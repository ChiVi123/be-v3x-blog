import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { AuthFacade } from '~application/facades/auth.facade';
import type { ClientContext } from '~application/types/use-case.type';
import { Role } from '~domain/entities/user.entity';
import { UnauthorizedException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { AppConfigService } from '~infrastructure/config/env';
import { ClientInfo, CurrentUser } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { PublicRegisterRequest } from '~presentation/dtos/auth/register.dto';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { LoginRequest } from '~presentation/dtos/login.dto';
import { JwtAuthGuard } from '~presentation/guards';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh-token';
const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

@Controller('auth')
export class AuthController {
  // private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authFacade: AuthFacade,
    @Inject(AppConfigService) private readonly configService: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: ONE_MINUTE_MS } })
  async login(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
    @ClientInfo() clientContext: ClientContext,
  ) {
    const { refreshToken, refreshTokenExpiryDate, accessToken } = await this.authFacade.login({
      email: body.email,
      password: body.password,
      clientContext,
    });

    this.setRefreshTokenCookie(res, refreshToken, refreshTokenExpiryDate);

    return { accessToken, refreshTokenExpiryDate };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR_MS } })
  async register(@Body() body: PublicRegisterRequest) {
    return this.authFacade.register({
      email: body.email,
      password: body.password,
      username: body.username,
      role: Role.USER,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE_MS } })
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
    } = await this.authFacade.refresh({
      refreshToken,
      clientContext,
    });

    this.setRefreshTokenCookie(res, newRefreshToken, refreshTokenExpiryDate);
    return { accessToken, refreshTokenExpiryDate };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('id') userId: UserId) {
    return this.authFacade.getMe(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      this.clearRefreshTokenCookie(res);
      return;
    }

    try {
      await this.authFacade.logout(refreshToken);
    } finally {
      this.clearRefreshTokenCookie(res);
    }
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, this.getRefreshTokenCookieOptions());
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
