import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { ImageFacade } from '~application/facades/image.facade';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { UploadImageDto } from '~presentation/dtos/image.dto';
import { JwtAuthGuard } from '~presentation/guards';

const ONE_MINUTE_MS = 60_000;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      callback(new UnsupportedMediaTypeException('Only JPEG, PNG and WebP images are allowed'), false);
      return;
    }
    callback(null, true);
  },
};

@Controller('images')
export class ImageController {
  constructor(private readonly imageFacade: ImageFacade) {}

  // Guard chạy trước interceptor nên request chưa đăng nhập sẽ bị chặn trước khi đọc file.
  @Post()
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: ONE_MINUTE_MS } })
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  @HttpCode(HttpStatus.CREATED)
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: UploadImageDto) {
    if (!file) {
      throw new BadRequestException('Image file is required (multipart field "file")');
    }

    return this.imageFacade.uploadImage({ file: file.buffer, alt: body.alt });
  }
}
