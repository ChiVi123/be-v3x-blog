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
const ADMIN_EMAIL = 'category_admin@example.com';
const USER_EMAIL = 'category_user@example.com';
const UNKNOWN_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('CategoryController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let adminToken: string;
  let userToken: string;
  let categoryId: string;
  let postId: string;

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

  async function login(email: string): Promise<string> {
    const response = await fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Bun-E2E-Agent/1.0' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    const body = await response.json();
    return body.accessToken;
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
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    await userRepository.create({
      username: 'category_admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: Role.ADMIN,
      avatarId: null,
      bio: null,
    });
    await userRepository.create({
      username: 'category_user',
      email: USER_EMAIL,
      password: hashedPassword,
      role: Role.USER,
      avatarId: null,
      bio: null,
    });

    adminToken = await login(ADMIN_EMAIL);
    userToken = await login(USER_EMAIL);
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('GET /categories', () => {
    it('is public and returns a list wrapped in data', async () => {
      const response = await call('GET', '/categories');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('POST /categories', () => {
    it('returns 401 without an access token', async () => {
      const response = await call('POST', '/categories', { body: { name: 'Technology' } });

      expect(response.status).toBe(401);
    });

    it('returns 403 for a regular user', async () => {
      const response = await call('POST', '/categories', { token: userToken, body: { name: 'Technology' } });

      expect(response.status).toBe(403);
    });

    it('returns 400 when the name is empty', async () => {
      const response = await call('POST', '/categories', { token: adminToken, body: { name: '   ' } });

      expect(response.status).toBe(400);
    });

    it('returns 400 when the body contains non-whitelisted fields', async () => {
      const response = await call('POST', '/categories', {
        token: adminToken,
        body: { name: 'Technology', slug: 'hacked' },
      });

      expect(response.status).toBe(400);
    });

    it('creates a category for an admin and generates the slug', async () => {
      const response = await call('POST', '/categories', { token: adminToken, body: { name: 'Life Style' } });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.name).toBe('Life Style');
      expect(body.slug).toBe('life-style');
      categoryId = body.id;
    });

    it('returns 409 when the category already exists', async () => {
      const response = await call('POST', '/categories', { token: adminToken, body: { name: 'life style' } });

      expect(response.status).toBe(409);
    });
  });

  describe('PATCH /categories/:id', () => {
    it('returns 403 for a regular user', async () => {
      const response = await call('PATCH', `/categories/${categoryId}`, {
        token: userToken,
        body: { name: 'Lifestyle' },
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when the category does not exist', async () => {
      const response = await call('PATCH', `/categories/${UNKNOWN_ID}`, {
        token: adminToken,
        body: { name: 'Lifestyle' },
      });

      expect(response.status).toBe(404);
    });

    it('renames the category and regenerates the slug for an admin', async () => {
      const response = await call('PATCH', `/categories/${categoryId}`, {
        token: adminToken,
        body: { name: 'Lifestyle' },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe('Lifestyle');
      expect(body.slug).toBe('lifestyle');
    });
  });

  describe('DELETE /categories/:id', () => {
    it('returns 403 for a regular user', async () => {
      const response = await call('DELETE', `/categories/${categoryId}`, { token: userToken });

      expect(response.status).toBe(403);
    });

    it('returns 409 when the category still has posts', async () => {
      const createPostResponse = await call('POST', '/posts', {
        token: userToken,
        body: {
          title: 'A post that blocks deletion',
          content: 'This content is definitely longer than twenty characters.',
          categoryId,
        },
      });
      expect(createPostResponse.status).toBe(201);
      postId = (await createPostResponse.json()).id;

      const response = await call('DELETE', `/categories/${categoryId}`, { token: adminToken });

      expect(response.status).toBe(409);
    });

    it('lets an admin delete the post of another user, then delete the empty category', async () => {
      const deletePostResponse = await call('DELETE', `/posts/${postId}`, { token: adminToken });
      expect(deletePostResponse.status).toBe(204);

      const response = await call('DELETE', `/categories/${categoryId}`, { token: adminToken });
      expect(response.status).toBe(204);

      const listResponse = await call('GET', '/categories');
      const list = await listResponse.json();
      expect(list.data.some((item: { id: string }) => item.id === categoryId)).toBe(false);
    });

    it('returns 404 when the category does not exist', async () => {
      const response = await call('DELETE', `/categories/${UNKNOWN_ID}`, { token: adminToken });

      expect(response.status).toBe(404);
    });
  });
});
