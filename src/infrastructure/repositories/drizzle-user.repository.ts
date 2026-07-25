import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { UserRepository } from '~application/repositories/user.repository';
import type { UserEntity } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { users } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';
import { userMapper } from '~infrastructure/mappers/drizzle-user.mapper';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(user: UserEntity): Promise<UserEntity> {
    const values = userMapper.toPersist(user);
    await this.db.insert(users).values(values);
    return user;
  }

  async update(id: UserId, user: UserEntity): Promise<void> {
    const values = userMapper.toPersist(user);
    await this.db.update(users).set(values).where(eq(users.id, id));
  }

  async delete(id: UserId): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async findById(id: UserId): Promise<UserEntity | null> {
    const user = await this.db.query.users.findFirst({ where: { id: { eq: id } } });
    return user ? userMapper.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.db.query.users.findFirst({ where: { email: { eq: email } } });
    return user ? userMapper.toEntity(user) : null;
  }
}
