import { Module } from '@nestjs/common';
import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import { LoginUseCase } from '~application/use-cases/login.use-case';
import {
  AUTH_SERVICE_TOKEN,
  LOGIN_USE_CASE_TOKEN,
  SESSION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { AuthController } from '~presentation/controllers/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: LOGIN_USE_CASE_TOKEN,
      useFactory: (userRepo: UserRepository, sessionRepo: SessionRepository, authService: AuthService) => {
        return new LoginUseCase(userRepo, sessionRepo, authService);
      },
      inject: [USER_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, AUTH_SERVICE_TOKEN],
    },
  ],
  exports: [],
})
export class AuthModule {}
