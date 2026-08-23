import type { UserEntity } from '~domain/entities/user.entity';

export interface AuthService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  generateAccessToken(user: AccessTokenPayload): string;
  generateRefreshToken(): string;
  createRefreshTokenExpiryDate(): Date;
}

export type AccessTokenPayload = Pick<UserEntity, 'id' | 'email' | 'role'>;
