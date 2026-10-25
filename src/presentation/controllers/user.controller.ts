import { Controller, Get, Inject, Param } from '@nestjs/common';
import type { GetAuthorUseCase } from '~application/use-cases/user/get-author.use-case';
import type { UserId } from '~domain/types/branded';
import { GET_AUTHOR_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';

@Controller('users')
export class UserController {
  constructor(@Inject(GET_AUTHOR_USE_CASE_TOKEN) private readonly getAuthorUseCase: GetAuthorUseCase) {}

  @Get(':id')
  getAuthor(@Param('id') id: UserId) {
    return this.getAuthorUseCase.execute(id);
  }
}
