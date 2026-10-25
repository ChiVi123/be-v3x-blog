import type { UserRepository } from '~application/repositories/user.repository';
import type { UserId } from '~domain/types/branded';

export class GetAuthorUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: UserId) {
    return this.userRepository.findById(userId);
  }
}
