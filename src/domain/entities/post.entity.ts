import type { ImageEntity } from '~domain/entities/image.entity';
import type { UserEntity } from '~domain/entities/user.entity';
import type { PostId } from '~domain/types/branded';
import { BaseEntity } from './base.entity';

export class PostEntity extends BaseEntity<PostId> {
  private _title: string;
  private _content: string;
  private _category: string;
  private _author: UserEntity;
  private _thumbnail: ImageEntity;

  constructor(
    id: PostId,
    title: string,
    content: string,
    category: string,
    author: UserEntity,
    thumbnail: ImageEntity,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._title = title;
    this._content = content;
    this._category = category;
    this._author = author;
    this._thumbnail = thumbnail;
  }

  get title(): string {
    return this._title;
  }

  get content(): string {
    return this._content;
  }

  get category(): string {
    return this._category;
  }

  get author(): UserEntity {
    return this._author;
  }

  get thumbnail(): ImageEntity {
    return this._thumbnail;
  }

  static create(
    id: PostId,
    title: string,
    content: string,
    category: string,
    author: UserEntity,
    thumbnail: ImageEntity,
    createdAt: Date,
    updatedAt: Date,
  ): PostEntity {
    const post = new PostEntity(id, title, content, category, author, thumbnail, createdAt, updatedAt);
    return post;
  }
}
