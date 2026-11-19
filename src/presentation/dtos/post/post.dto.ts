import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { CreatePostParams, UpdatePostParams } from '~application/facades';
import type { PostQuery } from '~application/repositories/post.repository';
import { PostStatus } from '~domain/entities/post.entity';
import type { CategoryId, ImageId, UserId } from '~domain/types/branded';

export class CreatePostDto implements Omit<CreatePostParams, 'authorId'> {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(20)
  @MaxLength(50_000)
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
  @MaxLength(50_000)
  @IsOptional()
  content?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: CategoryId;

  @IsUUID()
  @IsOptional()
  thumbnailId?: ImageId | null;
}

export class UpdatePostStatusDto {
  @IsEnum(PostStatus)
  status: PostStatus;
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

// Query cho "bài của tôi": có page/limit mặc định, lọc được theo trạng thái.
export class ListMyPostQueryDto implements Omit<PostQuery, 'author'> {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsUUID()
  @IsOptional()
  category?: CategoryId;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsEnum(['title', 'createdAt', 'updatedAt', 'id'])
  @IsOptional()
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'id';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
