import { random, randomDate } from 'seed/utils';
import { Role } from '~domain/entities/user.entity';
import { users } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

export type UserSeedData = {
  username: string;
  email: string;
  password: string; // pre-hashed password
  bio?: string;
  role?: Role;
};

type DbExecutor = DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

export async function batchUserSeeding(db: DbExecutor, dataList: UserSeedData[]) {
  if (dataList.length === 0) return [];
  const now = new Date();

  const values = dataList.map((item) => {
    const createdAt = randomDate(new Date('2025-01-01'), now);
    return {
      username: item.username,
      email: item.email,
      bio: item.bio,
      password: item.password,
      role: item.role ?? (item.username === 'admin' ? Role.ADMIN : Role.USER),
      createdAt,
      updatedAt: random([undefined, randomDate(createdAt, now)]),
    };
  });

  return await db.insert(users).values(values).onConflictDoNothing().returning({ id: users.id, email: users.email });
}
