import { describe, expect, it, mock } from 'bun:test';
import type { CategoryRepository } from '~application/repositories/category.repository';
import type { PostQuery, PostRepository } from '~application/repositories/post.repository';
import type { AdminUserQuery, UserRepository } from '~application/repositories/user.repository';
import { PostStatus } from '~domain/entities/post.entity';
import { Role, UserStatus } from '~domain/entities/user.entity';
import { AdminStatsFacade } from './admin-stats.facade';

describe('AdminStatsFacade', () => {
  it('combines post, user and category counts', async () => {
    const postRepository = {
      count: mock(async (query: PostQuery) => {
        if (query.status === PostStatus.PUBLISHED) return 7;
        if (query.status === PostStatus.DRAFT) return 3;
        return 10;
      }),
    };
    const userRepository = {
      countAdmin: mock(async (query: AdminUserQuery) => {
        if (query.role === Role.ADMIN) return 2;
        if (query.status === UserStatus.BANNED) return 1;
        return 5;
      }),
    };
    const categoryRepository = { findAll: mock(async () => [{}, {}]) };

    const facade = new AdminStatsFacade(
      postRepository as unknown as PostRepository,
      userRepository as unknown as UserRepository,
      categoryRepository as unknown as CategoryRepository,
    );

    expect(await facade.getStats()).toEqual({
      posts: { total: 10, published: 7, draft: 3 },
      users: { total: 5, admins: 2, banned: 1 },
      categories: { total: 2 },
    });
    expect(postRepository.count).toHaveBeenCalledWith({ page: 1, limit: 1, status: PostStatus.DRAFT });
    expect(userRepository.countAdmin).toHaveBeenCalledWith({ page: 1, limit: 1, role: Role.ADMIN });
  });
});
