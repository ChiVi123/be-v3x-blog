import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import type {
  AdminUserQuery,
  AdminUserRow,
  Author,
  UserCreateInput,
  UserOutput,
  UserQuery,
  UserRepository,
  UserUpdateInput,
} from '~application/repositories/user.repository';
import { Role, type UserEntity, UserStatus } from '~domain/entities';
import type { UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { posts, users } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const RETURNING = {
  id: users.id,
  username: users.username,
  email: users.email,
  role: users.role,
  status: users.status,
  bio: users.bio,
  avatarId: users.avatarId,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

const LIKE_SPECIAL_CHARS = /[\\%_]/g;

function buildAdminFilter({ query, role, status }: Pick<AdminUserQuery, 'query' | 'role' | 'status'>) {
  const keyword = query?.trim();
  const pattern = keyword ? `%${keyword.replace(LIKE_SPECIAL_CHARS, '\\$&')}%` : undefined;

  return and(
    role ? eq(users.role, role) : undefined,
    status ? eq(users.status, status) : undefined,
    pattern ? or(ilike(users.username, pattern), ilike(users.email, pattern)) : undefined,
  );
}

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
    const user = await this.db.query.users.findFirst({ where: { id: { eq: id } }, columns: { password: false } });
    return user ?? null;
  }

  async findByEmail(email: string): Promise<Author | null>;
  async findByEmail(email: string, includePassword: true): Promise<UserEntity | null>;
  async findByEmail(email: string, includePassword?: boolean): Promise<UserEntity | Author | null> {
    const user = await this.db.query.users.findFirst({
      where: { email: { eq: email } },
      ...(includePassword ? {} : { columns: { password: false } }),
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

  async searchAdmin(query: AdminUserQuery): Promise<AdminUserRow[]> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const offset = Math.max(0, (page - 1) * limit);
    const sortColumn = users[sortBy];

    // postsCount đếm mọi bài của user, kể cả bản nháp.
    return this.db
      .select({ ...RETURNING, postsCount: count(posts.id) })
      .from(users)
      .leftJoin(posts, eq(posts.authorId, users.id))
      .where(buildAdminFilter(query))
      .groupBy(users.id)
      .orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn), asc(users.id))
      .limit(limit)
      .offset(offset);
  }

  async countAdmin(query: AdminUserQuery): Promise<number> {
    const [result] = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .where(buildAdminFilter(query));
    return result.count;
  }

  async countActiveAdmins(): Promise<number> {
    const [result] = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .where(and(eq(users.role, Role.ADMIN), eq(users.status, UserStatus.ACTIVE)));
    return result.count;
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
