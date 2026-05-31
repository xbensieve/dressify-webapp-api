/**
 * Unit Tests — Admin Export Service (stream pipeline)
 *
 * The core challenge: stream.pipeline() requires the destination to be a real
 * Node.js Writable with internal stream machinery (event emitters, _write, etc.)
 *
 * Solution: subclass `Writable` and add Express-like methods (setHeader, write BOM).
 * This gives pipeline() exactly what it needs while letting us inspect output.
 *
 * Note: OrderModel.find() uses populate('user_id', ...) which requires UserModel
 * to be registered. We import it explicitly and seed real users for test orders.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Writable } from 'stream';
import mongoose from 'mongoose';
import { OrderModel } from '@modules/orders/orders.schema';
import { UserModel } from '@modules/users/users.schema';
import { streamOrdersCsv } from '@modules/admin/admin-export.service';

// ── CsvCollector ──────────────────────────────────────────────────────────────

class CsvCollector extends Writable {
  private _output = '';
  public readonly setHeaderCalls: Array<[string, string]> = [];
  public readonly bomWrites: string[] = [];

  constructor() {
    super(); // real Writable — pipeline() can call _write / _final
  }

  // Satisfy stream.pipeline Writable requirement
  _write(chunk: Buffer, _enc: BufferEncoding, cb: () => void): void {
    this._output += chunk.toString('utf-8');
    cb();
  }

  // Express setHeader surface
  setHeader(name: string, value: string): this {
    this.setHeaderCalls.push([name, value]);
    return this;
  }

  // Express write() surface — called by service for the BOM only
  write(
    chunk: string | Buffer,
    encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
    cb?: (error: Error | null | undefined) => void,
  ): boolean {
    const str = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    this.bomWrites.push(str);
    this._output += str;
    // Do NOT call super.write here — would double-write chunks that come
    // through pipeline later. BOM is written before pipeline starts.
    if (typeof encoding === 'function') encoding(null);
    else if (cb) cb(null);
    return true;
  }

  getOutput(): string {
    return this._output;
  }

  getHeader(name: string): string | undefined {
    return this.setHeaderCalls.find(([n]) => n === name)?.[1];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shared user ID — populated by beforeEach so populate() resolves */
let TEST_USER_ID: mongoose.Types.ObjectId;

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  user_id: TEST_USER_ID,
  address_id: new mongoose.Types.ObjectId(),
  order_status: 'completed',
  total_amount: 100,
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminExportService — streamOrdersCsv', () => {
  // Seed a real user + clear orders before each test
  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await UserModel.deleteMany({});
    const user = await UserModel.create({
      username: `export_test_${Date.now()}`,
      first_name: 'Test', last_name: 'User',
      email: `export_${Date.now()}@test.com`,
      phone: '0123456789',
      dob: new Date('2000-01-01'),
      password: 'hashed',
      role: 'customer',
    });
    TEST_USER_ID = user._id as mongoose.Types.ObjectId;
  });

  it('should emit a valid CSV header as the first content row', async () => {
    await OrderModel.create(makeOrder());
    const res = new CsvCollector();

    await streamOrdersCsv({}, res as never);

    const lines = res.getOutput().replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines[0]).toContain('order_id');
    expect(lines[0]).toContain('status');
    expect(lines[0]).toContain('total_amount');
    expect(lines[0]).toContain('created_at');
  });

  it('should emit one data row per order document', async () => {
    await OrderModel.insertMany([makeOrder(), makeOrder(), makeOrder()]);
    const res = new CsvCollector();

    await streamOrdersCsv({}, res as never);

    const lines = res.getOutput().replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(4); // 1 header + 3 data
  });

  it('should emit only a header row when no orders match the filter', async () => {
    // DB is empty (cleared in beforeEach)
    const res = new CsvCollector();

    await streamOrdersCsv({ status: 'cancelled' }, res as never);

    const lines = res.getOutput().replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(1); // header only
    expect(lines[0]).toContain('order_id');
  });

  it('should filter by status correctly', async () => {
    await OrderModel.insertMany([
      makeOrder({ order_status: 'completed' }),
      makeOrder({ order_status: 'completed' }),
      makeOrder({ order_status: 'cancelled' }),
    ]);
    const res = new CsvCollector();

    await streamOrdersCsv({ status: 'completed' }, res as never);

    const lines = res.getOutput().replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(3); // 1 header + 2 completed
    lines.slice(1).forEach((l) => expect(l).toContain('completed'));
  });

  it('should filter by date range correctly', async () => {
    await OrderModel.create(makeOrder({ total_amount: 100, createdAt: new Date('2024-03-01') }));
    await OrderModel.create(makeOrder({ total_amount: 200, createdAt: new Date('2025-06-15') }));
    const res = new CsvCollector();

    await streamOrdersCsv(
      { from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' },
      res as never,
    );

    const lines = res.getOutput().replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(2); // header + 1 match
    expect(lines[1]).toContain('200');
  });

  it('should set Content-Type to text/csv', async () => {
    await OrderModel.create(makeOrder());
    const res = new CsvCollector();

    await streamOrdersCsv({}, res as never);

    expect(res.getHeader('Content-Type')).toBe('text/csv; charset=utf-8');
  });

  it('should set Content-Disposition as attachment with timestamped filename', async () => {
    await OrderModel.create(makeOrder());
    const res = new CsvCollector();

    await streamOrdersCsv({}, res as never);

    expect(res.getHeader('Content-Disposition')).toMatch(
      /attachment; filename="orders_export_\d+\.csv"/,
    );
  });

  it('should write UTF-8 BOM as the first explicit res.write() call', async () => {
    await OrderModel.create(makeOrder());
    const res = new CsvCollector();

    await streamOrdersCsv({}, res as never);

    expect(res.bomWrites[0]).toBe('\ufeff');
  });

  it('should handle 30 orders correctly (cursor streaming)', async () => {
    await OrderModel.insertMany(Array.from({ length: 30 }, () => makeOrder()));
    const res = new CsvCollector();

    await streamOrdersCsv({}, res as never);

    const lines = res.getOutput().replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(31); // 1 header + 30
  });
}, 60_000);
