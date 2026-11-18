import type { ImageEntity } from '~domain/entities/image.entity';
import type { ImageId } from '~domain/types/branded';

export interface ImageRepository {
  create(image: ImageInsertInput): Promise<ImageEntity>;
  findById(id: ImageId): Promise<ImageEntity | null>;
}

export type ImageInsertInput = Omit<ImageEntity, 'id' | 'createdAt' | 'updatedAt'>;
