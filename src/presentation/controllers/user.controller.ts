import { Controller, Get, Param } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { UserFacade } from '~application/facades/user.facade';
import type { UserId } from '~domain/types/branded';

@Controller('users')
export class UserController {
  constructor(private readonly userFacade: UserFacade) {}

  @Get(':id')
  getAuthor(@Param('id') id: UserId) {
    return this.userFacade.getAuthor(id);
  }
}
