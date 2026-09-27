import { Module } from '@nestjs/common';
import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import { GetMeUseCase, LogoutUseCase, RefreshUseCase } from '~application/use-cases/auth';
import { LoginUseCase } from '~application/use-cases/auth/login.use-case';
import { RegisterUseCase } from '~application/use-cases/auth/register.use-case';
import {
  AUTH_SERVICE_TOKEN,
  GET_ME_USE_CASE_TOKEN,
  LOGIN_USE_CASE_TOKEN,
  LOGOUT_USE_CASE_TOKEN,
  REFRESH_USE_CASE_TOKEN,
  REGISTER_USE_CASE_TOKEN,
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
      provide: LOGIN_USE_CASE_TOKEN,
      useFactory: (userRepo: UserRepository, sessionRepo: SessionRepository, authService: AuthService) => {
        return new LoginUseCase(userRepo, sessionRepo, authService);
      },
      inject: [USER_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, AUTH_SERVICE_TOKEN],
    },
    {
      provide: REFRESH_USE_CASE_TOKEN,
      useFactory: (sessionRepo: SessionRepository, authService: AuthService, userRepo: UserRepository) => {
        return new RefreshUseCase(sessionRepo, authService, userRepo);
      },
      inject: [SESSION_REPOSITORY_TOKEN, AUTH_SERVICE_TOKEN, USER_REPOSITORY_TOKEN],
    },
    {
      provide: REGISTER_USE_CASE_TOKEN,
      useFactory: (userRepo: UserRepository, authService: AuthService) => {
        return new RegisterUseCase(userRepo, authService);
      },
      inject: [USER_REPOSITORY_TOKEN, AUTH_SERVICE_TOKEN],
    },
    {
      provide: LOGOUT_USE_CASE_TOKEN,
      useFactory: (sessionRepo: SessionRepository) => {
        return new LogoutUseCase(sessionRepo);
      },
      inject: [SESSION_REPOSITORY_TOKEN],
    },
    {
      provide: GET_ME_USE_CASE_TOKEN,
      useFactory: (userRepo: UserRepository) => {
        return new GetMeUseCase(userRepo);
      },
      inject: [USER_REPOSITORY_TOKEN],
    },
  ],
})
export class AuthModule {}
