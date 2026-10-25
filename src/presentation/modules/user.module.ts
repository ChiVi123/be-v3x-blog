import { Module } from '@nestjs/common';
import { UserFacade } from '~application/facades/user.facade';
import type { UserRepository } from '~application/repositories/user.repository';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { UserController } from '~presentation/controllers/user.controller';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: UserFacade,
      useFactory: (userRepo: UserRepository) => new UserFacade(userRepo),
      inject: [USER_REPOSITORY_TOKEN],
    },
  ],
})
export class UserModule {}
