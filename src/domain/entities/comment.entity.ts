import type { CommentId, PostId, UserId } from '~domain/types/branded';
import { BaseEntity_legacy } from './base.entity';

export class CommentEntity extends BaseEntity_legacy<CommentId> {
  private _content: string;
  private _likes: UserId[];
  private _postId: PostId;
  private _authorId: UserId;

  constructor(
    id: CommentId,
    content: string,
    likes: UserId[],
    postId: PostId,
    authorId: UserId,
    createdAt: Date,
    updatedAt: Date | null | undefined,
  ) {
    super(id, createdAt, updatedAt);
    this._content = content;
    this._likes = likes;
    this._postId = postId;
    this._authorId = authorId;
  }

  get content(): string {
    return this._content;
  }

  get postId(): PostId {
    return this._postId;
  }

  get authorId(): UserId {
    return this._authorId;
  }

  get likes(): UserId[] {
    return this._likes;
  }

  get numberOfLikes(): number {
    return this._likes.length;
  }

  like(userId: UserId) {
    if (this._likes.includes(userId)) {
      return;
    }
    this._likes.push(userId);
    this.updateUpdatedAt();
  }

  unlike(userId: UserId) {
    this._likes = this._likes.filter((like) => like !== userId);
    this.updateUpdatedAt();
  }

  updateContent(content: string) {
    this._content = content;
    this.updateUpdatedAt();
  }

  updatePostId(postId: PostId) {
    this._postId = postId;
    this.updateUpdatedAt();
  }

  updateAuthorId(authorId: UserId) {
    this._authorId = authorId;
    this.updateUpdatedAt();
  }

  private updateUpdatedAt() {
    this._updatedAt = new Date();
  }

  static create(
    id: CommentId,
    content: string,
    likes: UserId[],
    postId: PostId,
    authorId: UserId,
    createdAt: Date,
    updatedAt: Date | null | undefined,
  ) {
    const comment = new CommentEntity(id, content, likes, postId, authorId, createdAt, updatedAt);
    return comment;
  }
}
