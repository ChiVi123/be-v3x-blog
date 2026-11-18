import type { ImageRepository } from '~application/repositories/image.repository';
import type { ImageStorageService } from '~application/services/image-storage.service';

export type UploadImageParams = {
  file: Buffer;
  alt: string;
};

export class ImageFacade {
  constructor(
    private readonly imageRepository: ImageRepository,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async uploadImage({ file, alt }: UploadImageParams) {
    const stored = await this.imageStorage.upload(file);

    const image = await this.imageRepository.create({
      remoteKey: stored.remoteKey,
      url: stored.url,
      alt,
      metadata: {
        width: stored.width,
        height: stored.height,
        format: stored.format,
        size: stored.size,
      },
    });

    return { id: image.id, url: image.url, alt: image.alt, metadata: image.metadata };
  }
}
