import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Book } from 'src/books/entities/book.entity';
import { Review } from './entities/review.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Book])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
