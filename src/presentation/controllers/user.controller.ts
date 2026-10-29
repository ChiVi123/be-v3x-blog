import { Controller, Get, Param, Query } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { UserFacade } from '~application/facades/user.facade';
import type { UserId } from '~domain/types/branded';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { SearchUserQueryDto } from '~presentation/dtos/user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userFacade: UserFacade) {}

  @Get('search')
  search(@Query() query: SearchUserQueryDto) {
    return this.userFacade.search(query);
  }

  @Get(':id')
  getAuthor(@Param('id') id: UserId) {
    return this.userFacade.getAuthor(id);
  }
}
