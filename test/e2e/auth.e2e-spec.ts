import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app-factory';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { cleanDatabase } from '../helpers/db-cleaner';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const register = () =>
    request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', password: 'password123' });

  const login = () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

  describe('POST /auth/login', () => {
    beforeEach(register);

    it('200 — returns token pair on valid credentials', async () => {
      const res = await login().expect(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('401 — returns unauthorized on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(401);
    });

    it('401 — returns unauthorized for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ghost@example.com', password: 'password123' })
        .expect(401);
    });

    it('400 — returns validation error on invalid body', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bad-email', password: 'pw' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await register();
      const res = await login();
      refreshToken = res.body.refreshToken;
    });

    it('200 — returns new token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('401 — rejects a consumed refresh token (rotation enforcement)', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('204 — revokes refresh token after logout', async () => {
      await register();
      const loginRes = await login();
      const { accessToken, refreshToken } = loginRes.body;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });
  });

  describe('Error response shape', () => {
    it('error responses include message, code, details, timestamp, requestId', async () => {
      await register();
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.body).toMatchObject({
        message: expect.any(String),
        code: expect.any(String),
        details: expect.any(Array),
        timestamp: expect.any(String),
        requestId: expect.any(String),
      });
    });
  });
});
