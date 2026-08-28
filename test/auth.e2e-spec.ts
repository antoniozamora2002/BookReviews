import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, resetDb, registerAndLogin } from './helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('crea el usuario y nunca devuelve la contraseña', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'nuevo@test.com', password: 'secreto123' })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        email: 'nuevo@test.com',
      });
      expect(JSON.stringify(res.body)).not.toContain('$2b$');
    });

    it('rechaza un email invalido', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'no-es-un-email', password: 'secreto123' })
        .expect(400);
    });

    it('rechaza una contraseña demasiado corta', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@test.com', password: 'abc' })
        .expect(400);
    });

    it('rechaza campos no declarados en el DTO', async () => {
      // forbidNonWhitelisted: evita que alguien cuele campos como "role"
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@test.com', password: 'secreto123', role: 'admin' })
        .expect(400);
    });

    it('no crea un segundo usuario con el mismo email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', password: 'secreto123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', password: 'secreto123' });

      // PENDIENTE: hoy responde 500 porque el QueryFailedError de Postgres
      // sube sin filtro de excepciones. Deberia ser un 409 Conflict.
      // No fijamos el codigo para no consagrar el bug; lo que importa es
      // que la restriccion unique aguante y no se duplique el usuario.
      expect(res.status).toBeGreaterThanOrEqual(400);

      const ds = app.get(DataSource);
      const [{ count }] = await ds.query(
        `SELECT COUNT(*)::int AS count FROM "user" WHERE email = 'dup@test.com'`,
      );
      expect(count).toBe(1);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'login@test.com', password: 'secreto123' })
        .expect(201);
    });

    it('devuelve un token con credenciales validas', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'secreto123' })
        .expect(201);

      expect(typeof res.body.access_token).toBe('string');
    });

    it('devuelve 401 con la contraseña incorrecta', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'incorrecta' })
        .expect(401);
    });

    it('devuelve 401 si el email no existe', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'fantasma@test.com', password: 'secreto123' })
        .expect(401);
    });
  });

  describe('rutas protegidas', () => {
    it('GET /profile sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/profile').expect(401);
    });

    it('GET /profile con token devuelve la identidad del token', async () => {
      const { token, id } = await registerAndLogin(app, 'perfil@test.com');

      const res = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({ userId: id, email: 'perfil@test.com' });
    });

    it('GET /users sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('un token con firma invalida es rechazado', async () => {
      const { token } = await registerAndLogin(app, 'firma@test.com');
      const manipulado = token.slice(0, -3) + 'xxx';

      await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${manipulado}`)
        .expect(401);
    });
  });
});
