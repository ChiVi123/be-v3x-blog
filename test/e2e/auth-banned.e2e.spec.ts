import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role, UserStatus } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';
import { AppConfigService } from '~infrastructure/config/env';
import { USER_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/app.setup';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from '../utils/test-database.module';

const EMAIL = 'banned_test@example.com';
const PASSWORD = 'password123';

function getRefreshCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Expected the response to set a refresh-token cookie');
  }
  return setCookie.split(';')[0];
}

describe('Banned account (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let userRepository: UserRepository;
  let userId: UserId;

  function login(password = PASSWORD) {
    return fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Bun-E2E-Agent/1.0' },
      body: JSON.stringify({ email: EMAIL, password }),
    });
  }

  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-jwt-secret';
    process.env.DB_URL ||= 'postgresql://user:password@localhost:5432/blog';

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, moduleFixture.get(AppConfigService));
    await app.init();
    await app.listen(0);
    serverUrl = await app.getUrl();

    userRepository = moduleFixture.get<UserRepository>(USER_REPOSITORY_TOKEN);
    const bcrypt = await import('bcrypt');
    const user = await userRepository.create({
      username: 'banned_test_user',
      email: EMAIL,
      password: await bcrypt.hash(PASSWORD, 10),
      role: Role.USER,
      avatarId: null,
      bio: null,
    });
    userId = user.id;
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  it('new users are active and can log in', async () => {
    const response = await login();

    expect(response.status).toBe(200);
  });

  it('rejects a refresh with 403 once the user is banned', async () => {
    const cookie = getRefreshCookie(await login());
    await userRepository.update(userId, { status: UserStatus.BANNED });

    const response = await fetch(`${serverUrl}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(403);
  });

  it('rejects a login with 403 when the password is right', async () => {
    const response = await login();

    expect(response.status).toBe(403);
  });

  it('still answers 401 when the password is wrong, so a ban is not revealed', async () => {
    const response = await login('wrong_password_123');

    expect(response.status).toBe(401);
  });

  it('lets the user log in again after being unbanned', async () => {
    await userRepository.update(userId, { status: UserStatus.ACTIVE });

    const response = await login();

    expect(response.status).toBe(200);
  });
});
