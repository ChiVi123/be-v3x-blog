import type { ImageId } from '~domain/types/branded';
import { BaseEntity_legacy } from './base.entity';

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
};

export class ImageEntity extends BaseEntity_legacy<ImageId> {
  private _url: string;
  private _alt: string;
  private _remoteKey: string;
  private _metadata: ImageMetadata;

  constructor(
    id: ImageId,
    url: string,
    alt: string,
    remoteKey: string,
    metadata: ImageMetadata,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._url = url;
    this._alt = alt;
    this._remoteKey = remoteKey;
    this._metadata = metadata;
  }

  get url(): string {
    return this._url;
  }

  get alt(): string {
    return this._alt;
  }

  get remoteKey(): string {
    return this._remoteKey;
  }

  get metadata(): ImageMetadata {
    return this._metadata;
  }

  static create(
    id: ImageId,
    url: string,
    alt: string,
    remoteKey: string,
    metadata: ImageMetadata,
    createdAt: Date,
    updatedAt: Date,
  ): ImageEntity {
    const image = new ImageEntity(id, url, alt, remoteKey, metadata, createdAt, updatedAt);
    return image;
  }
}
