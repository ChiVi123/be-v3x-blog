import { Logger } from '@nestjs/common';
import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import type { ClientContext } from '~application/types/use-case.type';
import { Role } from '~domain/entities/user.entity';
import { InvalidCredentialsException, UnauthorizedException, UserAlreadyExistsException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';

export type LoginParams = {
  email: string;
  password: string;
  clientContext: ClientContext;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiryDate: Date;
};

export type RegisterParams = {
  email: string;
  password: string;
  username: string;
  role?: Role;
};

export type RegisterResult = {
  id: UserId;
  email: string;
  username: string;
};

export type RefreshParams = {
  refreshToken: string;
  clientContext: ClientContext;
};

export type RefreshResult = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiryDate: Date;
};

export class AuthFacade {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: logger will be used in the future
  private readonly logger = new Logger(AuthFacade.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly authService: AuthService,
  ) {}

  async login({ email, password, clientContext }: LoginParams): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email, true);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.authService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const refreshTokenExpiryDate = this.authService.createRefreshTokenExpiryDate();
    const refreshToken = await this.sessionRepository.create({
      userId: user.id,
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
      refreshToken: this.authService.generateRefreshToken(),
      expiresAt: refreshTokenExpiryDate,
    });

    return {
      accessToken: this.authService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken,
      refreshTokenExpiryDate,
    };
  }

  // TODO: Send mail to verify email
  async register({ email, password, username, role = Role.USER }: RegisterParams): Promise<RegisterResult> {
    const isExist = await this.userRepository.isExistByEmail(email);
    if (isExist) {
      throw new UserAlreadyExistsException();
    }

    const hashedPassword = await this.authService.hashPassword(password);

    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      role,
      bio: null,
      avatarId: null,
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
    };
  }

  async refresh({ refreshToken, clientContext }: RefreshParams): Promise<RefreshResult> {
    const session = await this.sessionRepository.findValidByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const newRefreshToken = this.authService.generateRefreshToken();
    const refreshTokenExpiryDate = this.authService.createRefreshTokenExpiryDate();

    const didRotate = await this.sessionRepository.rotateRefreshToken({
      sessionId: session.id,
      currentRefreshToken: refreshToken,
      newRefreshToken,
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
      expiresAt: refreshTokenExpiryDate,
    });
    if (!didRotate) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      accessToken: this.authService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken: newRefreshToken,
      refreshTokenExpiryDate,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepository.deleteByRefreshToken(refreshToken);
  }

  async getMe(userId: UserId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarId: user.avatarId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
