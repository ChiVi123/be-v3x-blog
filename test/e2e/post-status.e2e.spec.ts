import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { CategoryRepository } from '~application/repositories/category.repository';
import type { ImageRepository } from '~application/repositories/image.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import { AppConfigService } from '~infrastructure/config/env';
import {
  CATEGORY_REPOSITORY_TOKEN,
  IMAGE_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/app.setup';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from '../utils/test-database.module';

const PASSWORD = 'password123';
const AUTHOR_EMAIL = 'status_author@example.com';
const OTHER_EMAIL = 'status_other@example.com';
const ADMIN_EMAIL = 'status_admin@example.com';

describe('Post status (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let authorToken: string;
  let otherToken: string;
  let adminToken: string;
  let categoryId: string;
  let imageId: string;
  let postId: string;
  let postSlug: string;

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
    return (await response.json()).accessToken;
  }

  async function publicPostIds(): Promise<string[]> {
    const response = await call('GET', '/posts/all?page=1&limit=100');
    const body = await response.json();
    return body.data.map((post: { id: string }) => post.id);
  }

  async function categoryPostsCount(): Promise<number | undefined> {
    const response = await call('GET', '/categories');
    const body = await response.json();
    return body.data.find((item: { id: string }) => item.id === categoryId)?.postsCount;
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
    const imageRepository = moduleFixture.get<ImageRepository>(IMAGE_REPOSITORY_TOKEN);
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const accounts = [
      { username: 'status_author', email: AUTHOR_EMAIL, role: Role.USER },
      { username: 'status_other', email: OTHER_EMAIL, role: Role.USER },
      { username: 'status_admin', email: ADMIN_EMAIL, role: Role.ADMIN },
    ];
    for (const account of accounts) {
      await userRepository.create({ ...account, password: hashedPassword, avatarId: null, bio: null });
    }

    categoryId = (await categoryRepository.create({ name: 'Status Tests', slug: 'status-tests' })).id;
    imageId = (
      await imageRepository.create({
        remoteKey: 'tap-blog/status-test',
        url: 'https://res.cloudinary.com/demo/image/upload/status-test.png',
        alt: 'Status test',
        metadata: { width: 800, height: 600, format: 'png', size: 1000 },
      })
    ).id;

    authorToken = await login(AUTHOR_EMAIL);
    otherToken = await login(OTHER_EMAIL);
    adminToken = await login(ADMIN_EMAIL);
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('creating a post', () => {
    it('creates the post as a draft', async () => {
      const response = await call('POST', '/posts', {
        token: authorToken,
        body: {
          title: 'My first draft post',
          content: 'This content is definitely longer than twenty characters.',
          categoryId,
        },
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.status).toBe('draft');
      expect(body.publishedAt).toBeNull();
      postId = body.id;
      postSlug = body.slug;
    });

    it('rejects a status sent by the client', async () => {
      const response = await call('POST', '/posts', {
        token: authorToken,
        body: {
          title: 'Trying to skip the draft',
          content: 'This content is definitely longer than twenty characters.',
          categoryId,
          status: 'published',
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('draft visibility', () => {
    it('hides the draft from the public detail endpoint', async () => {
      const response = await call('GET', `/posts/detail/${postSlug}`);

      expect(response.status).toBe(404);
    });

    it('hides the draft from the public get-by-id endpoint', async () => {
      const response = await call('GET', `/posts/${postId}`);

      expect(response.status).toBe(404);
    });

    it('hides the draft from public lists and category counts', async () => {
      expect(await publicPostIds()).not.toContain(postId);
      expect(await categoryPostsCount()).toBe(0);
    });

    it('does not let a public query ask for drafts', async () => {
      const response = await call('GET', '/posts/all?page=1&limit=100&status=draft');

      expect(response.status).toBe(400);
    });

    it('requires authentication for /posts/me', async () => {
      const response = await call('GET', '/posts/me');

      expect(response.status).toBe(401);
    });

    it('shows the draft to its author in /posts/me', async () => {
      const response = await call('GET', '/posts/me', { token: authorToken });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.map((post: { id: string }) => post.id)).toContain(postId);
    });

    it('filters /posts/me by status', async () => {
      const response = await call('GET', '/posts/me?status=published', { token: authorToken });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.map((post: { id: string }) => post.id)).not.toContain(postId);
    });

    it('does not show the draft to another user in /posts/me', async () => {
      const response = await call('GET', '/posts/me', { token: otherToken });

      const body = await response.json();
      expect(body.data.map((post: { id: string }) => post.id)).not.toContain(postId);
    });

    it('lets only the author or an admin open the draft by id', async () => {
      const asOther = await call('GET', `/posts/me/${postId}`, { token: otherToken });
      const asAuthor = await call('GET', `/posts/me/${postId}`, { token: authorToken });
      const asAdmin = await call('GET', `/posts/me/${postId}`, { token: adminToken });

      expect(asOther.status).toBe(403);
      expect(asAuthor.status).toBe(200);
      expect(asAdmin.status).toBe(200);
    });
  });

  describe('publishing', () => {
    it('returns 403 when another user tries to change the status', async () => {
      const response = await call('PATCH', `/posts/${postId}/status`, {
        token: otherToken,
        body: { status: 'published' },
      });

      expect(response.status).toBe(403);
    });

    it('returns 400 for an invalid status value', async () => {
      const response = await call('PATCH', `/posts/${postId}/status`, {
        token: authorToken,
        body: { status: 'archived' },
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 when publishing a post that has no thumbnail', async () => {
      const response = await call('PATCH', `/posts/${postId}/status`, {
        token: authorToken,
        body: { status: 'published' },
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('POST_NOT_PUBLISHABLE');
    });

    it('publishes the post once it has a thumbnail', async () => {
      const updateResponse = await call('PATCH', `/posts/${postId}`, {
        token: authorToken,
        body: { thumbnailId: imageId },
      });
      expect(updateResponse.status).toBe(200);

      const response = await call('PATCH', `/posts/${postId}/status`, {
        token: authorToken,
        body: { status: 'published' },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('published');
      expect(body.publishedAt).not.toBeNull();
    });

    it('makes the published post visible to everyone', async () => {
      const detail = await call('GET', `/posts/detail/${postSlug}`);
      const byId = await call('GET', `/posts/${postId}`);

      expect(detail.status).toBe(200);
      expect(byId.status).toBe(200);
      expect(await publicPostIds()).toContain(postId);
      expect(await categoryPostsCount()).toBe(1);
    });
  });

  describe('unpublishing', () => {
    it('lets an admin move the post back to draft and keeps publishedAt', async () => {
      const response = await call('PATCH', `/posts/${postId}/status`, {
        token: adminToken,
        body: { status: 'draft' },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('draft');
      expect(body.publishedAt).not.toBeNull();
    });

    it('hides the post from the public again', async () => {
      const detail = await call('GET', `/posts/detail/${postSlug}`);

      expect(detail.status).toBe(404);
      expect(await publicPostIds()).not.toContain(postId);
      expect(await categoryPostsCount()).toBe(0);
    });
  });
});
