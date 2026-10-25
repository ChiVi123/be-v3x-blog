import { Module } from '@nestjs/common';
import { AuthFacade } from '~application/facades/auth.facade';
import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import {
  AUTH_SERVICE_TOKEN,
  SESSION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { AuthController } from '~presentation/controllers/auth.controller';
import { JwtAuthGuard } from '~presentation/guards';

@Module({
  controllers: [AuthController],
  providers: [
    JwtAuthGuard,
    {
      provide: AuthFacade,
      useFactory: (userRepo: UserRepository, sessionRepo: SessionRepository, authService: AuthService) =>
        new AuthFacade(userRepo, sessionRepo, authService),
      inject: [USER_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, AUTH_SERVICE_TOKEN],
    },
  ],
})
export class AuthModule {}
