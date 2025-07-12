import { Module } from '@nestjs/common';
import { BooksModule } from './books/books.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que esté disponible en todos los módulos sin importar
    }),
    DatabaseModule,
    BooksModule,
    ReviewsModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
