import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from 'src/books/entities/book.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewsRepository: Repository<Review>,
    @InjectRepository(Book) private booksRepository: Repository<Book>,
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}
  async create(
    createReviewDto: CreateReviewDto,
    userId: number,
  ): Promise<Review> {
    const book = await this.booksRepository.findOneBy({
      id: createReviewDto.bookId,
    });
    if (!book) {
      throw new NotFoundException('El libro no existe');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const review = this.reviewsRepository.create({
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      book: book,
      user: user,
    });

    return this.reviewsRepository.save(review);
  }

  findAll(): Promise<Review[]> {
    return this.reviewsRepository.find({
      relations: ['book', 'user'],
    });
  }

  async findOne(id: number): Promise<Review | null> {
    return this.reviewsRepository.findOne({
      where: { id },
      relations: ['book', 'user'],
    });
  }

  async update(
    id: number,
    updateReviewDto: UpdateReviewDto,
    userId: number,
  ): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['book'],
    });

    if (!review) {
      throw new NotFoundException(
        `Review with id ${id} not found or not authorized`,
      );
    }

    const updated = this.reviewsRepository.merge(review, updateReviewDto);

    return this.reviewsRepository.save(updated);
  }

  async remove(id: number, userId: number): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: {
        id,
        user: { id: userId },
      },
    });

    if (!review) {
      throw new NotFoundException(
        `Review with id ${id} not found or not authorized`,
      );
    }

    await this.reviewsRepository.delete(id);
  }
}
