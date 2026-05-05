import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app-factory';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { cleanDatabase } from '../helpers/db-cleaner';

describe('Users (e2e)', () => {
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

  describe('POST /users', () => {
    it('201 — creates a user with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'new@example.com', password: 'secure123' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe('new@example.com');
      expect(res.body.password).toBeUndefined();
    });

    it('409 — returns conflict when email already exists', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'dup@example.com', password: 'secure123' });

      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'dup@example.com', password: 'secure123' })
        .expect(409);

      expect(res.body.code).toBe('CONFLICT');
    });

    it('400 — returns validation error on invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'not-an-email', password: 'secure123' })
        .expect(400);

      expect(res.body.details).toBeDefined();
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('400 — returns validation error on short password', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'ok@example.com', password: 'short' })
        .expect(400);
    });
  });

  describe('Protected routes', () => {
    it('401 — returns unauthorized without token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});
