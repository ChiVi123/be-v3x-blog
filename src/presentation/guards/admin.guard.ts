import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role, UserStatus } from '~domain/entities/user.entity';
import { ForbiddenException, UnauthorizedException } from '~domain/exceptions';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';

/**
 * Phải chạy SAU JwtAuthGuard: @UseGuards(JwtAuthGuard, AdminGuard)
 *
 * Khác RolesGuard (chỉ tin role trong JWT), guard này đọc DB mỗi request nên admin bị khóa
 * hoặc bị hạ quyền sẽ mất quyền ngay, không phải đợi access token hết hạn.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(USER_REPOSITORY_TOKEN) private readonly userRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    const current = await this.userRepository.findById(user.id);
    if (!current) {
      throw new UnauthorizedException('User not found');
    }
    if (current.status === UserStatus.BANNED) {
      throw new ForbiddenException('Account is banned');
    }
    if (current.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
