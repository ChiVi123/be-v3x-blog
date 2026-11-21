import type { ImageId, UserId } from '~domain/types/branded';
import type { BaseEntity } from './base.entity';

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}
export enum UserStatus {
  ACTIVE = 'active',
  BANNED = 'banned',
}

export interface UserEntity extends BaseEntity<UserId> {
  username: string;
  email: string;
  password: string;
  role: Role;
  bio: string | null;
  avatarId: ImageId | null;
  status: UserStatus;
}
