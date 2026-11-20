import type { PublicAuthor, UserOutput, UserQuery, UserRepository } from '~application/repositories/user.repository';
import { EntityNotFoundException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';

// Whitelist: chỉ những trường an toàn để hiển thị công khai (không email, role, password).
// Chọn từng trường thay vì loại trừ, để trường mới thêm vào user sau này không vô tình bị lộ.
function toPublicAuthor(user: UserOutput): PublicAuthor {
  return {
    id: user.id,
    username: user.username,
    bio: user.bio,
    avatarId: user.avatarId,
    createdAt: user.createdAt,
  };
}

export class UserFacade {
  constructor(private readonly userRepository: UserRepository) {}

  async getAuthor(userId: UserId): Promise<PublicAuthor> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }
    return toPublicAuthor(user);
  }

  async search(query: UserQuery) {
    const [users, total] = await Promise.all([this.userRepository.search(query), this.userRepository.count(query)]);
    return { data: users.map(toPublicAuthor), total };
  }
}
