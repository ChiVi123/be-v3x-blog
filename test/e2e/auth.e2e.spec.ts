import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { AppModule } from '../../src/app.module';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from '../utils/test-database.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let userRepository: UserRepository;

  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-jwt-secret';
    process.env.DB_URL ||= 'postgresql://user:password@localhost:5432/blog';

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    await app.listen(0);

    serverUrl = await app.getUrl();
    userRepository = moduleFixture.get<UserRepository>(USER_REPOSITORY_TOKEN);

    // Seed test user
    await userRepository.create({
      username: 'auth_test_user',
      email: 'auth_test@example.com',
      password: 'password123',
      role: Role.USER,
      avatarId: null,
    });
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials and return 200 with tokens', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bun-E2E-Agent/1.0',
        },
        body: JSON.stringify({
          email: 'auth_test@example.com',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      expect(body.refreshToken.length).toBeGreaterThan(0);
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email-format',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.message).toBeDefined();
    });

    it('should return 400 when password is too short (< 6 characters)', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'auth_test@example.com',
          password: '123',
        }),
      });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.message).toBeDefined();
    });

    it('should return 400 when body contains non-whitelisted fields', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'auth_test@example.com',
          password: 'password123',
          extraField: 'should-fail',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should fail with 500 when email is not registered', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'not_found@example.com',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(500);
    });

    it('should fail with 500 when password is incorrect', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'auth_test@example.com',
          password: 'wrong_password_123',
        }),
      });

      expect(response.status).toBe(500);
    });
  });
});
