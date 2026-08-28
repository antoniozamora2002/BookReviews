import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BooksModule } from './books/books.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que esté disponible en todos los módulos sin importar
      // Falla el arranque si falta un secreto o una variable esta mal
      validate: validateEnv,
    }),

    // Limite global de respaldo; los endpoints sensibles llevan su propio
    // @Throttle mas estricto. Se desactiva en los tests e2e, que hacen
    // decenas de peticiones seguidas por diseño.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),

    DatabaseModule,
    BooksModule,
    ReviewsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
