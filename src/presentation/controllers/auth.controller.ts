import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import type { ClientContext } from '~application/types/use-case.type';
import type { RefreshUseCase, RegisterUseCase } from '~application/use-cases/auth';
import type { LoginUseCase } from '~application/use-cases/login.use-case';
import { UnauthorizedException } from '~domain/exceptions';
import { AppConfigService } from '~infrastructure/config/env';
import {
  LOGIN_USE_CASE_TOKEN,
  REFRESH_USE_CASE_TOKEN,
  REGISTER_USE_CASE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { ClientInfo } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { RegisterRequest } from '~presentation/dtos/auth/register.dto';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { LoginRequest } from '~presentation/dtos/login.dto';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh-token';

@Controller('auth')
export class AuthController {
  // private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(LOGIN_USE_CASE_TOKEN)
    private readonly loginUseCase: LoginUseCase,
    @Inject(REGISTER_USE_CASE_TOKEN)
    private readonly registerUseCase: RegisterUseCase,
    @Inject(REFRESH_USE_CASE_TOKEN)
    private readonly refreshUseCase: RefreshUseCase,
    @Inject(AppConfigService) private readonly configService: AppConfigService,
  ) {}

  // TODO: Set refresh token cookie and access token on login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest, @ClientInfo() clientContext: ClientContext) {
    return this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      clientContext,
    });
  }

  // TODO: The route is public, set role is User by default
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterRequest) {
    return this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      username: body.username,
      role: body.role,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @ClientInfo() clientContext: ClientContext,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiryDate,
    } = await this.refreshUseCase.execute({
      refreshToken,
      clientContext,
    });

    this.setRefreshTokenCookie(res, newRefreshToken, refreshTokenExpiryDate);
    return { accessToken };
  }

  private getRefreshTokenCookieOptions(expires?: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      ...(expires ? { expires } : {}),
    };
  }

  private setRefreshTokenCookie(res: Response, token: string, expires: Date): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, this.getRefreshTokenCookieOptions(expires));
  }
}
