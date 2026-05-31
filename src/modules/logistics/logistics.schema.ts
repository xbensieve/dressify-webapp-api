import mongoose, { Schema, type Document } from 'mongoose';

// ─── Shipment Status Enum ─────────────────────────────────────────────────────

export type ShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_attempt'
  | 'returned'
  | 'cancelled';

// ─── ShipmentEvent Document ───────────────────────────────────────────────────

/**
 * Persists every validated, de-duplicated webhook event from the logistics partner.
 * Acts as an immutable audit log of all shipment status transitions.
 */
export interface IShipmentEvent extends Document {
  _id: mongoose.Types.ObjectId;
  /** The partner-provided idempotency key (their event ID). Unique index. */
  idempotency_key: string;
  /** Our internal order reference. */
  order_id: mongoose.Types.ObjectId;
  /** Tracking number provided by the logistics partner. */
  tracking_number: string;
  status: ShipmentStatus;
  /** Carrier-specific sub-code (e.g. "WEATHER_DELAY"). */
  carrier_code?: string;
  /** Human-readable description from the carrier. */
  description?: string;
  /** Physical location of the event (city/hub). */
  location?: string;
  /** Timestamp when the event occurred on the carrier's end. */
  event_timestamp: Date;
  /** Raw payload from the partner for forensic/debugging purposes. */
  raw_payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const shipmentEventSchema = new Schema<IShipmentEvent>(
  {
    // Unique across all events — the idempotency anchor
    idempotency_key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    tracking_number: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed_attempt',
        'returned',
        'cancelled',
      ],
      required: true,
      index: true,
    },
    carrier_code: { type: String, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    event_timestamp: { type: Date, required: true },
    raw_payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

shipmentEventSchema.index({ order_id: 1, event_timestamp: -1 });
shipmentEventSchema.index({ tracking_number: 1, status: 1 });

export const ShipmentEventModel = mongoose.model<IShipmentEvent>(
  'ShipmentEvent',
  shipmentEventSchema,
);
