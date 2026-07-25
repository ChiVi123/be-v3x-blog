import type { PaginationQuery } from '~application/types/pagination';
import type { CommentEntity } from '~domain/entities/comment.entity';
import type { CommentId, PostId } from '~domain/types/branded';

export interface CommentRepository {
  create(comment: CommentEntity): Promise<void>;
  update(id: CommentId, comment: CommentUpdateInput): Promise<void>;
  delete(id: CommentId): Promise<void>;
  findById(id: CommentId): Promise<CommentEntity | null>;
  findAll(query: CommentQuery): Promise<CommentEntity[]>;
  findByPostId(postId: PostId): Promise<CommentEntity[]>;
}

export type CommentInsertInput = Pick<CommentEntity, 'content' | 'likes' | 'postId' | 'authorId'>;
export type CommentUpdateInput = Partial<Pick<CommentEntity, 'content' | 'likes'>>;
export type CommentQuery = PaginationQuery & {
  postId?: PostId;
};
