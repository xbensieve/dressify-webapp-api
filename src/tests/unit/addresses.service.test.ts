import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import * as addressesService from '@modules/addresses/addresses.service';
import { AddressModel } from '@modules/addresses/addresses.schema';

describe('AddressesService Unit Tests', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const addressData = {
    full_name: 'John Doe',
    phone: '0123456789',
    address_line: '123 Main St',
    city: 'Hanoi',
    district: 'Ba Dinh',
    ward: 'Cong Vi',
  };

  beforeEach(async () => {
    await AddressModel.deleteMany({});
  });

  describe('createAddress', () => {
    it('should create a new address for a user', async () => {
      const addr = await addressesService.createAddress(userId, addressData);
      expect(addr).toBeTruthy();
      expect(addr.user_id.toString()).toBe(userId);
      expect(addr.full_name).toBe(addressData.full_name);
      expect(addr.is_default).toBe(false);

      const found = await AddressModel.findById(addr._id);
      expect(found).toBeTruthy();
    });
  });

  describe('getUserAddresses', () => {
    it('should return empty list if user has no addresses', async () => {
      const list = await addressesService.getUserAddresses(userId);
      expect(list).toHaveLength(0);
    });

    it('should return all addresses for the user', async () => {
      await AddressModel.create([
        { ...addressData, user_id: userId },
        { ...addressData, user_id: userId, address_line: '456 Second St' },
        { ...addressData, user_id: new mongoose.Types.ObjectId() }, // different user
      ]);

      const list = await addressesService.getUserAddresses(userId);
      expect(list).toHaveLength(2);
    });
  });

  describe('updateAddress', () => {
    it('should throw NotFoundError if address does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        addressesService.updateAddress(userId, fakeId, { full_name: 'Updated Name' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should update an address successfully', async () => {
      const addr = await AddressModel.create({ ...addressData, user_id: userId });
      const updated = await addressesService.updateAddress(userId, addr._id.toString(), {
        full_name: 'Jane Doe',
        phone: '0987654321',
      });

      expect(updated.full_name).toBe('Jane Doe');
      expect(updated.phone).toBe('0987654321');

      const found = await AddressModel.findById(addr._id);
      expect(found!.full_name).toBe('Jane Doe');
    });
  });

  describe('deleteAddress', () => {
    it('should throw NotFoundError if address to delete does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        addressesService.deleteAddress(userId, fakeId),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should delete an address successfully', async () => {
      const addr = await AddressModel.create({ ...addressData, user_id: userId });
      await addressesService.deleteAddress(userId, addr._id.toString());

      const found = await AddressModel.findById(addr._id);
      expect(found).toBeNull();
    });
  });

  describe('setDefaultAddress', () => {
    it('should set default address and unset other default addresses for that user', async () => {
      const addr1 = await AddressModel.create({ ...addressData, user_id: userId, is_default: true });
      const addr2 = await AddressModel.create({ ...addressData, user_id: userId, is_default: false });
      const otherUserAddr = await AddressModel.create({
        ...addressData,
        user_id: new mongoose.Types.ObjectId(),
        is_default: true,
      });

      await addressesService.setDefaultAddress(userId, addr2._id.toString());

      const updatedAddr1 = await AddressModel.findById(addr1._id);
      const updatedAddr2 = await AddressModel.findById(addr2._id);
      const updatedOther = await AddressModel.findById(otherUserAddr._id);

      expect(updatedAddr1!.is_default).toBe(false);
      expect(updatedAddr2!.is_default).toBe(true);
      expect(updatedOther!.is_default).toBe(true); // shouldn't affect other user's address
    });
  });
});
