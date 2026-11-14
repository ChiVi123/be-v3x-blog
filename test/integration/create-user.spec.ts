import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from 'test/utils/test-database.module';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';

describe('UserRepository Integration Tests', () => {
  let moduleRef: TestingModule;
  let userRepository: UserRepository;
  let createdUserId: UserId;

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

  describe('create', () => {
    it('should create a user successfully and return UserOutput without password', async () => {
      const result = await userRepository.create({
        username: 'test-1',
        email: 'test-1@gmail.com',
        password: 'hashed-password-1',
        role: Role.USER,
        avatarId: null,
        bio: '',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.username).toBe('test-1');
      expect(result.email).toBe('test-1@gmail.com');
      expect(result.role).toBe(Role.USER);
      expect(result.avatarId).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect((result as Record<string, unknown>).password).toBeUndefined();

      createdUserId = result.id;
    });

    it('should fail when creating a user with duplicate email', async () => {
      expect(
        userRepository.create({
          username: 'test-unique-username',
          email: 'test-1@gmail.com',
          password: 'password',
          role: Role.USER,
          avatarId: null,
          bio: '',
        }),
      ).rejects.toThrow();
    });

    it('should fail when creating a user with duplicate username', async () => {
      expect(
        userRepository.create({
          username: 'test-1',
          email: 'another-email@gmail.com',
          password: 'password',
          role: Role.USER,
          avatarId: null,
          bio: '',
        }),
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should get user by email with full UserEntity including password', async () => {
      const result = await userRepository.findByEmail('test-1@gmail.com', true);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdUserId);
      expect(result?.username).toBe('test-1');
      expect(result?.email).toBe('test-1@gmail.com');
      expect(result?.password).toBe('hashed-password-1');
      expect(result?.role).toBe(Role.USER);
      expect(result?.avatarId).toBeNull();
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when email does not exist', async () => {
      const result = await userRepository.findByEmail('nonexistent@gmail.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should get user by id', async () => {
      const result = await userRepository.findById(createdUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdUserId);
      expect(result?.username).toBe('test-1');
      expect(result?.email).toBe('test-1@gmail.com');
      expect(result?.role).toBe(Role.USER);
    });

    it('should return null when id does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as UserId;
      const result = await userRepository.findById(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('isExistByEmail', () => {
    it('should return true if email exists', async () => {
      const exists = await userRepository.isExistByEmail('test-1@gmail.com');
      expect(exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      const exists = await userRepository.isExistByEmail('notfound@gmail.com');
      expect(exists).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user fields successfully', async () => {
      await userRepository.update(createdUserId, {
        username: 'test-1-updated',
        role: Role.ADMIN,
      });

      const updatedUser = await userRepository.findById(createdUserId);
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.username).toBe('test-1-updated');
      expect(updatedUser?.role).toBe(Role.ADMIN);
      expect(updatedUser?.email).toBe('test-1@gmail.com');
    });
  });

  describe('delete', () => {
    it('should delete user by id', async () => {
      const tempUser = await userRepository.create({
        username: 'temp-user',
        email: 'temp@gmail.com',
        password: 'password',
        role: Role.USER,
        avatarId: null,
        bio: '',
      });

      await userRepository.delete(tempUser.id);

      const foundById = await userRepository.findById(tempUser.id);
      expect(foundById).toBeNull();

      const foundByEmail = await userRepository.findByEmail('temp@gmail.com');
      expect(foundByEmail).toBeNull();

      const exists = await userRepository.isExistByEmail('temp@gmail.com');
      expect(exists).toBe(false);
    });
  });
});
