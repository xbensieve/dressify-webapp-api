import { z } from 'zod';

const SHIPMENT_STATUSES = [
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed_attempt',
  'returned',
  'cancelled',
] as const;

export const shipmentWebhookSchema = z.object({
  event_id: z
    .string({ required_error: 'event_id is required' })
    .min(8, 'event_id must be at least 8 characters')
    .max(128, 'event_id too long')
    .trim(),
  order_id: z
    .string({ required_error: 'order_id is required' })
    .regex(/^[a-f\d]{24}$/i, 'order_id must be a valid MongoDB ObjectId'),
  tracking_number: z
    .string({ required_error: 'tracking_number is required' })
    .min(4, 'tracking_number too short')
    .max(64, 'tracking_number too long')
    .trim(),
  status: z.enum(SHIPMENT_STATUSES, {
    required_error: 'status is required',
    invalid_type_error: `status must be one of: ${SHIPMENT_STATUSES.join(', ')}`,
  }),
  carrier_code: z.string().max(32).trim().optional(),
  description: z.string().max(512).trim().optional(),
  location: z.string().max(128).trim().optional(),
  event_timestamp: z
    .string({ required_error: 'event_timestamp is required' })
    .datetime({ message: 'event_timestamp must be a valid ISO 8601 datetime' }),
});

export type ShipmentWebhookDto = z.infer<typeof shipmentWebhookSchema>;
