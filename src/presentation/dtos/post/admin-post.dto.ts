import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import type { PostQuery } from '~application/repositories/post.repository';
import { PostStatus } from '~domain/entities/post.entity';
import type { CategoryId, UserId } from '~domain/types/branded';

export class AdminListPostQueryDto implements PostQuery {
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
  author?: UserId;

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
