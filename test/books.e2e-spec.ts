import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, resetDb, registerAndLogin, Sesion } from './helpers';

describe('Books (e2e)', () => {
  let app: INestApplication;
  let sesion: Sesion;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb(app);
    sesion = await registerAndLogin(app, 'books@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  describe('GET /books/search', () => {
    // El bug: sin q, la URL acababa con q=undefined y Google devolvia
    // resultados de buscar literalmente la palabra "undefined"
    it('sin el parametro q responde 400, no busca "undefined"', async () => {
      const res = await request(app.getHttpServer())
        .get('/books/search')
        .set(auth(sesion.token))
        .expect(400);

      expect(JSON.stringify(res.body)).not.toContain('undefined"');
    });

    it('rechaza un q vacio', async () => {
      await request(app.getHttpServer())
        .get('/books/search?q=')
        .set(auth(sesion.token))
        .expect(400);
    });

    it('rechaza parametros no declarados', async () => {
      await request(app.getHttpServer())
        .get('/books/search?q=dune&malicioso=1')
        .set(auth(sesion.token))
        .expect(400);
    });

    it('sin token responde 401', async () => {
      await request(app.getHttpServer())
        .get('/books/search?q=dune')
        .expect(401);
    });
  });

  describe('ids no numericos', () => {
    it('GET /books/abc responde 400', async () => {
      await request(app.getHttpServer())
        .get('/books/abc')
        .set(auth(sesion.token))
        .expect(400);
    });
  });
});
