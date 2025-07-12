import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findOne(id: number): Promise<Review | null> {
    return this.reviewsRepository.findOne({
      where: { id },
      relations: ['book'],
    });
  }

  async update(id: number, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['book'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }

    const updated = this.reviewsRepository.merge(review, updateReviewDto);

    return this.reviewsRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    await this.reviewsRepository.delete(id);
  }
}
