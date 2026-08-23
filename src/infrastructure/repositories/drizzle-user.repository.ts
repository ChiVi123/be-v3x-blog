import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type {
  UserCreateInput,
  UserOutput,
  UserRepository,
  UserUpdateInput,
} from '~application/repositories/user.repository';
import type { UserEntity } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { users } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const RETURNING = {
  id: users.id,
  username: users.username,
  email: users.email,
  role: users.role,
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

  async findById(id: UserId): Promise<UserEntity | null> {
    const user = await this.db.query.users.findFirst({ where: { id: { eq: id } } });
    return user ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.db.query.users.findFirst({ where: { email: { eq: email } } });
    return user ?? null;
  }
}
