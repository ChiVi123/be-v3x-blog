import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { CategoryRepository } from '~application/repositories/category.repository';
import type { ImageRepository } from '~application/repositories/image.repository';
import type { PostRepository } from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import { PostStatus } from '~domain/entities/post.entity';
import { Role } from '~domain/entities/user.entity';
import { AppConfigService } from '~infrastructure/config/env';
import {
  CATEGORY_REPOSITORY_TOKEN,
  IMAGE_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/app.setup';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from '../utils/test-database.module';

const AUTHOR_EMAIL = 'privacy_author@example.com';
const PUBLIC_AUTHOR_KEYS = ['avatarId', 'bio', 'createdAt', 'id', 'username'];
const UNKNOWN_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('Public API privacy (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let authorId: string;
  let postSlug: string;

  async function get(path: string) {
    return fetch(`${serverUrl}${path}`);
  }

  function expectPublicAuthor(author: Record<string, unknown>) {
    expect(Object.keys(author).sort()).toEqual(PUBLIC_AUTHOR_KEYS);
    expect(author.username).toBe('privacy_author');
  }

  function expectNoSecrets(text: string) {
    expect(text).not.toContain(AUTHOR_EMAIL);
    expect(text).not.toContain('$2b$'); // tiền tố của bcrypt hash
    expect(text).not.toContain('"password"');
    expect(text).not.toContain('"email"');
    expect(text).not.toContain('"role"');
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
    const postRepository = moduleFixture.get<PostRepository>(POST_REPOSITORY_TOKEN);
    const bcrypt = await import('bcrypt');

    const author = await userRepository.create({
      username: 'privacy_author',
      email: AUTHOR_EMAIL,
      password: await bcrypt.hash('password123', 10),
      role: Role.USER,
      avatarId: null,
      bio: 'A short bio',
    });
    authorId = author.id;

    const category = await categoryRepository.create({ name: 'Privacy Tests', slug: 'privacy-tests' });
    const image = await imageRepository.create({
      remoteKey: 'tap-blog/privacy-test',
      url: 'https://res.cloudinary.com/demo/image/upload/privacy-test.png',
      alt: 'Privacy test',
      metadata: { width: 800, height: 600, format: 'png', size: 1000 },
    });

    const post = await postRepository.create({
      title: 'Privacy test post',
      slug: 'privacy-test-post',
      content: 'This content is definitely longer than twenty characters.',
      authorId: author.id,
      categoryId: category.id,
      thumbnailId: image.id,
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
    });
    postSlug = post.slug;
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('GET /users/:id', () => {
    it('returns only the public author fields', async () => {
      const response = await get(`/users/${authorId}`);

      expect(response.status).toBe(200);
      const text = await response.text();
      expectNoSecrets(text);
      expectPublicAuthor(JSON.parse(text));
    });

    it('returns 404 for an unknown user', async () => {
      const response = await get(`/users/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const response = await get('/users/not-a-uuid');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /users/search', () => {
    it('returns only the public author fields for every user', async () => {
      const response = await get('/users/search?page=1&limit=10');

      expect(response.status).toBe(200);
      const text = await response.text();
      expectNoSecrets(text);
      const body = JSON.parse(text);
      expect(body.data.length).toBeGreaterThan(0);
      for (const author of body.data) {
        expect(Object.keys(author).sort()).toEqual(PUBLIC_AUTHOR_KEYS);
      }
    });
  });

  describe('posts', () => {
    it('GET /posts/detail/:slug embeds only the public author fields', async () => {
      const response = await get(`/posts/detail/${postSlug}`);

      expect(response.status).toBe(200);
      const text = await response.text();
      expectNoSecrets(text);
      expectPublicAuthor(JSON.parse(text).author);
    });

    it('GET /posts/all embeds only the public author fields', async () => {
      const response = await get('/posts/all?page=1&limit=10');

      expect(response.status).toBe(200);
      const text = await response.text();
      expectNoSecrets(text);
      const body = JSON.parse(text);
      expect(body.data.length).toBeGreaterThan(0);
      expectPublicAuthor(body.data[0].author);
    });

    it('GET /posts embeds only the public author fields', async () => {
      const response = await get('/posts?page=1&limit=10');

      expect(response.status).toBe(200);
      const text = await response.text();
      expectNoSecrets(text);
      expectPublicAuthor(JSON.parse(text).data[0].author);
    });
  });
});
