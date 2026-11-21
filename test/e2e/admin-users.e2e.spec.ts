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

const PASSWORD = 'password123';
const ADMIN_EMAIL = 'adm_one@example.com';
const ADMIN_TWO_EMAIL = 'adm_two@example.com';
const USER_EMAIL = 'adm_regular@example.com';
const TARGET_EMAIL = 'adm_target@example.com';
const UNKNOWN_ID = '123e4567-e89b-42d3-a456-426614174000';
const ADMIN_USER_KEYS = [
  'avatarId',
  'bio',
  'createdAt',
  'email',
  'id',
  'postsCount',
  'role',
  'status',
  'updatedAt',
  'username',
];

function getRefreshCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Expected the response to set a refresh-token cookie');
  }
  return setCookie.split(';')[0];
}

describe('Admin users (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let adminId: string;
  let adminTwoId: string;
  let targetId: string;
  let adminToken: string;
  let adminTwoToken: string;
  let userToken: string;

  async function call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
    return fetch(`${serverUrl}${path}`, {
      method,
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  }

  function login(email: string, password = PASSWORD) {
    return fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Bun-E2E-Agent/1.0' },
      body: JSON.stringify({ email, password }),
    });
  }

  async function tokenOf(email: string): Promise<string> {
    return (await (await login(email)).json()).accessToken;
  }

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
    configureApplication(app, moduleFixture.get(AppConfigService));
    await app.init();
    await app.listen(0);
    serverUrl = await app.getUrl();

    const userRepository = moduleFixture.get<UserRepository>(USER_REPOSITORY_TOKEN);
    const bcrypt = await import('bcrypt');
    const password = await bcrypt.hash(PASSWORD, 10);
    const base = { password, avatarId: null, bio: null };

    adminId = (await userRepository.create({ ...base, username: 'adm_one', email: ADMIN_EMAIL, role: Role.ADMIN })).id;
    adminTwoId = (
      await userRepository.create({ ...base, username: 'adm_two', email: ADMIN_TWO_EMAIL, role: Role.ADMIN })
    ).id;
    await userRepository.create({ ...base, username: 'adm_regular', email: USER_EMAIL, role: Role.USER });
    targetId = (await userRepository.create({ ...base, username: 'adm_target', email: TARGET_EMAIL, role: Role.USER }))
      .id;

    adminToken = await tokenOf(ADMIN_EMAIL);
    adminTwoToken = await tokenOf(ADMIN_TWO_EMAIL);
    userToken = await tokenOf(USER_EMAIL);
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('GET /admin/users', () => {
    it('returns 401 without a token', async () => {
      expect((await call('GET', '/admin/users')).status).toBe(401);
    });

    it('returns 403 for a regular user', async () => {
      expect((await call('GET', '/admin/users', { token: userToken })).status).toBe(403);
    });

    it('lists every user with email, role and status but no password', async () => {
      const response = await call('GET', '/admin/users', { token: adminToken });

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).not.toContain('"password"');
      const body = JSON.parse(text);
      expect(body.total).toBe(4);
      expect(body.data).toHaveLength(4);
      for (const user of body.data) {
        expect(Object.keys(user).sort()).toEqual(ADMIN_USER_KEYS);
      }
    });

    it('filters by role, status and keyword, and keeps total in sync', async () => {
      const admins = await (await call('GET', '/admin/users?role=admin', { token: adminToken })).json();
      const banned = await (await call('GET', '/admin/users?status=banned', { token: adminToken })).json();
      const search = await (await call('GET', '/admin/users?query=target', { token: adminToken })).json();

      expect(admins.total).toBe(2);
      expect(banned.total).toBe(0);
      expect(search.total).toBe(1);
      expect(search.data[0].email).toBe(TARGET_EMAIL);
    });

    it('returns 400 for an invalid filter or an unknown parameter', async () => {
      expect((await call('GET', '/admin/users?role=owner', { token: adminToken })).status).toBe(400);
      expect((await call('GET', '/admin/users?foo=bar', { token: adminToken })).status).toBe(400);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('returns 403 for a regular user', async () => {
      const response = await call('PATCH', `/admin/users/${targetId}/role`, {
        token: userToken,
        body: { role: 'admin' },
      });

      expect(response.status).toBe(403);
    });

    it('returns 400 for an invalid role or a non-UUID id', async () => {
      const badRole = await call('PATCH', `/admin/users/${targetId}/role`, {
        token: adminToken,
        body: { role: 'owner' },
      });
      const badId = await call('PATCH', '/admin/users/not-a-uuid/role', { token: adminToken, body: { role: 'user' } });

      expect(badRole.status).toBe(400);
      expect(badId.status).toBe(400);
    });

    it('returns 404 for an unknown user', async () => {
      const response = await call('PATCH', `/admin/users/${UNKNOWN_ID}/role`, {
        token: adminToken,
        body: { role: 'admin' },
      });

      expect(response.status).toBe(404);
    });

    it('promotes and then demotes a user', async () => {
      const promote = await call('PATCH', `/admin/users/${targetId}/role`, {
        token: adminToken,
        body: { role: 'admin' },
      });
      expect(promote.status).toBe(200);
      const promoted = await promote.json();
      expect(promoted.role).toBe('admin');
      expect(promoted).not.toHaveProperty('password');

      const demote = await call('PATCH', `/admin/users/${targetId}/role`, {
        token: adminToken,
        body: { role: 'user' },
      });
      expect(demote.status).toBe(200);
      expect((await demote.json()).role).toBe('user');
    });

    it('refuses to let an admin change their own role', async () => {
      const response = await call('PATCH', `/admin/users/${adminId}/role`, {
        token: adminToken,
        body: { role: 'user' },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('refuses to let an admin ban themselves', async () => {
      const response = await call('PATCH', `/admin/users/${adminId}/status`, {
        token: adminToken,
        body: { status: 'banned' },
      });

      expect(response.status).toBe(403);
    });

    it('returns 400 for an invalid status', async () => {
      const response = await call('PATCH', `/admin/users/${targetId}/status`, {
        token: adminToken,
        body: { status: 'deleted' },
      });

      expect(response.status).toBe(400);
    });

    it('bans a user: sessions are removed, login is refused, then unban restores access', async () => {
      const cookie = getRefreshCookie(await login(TARGET_EMAIL));

      const ban = await call('PATCH', `/admin/users/${targetId}/status`, {
        token: adminToken,
        body: { status: 'banned' },
      });
      expect(ban.status).toBe(200);
      expect((await ban.json()).status).toBe('banned');

      const refresh = await fetch(`${serverUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
      expect(refresh.status).toBe(401);
      expect((await login(TARGET_EMAIL)).status).toBe(403);

      const unban = await call('PATCH', `/admin/users/${targetId}/status`, {
        token: adminToken,
        body: { status: 'active' },
      });
      expect(unban.status).toBe(200);
      expect((await login(TARGET_EMAIL)).status).toBe(200);
    });

    it('blocks a banned admin at once even though their access token is still valid', async () => {
      expect((await call('GET', '/admin/users', { token: adminTwoToken })).status).toBe(200);

      const ban = await call('PATCH', `/admin/users/${adminTwoId}/status`, {
        token: adminToken,
        body: { status: 'banned' },
      });
      expect(ban.status).toBe(200);

      expect((await call('GET', '/admin/users', { token: adminTwoToken })).status).toBe(403);
    });
  });
});
