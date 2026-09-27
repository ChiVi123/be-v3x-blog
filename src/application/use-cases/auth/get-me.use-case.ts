import type { UserRepository } from '~application/repositories/user.repository';
import type { Role } from '~domain/entities/user.entity';
import { UnauthorizedException } from '~domain/exceptions';
import type { ImageId, UserId } from '~domain/types/branded';

export type GetMeUseCaseResult = {
  id: UserId;
  username: string;
  email: string;
  role: Role;
  avatarId: ImageId | null;
  createdAt: Date;
  updatedAt: Date;
};

export class GetMeUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: UserId): Promise<GetMeUseCaseResult> {
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
