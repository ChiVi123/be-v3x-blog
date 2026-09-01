import { Body, Controller, Inject, Post } from '@nestjs/common';
import type { UserCreateInput } from '~application/repositories/user.repository';
import type { CreateAccountUseCase } from '~application/use-cases/create-account.use-case';
import { REGISTER_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';

@Controller('users')
export class UserController {
  constructor(
    @Inject(REGISTER_USE_CASE_TOKEN)
    private readonly createAccountUseCase: CreateAccountUseCase,
  ) {}

  @Post()
  async createAccount(@Body() user: UserCreateInput) {
    const userEntity = await this.createAccountUseCase.execute(user);
    return {
      id: userEntity.id,
      username: userEntity.username,
      email: userEntity.email,
    };
  }
}
