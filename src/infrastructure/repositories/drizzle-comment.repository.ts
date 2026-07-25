import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type {
  CommentInsertInput,
  CommentQuery,
  CommentRepository,
  CommentUpdateInput,
} from '~application/repositories/comment.repository';
import type { CommentEntity } from '~domain/entities/comment.entity';
import type { CommentId, PostId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { comments } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';
import { commentMapper } from '~infrastructure/mappers/drizzle-comment.mapper';

@Injectable()
export class DrizzleCommentRepository implements CommentRepository {
  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(comment: CommentInsertInput): Promise<void> {
    const values = commentMapper.toPersist(comment);
    await this.db.insert(comments).values(values);
  }

  async update(id: CommentId, comment: CommentUpdateInput): Promise<void> {
    await this.db.update(comments).set(comment).where(eq(comments.id, id));
  }

  async delete(id: CommentId): Promise<void> {
    await this.db.delete(comments).where(eq(comments.id, id));
  }

  async findById(id: CommentId): Promise<CommentEntity | null> {
    const comment = await this.db.query.comments.findFirst({
      where: { id: { eq: id } },
    });
    return comment ? commentMapper.toEntity(comment) : null;
  }

  async findAll(query: CommentQuery): Promise<CommentEntity[]> {
    const comments = await this.db.query.comments.findMany({
      where: { postId: { eq: query.postId } },
      limit: query.limit,
      offset: query.limit * (query.page - 1),
    });
    return comments.map(commentMapper.toEntity);
  }

  async findByPostId(postId: PostId): Promise<CommentEntity[]> {
    const comments = await this.db.query.comments.findMany({
      where: { postId: { eq: postId } },
    });
    return comments.map(commentMapper.toEntity);
  }
}
