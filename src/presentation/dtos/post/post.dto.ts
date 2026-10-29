import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { CreatePostParams, UpdatePostParams } from '~application/facades';
import type { PostQuery } from '~application/repositories/post.repository';
import type { CategoryId, ImageId, UserId } from '~domain/types/branded';

export class CreatePostDto implements Omit<CreatePostParams, 'authorId'> {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2550)
  content: string;

  @IsUUID()
  categoryId: CategoryId;

  @IsUUID()
  @IsOptional()
  thumbnailId: ImageId | null;
}

export class UpdatePostDto implements Omit<UpdatePostParams, 'id' | 'authorId'> {
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

  @IsUUID()
  @IsOptional()
  categoryId?: CategoryId;

  @IsUUID()
  @IsOptional()
  thumbnailId?: ImageId | null;
}

export class ListPostQueryDto implements PostQuery {
  @IsString()
  @IsOptional()
  query?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  @IsUUID()
  @IsOptional()
  author?: UserId;

  @IsUUID()
  @IsOptional()
  category?: CategoryId;

  @IsEnum(['title', 'createdAt', 'updatedAt', 'id'])
  @IsOptional()
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'id';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
