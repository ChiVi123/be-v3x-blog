import { Module } from '@nestjs/common';
import { ImageFacade } from '~application/facades/image.facade';
import type { ImageRepository } from '~application/repositories/image.repository';
import type { ImageStorageService } from '~application/services/image-storage.service';
import { IMAGE_REPOSITORY_TOKEN, IMAGE_STORAGE_SERVICE_TOKEN } from '~infrastructure/config/provider-tokens';
import { ImageController } from '~presentation/controllers/image.controller';

@Module({
  providers: [
    {
      provide: ImageFacade,
      useFactory: (imageRepo: ImageRepository, imageStorage: ImageStorageService) =>
        new ImageFacade(imageRepo, imageStorage),
      inject: [IMAGE_REPOSITORY_TOKEN, IMAGE_STORAGE_SERVICE_TOKEN],
    },
  ],
  controllers: [ImageController],
})
export class ImageModule {}
