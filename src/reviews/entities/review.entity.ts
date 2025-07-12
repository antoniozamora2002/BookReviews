// review.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Book } from '../../books/entities/book.entity';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rating: number; // 1-5

  @Column()
  comment: string;

  @ManyToOne(() => Book, (book) => book.reviews, { onDelete: 'CASCADE' })
  book: Book;
}
