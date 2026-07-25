import type { UserEntity } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';

export interface UserRepository {
  create(user: UserInput): Promise<UserEntity>;
  update(id: UserId, user: UserUpdateInput): Promise<void>;
  delete(id: UserId): Promise<void>;
  findById(id: UserId): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
}

export type UserInput = Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UserUpdateInput = Omit<Partial<UserInput>, 'email'>;
