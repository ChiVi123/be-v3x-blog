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
import {
  CATEGORY_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';

describe('UserRepository.searchAdmin postsCount (integration)', () => {
  let moduleRef: TestingModule;
  let userRepository: UserRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, RepositoriesModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    userRepository = moduleRef.get<UserRepository>(USER_REPOSITORY_TOKEN);
    const postRepository = moduleRef.get<PostRepository>(POST_REPOSITORY_TOKEN);
    const categoryRepository = moduleRef.get<CategoryRepository>(CATEGORY_REPOSITORY_TOKEN);

    const base = { password: 'hashed', avatarId: null, bio: null, role: Role.USER };
    const writer = await userRepository.create({ ...base, username: 'writer', email: 'writer@example.com' });
    await userRepository.create({ ...base, username: 'reader', email: 'reader@example.com' });
    const category = await categoryRepository.create({ name: 'Count Tests', slug: 'count-tests' });

    const post = (title: string, status: PostStatus) =>
      postRepository.create({
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        content: 'This content is definitely longer than twenty characters.',
        authorId: writer.id,
        categoryId: category.id,
        thumbnailId: null,
        status,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
      });
    await post('Count published', PostStatus.PUBLISHED);
    await post('Count draft', PostStatus.DRAFT);
  });

  afterAll(async () => {
    const cleanup = moduleRef.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup.close();
    await moduleRef.close();
  });

  it('counts every post of each user, drafts included, with one row per user', async () => {
    const rows = await userRepository.searchAdmin({ page: 1, limit: 10 });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.username === 'writer')?.postsCount).toBe(2);
    expect(rows.find((row) => row.username === 'reader')?.postsCount).toBe(0);
  });

  it('keeps total and postsCount correct when a keyword filter is used', async () => {
    const rows = await userRepository.searchAdmin({ page: 1, limit: 10, query: 'writer' });

    expect(rows).toHaveLength(1);
    expect(rows[0].postsCount).toBe(2);
    expect(await userRepository.countAdmin({ page: 1, limit: 10, query: 'writer' })).toBe(1);
  });
});
