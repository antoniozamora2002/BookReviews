import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';

/**
 * Configuracion global compartida por main.ts y los tests e2e.
 *
 * Vive aparte a proposito: si los e2e replicaran este wiring por su cuenta,
 * una diferencia entre ambos (por ejemplo olvidar el ClassSerializerInterceptor)
 * pasaria desapercibida justo en los tests que deberian detectarla.
 */
export function configureApp(app: INestApplication): INestApplication {
  // Cabeceras de seguridad (CSP, HSTS, X-Frame-Options, nosniff...)
  app.use(helmet());

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

  // Traduce los errores de Postgres (email duplicado, FK rota...) a codigos
  // HTTP correctos en vez de dejarlos subir como 500
  app.useGlobalFilters(new DatabaseExceptionFilter());

  return app;
}
