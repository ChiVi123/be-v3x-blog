import type { ImageId } from '~domain/types/branded';
import type { BaseEntity } from './base.entity';

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
};

export interface ImageEntity extends BaseEntity<ImageId> {
  url: string;
  alt: string;
  remoteKey: string;
  metadata: ImageMetadata;
}
