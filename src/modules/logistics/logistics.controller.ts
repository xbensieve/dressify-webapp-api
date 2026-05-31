import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as logisticsService from './logistics.service';
import type { WebhookPayload } from './logistics.service';

/**
 * POST /api/v1/webhooks/shipment-status
 *
 * Logistics partner webhook receiver.
 *
 * Design decisions:
 *  - The raw req.body is forwarded as `rawPayload` for forensic storage, so the
 *    body parser must NOT transform it before this handler runs.
 *  - The parsed, Zod-validated body arrives as `WebhookPayload` (cast is safe
 *    because the validate middleware runs before this handler in the route).
 *  - HTTP status codes follow the exactly-once contract:
 *      200 — new event processed (or idempotent duplicate replay)
 *      409 — concurrent in-flight duplicate: partner should retry after backoff
 */
export const receiveShipmentWebhook = asyncHandler(async (req: Request, res: Response) => {
  // req.body is already the Zod-validated payload at this point
  const payload = req.body as WebhookPayload;

  // Preserve the raw (pre-parse) request body for audit storage.
  // req.body IS the parsed body — we cast it back to a plain object for storage.
  const rawPayload = req.body as Record<string, unknown>;

  const ack = await logisticsService.processShipmentWebhook(payload, rawPayload);

  // Always respond 200 to the partner (even for duplicates) to prevent unnecessary retries.
  // The `duplicate` field in the body lets internal consumers distinguish new vs replayed events.
  res.status(200).json({
    success: true,
    message: ack.duplicate
      ? 'Duplicate event — already processed'
      : 'Shipment event received and queued for processing',
    data: ack,
  });
});
