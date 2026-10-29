import { Inject, Injectable, Logger } from '@nestjs/common';
import { count, eq, or } from 'drizzle-orm';
import type {
  PostDetail,
  PostInput,
  PostQuery,
  PostRepository,
  PostRow,
  PostUpdateInput,
} from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import type { PostId, UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { posts } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const TIME_WEIGHT = 200; // words per minute
const QUERY_ROW = { authorId: false, categoryId: false, thumbnailId: false, content: false } as const;
const QUERY_DETAIL = { authorId: false, categoryId: false, thumbnailId: false } as const;
const QUERY_WITH = {
  author: {
    columns: {
      password: false,
    },
  },
  category: true,
  thumbnail: true,
} as const;

@Injectable()
export class DrizzlePostRepository implements PostRepository {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: logger will be used in the future
  private readonly logger = new Logger(DrizzlePostRepository.name);

  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(post: PostInput): Promise<PostEntity> {
    const [result] = await this.db
      .insert(posts)
      .values({ ...post, readingTime: post.content.length / TIME_WEIGHT })
      .returning();
    return result;
  }

  async update(id: PostId, post: PostUpdateInput): Promise<PostEntity> {
    const [result] = await this.db
      .update(posts)
      .set({ ...post, updatedAt: new Date() })
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
    const { page = 1, limit = 10, author, category, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const offset = Math.max(0, (page - 1) * limit);

    const postsResult = await this.db.query.posts.findMany({
      where: {
        OR: [{ authorId: { eq: author } }, { categoryId: { eq: category } }],
      },
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
    const { author, category } = query;
    const result = await this.db
      .select({ count: count(posts.id) })
      .from(posts)
      .where(
        or(author ? eq(posts.authorId, author) : undefined, category ? eq(posts.categoryId, category) : undefined),
      );

    return result[0].count;
  }
}
