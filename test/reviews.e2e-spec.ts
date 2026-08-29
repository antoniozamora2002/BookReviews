import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  resetDb,
  registerAndLogin,
  seedBook,
  Sesion,
} from './helpers';

describe('Reviews (e2e)', () => {
  let app: INestApplication;
  let dueno: Sesion;
  let intruso: Sesion;
  let bookId: number;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb(app);
    dueno = await registerAndLogin(app, 'dueno@test.com');
    intruso = await registerAndLogin(app, 'intruso@test.com');
    bookId = (await seedBook(app)).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const crearResena = async (token: string, comment = 'Excelente') => {
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, comment, bookId })
      .expect(201);
    return res.body.id as number;
  };

  describe('POST /reviews', () => {
    it('asocia la reseña al usuario del token', async () => {
      const id = await crearResena(dueno.token);

      const res = await request(app.getHttpServer())
        .get(`/reviews/${id}`)
        .set('Authorization', `Bearer ${dueno.token}`)
        .expect(200);

      expect(res.body.user.id).toBe(dueno.id);
    });

    it('rechaza un rating fuera de 1-5', async () => {
      await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${dueno.token}`)
        .send({ rating: 6, comment: 'x', bookId })
        .expect(400);
    });

    it('devuelve 404 si el libro no existe', async () => {
      await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${dueno.token}`)
        .send({ rating: 5, comment: 'x', bookId: 999999 })
        .expect(404);
    });

    it('sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .post('/reviews')
        .send({ rating: 5, comment: 'x', bookId })
        .expect(401);
    });
  });

  describe('GET /reviews', () => {
    // La regresion que arreglamos: la relacion 'user' llegaba con el hash
    it('nunca expone el hash de contraseña en la relacion user', async () => {
      await crearResena(dueno.token);

      const res = await request(app.getHttpServer())
        .get('/reviews')
        .set('Authorization', `Bearer ${dueno.token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].user).toBeDefined();
      expect(res.body[0].user.password).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('$2b$');
    });
  });

  describe('autorizacion por propietario', () => {
    it('un intruso NO puede editar la reseña de otro', async () => {
      const id = await crearResena(dueno.token, 'original');

      await request(app.getHttpServer())
        .patch(`/reviews/${id}`)
        .set('Authorization', `Bearer ${intruso.token}`)
        .send({ comment: 'secuestrada' })
        .expect(404);

      // Y el contenido sigue intacto
      const res = await request(app.getHttpServer())
        .get(`/reviews/${id}`)
        .set('Authorization', `Bearer ${dueno.token}`)
        .expect(200);
      expect(res.body.comment).toBe('original');
    });

    it('un intruso NO puede borrar la reseña de otro', async () => {
      const id = await crearResena(dueno.token);

      await request(app.getHttpServer())
        .delete(`/reviews/${id}`)
        .set('Authorization', `Bearer ${intruso.token}`)
        .expect(404);

      // Lo critico: sigue existiendo
      await request(app.getHttpServer())
        .get(`/reviews/${id}`)
        .set('Authorization', `Bearer ${dueno.token}`)
        .expect(200);
    });

    it('el dueño SI puede editar la suya', async () => {
      const id = await crearResena(dueno.token, 'original');

      await request(app.getHttpServer())
        .patch(`/reviews/${id}`)
        .set('Authorization', `Bearer ${dueno.token}`)
        .send({ comment: 'corregida' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/reviews/${id}`)
        .set('Authorization', `Bearer ${dueno.token}`)
        .expect(200);
      expect(res.body.comment).toBe('corregida');
    });

    it('el dueño SI puede borrar la suya', async () => {
      const id = await crearResena(dueno.token);

      await request(app.getHttpServer())
        .delete(`/reviews/${id}`)
        .set('Authorization', `Bearer ${dueno.token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/reviews')
        .set('Authorization', `Bearer ${dueno.token}`)
        .expect(200);
      expect(res.body).toHaveLength(0);
    });
  });
  describe('ids no numericos', () => {
    // El bug: con +id, /reviews/abc producia NaN y la query reventaba con 500.
    // Se comprueba el MENSAJE, no solo el 400: el DatabaseExceptionFilter
    // tambien devuelve 400 para el 22P02 de Postgres, asi que sin mirar el
    // mensaje el test no distinguiria si el ParseIntPipe sigue puesto.
    it('GET /reviews/abc lo rechaza el pipe, sin llegar a la BD', async () => {
      const res = await request(app.getHttpServer())
        .get('/reviews/abc')
        .set(`Authorization`, `Bearer ${dueno.token}`)
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('numeric string is expected');
    });

    it('PATCH /reviews/abc responde 400', async () => {
      await request(app.getHttpServer())
        .patch('/reviews/abc')
        .set('Authorization', `Bearer ${dueno.token}`)
        .send({ comment: 'x' })
        .expect(400);
    });
  });
});
