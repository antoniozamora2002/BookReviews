import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  resetDb,
  registerAndLogin,
  registerAdmin,
  seedBook,
  Sesion,
} from './helpers';

describe('Autorizacion / RBAC (e2e)', () => {
  let app: INestApplication;
  let ana: Sesion;
  let intruso: Sesion;
  let admin: Sesion;
  let bookId: number;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb(app);
    ana = await registerAndLogin(app, 'ana@test.com');
    intruso = await registerAndLogin(app, 'intruso@test.com');
    admin = await registerAdmin(app, 'admin@test.com');
    bookId = (await seedBook(app)).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  // #3: antes bastaba estar autenticado para tocar CUALQUIER usuario
  describe('IDOR en /users', () => {
    it('un usuario NO puede leer otro usuario', async () => {
      await request(app.getHttpServer())
        .get(`/users/${ana.id}`)
        .set(auth(intruso.token))
        .expect(403);
    });

    it('un usuario NO puede modificar otro usuario', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${ana.id}`)
        .set(auth(intruso.token))
        .send({ email: 'secuestrado@test.com' })
        .expect(403);

      // Y el email sigue intacto
      const res = await request(app.getHttpServer())
        .get(`/users/${ana.id}`)
        .set(auth(ana.token))
        .expect(200);
      expect(res.body.email).toBe('ana@test.com');
    });

    it('un usuario NO puede borrar otro usuario', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${ana.id}`)
        .set(auth(intruso.token))
        .expect(403);

      // Lo critico: sigue existiendo
      await request(app.getHttpServer())
        .get(`/users/${ana.id}`)
        .set(auth(ana.token))
        .expect(200);
    });

    it('un usuario SI puede leerse y modificarse a si mismo', async () => {
      await request(app.getHttpServer())
        .get(`/users/${ana.id}`)
        .set(auth(ana.token))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/users/${ana.id}`)
        .set(auth(ana.token))
        .send({ email: 'ana2@test.com' })
        .expect(200);
    });

    it('un admin SI puede operar sobre cualquier usuario', async () => {
      await request(app.getHttpServer())
        .get(`/users/${ana.id}`)
        .set(auth(admin.token))
        .expect(200);
    });
  });

  describe('endpoints solo de admin', () => {
    it('GET /users es solo para admin', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set(auth(ana.token))
        .expect(403);

      await request(app.getHttpServer())
        .get('/users')
        .set(auth(admin.token))
        .expect(200);
    });

    it('PATCH /users/:id/role es solo para admin', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${intruso.id}/role`)
        .set(auth(ana.token))
        .send({ role: 'admin' })
        .expect(403);
    });
  });

  // #3: el catalogo es compartido; antes cualquiera lo editaba o borraba
  describe('IDOR en /books', () => {
    it('un usuario normal NO puede modificar el catalogo', async () => {
      await request(app.getHttpServer())
        .patch(`/books/${bookId}`)
        .set(auth(ana.token))
        .send({ title: 'Titulo secuestrado' })
        .expect(403);
    });

    it('un usuario normal NO puede borrar del catalogo', async () => {
      await request(app.getHttpServer())
        .delete(`/books/${bookId}`)
        .set(auth(ana.token))
        .expect(403);

      // El libro sigue ahi (borrarlo arrastraria las resenas por CASCADE)
      await request(app.getHttpServer())
        .get(`/books/${bookId}`)
        .set(auth(ana.token))
        .expect(200);
    });

    it('un usuario normal SI puede leer el catalogo', async () => {
      await request(app.getHttpServer())
        .get('/books')
        .set(auth(ana.token))
        .expect(200);
    });

    it('un admin SI puede modificar el catalogo', async () => {
      await request(app.getHttpServer())
        .patch(`/books/${bookId}`)
        .set(auth(admin.token))
        .send({ title: 'Dune (edicion revisada)' })
        .expect(200);
    });
  });

  describe('escalada de privilegios', () => {
    it('no se puede colar "role" al registrarse', async () => {
      // forbidNonWhitelisted: role no esta en CreateUserDto
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'listillo@test.com',
          password: 'secreto123',
          role: 'admin',
        })
        .expect(400);
    });

    it('no se puede colar "role" en un PATCH /users/:id propio', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${ana.id}`)
        .set(auth(ana.token))
        .send({ role: 'admin' })
        .expect(400);
    });
  });
});
