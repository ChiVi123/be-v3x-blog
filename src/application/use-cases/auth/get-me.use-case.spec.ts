import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role, type UserEntity } from '~domain/entities/user.entity';
import { UnauthorizedException } from '~domain/exceptions';
import type { ImageId, UserId } from '~domain/types/branded';
import { GetMeUseCase } from './get-me.use-case';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let mockUserRepository: { findById: ReturnType<typeof mock> };

  const mockUser: UserEntity = {
    id: 'user-1' as UserId,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashed-password',
    role: Role.USER,
    avatarId: null as ImageId | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: mock(async () => mockUser),
    };
    useCase = new GetMeUseCase(mockUserRepository as unknown as UserRepository);
  });

  it('should return user details without password when user exists', async () => {
    const result = await useCase.execute('user-1' as UserId);

    expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1' as UserId);
    expect(result).toEqual({
      id: 'user-1' as UserId,
      username: 'testuser',
      email: 'test@example.com',
      role: Role.USER,
      avatarId: null,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    });
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    mockUserRepository.findById = mock(async () => null);

    expect(useCase.execute('non-existent' as UserId)).rejects.toThrow(UnauthorizedException);
  });
});
