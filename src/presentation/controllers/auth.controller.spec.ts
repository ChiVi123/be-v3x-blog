import 'reflect-metadata';

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { ClientContext } from '~application/types/use-case.type';
import type { GetMeUseCase, LogoutUseCase, RefreshUseCase, RegisterUseCase } from '~application/use-cases/auth';
import type { LoginUseCase } from '~application/use-cases/auth/login.use-case';
import { Role } from '~domain/entities/user.entity';
import { InvalidCredentialsException, UnauthorizedException, UserAlreadyExistsException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { AppConfigService } from '~infrastructure/config/env';
import {
  AUTH_SERVICE_TOKEN,
  GET_ME_USE_CASE_TOKEN,
  LOGIN_USE_CASE_TOKEN,
  LOGOUT_USE_CASE_TOKEN,
  REFRESH_USE_CASE_TOKEN,
  REGISTER_USE_CASE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { AuthController } from '~presentation/controllers/auth.controller';
import type { PublicRegisterRequest } from '~presentation/dtos/auth/register.dto';
import type { LoginRequest } from '~presentation/dtos/login.dto';
import { JwtAuthGuard } from '~presentation/guards';

describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: { execute: ReturnType<typeof mock> };
  let mockRegisterUseCase: { execute: ReturnType<typeof mock> };
  let mockRefreshUseCase: { execute: ReturnType<typeof mock> };
  let mockLogoutUseCase: { execute: ReturnType<typeof mock> };
  let mockGetMeUseCase: { execute: ReturnType<typeof mock> };
  let mockConfigService: { get: ReturnType<typeof mock> };

  const mockExpiryDate = new Date('2026-09-27T00:00:00Z');

  beforeEach(async () => {
    mockLoginUseCase = {
      execute: mock(async () => ({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        refreshTokenExpiryDate: mockExpiryDate,
      })),
    };

    mockRegisterUseCase = {
      execute: mock(async () => ({
        id: 'user-1' as UserId,
        email: 'test@example.com',
        username: 'testuser',
      })),
    };

    mockRefreshUseCase = {
      execute: mock(async () => ({
        accessToken: 'mock-new-access-token',
        refreshToken: 'mock-new-refresh-token',
        refreshTokenExpiryDate: mockExpiryDate,
      })),
    };

    mockLogoutUseCase = {
      execute: mock(async () => undefined),
    };

    mockGetMeUseCase = {
      execute: mock(async () => ({
        id: 'user-1' as UserId,
        username: 'testuser',
        email: 'test@example.com',
        role: Role.USER,
        avatarId: null,
        createdAt: mockExpiryDate,
        updatedAt: mockExpiryDate,
      })),
    };

    mockConfigService = {
      get: mock((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60_000,
            limit: 60,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: LOGIN_USE_CASE_TOKEN,
          useValue: mockLoginUseCase as unknown as LoginUseCase,
        },
        {
          provide: REGISTER_USE_CASE_TOKEN,
          useValue: mockRegisterUseCase as unknown as RegisterUseCase,
        },
        {
          provide: REFRESH_USE_CASE_TOKEN,
          useValue: mockRefreshUseCase as unknown as RefreshUseCase,
        },
        {
          provide: LOGOUT_USE_CASE_TOKEN,
          useValue: mockLogoutUseCase as unknown as LogoutUseCase,
        },
        {
          provide: GET_ME_USE_CASE_TOKEN,
          useValue: mockGetMeUseCase as unknown as GetMeUseCase,
        },
        {
          provide: AUTH_SERVICE_TOKEN,
          useValue: {
            verifyAccessToken: mock(async () => ({
              id: 'user-1' as UserId,
              email: 'test@example.com',
              role: Role.USER,
            })),
          },
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService as unknown as AppConfigService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should pass body and clientContext to loginUseCase, set a cookie, and return access token and expiry date', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const clientContext: ClientContext = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };

      const res = {
        cookie: mock(),
      } as unknown as Response;

      const result = await controller.login(body, res, clientContext);

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        clientContext: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshTokenExpiryDate: mockExpiryDate,
      });
      expect(res.cookie).toHaveBeenCalledWith('refresh-token', 'mock-refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        expires: mockExpiryDate,
      });
    });

    it('should propagate errors when loginUseCase throws', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      const clientContext: ClientContext = {
        ipAddress: '0.0.0.0',
        userAgent: 'Unknown',
      };

      mockLoginUseCase.execute = mock(async () => {
        throw new InvalidCredentialsException();
      });

      const res = {
        cookie: mock(),
      } as unknown as Response;

      await expect(controller.login(body, res, clientContext)).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('register', () => {
    it('should assign USER role and return registered user summary', async () => {
      const body: PublicRegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      const result = await controller.register(body);

      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: Role.USER,
      });
      expect(result).toEqual({
        id: 'user-1' as UserId,
        email: 'test@example.com',
        username: 'testuser',
      });
    });

    it('should propagate errors when registerUseCase throws', async () => {
      const body: PublicRegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      mockRegisterUseCase.execute = mock(async () => {
        throw new UserAlreadyExistsException();
      });

      expect(controller.register(body)).rejects.toThrow(UserAlreadyExistsException);
    });
  });

  describe('refresh', () => {
    const clientContext: ClientContext = {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };

    it('should throw UnauthorizedException when refresh-token cookie is missing', async () => {
      const req = {
        cookies: {},
      } as unknown as Request;
      const res = {
        cookie: mock(),
      } as unknown as Response;

      expect(controller.refresh(req, res, clientContext)).rejects.toThrow(UnauthorizedException);
      expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
    });

    it('should refresh tokens, set cookie with path /, and return new access token', async () => {
      const req = {
        cookies: {
          'refresh-token': 'valid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        cookie: mock(),
      } as unknown as Response;

      const result = await controller.refresh(req, res, clientContext);

      expect(mockRefreshUseCase.execute).toHaveBeenCalledWith({
        refreshToken: 'valid-refresh-token',
        clientContext,
      });

      expect(res.cookie).toHaveBeenCalledWith('refresh-token', 'mock-new-refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        expires: mockExpiryDate,
      });

      expect(result).toEqual({
        accessToken: 'mock-new-access-token',
        refreshTokenExpiryDate: mockExpiryDate,
      });
    });

    it('should set secure cookie when NODE_ENV is production', async () => {
      mockConfigService.get = mock((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const req = {
        cookies: {
          'refresh-token': 'valid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        cookie: mock(),
      } as unknown as Response;

      await controller.refresh(req, res, clientContext);

      expect(res.cookie).toHaveBeenCalledWith('refresh-token', 'mock-new-refresh-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        expires: mockExpiryDate,
      });
    });

    it('should propagate errors when refreshUseCase throws', async () => {
      const req = {
        cookies: {
          'refresh-token': 'invalid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        cookie: mock(),
      } as unknown as Response;

      mockRefreshUseCase.execute = mock(async () => {
        throw new InvalidCredentialsException();
      });

      expect(controller.refresh(req, res, clientContext)).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('me', () => {
    it('should return authenticated user profile', async () => {
      const result = await controller.me('user-1' as UserId);

      expect(mockGetMeUseCase.execute).toHaveBeenCalledWith('user-1' as UserId);
      expect(result).toEqual({
        id: 'user-1' as UserId,
        username: 'testuser',
        email: 'test@example.com',
        role: Role.USER,
        avatarId: null,
        createdAt: mockExpiryDate,
        updatedAt: mockExpiryDate,
      });
    });

    it('should propagate errors when getMeUseCase throws', async () => {
      mockGetMeUseCase.execute = mock(async () => {
        throw new UnauthorizedException('User not found');
      });

      expect(controller.me('user-1' as UserId)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear cookie without calling logoutUseCase when no cookie present', async () => {
      const req = {
        cookies: {},
      } as unknown as Request;
      const res = {
        clearCookie: mock(),
      } as unknown as Response;

      await controller.logout(req, res);

      expect(mockLogoutUseCase.execute).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
      });
    });

    it('should call logoutUseCase with refresh token and clear cookie when cookie is present', async () => {
      const req = {
        cookies: {
          'refresh-token': 'valid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        clearCookie: mock(),
      } as unknown as Response;

      await controller.logout(req, res);

      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith('valid-refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
      });
    });

    it('should still clear cookie even when logoutUseCase throws (try/finally)', async () => {
      const req = {
        cookies: {
          'refresh-token': 'valid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        clearCookie: mock(),
      } as unknown as Response;

      mockLogoutUseCase.execute = mock(async () => {
        throw new Error('Database connection failed');
      });

      await expect(controller.logout(req, res)).rejects.toThrow('Database connection failed');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
      });
    });

    it('should use secure cookie when NODE_ENV is production', async () => {
      mockConfigService.get = mock((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const req = {
        cookies: {
          'refresh-token': 'valid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        clearCookie: mock(),
      } as unknown as Response;

      await controller.logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('refresh-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      });
    });
  });
});
