import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Reflector class is required for NestJS DI reflection
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '~domain/entities/user.entity';
import { ForbiddenException, UnauthorizedException } from '~domain/exceptions';
import { ROLES_KEY } from '~presentation/decorators';

/**
 * Phải chạy SAU JwtAuthGuard (request.user được JwtAuthGuard gắn vào):
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * Route không có @Roles() thì guard cho qua.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
