import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BooksService } from 'src/books/books.service';
import { Book } from 'src/books/entities/book.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewsRepository: Repository<Review>,
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
  ) {}
  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    const book = await this.booksRepository.findOneBy({
      id: createReviewDto.bookId,
    });
    if (!book) {
      throw new NotFoundException('El libro no existe');
    }

    const review = this.reviewsRepository.create({
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      book: book,
    });

    return this.reviewsRepository.save(review);
  }

  findAll(): Promise<Review[]> {
    return this.reviewsRepository.find({
      relations: ['book'],
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} review`;
  }

  update(id: number, updateReviewDto: UpdateReviewDto) {
    return `This action updates a #${id} review`;
  }

  remove(id: number) {
    return `This action removes a #${id} review`;
  }
}
