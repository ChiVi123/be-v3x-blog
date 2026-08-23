import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let serverUrl: string;

  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-jwt-secret';
    process.env.DB_URL ||= 'postgresql://user:password@localhost:5432/blog';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await app.listen(0);
    serverUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) hello world', async () => {
    const response = await fetch(`${serverUrl}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toBe('Hello World!');
  });
});
