import { Module } from '@nestjs/common';
import type { UserRepository } from '~application/repositories/user.repository';
import { GetAuthorUseCase } from '~application/use-cases/user/get-author.use-case';
import { GET_AUTHOR_USE_CASE_TOKEN, USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { UserController } from '~presentation/controllers/user.controller';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
    {
      provide: GET_AUTHOR_USE_CASE_TOKEN,
      useFactory: (userRepo: UserRepository) => {
        return new GetAuthorUseCase(userRepo);
      },
      inject: [USER_REPOSITORY_TOKEN],
    },
  ],
})
export class UserModule {}
