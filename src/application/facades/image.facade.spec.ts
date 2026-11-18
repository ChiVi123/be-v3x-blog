import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ImageInsertInput, ImageRepository } from '~application/repositories/image.repository';
import type { ImageStorageService, StoredImage } from '~application/services/image-storage.service';
import type { ImageId } from '~domain/types/branded';
import { ImageFacade } from './image.facade';

describe('ImageFacade', () => {
  let facade: ImageFacade;
  let mockImageRepository: { create: ReturnType<typeof mock>; findById: ReturnType<typeof mock> };
  let mockImageStorage: { upload: ReturnType<typeof mock> };

  const file = Buffer.from('fake-image-bytes');
  const stored: StoredImage = {
    remoteKey: 'tap-blog/abc123',
    url: 'https://res.cloudinary.com/demo/image/upload/tap-blog/abc123.jpg',
    width: 1200,
    height: 800,
    format: 'jpg',
    size: 34567,
  };

  beforeEach(() => {
    mockImageRepository = {
      create: mock(async (input: ImageInsertInput) => ({
        id: 'image-1' as ImageId,
        ...input,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: null,
      })),
      findById: mock(async () => null),
    };
    mockImageStorage = { upload: mock(async () => stored) };

    facade = new ImageFacade(
      mockImageRepository as unknown as ImageRepository,
      mockImageStorage as unknown as ImageStorageService,
    );
  });

  it('uploads the file, stores its metadata and returns the public fields', async () => {
    const result = await facade.uploadImage({ file, alt: 'A cover image' });

    expect(mockImageStorage.upload).toHaveBeenCalledWith(file);
    expect(mockImageRepository.create).toHaveBeenCalledWith({
      remoteKey: 'tap-blog/abc123',
      url: stored.url,
      alt: 'A cover image',
      metadata: { width: 1200, height: 800, format: 'jpg', size: 34567 },
    });
    expect(result).toEqual({
      id: 'image-1' as ImageId,
      url: stored.url,
      alt: 'A cover image',
      metadata: { width: 1200, height: 800, format: 'jpg', size: 34567 },
    });
  });

  it('does not persist anything when the upload fails', async () => {
    mockImageStorage.upload = mock(async () => {
      throw new Error('upload failed');
    });

    await expect(facade.uploadImage({ file, alt: 'A cover image' })).rejects.toThrow('upload failed');
    expect(mockImageRepository.create).not.toHaveBeenCalled();
  });
});
