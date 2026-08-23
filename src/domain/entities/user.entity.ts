import type { ImageId, UserId } from '~domain/types/branded';
import { type BaseEntity, BaseEntity_legacy } from './base.entity';

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export class UserEntity_legacy extends BaseEntity_legacy<UserId> {
  private _username: string;
  private _email: string;
  private _password: string;
  private _role: Role;
  private _avatarId: ImageId | null;

  constructor(
    id: UserId,
    username: string,
    email: string,
    password: string,
    role: Role,
    avatarId: ImageId | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._username = username;
    this._email = email;
    this._password = password;
    this._role = role;
    this._avatarId = avatarId;
  }

  get username(): string {
    return this._username;
  }

  get email(): string {
    return this._email;
  }

  get password(): string {
    return this._password;
  }

  get role(): Role {
    return this._role;
  }

  get avatarId(): ImageId | null {
    return this._avatarId;
  }

  static create(
    id: UserId,
    username: string,
    email: string,
    password: string,
    role: Role,
    avatarId: ImageId | null,
    createdAt: Date,
    updatedAt: Date,
  ): UserEntity_legacy {
    const user = new UserEntity_legacy(id, username, email, password, role, avatarId, createdAt, updatedAt);
    return user;
  }
}

export interface UserEntity extends BaseEntity<UserId> {
  username: string;
  email: string;
  password: string;
  role: Role;
  avatarId: ImageId | null;
}
