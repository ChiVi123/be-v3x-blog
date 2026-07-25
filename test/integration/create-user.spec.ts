import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { PGlite } from '@electric-sql/pglite';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import { PG_CLIENT_TOKEN, USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';

describe('create user integration test', () => {
  let module: TestingModule;
  let userRepository: UserRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, RepositoriesModule],
    }).compile();

    userRepository = module.get<UserRepository>(USER_REPOSITORY_TOKEN);
  });

  afterAll(async () => {
    const pgClient = module.get<PGlite>(PG_CLIENT_TOKEN);
    await pgClient.close().catch((error) => {
      console.error('Failed to close database', error);
    });
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
