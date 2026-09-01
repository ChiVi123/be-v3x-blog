import type { UserEntity } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';

export interface UserRepository {
  create(user: UserCreateInput): Promise<UserOutput>;
  update(id: UserId, user: UserUpdateInput): Promise<void>;
  delete(id: UserId): Promise<void>;
  findById(id: UserId): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  isExistByEmail(email: string): Promise<boolean>;
}

export type UserCreateInput = Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UserUpdateInput = Omit<Partial<UserCreateInput>, 'email'>;
export type UserOutput = Omit<UserEntity, 'password'>;
