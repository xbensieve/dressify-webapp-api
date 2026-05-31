import mongoose from 'mongoose';
import { redisClient } from '@infrastructure/cache/redis.client';
import { enqueue } from '@infrastructure/queue/bullmq';
import { ShipmentEventRepository } from './logistics.repository';
import type { ShipmentStatus } from './logistics.schema';
import { AppError, BadRequestError } from '@shared/errors/AppError';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('logistics.service');
const shipmentRepo = new ShipmentEventRepository();

// ─── Constants ─────────────────────────────────────────────────────────────────

/**
 * Redis idempotency key TTL.
 * 24 h is a safe window: carrier retry policies rarely exceed 6–12 h.
 * The DB unique index provides a permanent backstop beyond this window.
 */
const IDEMPOTENCY_CACHE_TTL_SECONDS = 86_400; // 24 hours

/**
 * Redis processing-lock TTL.
 * Guards against concurrent in-flight processing of the same key during the
 * tiny window between "key not in cache" and "key written to cache".
 */
const PROCESSING_LOCK_TTL_SECONDS = 30; // 30 seconds

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  /** Partner-generated unique event identifier — used as idempotency key. */
  event_id: string;
  order_id: string;
  tracking_number: string;
  status: ShipmentStatus;
  carrier_code?: string;
  description?: string;
  location?: string;
  /** ISO 8601 timestamp from the carrier. */
  event_timestamp: string;
}

export interface WebhookAckResponse {
  received: true;
  event_id: string;
  /** Indicates whether this is a fresh processing or a duplicate replay. */
  duplicate: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Process an inbound shipment status webhook with strict idempotency.
 *
 * Idempotency mechanism — three-layer defence:
 *
 *  Layer 1 — Redis cached response (fast path):
 *    Key `webhook:idempotency:{event_id}` → cached JSON ack.
 *    Returns instantly for all duplicate calls within the TTL window.
 *
 *  Layer 2 — Redis processing lock (concurrent duplicate guard):
 *    Key `webhook:processing:{event_id}` with SET NX EX.
 *    Prevents two simultaneous identical requests from both passing Layer 1
 *    and racing into the DB write. The loser gets a 409 telling it to retry.
 *
 *  Layer 3 — MongoDB unique index on idempotency_key (permanent backstop):
 *    After the TTL window expires, the DB unique index catches any replayed
 *    events and we return the original ack without reprocessing.
 *
 * After exactly-once persistence, a BullMQ job is enqueued for downstream
 * async processing (order status updates, notifications, analytics).
 */
export const processShipmentWebhook = async (
  payload: WebhookPayload,
  rawPayload: Record<string, unknown>,
): Promise<WebhookAckResponse> => {
  const { event_id, order_id, tracking_number, status, event_timestamp } = payload;

  log.info({ event_id, order_id, tracking_number, status }, 'Inbound shipment webhook received');

  // ── Layer 1: Redis fast-path idempotency check ────────────────────────────
  const idempotencyKey = `webhook:idempotency:${event_id}`;
  const cached = await redisClient.get(idempotencyKey);

  if (cached) {
    log.info({ event_id }, 'Duplicate webhook detected — returning cached ack (Layer 1 Redis)');
    const cachedAck = JSON.parse(cached) as WebhookAckResponse;
    return { ...cachedAck, duplicate: true };
  }

  // ── Layer 2: Redis processing lock — prevent concurrent duplicates ────────
  const processingLockKey = `webhook:processing:${event_id}`;
  const acquired = await redisClient.set(processingLockKey, '1', {
    NX: true,          // Only set if not exists
    EX: PROCESSING_LOCK_TTL_SECONDS,
  });

  if (!acquired) {
    // Another request is currently processing the same event_id
    log.warn({ event_id }, 'Concurrent duplicate webhook — processing lock held by another request');
    throw new AppError(
      'This event is currently being processed. Retry in a few seconds.',
      409,
      'CONFLICT',
    );
  }

  try {
    // ── Layer 3: DB unique index backstop ─────────────────────────────────
    // Check if it already exists in DB (catches replays after Redis TTL expiry)
    const existing = await shipmentRepo.findByIdempotencyKey(event_id);
    if (existing) {
      log.info({ event_id }, 'Duplicate webhook detected — DB backstop (Layer 3)');
      const ack: WebhookAckResponse = { received: true, event_id, duplicate: true };

      // Re-populate the Redis cache to accelerate future duplicate checks
      await redisClient.setEx(idempotencyKey, IDEMPOTENCY_CACHE_TTL_SECONDS, JSON.stringify(ack));
      return ack;
    }

    // ── Validate order_id is a valid ObjectId ─────────────────────────────
    if (!mongoose.isValidObjectId(order_id)) {
      throw new BadRequestError(`Invalid order_id: ${order_id}`);
    }

    // ── Parse and validate event_timestamp ───────────────────────────────
    const eventDate = new Date(event_timestamp);
    if (isNaN(eventDate.getTime())) {
      throw new BadRequestError(`Invalid event_timestamp: ${event_timestamp}`);
    }

    // ── Persist the event ─────────────────────────────────────────────────
    const shipmentEvent = await shipmentRepo.create({
      idempotency_key: event_id,
      order_id: new mongoose.Types.ObjectId(order_id),
      tracking_number,
      status,
      carrier_code: payload.carrier_code,
      description: payload.description,
      location: payload.location,
      event_timestamp: eventDate,
      raw_payload: rawPayload,
    });

    log.info(
      { event_id, shipmentEventId: String(shipmentEvent._id), status },
      'Shipment event persisted',
    );

    // ── Enqueue async processing job ──────────────────────────────────────
    await enqueue(
      'notifications',
      'shipment.status.changed',
      {
        shipmentEventId: String(shipmentEvent._id),
        orderId: order_id,
        trackingNumber: tracking_number,
        status,
        eventTimestamp: event_timestamp,
      },
      {
        // Delay slightly to batch rapid successive status updates
        delay: 500,
        // Deduplicate queued jobs by event_id (BullMQ jobId dedup)
        jobId: `shipment:${event_id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    log.debug({ event_id, status }, 'BullMQ notifications job enqueued');

    // ── Cache the ack in Redis ────────────────────────────────────────────
    const ack: WebhookAckResponse = { received: true, event_id, duplicate: false };
    await redisClient.setEx(idempotencyKey, IDEMPOTENCY_CACHE_TTL_SECONDS, JSON.stringify(ack));

    return ack;
  } finally {
    // Always release the processing lock so the next legitimate event can proceed
    await redisClient.del(processingLockKey).catch((err) => {
      log.error({ err, processingLockKey }, 'Failed to release processing lock');
    });
  }
};
