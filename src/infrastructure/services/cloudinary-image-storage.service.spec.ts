import { describe, expect, it, mock } from 'bun:test';
import type { AppConfigService } from '~infrastructure/config/env';
import { CloudinaryImageStorageService } from './cloudinary-image-storage.service';

describe('CloudinaryImageStorageService', () => {
  it('rejects with a clear error when the credentials are missing', async () => {
    const configService = { get: mock(() => undefined) } as unknown as AppConfigService;
    const service = new CloudinaryImageStorageService(configService);

    await expect(service.upload(Buffer.from('fake-image-bytes'))).rejects.toThrow(/Cloudinary is not configured/);
  });

  it('rejects when only some of the credentials are set', async () => {
    const values: Record<string, string> = { CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: 'key' };
    const configService = { get: mock((key: string) => values[key]) } as unknown as AppConfigService;
    const service = new CloudinaryImageStorageService(configService);

    await expect(service.upload(Buffer.from('fake-image-bytes'))).rejects.toThrow(/Cloudinary is not configured/);
  });
});
