import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, resetDb } from './helpers';

/**
 * El resto de suites e2e desactiva el rate limiting (hacen decenas de
 * peticiones seguidas). Aqui se vuelve a activar ANTES de construir la app,
 * porque la factory de ThrottlerModule lee la variable al instanciarse.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  const valorOriginal = process.env.THROTTLE_DISABLED;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'false';
    app = await createTestApp();
    await resetDb(app);
  });

  afterAll(async () => {
    process.env.THROTTLE_DISABLED = valorOriginal;
    await app.close();
  });

  it('corta los intentos de login por fuerza bruta', async () => {
    const intento = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nadie@test.com', password: 'adivinando' });

    const codigos: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await intento();
      codigos.push(res.status);
    }

    // Limite de 5/min: los primeros son 401 (credenciales malas) y a partir
    // de ahi 429 Too Many Requests
    expect(codigos.filter((c) => c === 429).length).toBeGreaterThan(0);
    expect(codigos.slice(0, 5).every((c) => c === 401)).toBe(true);
    expect(codigos[codigos.length - 1]).toBe(429);
  });
});
