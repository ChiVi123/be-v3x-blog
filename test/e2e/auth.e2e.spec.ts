import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import { AppConfigService } from '~infrastructure/config/env';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/app.setup';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from '../utils/test-database.module';

const CORS_ORIGIN = 'http://frontend.example.test';

function getRefreshCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Expected the response to set a refresh-token cookie');
  }
  return setCookie.split(';')[0];
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let userRepository: UserRepository;

  async function login() {
    return fetch(`${serverUrl}/auth/login`, {
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
  }

  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-jwt-secret';
    process.env.DB_URL ||= 'postgresql://user:password@localhost:5432/blog';
    process.env.CORS_ORIGINS = CORS_ORIGIN;

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, moduleFixture.get(AppConfigService));
    await app.init();
    await app.listen(0);

    serverUrl = await app.getUrl();
    userRepository = moduleFixture.get<UserRepository>(USER_REPOSITORY_TOKEN);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    await userRepository.create({
      username: 'auth_test_user',
      email: 'auth_test@example.com',
      password: hashedPassword,
      role: Role.USER,
      avatarId: null,
    });
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('CORS', () => {
    it('allows the configured browser origin to send credentialed requests', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: CORS_ORIGIN,
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe(CORS_ORIGIN);
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });
  });

  describe('POST /auth/login', () => {
    it('returns an access token and sets an httpOnly refresh-token cookie', async () => {
      const response = await login();

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).not.toHaveProperty('refreshToken');
      expect(typeof body.accessToken).toBe('string');

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('refresh-token=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
      expect(setCookie).toContain('Path=/');
    });

    it('returns 400 when email format is invalid', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email-format', password: 'password123' }),
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'auth_test@example.com', password: '123' }),
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 when body contains non-whitelisted fields', async () => {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'auth_test@example.com',
          password: 'password123',
          extraField: 'should-fail',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('fails with 401 when credentials are invalid', async () => {
      const unknownUserResponse = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not_found@example.com', password: 'password123' }),
      });
      const wrongPasswordResponse = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'auth_test@example.com', password: 'wrong_password_123' }),
      });

      expect(unknownUserResponse.status).toBe(401);
      expect(wrongPasswordResponse.status).toBe(401);
    });
  });

  describe('POST /auth/register', () => {
    it('rejects attempts to set a role and creates only public users', async () => {
      const privilegedResponse = await fetch(`${serverUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'privileged@example.com',
          password: 'password123',
          username: 'privileged_user',
          role: Role.ADMIN,
        }),
      });
      const publicResponse = await fetch(`${serverUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'public@example.com',
          password: 'password123',
          username: 'public_user',
        }),
      });

      expect(privilegedResponse.status).toBe(400);
      expect(publicResponse.status).toBe(201);
    });
  });

  describe('POST /auth/refresh and POST /auth/logout', () => {
    it('rotates the refresh cookie and invalidates it on logout', async () => {
      const loginResponse = await login();
      const initialCookie = getRefreshCookie(loginResponse);

      const refreshResponse = await fetch(`${serverUrl}/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: initialCookie },
      });

      expect(refreshResponse.status).toBe(200);
      const refreshBody = await refreshResponse.json();
      expect(refreshBody).toHaveProperty('accessToken');
      expect(refreshBody).toHaveProperty('refreshTokenExpiryDate');
      expect(refreshBody).not.toHaveProperty('refreshToken');

      const rotatedCookie = getRefreshCookie(refreshResponse);
      expect(rotatedCookie).not.toBe(initialCookie);

      const logoutResponse = await fetch(`${serverUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: rotatedCookie,
          Authorization: `Bearer ${refreshBody.accessToken}`,
        },
      });

      expect(logoutResponse.status).toBe(204);
      expect(logoutResponse.headers.get('set-cookie')).toContain('refresh-token=;');

      const invalidatedRefreshResponse = await fetch(`${serverUrl}/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: rotatedCookie },
      });

      expect(invalidatedRefreshResponse.status).toBe(401);
    });

    it('allows only one concurrent request to rotate the same refresh token', async () => {
      const loginResponse = await login();
      const refreshCookie = getRefreshCookie(loginResponse);

      const responses = await Promise.all([
        fetch(`${serverUrl}/auth/refresh`, {
          method: 'POST',
          headers: { Cookie: refreshCookie },
        }),
        fetch(`${serverUrl}/auth/refresh`, {
          method: 'POST',
          headers: { Cookie: refreshCookie },
        }),
      ]);

      const statuses = responses.map((response) => response.status).sort();
      expect(statuses).toEqual([200, 401]);
    });

    it('returns 401 when the refresh cookie is missing', async () => {
      const response = await fetch(`${serverUrl}/auth/refresh`, { method: 'POST' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated user profile when a valid bearer token is provided', async () => {
      const loginResponse = await login();
      const { accessToken } = await loginResponse.json();

      const response = await fetch(`${serverUrl}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.email).toBe('auth_test@example.com');
      expect(body.username).toBe('auth_test_user');
      expect(body.role).toBe(Role.USER);
      expect(body).not.toHaveProperty('password');
    });

    it('returns 401 when authorization header is missing', async () => {
      const response = await fetch(`${serverUrl}/auth/me`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('rate limit', () => {
    it('returns 429 after the remaining login attempts from the same IP are exhausted', async () => {
      const firstResponse = await login();
      expect(firstResponse.status).toBe(200);

      const remaining = Number(firstResponse.headers.get('x-ratelimit-remaining'));
      expect(remaining).toBeGreaterThanOrEqual(0);

      for (let attempt = 0; attempt < remaining; attempt += 1) {
        const response = await login();
        expect(response.status).toBe(200);
      }

      const blockedResponse = await login();
      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.headers.get('retry-after')).toBeDefined();
    });
  });
});
