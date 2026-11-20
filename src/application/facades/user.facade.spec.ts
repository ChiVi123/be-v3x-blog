import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { UserOutput, UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import { EntityNotFoundException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { UserFacade } from './user.facade';

describe('UserFacade', () => {
  let facade: UserFacade;
  let mockUserRepository: {
    findById: ReturnType<typeof mock>;
    search: ReturnType<typeof mock>;
    count: ReturnType<typeof mock>;
  };

  const userId = 'user-1' as UserId;
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const user: UserOutput = {
    id: userId,
    username: 'john_doe',
    email: 'john@example.com',
    role: Role.ADMIN,
    bio: 'Writer',
    avatarId: null,
    createdAt,
    updatedAt: new Date('2026-02-01T00:00:00Z'),
  };
  const publicAuthor = { id: userId, username: 'john_doe', bio: 'Writer', avatarId: null, createdAt };

  beforeEach(() => {
    mockUserRepository = {
      findById: mock(async () => user),
      search: mock(async () => [user]),
      count: mock(async () => 1),
    };

    facade = new UserFacade(mockUserRepository as unknown as UserRepository);
  });

  describe('getAuthor', () => {
    it('returns only the public fields', async () => {
      const result = await facade.getAuthor(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(publicAuthor);
      expect(Object.keys(result).sort()).toEqual(['avatarId', 'bio', 'createdAt', 'id', 'username']);
    });

    it('strips sensitive fields even if the repository returns them by mistake', async () => {
      mockUserRepository.findById = mock(async () => ({ ...user, password: '$2b$10$hash' }));

      const result = await facade.getAuthor(userId);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('role');
    });

    it('throws EntityNotFoundException when the user does not exist', async () => {
      mockUserRepository.findById = mock(async () => null);

      await expect(facade.getAuthor(userId)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('search', () => {
    it('maps every user to the public shape and returns the total', async () => {
      const result = await facade.search({ page: 1, limit: 10 });

      expect(mockUserRepository.search).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(mockUserRepository.count).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual({ data: [publicAuthor], total: 1 });
    });
  });
});
