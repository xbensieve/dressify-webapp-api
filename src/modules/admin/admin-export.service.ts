import { Transform, pipeline, type Writable } from 'stream';
import type { Response } from 'express';
import { OrderModel } from '@modules/orders/orders.schema';
import { createModuleLogger } from '@shared/logger/createModuleLogger';
import { AppError } from '@shared/errors/AppError';
import { z } from 'zod';

const log = createModuleLogger('admin-export.service');

// ─── Filter validation schema ─────────────────────────────────────────────────

export const exportOrdersQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  sellerId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'sellerId must be a valid ObjectId')
    .optional(),
});

export type ExportOrdersQuery = z.infer<typeof exportOrdersQuerySchema>;

// ─── CSV field definitions ────────────────────────────────────────────────────

/**
 * Defines the exported columns and how to extract them from a document.
 * Add/remove columns here without touching stream logic.
 */
interface CsvField<T> {
  header: string;
  value: (doc: T) => string | number | undefined;
}

type OrderRow = {
  _id: { toString(): string };
  user_id: { toString(): string } | { username?: string; email?: string };
  address_id: { toString(): string };
  order_status: string;
  total_amount: number;
  createdAt: Date;
  updatedAt: Date;
};

const CSV_FIELDS: CsvField<OrderRow>[] = [
  { header: 'order_id',      value: (d) => d._id.toString() },
  { header: 'status',        value: (d) => d.order_status },
  { header: 'total_amount',  value: (d) => d.total_amount },
  { header: 'created_at',    value: (d) => d.createdAt.toISOString() },
  { header: 'updated_at',    value: (d) => d.updatedAt.toISOString() },
  {
    header: 'customer_email',
    value: (d) =>
      d.user_id && typeof d.user_id === 'object' && 'email' in d.user_id
        ? (d.user_id as { email?: string }).email ?? ''
        : d.user_id?.toString() ?? '',
  },
  {
    header: 'customer_name',
    value: (d) =>
      d.user_id && typeof d.user_id === 'object' && 'username' in d.user_id
        ? (d.user_id as { username?: string }).username ?? ''
        : '',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Escape a single CSV cell value.
 *  - Wraps in double-quotes if the value contains commas, quotes, or newlines.
 *  - Escapes embedded double-quotes by doubling them.
 */
const escapeCsvCell = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsvRow = (cells: (string | number | undefined)[]): string =>
  cells.map(escapeCsvCell).join(',') + '\r\n';

const CSV_HEADER_ROW = buildCsvRow(CSV_FIELDS.map((f) => f.header));

// ─── Core stream export function ──────────────────────────────────────────────

/**
 * Streams a filtered Order dataset as CSV directly into the Express Response.
 *
 * Memory profile:
 *   - MongoDB QueryCursor fetches documents in configurable batches (batchSize).
 *   - Transform stream serializes one document at a time.
 *   - Node.js back-pressure (stream.pipeline) prevents buffer bloat.
 *   - Peak heap usage ≈ batchSize × avg_doc_size_bytes, NOT total_dataset_size.
 *
 * Architecture — stream.pipeline:
 *   mongoose cursor (Readable)
 *     → CsvTransform (Transform)  ← converts each doc to a CSV row string
 *     → res (Writable/HTTP stream) ← Express response, chunked Transfer-Encoding
 *
 * stream.pipeline is used instead of .pipe() because:
 *   1. It automatically destroys all streams on error, preventing memory leaks.
 *   2. It propagates errors correctly to the callback.
 *   3. It ensures the destination is properly finished on completion.
 */
export const streamOrdersCsv = async (
  query: ExportOrdersQuery,
  res: Response,
): Promise<void> => {
  log.info({ query }, 'Admin: beginning order CSV stream export');

  // ── Build Mongoose query filter ───────────────────────────────────────────
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter['order_status'] = query.status;
  }
  if (query.from || query.to) {
    filter['createdAt'] = {
      ...(query.from ? { $gte: new Date(query.from) } : {}),
      ...(query.to   ? { $lte: new Date(query.to) }   : {}),
    };
  }

  // ── Open MongoDB cursor — NEVER call .lean() before .cursor() ─────────────
  // .cursor() returns a QueryCursor<Document> which implements ReadableStream.
  // batchSize(200): cursor fetches 200 docs per network round-trip — balanced
  // between memory and chattiness. Tune based on avg document size.
  const cursor = OrderModel
    .find(filter)
    .select('_id user_id address_id order_status total_amount createdAt updatedAt')
    .populate('user_id', 'username email')   // only name + email — no password fields
    .sort({ createdAt: -1 })
    .batchSize(200)
    .cursor();                               // returns mongoose QueryCursor (Readable)

  // ── Build CSV Transform stream ────────────────────────────────────────────
  // Operates in object mode (input = Mongoose doc, output = Buffer/string chunks)
  let rowCount = 0;
  let headerWritten = false;

  const csvTransform = new Transform({
    objectMode: true,                        // read Mongoose Documents (objects)
    writableObjectMode: true,
    readableObjectMode: false,               // emit raw string/Buffer chunks

    transform(doc: OrderRow, _encoding, callback) {
      try {
        // Emit CSV header exactly once on the first document
        if (!headerWritten) {
          this.push(CSV_HEADER_ROW);
          headerWritten = true;
        }
        const row = buildCsvRow(CSV_FIELDS.map((f) => f.value(doc)));
        this.push(row);
        rowCount++;
        callback();
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },

    flush(callback) {
      // Edge case: if cursor was empty, push just the header so the CSV is valid
      if (!headerWritten) {
        this.push(CSV_HEADER_ROW);
      }
      log.info({ rowCount }, 'CSV transform complete — all rows emitted');
      callback();
    },
  });

  // ── Set HTTP headers BEFORE pipeline starts ───────────────────────────────
  // Once pipeline begins pumping, headers cannot be changed.
  const filename = `orders_export_${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Export-Filter', JSON.stringify(query));
  // UTF-8 BOM for correct Excel rendering of non-ASCII characters
  res.write('\ufeff');

  // ── Wire pipeline: cursor → transform → response ──────────────────────────
  // stream.pipeline ensures ALL streams are destroyed on error or completion.
  // Back-pressure is handled automatically: if `res` is slow (client throttles),
  // the cursor pauses; no unbounded buffering occurs.
  await new Promise<void>((resolve, reject) => {
    pipeline(
      cursor as unknown as NodeJS.ReadableStream,
      csvTransform,
      res as unknown as Writable,
      (err) => {
        if (err) {
          log.error({ err, rowCount }, 'CSV stream pipeline error');
          // Headers already sent — cannot send a JSON error body.
          // Destroy the response to signal failure to the client.
          if (!res.writableEnded) {
            res.destroy(err);
          }
          reject(
            new AppError(`CSV export pipeline failed: ${err.message}`, 500, 'INTERNAL_ERROR'),
          );
        } else {
          log.info({ rowCount, filename }, 'CSV export stream completed successfully');
          resolve();
        }
      },
    );
  });
};
