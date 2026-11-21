import { Module } from '@nestjs/common';
import { AdminUserFacade } from '~application/facades/admin-user.facade';
import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import { SESSION_REPOSITORY_TOKEN, USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { AdminUserController } from '~presentation/controllers/admin-user.controller';

@Module({
  controllers: [AdminUserController],
  providers: [
    {
      provide: AdminUserFacade,
      useFactory: (userRepo: UserRepository, sessionRepo: SessionRepository) =>
        new AdminUserFacade(userRepo, sessionRepo),
      inject: [USER_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN],
    },
  ],
})
export class AdminUserModule {}
