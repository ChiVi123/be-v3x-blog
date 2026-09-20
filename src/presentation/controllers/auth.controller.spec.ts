import 'reflect-metadata';

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import type { ClientContext } from '~application/types/use-case.type';
import type { RefreshUseCase, RegisterUseCase } from '~application/use-cases/auth';
import type { LoginUseCase } from '~application/use-cases/login.use-case';
import { Role } from '~domain/entities/user.entity';
import { InvalidCredentialsException, UnauthorizedException, UserAlreadyExistsException } from '~domain/exceptions';
import { AppConfigService } from '~infrastructure/config/env';
import {
  LOGIN_USE_CASE_TOKEN,
  REFRESH_USE_CASE_TOKEN,
  REGISTER_USE_CASE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { AuthController } from '~presentation/controllers/auth.controller';
import type { RegisterRequest } from '~presentation/dtos/auth/register.dto';
import type { LoginRequest } from '~presentation/dtos/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: { execute: ReturnType<typeof mock> };
  let mockRegisterUseCase: { execute: ReturnType<typeof mock> };
  let mockRefreshUseCase: { execute: ReturnType<typeof mock> };
  let mockConfigService: { get: ReturnType<typeof mock> };

  const mockExpiryDate = new Date('2026-09-27T00:00:00Z');

  beforeEach(async () => {
    mockLoginUseCase = {
      execute: mock(async () => ({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })),
    };

    mockRegisterUseCase = {
      execute: mock(async () => undefined),
    };

    mockRefreshUseCase = {
      execute: mock(async () => ({
        accessToken: 'mock-new-access-token',
        refreshToken: 'mock-new-refresh-token',
        refreshTokenExpiryDate: mockExpiryDate,
      })),
    };

    mockConfigService = {
      get: mock((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
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
          provide: AppConfigService,
          useValue: mockConfigService as unknown as AppConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should pass body and clientContext to loginUseCase and return result', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const clientContext: ClientContext = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };

      const result = await controller.login(body, clientContext);

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
        refreshToken: 'mock-refresh-token',
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

      expect(controller.login(body, clientContext)).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('register', () => {
    it('should pass register parameters with role to registerUseCase and return the result', async () => {
      const body: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: Role.ADMIN,
      };

      const result = await controller.register(body);

      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: Role.ADMIN,
      });
      expect(result).toBeUndefined();
    });

    it('should pass register parameters without optional role to registerUseCase', async () => {
      const body: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      await controller.register(body);

      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: undefined,
      });
    });

    it('should propagate errors when registerUseCase throws', async () => {
      const body: RegisterRequest = {
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
});
