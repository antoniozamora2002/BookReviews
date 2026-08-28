import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, resetDb, registerAndLogin, Sesion } from './helpers';

describe('Refresh tokens (e2e)', () => {
  let app: INestApplication;
  let sesion: Sesion;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb(app);
    sesion = await registerAndLogin(app, 'refresh@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  it('el login devuelve access y refresh, y son distintos', () => {
    expect(sesion.token).toBeTruthy();
    expect(sesion.refreshToken).toBeTruthy();
    expect(sesion.token).not.toBe(sesion.refreshToken);
  });

  it('un refresh valido devuelve un par nuevo', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: sesion.refreshToken })
      .expect(200);

    expect(typeof res.body.access_token).toBe('string');
    expect(typeof res.body.refresh_token).toBe('string');
    expect(res.body.refresh_token).not.toBe(sesion.refreshToken);
  });

  it('el access token nuevo sirve para autenticarse', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: sesion.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .get('/profile')
      .set(auth(res.body.access_token))
      .expect(200);
  });

  // Rotacion: lo que limita el dano de un refresh token robado
  it('el refresh token viejo deja de servir tras rotar', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: sesion.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: sesion.refreshToken })
      .expect(401);
  });

  it('rechaza un refresh token manipulado', async () => {
    const manipulado = sesion.refreshToken.slice(0, -3) + 'xxx';

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: manipulado })
      .expect(401);
  });

  it('un access token NO sirve como refresh token', async () => {
    // Secretos distintos: la firma no valida contra el secreto de refresh
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: sesion.token })
      .expect(401);
  });

  it('tras logout el refresh token deja de servir', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set(auth(sesion.token))
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: sesion.refreshToken })
      .expect(401);
  });

  it('rechaza un body que no es un JWT', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: 'esto-no-es-un-jwt' })
      .expect(400);
  });
});
