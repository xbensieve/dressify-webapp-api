import { acquireLock, LockAcquisitionError } from '@infrastructure/cache/redlock.client';
import {
  VoucherRepository,
  VoucherUsageRepository,
  FlashSaleRepository,
} from './promotions.repository';
import { AppError, BadRequestError, NotFoundError } from '@shared/errors/AppError';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('promotions.service');

const voucherRepo = new VoucherRepository();
const usageRepo = new VoucherUsageRepository();
const flashSaleRepo = new FlashSaleRepository();

// ─── Lock TTL constants ───────────────────────────────────────────────────────

/** Max time we hold the voucher lock. Must be > worst-case DB round-trip. */
const VOUCHER_LOCK_TTL_MS = 5_000;

/** Max time we hold the flash-sale lock. */
const FLASH_SALE_LOCK_TTL_MS = 4_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplyVoucherResult {
  voucherId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  /** Actual discount amount, capped by max_discount_amount if applicable */
  calculatedDiscount: number;
  finalAmount: number;
}

export interface ReserveFlashSaleResult {
  flashSaleId: string;
  variationId: string;
  salePrice: number;
  quantity: number;
  remaining: number;
}

// ─── Voucher Service ──────────────────────────────────────────────────────────

/**
 * Apply a voucher to a cart total.
 *
 * Concurrency strategy — two-layer defence:
 *
 *   Layer 1 (Native Redlock — SET NX PX):
 *     Acquires a distributed lock keyed on the voucher ID using an atomic
 *     Redis SET NX PX command. Guarantees only ONE process executes the
 *     critical section at a time. Released via a Lua compare-and-delete
 *     script to prevent accidental foreign releases.
 *
 *   Layer 2 (MongoDB $expr atomic findOneAndUpdate):
 *     `$expr: { $lt: ['$usage_count', '$usage_limit'] }` acts as a DB-level
 *     atomic guard that fires inside the acquired lock. Even in the unlikely
 *     event of partial Redis failure, the DB prevents over-redemption.
 *
 * TOCTOU race: Without the lock, two concurrent requests could both pass the
 * pre-lock `findActiveByCode` check and both call `incrementUsageIfAvailable`,
 * resulting in usage_count exceeding usage_limit by 1 under high concurrency.
 * The Redlock eliminates this window entirely.
 */
export const applyVoucher = async (
  userId: string,
  code: string,
  orderAmount: number,
): Promise<ApplyVoucherResult> => {
  log.info({ userId, code, orderAmount }, 'Attempting to apply voucher');

  // ── 1. Pre-lock read — fail fast without holding the lock ────────────────
  const voucher = await voucherRepo.findActiveByCode(code);
  if (!voucher) {
    throw new NotFoundError(`Voucher "${code}"`);
  }

  if (orderAmount < voucher.min_order_amount) {
    throw new BadRequestError(
      `Minimum order amount for this voucher is ${voucher.min_order_amount}`,
    );
  }

  // ── 2. Per-user limit check (cheap, no lock needed) ─────────────────────
  const userUsageCount = await usageRepo.countByUserAndVoucher(userId, String(voucher._id));
  if (userUsageCount >= voucher.per_user_limit) {
    throw new BadRequestError(
      `You have already used this voucher ${voucher.per_user_limit} time(s)`,
    );
  }

  // ── 3. Acquire distributed lock (SET NX PX) ──────────────────────────────
  const lockKey = `lock:voucher:${String(voucher._id)}`;

  let lock;
  try {
    lock = await acquireLock(lockKey, {
      ttlMs: VOUCHER_LOCK_TTL_MS,
      retryCount: 5,
      retryDelayMs: 150,
      jitterMs: 50,
    });
  } catch (err) {
    if (err instanceof LockAcquisitionError) {
      log.warn({ userId, code }, 'Voucher lock contention — all retries exhausted');
      throw new AppError(
        'This voucher is being processed by another request. Please retry in a moment.',
        429,
        'RATE_LIMITED',
      );
    }
    throw err;
  }

  // Track whether the DB increment succeeded so we know whether to roll back
  let incrementSucceeded = false;

  try {
    // ── 4. Atomic DB decrement inside the lock ─────────────────────────────
    const updated = await voucherRepo.incrementUsageIfAvailable(String(voucher._id));
    if (!updated) {
      throw new BadRequestError('This voucher has reached its usage limit or has expired');
    }
    incrementSucceeded = true;

    // ── 5. Record per-user usage ───────────────────────────────────────────
    await usageRepo.create(userId, String(voucher._id));

    // ── 6. Calculate discount ──────────────────────────────────────────────
    let calculatedDiscount: number;
    if (voucher.type === 'percentage') {
      calculatedDiscount = (orderAmount * voucher.discount_value) / 100;
      if (voucher.max_discount_amount) {
        calculatedDiscount = Math.min(calculatedDiscount, voucher.max_discount_amount);
      }
    } else {
      calculatedDiscount = Math.min(voucher.discount_value, orderAmount);
    }

    const finalAmount = Math.max(0, orderAmount - calculatedDiscount);

    log.info(
      { userId, code, voucherId: String(updated._id), calculatedDiscount, finalAmount },
      'Voucher applied successfully',
    );

    return {
      voucherId: String(updated._id),
      code: updated.code,
      discountType: updated.type,
      discountValue: updated.discount_value,
      calculatedDiscount: Math.round(calculatedDiscount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
    };
  } catch (err) {
    // Compensating transaction: roll back DB increment if a downstream step failed
    if (incrementSucceeded) {
      await voucherRepo.decrementUsage(String(voucher._id)).catch((rollbackErr: unknown) => {
        log.error(
          { rollbackErr, voucherId: String(voucher._id) },
          'Voucher usage rollback failed — manual intervention may be required',
        );
      });
    }
    throw err;
  } finally {
    // Always release the lock so other requests can proceed
    await lock.release();
  }
};

// ─── Flash Sale Service ───────────────────────────────────────────────────────

/**
 * Reserve flash sale inventory for a given variation + quantity.
 *
 * Concurrency strategy — same two-layer defence:
 *
 *   Layer 1 (Native Redlock):
 *     Lock keyed on `variation_id` — concurrent buyers of the same flash-sale
 *     item are serialized through a single critical section. Independent
 *     flash sales (different variations) do not block each other.
 *
 *   Layer 2 (MongoDB $expr atomic findOneAndUpdate):
 *     `$lte: [{ $add: ['$sold_quantity', quantity] }, '$reserved_quantity']`
 *     atomically prevents over-selling at the DB level as a backstop.
 *
 * The caller (order service) MUST atomically decrement ProductVariation stock
 * within its own Mongoose transaction AFTER this reservation succeeds.
 * On order failure, call FlashSaleRepository.releaseUnits() to compensate.
 */
export const reserveFlashSaleItem = async (
  userId: string,
  variationId: string,
  quantity: number,
): Promise<ReserveFlashSaleResult> => {
  log.info({ userId, variationId, quantity }, 'Attempting flash sale reservation');

  if (quantity < 1) {
    throw new BadRequestError('Quantity must be at least 1');
  }

  // ── 1. Pre-lock read — fast-fail without holding the lock ─────────────────
  const flashSale = await flashSaleRepo.findActiveByVariation(variationId);
  if (!flashSale) {
    throw new NotFoundError(`Active flash sale for variation ${variationId}`);
  }

  const available = flashSale.reserved_quantity - flashSale.sold_quantity;
  if (available <= 0) {
    throw new BadRequestError('Flash sale items are sold out');
  }
  if (quantity > available) {
    throw new BadRequestError(`Only ${available} item(s) remaining in the flash sale`);
  }

  // ── 2. Acquire distributed lock keyed on variation ────────────────────────
  const lockKey = `lock:flash_sale:${variationId}`;

  let lock;
  try {
    lock = await acquireLock(lockKey, {
      ttlMs: FLASH_SALE_LOCK_TTL_MS,
      retryCount: 5,
      retryDelayMs: 150,
      jitterMs: 50,
    });
  } catch (err) {
    if (err instanceof LockAcquisitionError) {
      log.warn({ userId, variationId }, 'Flash sale lock contention — all retries exhausted');
      throw new AppError(
        'High demand! Another purchase is in progress. Please retry in a moment.',
        429,
        'RATE_LIMITED',
      );
    }
    throw err;
  }

  try {
    // ── 3. Atomic DB reservation inside the lock ──────────────────────────
    const updated = await flashSaleRepo.reserveUnitsIfAvailable(String(flashSale._id), quantity);

    if (!updated) {
      throw new BadRequestError(
        'Flash sale items are sold out (concurrent buyer got the last unit)',
      );
    }

    const remaining = updated.reserved_quantity - updated.sold_quantity;

    log.info(
      { userId, variationId, flashSaleId: String(updated._id), quantity, remaining },
      'Flash sale reservation successful',
    );

    return {
      flashSaleId: String(updated._id),
      variationId,
      salePrice: updated.sale_price,
      quantity,
      remaining,
    };
  } finally {
    await lock.release();
  }
};
