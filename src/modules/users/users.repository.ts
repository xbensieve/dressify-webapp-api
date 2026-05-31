import { UserModel } from './users.schema';
import type { IUser, CreateUserDto } from './users.types';

export class UserRepository {
  async create(dto: Partial<CreateUserDto>): Promise<IUser> {
    const user = new UserModel(dto);
    return user.save();
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id).select('-password_hash -confirmationCode -expireConfirmationCode -__v');
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return UserModel.findOne({ username });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() });
  }

  async findByIdentifier(
    username: string,
    email: string,
    phone?: string,
  ): Promise<IUser | null> {
    const conditions: object[] = [{ username }, { email: email.toLowerCase() }];
    if (phone) conditions.push({ phone });
    return UserModel.findOne({ $or: conditions });
  }

  async findByEmailAndCode(email: string, code: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase(), confirmationCode: code });
  }

  async activateUser(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, {
      isConfirmed: true,
      confirmationCode: null,
      expireConfirmationCode: null,
    });
  }

  async findAll(): Promise<IUser[]> {
    return UserModel.find().select('-password_hash -confirmationCode -expireConfirmationCode -__v');
  }

  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, { status }, { new: true }).select('-password_hash');
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, { avatar: avatarUrl }, { new: true });
  }
}
