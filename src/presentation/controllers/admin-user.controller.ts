import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { AdminUserFacade } from '~application/facades/admin-user.facade';
import type { UserId } from '~domain/types/branded';
import { CurrentUser } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { AdminListUserQueryDto, UpdateUserRoleDto, UpdateUserStatusDto } from '~presentation/dtos/admin-user.dto';
import { AdminGuard, JwtAuthGuard } from '~presentation/guards';

// JwtAuthGuard phải đứng trước AdminGuard (AdminGuard đọc request.user).
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUserController {
  constructor(private readonly adminUserFacade: AdminUserFacade) {}

  @Get()
  list(@Query() query: AdminListUserQueryDto) {
    return this.adminUserFacade.list(query);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  changeRole(
    @Param('id', new ParseUUIDPipe()) id: UserId,
    @Body() body: UpdateUserRoleDto,
    @CurrentUser('id') requesterId: UserId,
  ) {
    return this.adminUserFacade.changeRole({ id, role: body.role, requesterId });
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param('id', new ParseUUIDPipe()) id: UserId,
    @Body() body: UpdateUserStatusDto,
    @CurrentUser('id') requesterId: UserId,
  ) {
    return this.adminUserFacade.changeStatus({ id, status: body.status, requesterId });
  }
}
