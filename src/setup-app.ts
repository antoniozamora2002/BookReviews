import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Configuracion global compartida por main.ts y los tests e2e.
 *
 * Vive aparte a proposito: si los e2e replicaran este wiring por su cuenta,
 * una diferencia entre ambos (por ejemplo olvidar el ClassSerializerInterceptor)
 * pasaria desapercibida justo en los tests que deberian detectarla.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global para que @Exclude() (ej. User.password) se aplique en TODAS las
  // respuestas, no solo en las de UsersController
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  return app;
}
