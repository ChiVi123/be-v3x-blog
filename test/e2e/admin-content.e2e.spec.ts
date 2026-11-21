import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { CategoryRepository } from '~application/repositories/category.repository';
import type { PostRepository } from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import { PostStatus } from '~domain/entities/post.entity';
import { Role } from '~domain/entities/user.entity';
import { AppConfigService } from '~infrastructure/config/env';
import {
  CATEGORY_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/app.setup';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from '../utils/test-database.module';

const PASSWORD = 'password123';
const ADMIN_EMAIL = 'cnt_admin@example.com';
const ADMIN_TWO_EMAIL = 'cnt_admin_two@example.com';
const WRITER_EMAIL = 'cnt_writer@example.com';

describe('Admin content (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let adminId: string;
  let adminTwoId: string;
  let writerId: string;
  let categoryId: string;
  let adminToken: string;
  let adminTwoToken: string;
  let writerToken: string;

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

  async function tokenOf(email: string): Promise<string> {
    const response = await fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Bun-E2E-Agent/1.0' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    return (await response.json()).accessToken;
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
    const categoryRepository = moduleFixture.get<CategoryRepository>(CATEGORY_REPOSITORY_TOKEN);
    const postRepository = moduleFixture.get<PostRepository>(POST_REPOSITORY_TOKEN);
    const bcrypt = await import('bcrypt');
    const password = await bcrypt.hash(PASSWORD, 10);
    const base = { password, avatarId: null, bio: null };

    adminId = (await userRepository.create({ ...base, username: 'cnt_admin', email: ADMIN_EMAIL, role: Role.ADMIN }))
      .id;
    adminTwoId = (
      await userRepository.create({ ...base, username: 'cnt_admin_two', email: ADMIN_TWO_EMAIL, role: Role.ADMIN })
    ).id;
    writerId = (await userRepository.create({ ...base, username: 'cnt_writer', email: WRITER_EMAIL, role: Role.USER }))
      .id;
    categoryId = (await categoryRepository.create({ name: 'Content Tests', slug: 'content-tests' })).id;

    const content = 'This content is definitely longer than twenty characters.';
    await postRepository.create({
      title: 'Admin view draft',
      slug: 'admin-view-draft',
      content,
      authorId: writerId as never,
      categoryId: categoryId as never,
      thumbnailId: null,
      status: PostStatus.DRAFT,
      publishedAt: null,
    });
    await postRepository.create({
      title: 'Admin view published',
      slug: 'admin-view-published',
      content,
      authorId: writerId as never,
      categoryId: categoryId as never,
      thumbnailId: null,
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
    });

    adminToken = await tokenOf(ADMIN_EMAIL);
    adminTwoToken = await tokenOf(ADMIN_TWO_EMAIL);
    writerToken = await tokenOf(WRITER_EMAIL);
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('GET /admin/posts', () => {
    it('returns 401 without a token and 403 for a regular user', async () => {
      expect((await call('GET', '/admin/posts')).status).toBe(401);
      expect((await call('GET', '/admin/posts', { token: writerToken })).status).toBe(403);
    });

    it('lists drafts and published posts without their content', async () => {
      const response = await call('GET', '/admin/posts', { token: adminToken });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.total).toBe(2);
      expect(body.data.map((post: { status: string }) => post.status).sort()).toEqual(['draft', 'published']);
      for (const post of body.data) {
        expect(post).not.toHaveProperty('content');
      }
    });

    it('filters by status, author and category, and keeps total in sync', async () => {
      const drafts = await (await call('GET', '/admin/posts?status=draft', { token: adminToken })).json();
      const byWriter = await (await call('GET', `/admin/posts?author=${writerId}`, { token: adminToken })).json();
      const byAdmin = await (await call('GET', `/admin/posts?author=${adminId}`, { token: adminToken })).json();
      const byCategory = await (await call('GET', `/admin/posts?category=${categoryId}`, { token: adminToken })).json();

      expect(drafts.total).toBe(1);
      expect(drafts.data[0].title).toBe('Admin view draft');
      expect(byWriter.total).toBe(2);
      expect(byAdmin.total).toBe(0);
      expect(byCategory.total).toBe(2);
    });

    it('returns 400 for an invalid status or an unknown parameter', async () => {
      expect((await call('GET', '/admin/posts?status=archived', { token: adminToken })).status).toBe(400);
      expect((await call('GET', '/admin/posts?foo=bar', { token: adminToken })).status).toBe(400);
    });

    it('still hides the draft from the public list', async () => {
      const body = await (await call('GET', '/posts/all?page=1&limit=100')).json();

      expect(body.total).toBe(1);
    });
  });

  describe('GET /admin/stats', () => {
    it('returns 401 without a token and 403 for a regular user', async () => {
      expect((await call('GET', '/admin/stats')).status).toBe(401);
      expect((await call('GET', '/admin/stats', { token: writerToken })).status).toBe(403);
    });

    it('returns post, user and category counts', async () => {
      const response = await call('GET', '/admin/stats', { token: adminToken });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        posts: { total: 2, published: 1, draft: 1 },
        users: { total: 3, admins: 2, banned: 0 },
        categories: { total: 1 },
      });
    });
  });

  describe('GET /admin/users postsCount', () => {
    it('shows how many posts each user wrote, drafts included', async () => {
      const body = await (await call('GET', '/admin/users', { token: adminToken })).json();
      const countOf = (username: string) =>
        body.data.find((user: { username: string }) => user.username === username).postsCount;

      expect(body.total).toBe(3);
      expect(countOf('cnt_writer')).toBe(2);
      expect(countOf('cnt_admin')).toBe(0);
    });
  });

  describe('category routes check the database', () => {
    it('lets an active admin create a category', async () => {
      const response = await call('POST', '/categories', { token: adminTwoToken, body: { name: 'Allowed' } });

      expect(response.status).toBe(201);
    });

    it('blocks an admin right after they are banned, even with a still-valid token', async () => {
      const ban = await call('PATCH', `/admin/users/${adminTwoId}/status`, {
        token: adminToken,
        body: { status: 'banned' },
      });
      expect(ban.status).toBe(200);

      const response = await call('POST', '/categories', { token: adminTwoToken, body: { name: 'Blocked' } });

      expect(response.status).toBe(403);
    });
  });
});
