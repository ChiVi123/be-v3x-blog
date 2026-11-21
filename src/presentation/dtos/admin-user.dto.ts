import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { AdminUserQuery } from '~application/repositories/user.repository';
import { Role, UserStatus } from '~domain/entities/user.entity';

export class AdminListUserQueryDto implements AdminUserQuery {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  query?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsEnum(['id', 'username', 'email', 'createdAt', 'updatedAt'])
  @IsOptional()
  sortBy?: 'id' | 'username' | 'email' | 'createdAt' | 'updatedAt';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
