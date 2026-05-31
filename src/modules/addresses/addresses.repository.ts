import { AddressModel, type IAddress } from './addresses.schema';

export class AddressRepository {
  async findByUser(userId: string): Promise<IAddress[]> {
    return AddressModel.find({ user_id: userId }).lean() as unknown as Promise<IAddress[]>;
  }

  async findDefault(userId: string): Promise<IAddress | null> {
    return AddressModel.findOne({ user_id: userId, is_default: true }).lean() as unknown as Promise<IAddress | null>;
  }

  async create(userId: string, data: Partial<IAddress>): Promise<IAddress> {
    return AddressModel.create({ ...data, user_id: userId });
  }

  async update(id: string, data: Partial<IAddress>): Promise<IAddress | null> {
    return AddressModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await AddressModel.findByIdAndDelete(id);
    return result !== null;
  }

  async setDefault(userId: string, addressId: string): Promise<void> {
    await AddressModel.updateMany({ user_id: userId }, { is_default: false });
    await AddressModel.findByIdAndUpdate(addressId, { is_default: true });
  }
}
