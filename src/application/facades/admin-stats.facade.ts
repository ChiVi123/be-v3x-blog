import type { CategoryRepository } from '~application/repositories/category.repository';
import type { PostRepository } from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import { PostStatus } from '~domain/entities/post.entity';
import { Role, UserStatus } from '~domain/entities/user.entity';

// `count` bỏ qua page/limit, hai trường này chỉ để thỏa kiểu truy vấn.
const COUNT_ONLY = { page: 1, limit: 1 } as const;

export class AdminStatsFacade {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async getStats() {
    const [totalPosts, publishedPosts, draftPosts, totalUsers, admins, bannedUsers, categories] = await Promise.all([
      this.postRepository.count(COUNT_ONLY),
      this.postRepository.count({ ...COUNT_ONLY, status: PostStatus.PUBLISHED }),
      this.postRepository.count({ ...COUNT_ONLY, status: PostStatus.DRAFT }),
      this.userRepository.countAdmin(COUNT_ONLY),
      this.userRepository.countAdmin({ ...COUNT_ONLY, role: Role.ADMIN }),
      this.userRepository.countAdmin({ ...COUNT_ONLY, status: UserStatus.BANNED }),
      this.categoryRepository.findAll(),
    ]);

    return {
      posts: { total: totalPosts, published: publishedPosts, draft: draftPosts },
      users: { total: totalUsers, admins, banned: bannedUsers },
      categories: { total: categories.length },
    };
  }
}
