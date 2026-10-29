import { Inject, Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import type {
  Author,
  UserCreateInput,
  UserOutput,
  UserQuery,
  UserRepository,
  UserUpdateInput,
} from '~application/repositories/user.repository';
import { Role, type UserEntity } from '~domain/entities';
import type { UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { users } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const RETURNING = {
  id: users.id,
  username: users.username,
  email: users.email,
  role: users.role,
  bio: users.bio,
  avatarId: users.avatarId,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(user: UserCreateInput): Promise<UserOutput> {
    const [result] = await this.db.insert(users).values(user).returning(RETURNING);
    return { ...result };
  }

  async update(id: UserId, user: UserUpdateInput): Promise<void> {
    await this.db.update(users).set(user).where(eq(users.id, id));
  }

  async delete(id: UserId): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async findById(id: UserId): Promise<Author | null> {
    const user = await this.db.query.users.findFirst({ where: { id: { eq: id } } });
    return user ?? null;
  }

  async findByEmail(email: string): Promise<Author | null>;
  async findByEmail(email: string, includePassword: true): Promise<UserEntity | null>;
  async findByEmail(email: string, includePassword?: boolean): Promise<UserEntity | Author | null> {
    const user = await this.db.query.users.findFirst({
      where: { email: { eq: email } },
      ...(includePassword ? { columns: { password: true } } : {}),
    });
    return user ?? null;
  }

  async search(query: UserQuery): Promise<UserOutput[]> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const offset = Math.max(0, (page - 1) * limit);

    const usersResult = await this.db.query.users.findMany({
      where: { role: { NOT: Role.ADMIN } },
      limit,
      offset,
      orderBy: (users, { desc, asc }) => (sortOrder === 'desc' ? [desc(users[sortBy])] : [asc(users[sortBy])]),
      columns: { password: false },
    });

    return usersResult;
  }

  async count(_query: UserQuery): Promise<number> {
    const result = await this.db.select({ count: count(users.id) }).from(users);

    return result[0].count;
  }

  async isExist(id: UserId): Promise<boolean> {
    const [result] = await this.db.select({ count: count() }).from(users).where(eq(users.id, id));
    return result?.count > 0;
  }

  async isExistByEmail(email: string): Promise<boolean> {
    const [result] = await this.db.select({ count: count() }).from(users).where(eq(users.email, email));
    return result?.count > 0;
  }
}
