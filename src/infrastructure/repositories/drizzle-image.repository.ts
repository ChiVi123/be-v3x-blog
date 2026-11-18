import { Inject, Injectable } from '@nestjs/common';
import type { ImageInsertInput, ImageRepository } from '~application/repositories/image.repository';
import type { ImageEntity } from '~domain/entities/image.entity';
import type { ImageId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { images } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

@Injectable()
export class DrizzleImageRepository implements ImageRepository {
  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(image: ImageInsertInput): Promise<ImageEntity> {
    const [result] = await this.db.insert(images).values(image).returning();
    return result;
  }

  async findById(id: ImageId): Promise<ImageEntity | null> {
    const image = await this.db.query.images.findFirst({ where: { id: { eq: id } } });
    return image ?? null;
  }
}
