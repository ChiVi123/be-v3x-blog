import { Inject, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { ImageStorageService, StoredImage } from '~application/services/image-storage.service';
import { AppConfigService } from '~infrastructure/config/env';

@Injectable()
export class CloudinaryImageStorageService implements ImageStorageService {
  private readonly logger = new Logger(CloudinaryImageStorageService.name);
  private isConfigured = false;

  constructor(@Inject(AppConfigService) private readonly configService: AppConfigService) {}

  async upload(file: Buffer): Promise<StoredImage> {
    this.ensureConfigured();
    const folder = this.configService.get('CLOUDINARY_FOLDER');

    return new Promise<StoredImage>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => {
        if (error || !result) {
          this.logger.error(`Cloudinary upload failed: ${error?.message ?? 'no result returned'}`);
          reject(new Error('Failed to upload image'));
          return;
        }

        resolve({
          remoteKey: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
        });
      });

      stream.end(file);
    });
  }

  // Cấu hình lười (lúc upload đầu tiên) để app và các test khác vẫn chạy khi chưa có credentials.
  private ensureConfigured(): void {
    if (this.isConfigured) {
      return;
    }

    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary is not configured: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET',
      );
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    this.isConfigured = true;
  }
}
