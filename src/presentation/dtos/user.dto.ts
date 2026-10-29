import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { UserQuery } from '~application/repositories/user.repository';

export class SearchUserQueryDto implements UserQuery {
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

  @IsEnum(['id', 'username', 'email', 'createdAt', 'updatedAt'])
  @IsOptional()
  sortBy?: 'id' | 'username' | 'email' | 'createdAt' | 'updatedAt';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
