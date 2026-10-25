import type { UserRepository } from '~application/repositories/user.repository';
import type { UserId } from '~domain/types/branded';

export class UserFacade {
  constructor(private readonly userRepository: UserRepository) {}

  getAuthor(userId: UserId) {
    return this.userRepository.findById(userId);
  }
}
