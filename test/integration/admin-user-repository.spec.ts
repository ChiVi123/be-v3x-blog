import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from 'test/utils/test-database.module';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role, UserStatus } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';

describe('UserRepository admin queries (integration)', () => {
  let moduleRef: TestingModule;
  let userRepository: UserRepository;
  let aliceId: UserId;
  let bobId: UserId;

  const usernamesOf = (rows: { username: string }[]) => rows.map((row) => row.username).sort();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, RepositoriesModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    userRepository = moduleRef.get<UserRepository>(USER_REPOSITORY_TOKEN);

    const base = { password: 'hashed', avatarId: null, bio: null };
    aliceId = (
      await userRepository.create({ ...base, username: 'alice', email: 'alice@example.com', role: Role.ADMIN })
    ).id;
    bobId = (await userRepository.create({ ...base, username: 'bob', email: 'bob@example.com', role: Role.USER })).id;
    await userRepository.create({
      ...base,
      username: 'carol_100%',
      email: 'carol@example.com',
      role: Role.USER,
      status: UserStatus.BANNED,
    });
  });

  afterAll(async () => {
    const cleanup = moduleRef.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup.close();
    await moduleRef.close();
  });

  it('lists every user including admins, with email, role and status but no password', async () => {
    const rows = await userRepository.searchAdmin({ page: 1, limit: 10 });

    expect(usernamesOf(rows)).toEqual(['alice', 'bob', 'carol_100%']);
    const alice = rows.find((row) => row.username === 'alice');
    expect(alice?.email).toBe('alice@example.com');
    expect(alice?.role).toBe(Role.ADMIN);
    expect(alice?.status).toBe(UserStatus.ACTIVE);
    expect((alice as Record<string, unknown>).password).toBeUndefined();
  });

  it('filters by role and by status', async () => {
    const admins = await userRepository.searchAdmin({ page: 1, limit: 10, role: Role.ADMIN });
    const banned = await userRepository.searchAdmin({ page: 1, limit: 10, status: UserStatus.BANNED });

    expect(usernamesOf(admins)).toEqual(['alice']);
    expect(usernamesOf(banned)).toEqual(['carol_100%']);
  });

  it('searches username and email without caring about case', async () => {
    const rows = await userRepository.searchAdmin({ page: 1, limit: 10, query: 'BOB@' });

    expect(usernamesOf(rows)).toEqual(['bob']);
  });

  it('treats % in the keyword literally instead of as a wildcard', async () => {
    const rows = await userRepository.searchAdmin({ page: 1, limit: 10, query: '%' });

    expect(usernamesOf(rows)).toEqual(['carol_100%']);
  });

  it('counts with the same filters and ignores pagination', async () => {
    expect(await userRepository.countAdmin({ page: 1, limit: 1 })).toBe(3);
    expect(await userRepository.countAdmin({ page: 1, limit: 10, status: UserStatus.BANNED })).toBe(1);
    expect(await userRepository.countAdmin({ page: 1, limit: 10, query: 'bob' })).toBe(1);
  });

  it('paginates without repeating rows', async () => {
    const page1 = await userRepository.searchAdmin({ page: 1, limit: 2, sortBy: 'username', sortOrder: 'asc' });
    const page2 = await userRepository.searchAdmin({ page: 2, limit: 2, sortBy: 'username', sortOrder: 'asc' });

    expect(page1.map((row) => row.username)).toEqual(['alice', 'bob']);
    expect(page2.map((row) => row.username)).toEqual(['carol_100%']);
  });

  it('counts only active admins', async () => {
    expect(await userRepository.countActiveAdmins()).toBe(1);

    await userRepository.update(bobId, { role: Role.ADMIN });
    expect(await userRepository.countActiveAdmins()).toBe(2);

    await userRepository.update(aliceId, { status: UserStatus.BANNED });
    expect(await userRepository.countActiveAdmins()).toBe(1);
  });
});
