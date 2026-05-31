import { AddressRepository } from './addresses.repository';
import { NotFoundError } from '@shared/errors/AppError';

const addressRepository = new AddressRepository();

export const getUserAddresses = async (userId: string) => addressRepository.findByUser(userId);

export const createAddress = async (userId: string, data: Record<string, unknown>) => {
  return addressRepository.create(userId, data);
};

export const updateAddress = async (_userId: string, addressId: string, data: Record<string, unknown>) => {
  const existing = await addressRepository.update(addressId, data);
  if (!existing) throw new NotFoundError('Address');
  return existing;
};

export const deleteAddress = async (_userId: string, addressId: string): Promise<void> => {
  const deleted = await addressRepository.delete(addressId);
  if (!deleted) throw new NotFoundError('Address');
};

export const setDefaultAddress = async (userId: string, addressId: string): Promise<void> => {
  await addressRepository.setDefault(userId, addressId);
};
