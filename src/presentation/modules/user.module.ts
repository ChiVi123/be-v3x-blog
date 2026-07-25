import { Module } from '@nestjs/common';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import { CreateAccountUseCase } from '~application/use-cases/create-account.use-case';
import {
  AUTH_SERVICE_TOKEN,
  CREATE_ACCOUNT_USE_CASE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { UserController } from '~presentation/controllers/user.controller';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
    {
      provide: CREATE_ACCOUNT_USE_CASE_TOKEN,
      useFactory: (repository: UserRepository, service: AuthService) => new CreateAccountUseCase(repository, service),
      inject: [USER_REPOSITORY_TOKEN, AUTH_SERVICE_TOKEN],
    },
  ],
  exports: [],
})
export class UserModule {}
