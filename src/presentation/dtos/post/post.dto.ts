import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { ImageId, UserId } from '~domain/types/branded';

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

export class UpdatePostRequest {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2550)
  @IsOptional()
  content?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  category?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  thumbnailId?: ImageId | null;
}

export class ListPostQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsUUID()
  author?: UserId;
}
