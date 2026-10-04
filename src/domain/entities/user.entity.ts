import type { ImageId, UserId } from '~domain/types/branded';
import type { BaseEntity } from './base.entity';

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export interface UserEntity extends BaseEntity<UserId> {
  username: string;
  email: string;
  password: string;
  role: Role;
  avatarId: ImageId | null;
}
