import { Inject, Injectable } from '@nestjs/common';
// biome-ignore lint/style/useImportType: JwtService class is required for NestJS DI
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import ms from 'ms';
import type { AccessTokenPayload, AuthService } from '~application/services/auth.service';
import { AppConfigService } from '~infrastructure/config/env';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthServiceImpl implements AuthService {
  constructor(
    @Inject(AppConfigService) private readonly configService: AppConfigService,
    private readonly jwt: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(user: AccessTokenPayload): string {
    return this.jwt.sign(user, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRY'),
    });
  }

  generateRefreshToken(): string {
    return crypto.randomUUID();
  }

  createRefreshTokenExpiryDate(): Date {
    const expiry = this.configService.get('REFRESH_TOKEN_EXPIRY');
    const durationMs = typeof expiry === 'number' ? expiry : ms(expiry);
    return new Date(Date.now() + durationMs);
  }
}
