import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import type {
  PostDetail,
  PostInput,
  PostQuery,
  PostRepository,
  PostRow,
  PostStatusInput,
  PostUpdateInput,
} from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import type { PostId, UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { posts } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const WORDS_PER_MINUTE = 200;
const QUERY_ROW = { authorId: false, categoryId: false, thumbnailId: false, content: false } as const;
const QUERY_DETAIL = { authorId: false, categoryId: false, thumbnailId: false } as const;
const QUERY_WITH = {
  author: {
    columns: { id: true, username: true, bio: true, avatarId: true, createdAt: true },
  },
  category: true,
  thumbnail: true,
} as const;

function calcReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

// Chỉ thêm điều kiện khi có giá trị, các điều kiện kết hợp bằng AND
function buildPostFilter({ author, category, status }: Pick<PostQuery, 'author' | 'category' | 'status'>) {
  return {
    ...(author ? { authorId: { eq: author } } : {}),
    ...(category ? { categoryId: { eq: category } } : {}),
    ...(status ? { status: { eq: status } } : {}),
  };
}

@Injectable()
export class DrizzlePostRepository implements PostRepository {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: logger will be used in the future
  private readonly logger = new Logger(DrizzlePostRepository.name);

  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(post: PostInput): Promise<PostEntity> {
    const [result] = await this.db
      .insert(posts)
      .values({ ...post, readingTime: calcReadingTime(post.content) })
      .returning();
    return result;
  }

  async update(id: PostId, post: PostUpdateInput): Promise<PostEntity> {
    const [result] = await this.db
      .update(posts)
      .set({
        ...post,
        ...(post.content !== undefined ? { readingTime: calcReadingTime(post.content) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();
    return result;
  }

  async updateStatus(id: PostId, input: PostStatusInput): Promise<PostEntity> {
    const [result] = await this.db
      .update(posts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return result;
  }

  async delete(id: PostId): Promise<void> {
    await this.db.delete(posts).where(eq(posts.id, id));
  }

  async findById(id: PostId): Promise<PostEntity | null> {
    const post = await this.db.query.posts.findFirst({ where: { id: { eq: id } } });
    return post ?? null;
  }

  async findBy<Key extends keyof PostEntity, Value extends PostEntity[Key]>(
    key: Key,
    value: Value,
  ): Promise<PostDetail | null> {
    const post = await this.db.query.posts.findFirst({
      where: { [key]: { eq: value } },
      columns: QUERY_DETAIL,
      with: QUERY_WITH,
    });
    return post ?? null;
  }

  async findAll(query: PostQuery): Promise<PostRow[]> {
    const { page = 1, limit = 10, author, category, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const offset = Math.max(0, (page - 1) * limit);

    const postsResult = await this.db.query.posts.findMany({
      where: buildPostFilter({ author, category, status }),
      limit,
      offset,
      orderBy: (posts, { desc, asc }) => (sortOrder === 'desc' ? [desc(posts[sortBy])] : [asc(posts[sortBy])]),
      columns: QUERY_ROW,
      with: QUERY_WITH,
    });

    return postsResult;
  }

  async findByUserId(userId: UserId): Promise<PostRow[]> {
    const posts = await this.db.query.posts.findMany({
      where: { authorId: { eq: userId } },
      columns: QUERY_ROW,
      with: QUERY_WITH,
    });
    return posts ?? [];
  }

  async count(query: PostQuery): Promise<number> {
    const { author, category, status } = query;
    const result = await this.db
      .select({ count: count(posts.id) })
      .from(posts)
      .where(
        and(
          author ? eq(posts.authorId, author) : undefined,
          category ? eq(posts.categoryId, category) : undefined,
          status ? eq(posts.status, status) : undefined,
        ),
      );

    return result[0].count;
  }
}
