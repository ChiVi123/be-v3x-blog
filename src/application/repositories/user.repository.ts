import type { PaginationQuery } from '~application/types/pagination';
import type { Role, UserEntity, UserStatus } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';

export interface UserRepository {
  create(user: UserCreateInput): Promise<UserOutput>;
  update(id: UserId, user: UserUpdateInput): Promise<void>;
  delete(id: UserId): Promise<void>;
  findById(id: UserId): Promise<Author | null>;
  findByEmail(email: string, includePassword: true): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<Author | null>;
  search(query: UserQuery): Promise<UserOutput[]>;
  count(query: UserQuery): Promise<number>;
  isExist(id: UserId): Promise<boolean>;
  isExistByEmail(email: string): Promise<boolean>;
  searchAdmin(query: AdminUserQuery): Promise<AdminUserRow[]>;
  countAdmin(query: AdminUserQuery): Promise<number>;
  countActiveAdmins(): Promise<number>;
}

export type UserCreateInput = Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: UserStatus;
};
export type UserUpdateInput = Omit<Partial<UserCreateInput>, 'email'>;
export type UserOutput = Omit<UserEntity, 'password'>;
export type Author = UserOutput;
export type PublicAuthor = Pick<UserEntity, 'id' | 'username' | 'bio' | 'avatarId' | 'createdAt'>;
export type UserQuery = PaginationQuery<Pick<UserEntity, 'id' | 'username' | 'email' | 'createdAt' | 'updatedAt'>>;
export type AdminUserQuery = UserQuery & {
  role?: Role;
  status?: UserStatus;
};
export type AdminUserRow = UserOutput & { postsCount: number };
