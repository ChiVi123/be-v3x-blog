import type { CommentInsertInput } from '~application/repositories/comment.repository';
import { CommentEntity } from '~domain/entities/comment.entity';
import type { CommentInput, CommentSelect } from '~infrastructure/database/drizzle/types';

export const commentMapper = {
  toEntity: (comment: CommentSelect): CommentEntity => {
    return CommentEntity.create(
      comment.id,
      comment.content,
      comment.likes,
      comment.postId,
      comment.authorId,
      comment.createdAt,
      comment.updatedAt,
    );
  },
  toPersist: (comment: CommentInsertInput): CommentInput => {
    return {
      content: comment.content,
      likes: comment.likes,
      postId: comment.postId,
      authorId: comment.authorId,
    };
  },
};
