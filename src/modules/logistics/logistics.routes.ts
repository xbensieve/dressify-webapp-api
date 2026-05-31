import { Router } from 'express';
import { validate } from '@shared/middleware/validate.middleware';
import { shipmentWebhookSchema } from './logistics.validation';
import * as logisticsController from './logistics.controller';

const router = Router();

/**
 * @route   POST /api/v1/webhooks/shipment-status
 * @desc    Receive shipment status updates from logistics partners
 * @access  Public (secured by partner secret validation in a real scenario —
 *          add an HMAC-signature middleware here for production use)
 *
 * Note: This endpoint intentionally does NOT use verifyToken.
 * Logistics partners authenticate via a shared HMAC secret in the
 * X-Webhook-Signature header. Add that middleware before the validate call
 * in production (e.g. verifyWebhookSignature from a shared utility).
 */
router.post(
  '/shipment-status',
  validate({ body: shipmentWebhookSchema }),
  logisticsController.receiveShipmentWebhook,
);

export default router;
