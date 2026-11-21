import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserOutput, UserRepository } from '~application/repositories/user.repository';
import { Role, UserStatus } from '~domain/entities/user.entity';
import { ConflictException, EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { AdminUserFacade } from './admin-user.facade';

describe('AdminUserFacade', () => {
  let facade: AdminUserFacade;
  let mockUserRepository: {
    findById: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    searchAdmin: ReturnType<typeof mock>;
    countAdmin: ReturnType<typeof mock>;
    countActiveAdmins: ReturnType<typeof mock>;
  };
  let mockSessionRepository: { deleteByUserId: ReturnType<typeof mock> };

  const adminId = 'admin-1' as UserId;
  const targetId = 'user-1' as UserId;
  const createdAt = new Date('2026-01-01T00:00:00Z');

  const makeUser = (overrides: Partial<UserOutput> = {}): UserOutput => ({
    id: targetId,
    username: 'john_doe',
    email: 'john@example.com',
    role: Role.USER,
    status: UserStatus.ACTIVE,
    bio: null,
    avatarId: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });

  beforeEach(() => {
    mockUserRepository = {
      findById: mock(async () => makeUser()),
      update: mock(async () => undefined),
      searchAdmin: mock(async () => [{ ...makeUser(), postsCount: 3 }]),
      countAdmin: mock(async () => 1),
      countActiveAdmins: mock(async () => 2),
    };
    mockSessionRepository = { deleteByUserId: mock(async () => undefined) };

    facade = new AdminUserFacade(
      mockUserRepository as unknown as UserRepository,
      mockSessionRepository as unknown as SessionRepository,
    );
  });

  describe('list', () => {
    it('returns the users with email, role and status, plus the total', async () => {
      const query = { page: 1, limit: 10, role: Role.USER };
      const result = await facade.list(query);

      expect(mockUserRepository.searchAdmin).toHaveBeenCalledWith(query);
      expect(mockUserRepository.countAdmin).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [{ ...makeUser(), postsCount: 3 }], total: 1 });
    });
  });

  describe('changeRole', () => {
    it('promotes a user to admin', async () => {
      await facade.changeRole({ id: targetId, role: Role.ADMIN, requesterId: adminId });

      expect(mockUserRepository.update).toHaveBeenCalledWith(targetId, { role: Role.ADMIN });
    });

    it('does nothing when the user already has that role', async () => {
      const result = await facade.changeRole({ id: targetId, role: Role.USER, requesterId: adminId });

      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual(makeUser());
    });

    it('refuses to change the requester own role', async () => {
      await expect(facade.changeRole({ id: adminId, role: Role.USER, requesterId: adminId })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('throws EntityNotFoundException when the user does not exist', async () => {
      mockUserRepository.findById = mock(async () => null);

      await expect(facade.changeRole({ id: targetId, role: Role.ADMIN, requesterId: adminId })).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('refuses to demote the last active admin', async () => {
      mockUserRepository.findById = mock(async () => makeUser({ role: Role.ADMIN }));
      mockUserRepository.countActiveAdmins = mock(async () => 1);

      await expect(facade.changeRole({ id: targetId, role: Role.USER, requesterId: adminId })).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('demotes an admin when other active admins remain', async () => {
      mockUserRepository.findById = mock(async () => makeUser({ role: Role.ADMIN }));

      await facade.changeRole({ id: targetId, role: Role.USER, requesterId: adminId });

      expect(mockUserRepository.update).toHaveBeenCalledWith(targetId, { role: Role.USER });
    });

    it('does not count a banned admin as the last active admin', async () => {
      mockUserRepository.findById = mock(async () => makeUser({ role: Role.ADMIN, status: UserStatus.BANNED }));
      mockUserRepository.countActiveAdmins = mock(async () => 1);

      await facade.changeRole({ id: targetId, role: Role.USER, requesterId: adminId });

      expect(mockUserRepository.update).toHaveBeenCalledWith(targetId, { role: Role.USER });
    });
  });

  describe('changeStatus', () => {
    it('bans a user and deletes all of their sessions', async () => {
      await facade.changeStatus({ id: targetId, status: UserStatus.BANNED, requesterId: adminId });

      expect(mockUserRepository.update).toHaveBeenCalledWith(targetId, { status: UserStatus.BANNED });
      expect(mockSessionRepository.deleteByUserId).toHaveBeenCalledWith(targetId);
    });

    it('unbans a user without touching sessions', async () => {
      mockUserRepository.findById = mock(async () => makeUser({ status: UserStatus.BANNED }));

      await facade.changeStatus({ id: targetId, status: UserStatus.ACTIVE, requesterId: adminId });

      expect(mockUserRepository.update).toHaveBeenCalledWith(targetId, { status: UserStatus.ACTIVE });
      expect(mockSessionRepository.deleteByUserId).not.toHaveBeenCalled();
    });

    it('does nothing when the user already has that status', async () => {
      await facade.changeStatus({ id: targetId, status: UserStatus.ACTIVE, requesterId: adminId });

      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockSessionRepository.deleteByUserId).not.toHaveBeenCalled();
    });

    it('refuses to ban the requester', async () => {
      await expect(
        facade.changeStatus({ id: adminId, status: UserStatus.BANNED, requesterId: adminId }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('refuses to ban the last active admin and keeps their sessions', async () => {
      mockUserRepository.findById = mock(async () => makeUser({ role: Role.ADMIN }));
      mockUserRepository.countActiveAdmins = mock(async () => 1);

      await expect(
        facade.changeStatus({ id: targetId, status: UserStatus.BANNED, requesterId: adminId }),
      ).rejects.toThrow(ConflictException);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockSessionRepository.deleteByUserId).not.toHaveBeenCalled();
    });

    it('throws EntityNotFoundException when the user does not exist', async () => {
      mockUserRepository.findById = mock(async () => null);

      await expect(
        facade.changeStatus({ id: targetId, status: UserStatus.BANNED, requesterId: adminId }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
