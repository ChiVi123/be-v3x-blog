import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { ImageId } from '~domain/types/branded';

export class CreatePostRequest {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2550)
  content: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  thumbnailId: ImageId | null;
}
