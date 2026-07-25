import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from 'test/utils/test-database.module';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';

describe('create user integration test', () => {
  let moduleRef: TestingModule;
  let userRepository: UserRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, RepositoriesModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    userRepository = moduleRef.get<UserRepository>(USER_REPOSITORY_TOKEN);
  });

  afterAll(async () => {
    const cleanup = moduleRef.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup.close();
    await moduleRef.close();
  });

  it('should create a user', async () => {
    const result = await userRepository.create({
      username: 'test-1',
      email: 'test-1@gmail.com',
      password: 'test',
      role: Role.USER,
      avatarId: null,
    });

    expect(result).toBeDefined();
    expect(result.username).toBe('test-1');
    expect(result.email).toBe('test-1@gmail.com');
    expect(result.role).toBe(Role.USER);
    expect(result.avatarId).toBeNull();
  });

  it('should get user by test email', async () => {
    const result = await userRepository.findByEmail('test-1@gmail.com');

    expect(result).toBeDefined();
    expect(result?.username).toBe('test-1');
    expect(result?.email).toBe('test-1@gmail.com');
    expect(result?.role).toBe(Role.USER);
    expect(result?.avatarId).toBeNull();
  });
});
