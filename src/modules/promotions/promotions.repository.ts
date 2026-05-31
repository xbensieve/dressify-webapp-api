import {
  VoucherModel,
  VoucherUsageModel,
  FlashSaleModel,
  type IVoucher,
  type IVoucherUsage,
  type IFlashSale,
} from './promotions.schema';
import type mongoose from 'mongoose';

// ─── Voucher Repository ───────────────────────────────────────────────────────

export class VoucherRepository {
  /**
   * Find an active, non-expired voucher by code.
   */
  async findActiveByCode(code: string): Promise<IVoucher | null> {
    return VoucherModel.findOne({
      code: code.toUpperCase().trim(),
      status: 'active',
      starts_at: { $lte: new Date() },
      expires_at: { $gt: new Date() },
    }).lean() as unknown as Promise<IVoucher | null>;
  }

  /**
   * Atomically increment usage_count by 1 ONLY if usage_count < usage_limit.
   * Returns the updated document or null if the limit is already reached.
   * This is the DB-level guard that operates AFTER the Redlock is acquired.
   */
  async incrementUsageIfAvailable(voucherId: string): Promise<IVoucher | null> {
    return VoucherModel.findOneAndUpdate(
      {
        _id: voucherId,
        $expr: { $lt: ['$usage_count', '$usage_limit'] },
        status: 'active',
        expires_at: { $gt: new Date() },
      },
      { $inc: { usage_count: 1 } },
      { new: true },
    ).lean() as unknown as Promise<IVoucher | null>;
  }

  /**
   * Roll back a usage increment (called when the upstream order fails).
   */
  async decrementUsage(voucherId: string): Promise<void> {
    await VoucherModel.findByIdAndUpdate(voucherId, {
      $inc: { usage_count: -1 },
    });
  }

  async findById(id: string): Promise<IVoucher | null> {
    return VoucherModel.findById(id).lean() as unknown as Promise<IVoucher | null>;
  }
}

// ─── VoucherUsage Repository ──────────────────────────────────────────────────

export class VoucherUsageRepository {
  /**
   * Count how many times a user has used a specific voucher.
   */
  async countByUserAndVoucher(userId: string, voucherId: string): Promise<number> {
    return VoucherUsageModel.countDocuments({ user_id: userId, voucher_id: voucherId });
  }

  /**
   * Record a voucher usage event (idempotent by unique index on voucher_id+user_id
   * when per_user_limit=1; for higher limits use a plain insert).
   */
  async create(
    userId: string,
    voucherId: string,
    orderId?: mongoose.Types.ObjectId,
  ): Promise<IVoucherUsage> {
    return VoucherUsageModel.create({
      user_id: userId,
      voucher_id: voucherId,
      ...(orderId ? { order_id: orderId } : {}),
    });
  }
}

// ─── FlashSale Repository ─────────────────────────────────────────────────────

export class FlashSaleRepository {
  /**
   * Find a currently active flash sale for a specific variation.
   */
  async findActiveByVariation(variationId: string): Promise<IFlashSale | null> {
    const now = new Date();
    return FlashSaleModel.findOne({
      variation_id: variationId,
      is_active: true,
      starts_at: { $lte: now },
      ends_at: { $gt: now },
    }).lean() as unknown as Promise<IFlashSale | null>;
  }

  /**
   * Atomically reserve N units from a flash sale ONLY IF enough remain.
   * sold_quantity + quantity <= reserved_quantity is enforced at DB level.
   */
  async reserveUnitsIfAvailable(
    flashSaleId: string,
    quantity: number,
  ): Promise<IFlashSale | null> {
    return FlashSaleModel.findOneAndUpdate(
      {
        _id: flashSaleId,
        is_active: true,
        ends_at: { $gt: new Date() },
        $expr: {
          $lte: [{ $add: ['$sold_quantity', quantity] }, '$reserved_quantity'],
        },
      },
      { $inc: { sold_quantity: quantity } },
      { new: true },
    ).lean() as unknown as Promise<IFlashSale | null>;
  }

  /**
   * Roll back a reservation (called on upstream failure).
   */
  async releaseUnits(flashSaleId: string, quantity: number): Promise<void> {
    await FlashSaleModel.findByIdAndUpdate(flashSaleId, {
      $inc: { sold_quantity: -quantity },
    });
  }

  async findById(id: string): Promise<IFlashSale | null> {
    return FlashSaleModel.findById(id).lean() as unknown as Promise<IFlashSale | null>;
  }
}
