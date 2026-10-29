import type { UserQuery, UserRepository } from '~application/repositories/user.repository';
import type { UserId } from '~domain/types/branded';

export class UserFacade {
  constructor(private readonly userRepository: UserRepository) {}

  getAuthor(userId: UserId) {
    return this.userRepository.findById(userId);
  }

  async search(query: UserQuery) {
    const [users, total] = await Promise.all([this.userRepository.search(query), this.userRepository.count(query)]);
    return { data: users, total };
  }
}
