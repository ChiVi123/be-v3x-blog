import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from 'test/utils/test-database.module';
import type { CategoryRepository } from '~application/repositories/category.repository';
import type { PostRepository } from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import { PostStatus } from '~domain/entities/post.entity';
import { Role } from '~domain/entities/user.entity';
import { ConflictException } from '~domain/exceptions';
import type { CategoryId, UserId } from '~domain/types/branded';
import {
  CATEGORY_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';

const wordsOf = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('PostRepository Integration Tests', () => {
  let moduleRef: TestingModule;
  let postRepository: PostRepository;
  let categoryRepository: CategoryRepository;
  let userRepository: UserRepository;

  let authorA: UserId;
  let authorB: UserId;
  let categoryX: CategoryId;
  let categoryY: CategoryId;

  async function createPost(
    title: string,
    authorId: UserId,
    categoryId: CategoryId,
    content = wordsOf(30),
    status: PostStatus = PostStatus.PUBLISHED,
  ) {
    return postRepository.create({
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      content,
      authorId,
      categoryId,
      thumbnailId: null,
      status,
      publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
    });
  }

  const titlesOf = (rows: { title: string }[]) => rows.map((row) => row.title).sort();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, RepositoriesModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    postRepository = moduleRef.get<PostRepository>(POST_REPOSITORY_TOKEN);
    categoryRepository = moduleRef.get<CategoryRepository>(CATEGORY_REPOSITORY_TOKEN);
    userRepository = moduleRef.get<UserRepository>(USER_REPOSITORY_TOKEN);

    const userA = await userRepository.create({
      username: 'author-a',
      email: 'author-a@example.com',
      password: 'hashed',
      role: Role.USER,
      avatarId: null,
      bio: null,
    });
    const userB = await userRepository.create({
      username: 'author-b',
      email: 'author-b@example.com',
      password: 'hashed',
      role: Role.USER,
      avatarId: null,
      bio: null,
    });
    authorA = userA.id;
    authorB = userB.id;

    const catX = await categoryRepository.create({ name: 'Category X', slug: 'category-x' });
    const catY = await categoryRepository.create({ name: 'Category Y', slug: 'category-y' });
    categoryX = catX.id;
    categoryY = catY.id;

    // Ma trận 2 tác giả x 2 chuyên mục
    await createPost('Post A X', authorA, categoryX);
    await createPost('Post A Y', authorA, categoryY);
    await createPost('Post B X', authorB, categoryX);
    await createPost('Post B Y', authorB, categoryY);
  });

  afterAll(async () => {
    const cleanup = moduleRef.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup.close();
    await moduleRef.close();
  });

  describe('findAll', () => {
    it('returns all posts when no filter is provided', async () => {
      const result = await postRepository.findAll({ page: 1, limit: 10 });

      expect(titlesOf(result)).toEqual(['Post A X', 'Post A Y', 'Post B X', 'Post B Y']);
    });

    it('filters by author only', async () => {
      const result = await postRepository.findAll({ page: 1, limit: 10, author: authorA });

      expect(titlesOf(result)).toEqual(['Post A X', 'Post A Y']);
    });

    it('filters by category only', async () => {
      const result = await postRepository.findAll({ page: 1, limit: 10, category: categoryX });

      expect(titlesOf(result)).toEqual(['Post A X', 'Post B X']);
    });

    it('combines author and category with AND, not OR', async () => {
      const result = await postRepository.findAll({ page: 1, limit: 10, author: authorA, category: categoryX });

      expect(titlesOf(result)).toEqual(['Post A X']);
    });

    it('applies pagination on top of filters', async () => {
      const page1 = await postRepository.findAll({ page: 1, limit: 1, author: authorB });
      const page2 = await postRepository.findAll({ page: 2, limit: 1, author: authorB });

      expect(page1).toHaveLength(1);
      expect(page2).toHaveLength(1);
      expect(page1[0].title).not.toBe(page2[0].title);
    });
  });

  describe('count', () => {
    it('counts all posts when no filter is provided', async () => {
      expect(await postRepository.count({ page: 1, limit: 10 })).toBe(4);
    });

    it('counts by author', async () => {
      expect(await postRepository.count({ page: 1, limit: 10, author: authorA })).toBe(2);
    });

    it('counts by category', async () => {
      expect(await postRepository.count({ page: 1, limit: 10, category: categoryY })).toBe(2);
    });

    it('counts with author AND category', async () => {
      expect(await postRepository.count({ page: 1, limit: 10, author: authorB, category: categoryY })).toBe(1);
    });

    it('matches the number of rows returned by findAll for the same filter', async () => {
      const query = { page: 1, limit: 10, author: authorA, category: categoryY };

      const rows = await postRepository.findAll(query);
      const total = await postRepository.count(query);

      expect(total).toBe(rows.length);
    });
  });

  describe('readingTime', () => {
    it('rounds up to a whole number of minutes (450 words at 200 wpm = 3)', async () => {
      const post = await createPost('Long Post', authorA, categoryX, wordsOf(450));

      expect(post.readingTime).toBe(3);
      expect(Number.isInteger(post.readingTime)).toBe(true);
    });

    it('is at least 1 minute for short content', async () => {
      const post = await createPost('Short Post', authorA, categoryX, wordsOf(5));

      expect(post.readingTime).toBe(1);
    });

    it('is recalculated when content is updated', async () => {
      const post = await createPost('Update Post', authorA, categoryX, wordsOf(5));
      expect(post.readingTime).toBe(1);

      const updated = await postRepository.update(post.id, { content: wordsOf(650) });

      expect(updated.readingTime).toBe(4);
    });

    it('is unchanged when only the title is updated', async () => {
      const post = await createPost('Keep Time Post', authorA, categoryX, wordsOf(450));

      const updated = await postRepository.update(post.id, { title: 'Keep Time Post Renamed' });

      expect(updated.readingTime).toBe(3);
    });
  });

  describe('status', () => {
    let authorC: UserId;
    let categoryZ: CategoryId;

    beforeAll(async () => {
      const userC = await userRepository.create({
        username: 'author-c',
        email: 'author-c@example.com',
        password: 'hashed',
        role: Role.USER,
        avatarId: null,
        bio: null,
      });
      authorC = userC.id;
      categoryZ = (await categoryRepository.create({ name: 'Category Z', slug: 'category-z' })).id;

      await createPost('Draft C One', authorC, categoryZ, wordsOf(30), PostStatus.DRAFT);
      await createPost('Draft C Two', authorC, categoryZ, wordsOf(30), PostStatus.DRAFT);
      await createPost('Published C One', authorC, categoryZ, wordsOf(30), PostStatus.PUBLISHED);
    });

    it('stores the status and publishedAt passed to create', async () => {
      const draft = await createPost('Stored Draft', authorC, categoryZ, wordsOf(30), PostStatus.DRAFT);
      const published = await createPost('Stored Published', authorC, categoryZ, wordsOf(30), PostStatus.PUBLISHED);

      expect(draft.status).toBe(PostStatus.DRAFT);
      expect(draft.publishedAt).toBeNull();
      expect(published.status).toBe(PostStatus.PUBLISHED);
      expect(published.publishedAt).toBeInstanceOf(Date);
    });

    it('returns posts of every status when no status filter is given', async () => {
      const result = await postRepository.findAll({ page: 1, limit: 50, author: authorC, category: categoryZ });

      expect(result.some((post) => post.status === PostStatus.DRAFT)).toBe(true);
      expect(result.some((post) => post.status === PostStatus.PUBLISHED)).toBe(true);
    });

    it('filters findAll by status', async () => {
      const drafts = await postRepository.findAll({ page: 1, limit: 50, author: authorC, status: PostStatus.DRAFT });
      const published = await postRepository.findAll({
        page: 1,
        limit: 50,
        author: authorC,
        status: PostStatus.PUBLISHED,
      });

      expect(drafts.every((post) => post.status === PostStatus.DRAFT)).toBe(true);
      expect(titlesOf(drafts)).toContain('Draft C One');
      expect(titlesOf(drafts)).not.toContain('Published C One');
      expect(titlesOf(published)).toContain('Published C One');
      expect(titlesOf(published)).not.toContain('Draft C One');
    });

    it('filters count by status and keeps it consistent with findAll', async () => {
      const query = { page: 1, limit: 50, author: authorC, status: PostStatus.DRAFT };

      const rows = await postRepository.findAll(query);
      const total = await postRepository.count(query);

      expect(total).toBe(rows.length);
      expect(total).toBeGreaterThanOrEqual(2);
    });

    it('updateStatus changes status and publishedAt without touching other fields', async () => {
      const draft = await createPost('Status Switch', authorC, categoryZ, wordsOf(30), PostStatus.DRAFT);
      const when = new Date('2026-03-01T00:00:00Z');

      const published = await postRepository.updateStatus(draft.id, {
        status: PostStatus.PUBLISHED,
        publishedAt: when,
      });

      expect(published.status).toBe(PostStatus.PUBLISHED);
      expect(published.publishedAt?.toISOString()).toBe(when.toISOString());
      expect(published.title).toBe('Status Switch');
      expect(published.readingTime).toBe(draft.readingTime);

      const unpublished = await postRepository.updateStatus(draft.id, { status: PostStatus.DRAFT, publishedAt: when });

      expect(unpublished.status).toBe(PostStatus.DRAFT);
      expect(unpublished.publishedAt?.toISOString()).toBe(when.toISOString());
    });
  });

  describe('slug uniqueness', () => {
    it('throws ConflictException when creating a post whose slug is already used', async () => {
      await createPost('Duplicate Slug Post', authorA, categoryX);

      await expect(createPost('Duplicate Slug Post', authorA, categoryX)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when updating a post to a slug already used', async () => {
      await createPost('Taken Slug Post', authorA, categoryX);
      const other = await createPost('Other Slug Post', authorA, categoryX);

      await expect(postRepository.update(other.id, { slug: 'taken-slug-post' })).rejects.toThrow(ConflictException);
    });
  });
});
