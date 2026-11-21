import 'reflect-metadata';

import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { ImageRepository } from '~application/repositories/image.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import { Role } from '~domain/entities/user.entity';
import type { ImageId } from '~domain/types/branded';
import { AppConfigService } from '~infrastructure/config/env';
import {
  IMAGE_REPOSITORY_TOKEN,
  IMAGE_STORAGE_SERVICE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/app.setup';
import { DB_CLEANUP_TOKEN, TestDatabaseModule } from '../utils/test-database.module';

const PASSWORD = 'password123';
const USER_EMAIL = 'image_user@example.com';
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type UploadOptions = {
  token?: string;
  file?: { type: string; bytes: Uint8Array; name: string };
  alt?: string;
};

describe('ImageController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let serverUrl: string;
  let userToken: string;
  let imageRepository: ImageRepository;

  // Storage giả: không gọi Cloudinary thật.
  const fakeStorage = {
    upload: mock(async () => ({
      remoteKey: 'tap-blog/fake-image',
      url: 'https://res.cloudinary.com/demo/image/upload/tap-blog/fake-image.png',
      width: 800,
      height: 600,
      format: 'png',
      size: 1234,
    })),
  };

  async function upload(options: UploadOptions = {}) {
    const form = new FormData();
    if (options.file) {
      form.append('file', new Blob([options.file.bytes as BlobPart], { type: options.file.type }), options.file.name);
    }
    if (options.alt !== undefined) {
      form.append('alt', options.alt);
    }

    return fetch(`${serverUrl}/images`, {
      method: 'POST',
      headers: options.token ? { Authorization: `Bearer ${options.token}` } : {},
      body: form,
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
      .overrideProvider(IMAGE_STORAGE_SERVICE_TOKEN)
      .useValue(fakeStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, moduleFixture.get(AppConfigService));
    await app.init();
    await app.listen(0);
    serverUrl = await app.getUrl();

    imageRepository = moduleFixture.get<ImageRepository>(IMAGE_REPOSITORY_TOKEN);
    const userRepository = moduleFixture.get<UserRepository>(USER_REPOSITORY_TOKEN);
    const bcrypt = await import('bcrypt');

    await userRepository.create({
      username: 'image_user',
      email: USER_EMAIL,
      password: await bcrypt.hash(PASSWORD, 10),
      role: Role.USER,
      avatarId: null,
      bio: null,
    });

    const loginResponse = await fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Bun-E2E-Agent/1.0' },
      body: JSON.stringify({ email: USER_EMAIL, password: PASSWORD }),
    });
    userToken = (await loginResponse.json()).accessToken;
  }, 30000);

  afterAll(async () => {
    const cleanup = moduleFixture?.get<{ close: () => Promise<void> }>(DB_CLEANUP_TOKEN);
    await cleanup?.close();
    await app?.close();
  }, 30000);

  describe('POST /images', () => {
    it('returns 401 without an access token', async () => {
      const response = await upload({
        file: { type: 'image/png', bytes: PNG_BYTES, name: 'cover.png' },
        alt: 'A cover image',
      });

      expect(response.status).toBe(401);
      expect(fakeStorage.upload).not.toHaveBeenCalled();
    });

    it('returns 400 when the file is missing', async () => {
      const response = await upload({ token: userToken, alt: 'A cover image' });

      expect(response.status).toBe(400);
    });

    it('returns 400 when alt text is missing', async () => {
      const response = await upload({
        token: userToken,
        file: { type: 'image/png', bytes: PNG_BYTES, name: 'cover.png' },
      });

      expect(response.status).toBe(400);
    });

    it('returns 415 for a file type that is not allowed', async () => {
      const response = await upload({
        token: userToken,
        file: { type: 'text/plain', bytes: new TextEncoder().encode('hello'), name: 'note.txt' },
        alt: 'Not an image',
      });

      expect(response.status).toBe(415);
      expect(fakeStorage.upload).not.toHaveBeenCalled();
    });

    it('returns 413 when the file is larger than 5 MB', async () => {
      const response = await upload({
        token: userToken,
        file: { type: 'image/png', bytes: new Uint8Array(MAX_IMAGE_SIZE_BYTES + 1), name: 'huge.png' },
        alt: 'Too large',
      });

      expect(response.status).toBe(413);
      expect(fakeStorage.upload).not.toHaveBeenCalled();
    });

    it('uploads the image, saves it to the database and returns its public fields', async () => {
      const response = await upload({
        token: userToken,
        file: { type: 'image/png', bytes: PNG_BYTES, name: 'cover.png' },
        alt: '  A cover image  ',
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.url).toBe('https://res.cloudinary.com/demo/image/upload/tap-blog/fake-image.png');
      expect(body.alt).toBe('A cover image');
      expect(body.metadata).toEqual({ width: 800, height: 600, format: 'png', size: 1234 });
      expect(body).not.toHaveProperty('remoteKey');
      expect(fakeStorage.upload).toHaveBeenCalledTimes(1);

      const saved = await imageRepository.findById(body.id as ImageId);
      expect(saved?.remoteKey).toBe('tap-blog/fake-image');
    });
  });
});
