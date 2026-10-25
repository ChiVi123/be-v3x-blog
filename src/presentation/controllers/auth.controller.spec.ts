import 'reflect-metadata';

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthFacade } from '~application/facades/auth.facade';
import type { ClientContext } from '~application/types/use-case.type';
import { Role } from '~domain/entities/user.entity';
import { InvalidCredentialsException, UnauthorizedException, UserAlreadyExistsException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { AppConfigService } from '~infrastructure/config/env';
import { AUTH_SERVICE_TOKEN } from '~infrastructure/config/provider-tokens';
import { AuthController } from '~presentation/controllers/auth.controller';
import type { PublicRegisterRequest } from '~presentation/dtos/auth/register.dto';
import type { LoginRequest } from '~presentation/dtos/login.dto';
import { JwtAuthGuard } from '~presentation/guards';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthFacade: {
    login: ReturnType<typeof mock>;
    register: ReturnType<typeof mock>;
    refresh: ReturnType<typeof mock>;
    logout: ReturnType<typeof mock>;
    getMe: ReturnType<typeof mock>;
  };
  let mockConfigService: { get: ReturnType<typeof mock> };

  const mockExpiryDate = new Date('2026-09-27T00:00:00Z');

  beforeEach(async () => {
    mockAuthFacade = {
      login: mock(async () => ({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        refreshTokenExpiryDate: mockExpiryDate,
      })),
      register: mock(async () => ({
        id: 'user-1' as UserId,
        email: 'test@example.com',
        username: 'testuser',
      })),
      refresh: mock(async () => ({
        accessToken: 'mock-new-access-token',
        refreshToken: 'mock-new-refresh-token',
        refreshTokenExpiryDate: mockExpiryDate,
      })),
      logout: mock(async () => undefined),
      getMe: mock(async () => ({
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
          provide: AuthFacade,
          useValue: mockAuthFacade,
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
    it('should pass body and clientContext to authFacade.login, set a cookie, and return access token and expiry date', async () => {
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

      expect(mockAuthFacade.login).toHaveBeenCalledWith({
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

    it('should propagate errors when authFacade.login throws', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      const clientContext: ClientContext = {
        ipAddress: '0.0.0.0',
        userAgent: 'Unknown',
      };

      mockAuthFacade.login = mock(async () => {
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

      expect(mockAuthFacade.register).toHaveBeenCalledWith({
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

    it('should propagate errors when authFacade.register throws', async () => {
      const body: PublicRegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      mockAuthFacade.register = mock(async () => {
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
      expect(mockAuthFacade.refresh).not.toHaveBeenCalled();
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

      expect(mockAuthFacade.refresh).toHaveBeenCalledWith({
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

    it('should propagate errors when authFacade.refresh throws', async () => {
      const req = {
        cookies: {
          'refresh-token': 'invalid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        cookie: mock(),
      } as unknown as Response;

      mockAuthFacade.refresh = mock(async () => {
        throw new InvalidCredentialsException();
      });

      expect(controller.refresh(req, res, clientContext)).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('me', () => {
    it('should return authenticated user profile', async () => {
      const result = await controller.me('user-1' as UserId);

      expect(mockAuthFacade.getMe).toHaveBeenCalledWith('user-1' as UserId);
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

    it('should propagate errors when authFacade.getMe throws', async () => {
      mockAuthFacade.getMe = mock(async () => {
        throw new UnauthorizedException('User not found');
      });

      expect(controller.me('user-1' as UserId)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear cookie without calling authFacade.logout when no cookie present', async () => {
      const req = {
        cookies: {},
      } as unknown as Request;
      const res = {
        clearCookie: mock(),
      } as unknown as Response;

      await controller.logout(req, res);

      expect(mockAuthFacade.logout).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
      });
    });

    it('should call authFacade.logout with refresh token and clear cookie when cookie is present', async () => {
      const req = {
        cookies: {
          'refresh-token': 'valid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        clearCookie: mock(),
      } as unknown as Response;

      await controller.logout(req, res);

      expect(mockAuthFacade.logout).toHaveBeenCalledWith('valid-refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
      });
    });

    it('should still clear cookie even when authFacade.logout throws (try/finally)', async () => {
      const req = {
        cookies: {
          'refresh-token': 'valid-refresh-token',
        },
      } as unknown as Request;
      const res = {
        clearCookie: mock(),
      } as unknown as Response;

      mockAuthFacade.logout = mock(async () => {
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
