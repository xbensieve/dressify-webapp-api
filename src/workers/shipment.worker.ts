import { createWorker } from '@infrastructure/queue/bullmq';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('shipment.worker');

interface ShipmentStatusJobData extends Record<string, unknown> {
  shipmentEventId: string;
  orderId: string;
  trackingNumber: string;
  status: string;
  eventTimestamp: string;
}

/**
 * Shipment Status Worker
 *
 * Consumes jobs from the 'notifications' queue where jobName === 'shipment.status.changed'.
 *
 * Responsibilities (extend as needed):
 *   1. Update the corresponding Order document's shipment_status field.
 *   2. Send push / email / SMS notification to the customer.
 *   3. Emit a WebSocket event to the frontend dashboard.
 *   4. Feed analytics pipeline (status transition timing etc.).
 *
 * Concurrency is intentionally low (2) — these jobs involve multiple DB writes
 * and external HTTP calls (SMS/push). Scale horizontally by running additional
 * worker processes (npm run worker) rather than increasing concurrency.
 */
export const startShipmentWorker = () => {
  const worker = createWorker<ShipmentStatusJobData>(
    'notifications',
    async (data, jobName) => {
      if (jobName !== 'shipment.status.changed') return; // filter to only handle our jobs

      log.info(
        {
          jobName,
          shipmentEventId: data.shipmentEventId,
          orderId: data.orderId,
          status: data.status,
        },
        'Processing shipment status change',
      );

      // ── Step 1: Update Order's logistics status ────────────────────────────
      // Import inline to avoid circular dependency at module level
      const { OrderModel } = await import('@modules/orders/orders.schema');
      await OrderModel.findByIdAndUpdate(data.orderId, {
        $set: { shipment_status: data.status, last_shipment_event_id: data.shipmentEventId },
      });

      log.debug({ orderId: data.orderId, status: data.status }, 'Order shipment status updated');

      // ── Step 2: Customer notification ─────────────────────────────────────
      // Placeholder: enqueue an email/push notification here
      // await enqueue('email', 'shipment.notification', { ... });

      // ── Step 3: WebSocket broadcast ───────────────────────────────────────
      // Placeholder: emit via your WebSocket infrastructure
      // wsService.broadcast(`order:${data.orderId}`, { type: 'SHIPMENT_UPDATE', status: data.status });

      log.info(
        { shipmentEventId: data.shipmentEventId, status: data.status },
        'Shipment event processing complete',
      );
    },
    { concurrency: 2 },
  );

  log.info('Shipment status worker started');
  return worker;
};
