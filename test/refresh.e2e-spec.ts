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
      .send({ refresh_token: sesion.refreshToken })
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
  // El bug: entrar desde un segundo aparato expulsaba al primero, porque el
  // hash del refresh vivia en UNA columna de User en vez de una fila por sesion
  describe('multi-dispositivo', () => {
    const login = async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'refresh@test.com', password: 'secreto123' })
        .expect(200);
      return res.body as { access_token: string; refresh_token: string };
    };

    it('un segundo login NO invalida la sesion del primero', async () => {
      const movil = await login();
      const portatil = await login();

      // El ultimo funciona...
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: portatil.refresh_token })
        .expect(200);

      // ...y el primero TAMBIEN sigue vivo
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: movil.refresh_token })
        .expect(200);
    });

    it('logout cierra solo el aparato que lo pide', async () => {
      const movil = await login();
      const portatil = await login();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set(auth(portatil.access_token))
        .send({ refresh_token: portatil.refresh_token })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: portatil.refresh_token })
        .expect(401);

      // El movil sigue conectado
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: movil.refresh_token })
        .expect(200);
    });

    it('logout-all cierra todos los aparatos', async () => {
      const movil = await login();
      const portatil = await login();

      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set(auth(portatil.access_token))
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: portatil.refresh_token })
        .expect(401);
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: movil.refresh_token })
        .expect(401);
    });
  });
});
