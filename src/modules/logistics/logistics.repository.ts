import { ShipmentEventModel, type IShipmentEvent, type ShipmentStatus } from './logistics.schema';
import type mongoose from 'mongoose';

export interface CreateShipmentEventDto {
  idempotency_key: string;
  order_id: mongoose.Types.ObjectId;
  tracking_number: string;
  status: ShipmentStatus;
  carrier_code?: string;
  description?: string;
  location?: string;
  event_timestamp: Date;
  raw_payload: Record<string, unknown>;
}

export class ShipmentEventRepository {
  /**
   * Check whether an event with this idempotency key has already been persisted.
   * Returns the existing document (for cached response replay) or null.
   */
  async findByIdempotencyKey(key: string): Promise<IShipmentEvent | null> {
    return ShipmentEventModel.findOne({ idempotency_key: key })
      .lean() as unknown as Promise<IShipmentEvent | null>;
  }

  /**
   * Persist a new shipment event.
   * Will throw a MongoServerError (code 11000) if idempotency_key already exists —
   * the service layer treats this as a duplicate and returns the cached response.
   */
  async create(dto: CreateShipmentEventDto): Promise<IShipmentEvent> {
    const [doc] = await ShipmentEventModel.create([dto]);
    return doc;
  }

  /**
   * Paginated history for a given order.
   */
  async findByOrderId(orderId: string): Promise<IShipmentEvent[]> {
    return ShipmentEventModel.find({ order_id: orderId })
      .sort({ event_timestamp: -1 })
      .lean() as unknown as Promise<IShipmentEvent[]>;
  }

  /**
   * Latest event for a tracking number (useful for status display).
   */
  async findLatestByTrackingNumber(trackingNumber: string): Promise<IShipmentEvent | null> {
    return ShipmentEventModel.findOne({ tracking_number: trackingNumber })
      .sort({ event_timestamp: -1 })
      .lean() as unknown as Promise<IShipmentEvent | null>;
  }
}
