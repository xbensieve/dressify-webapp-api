import { UserRepository } from './users.repository';
import { AddressRepository } from '@modules/addresses/addresses.repository';
import { NotFoundError } from '@shared/errors/AppError';

const userRepository = new UserRepository();
const addressRepository = new AddressRepository();

export const getProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError('User');

  const addresses = await addressRepository.findByUser(userId);

  return { user, addresses };
};
