import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostInput, PostQuery, PostRepository, PostUpdateInput } from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import type { PostId, UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { posts } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const RETURNING_DETAILS = {
  id: posts.id,
  title: posts.title,
  slug: posts.slug,
  content: posts.content,
  category: posts.category,
  authorId: posts.authorId,
  thumbnailId: posts.thumbnailId,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
};

@Injectable()
export class DrizzlePostRepository implements PostRepository {
  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(post: PostInput): Promise<PostEntity> {
    const [result] = await this.db.insert(posts).values(post).returning(RETURNING_DETAILS);
    return result;
  }

  async update(post: PostUpdateInput): Promise<PostEntity> {
    const [result] = await this.db.update(posts).set(post).returning(RETURNING_DETAILS);
    return result;
  }

  async delete(id: PostId): Promise<void> {
    await this.db.delete(posts).where(eq(posts.id, id));
  }

  async findById(id: PostId): Promise<PostEntity | null> {
    const post = await this.db.query.posts.findFirst({ where: { id: { eq: id } } });
    return post ?? null;
  }

  async findAll(_query: PostQuery): Promise<PostEntity[]> {
    // TODO: implement query properly
    const posts = await this.db.query.posts.findMany();
    return posts ?? [];
  }

  async findByUserId(userId: UserId): Promise<PostEntity[]> {
    const posts = await this.db.query.posts.findMany({
      where: { authorId: { eq: userId } },
    });
    return posts ?? [];
  }
}
