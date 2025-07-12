import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  googleId: string; // El "id" de Google Books

  @Column()
  title: string;

  @Column('simple-array')
  authors: string[]; // Lista de autores

  @Column({ nullable: true })
  publisher: string;

  @Column({ nullable: true })
  publishedDate: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  isbn13: string;

  @Column({ nullable: true })
  isbn10: string;

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ nullable: true })
  pageCount: number;

  @Column({ nullable: true })
  averageRating: number;

  @Column({ nullable: true })
  ratingsCount: number;

  @Column({ nullable: true })
  maturityRating: string;

  @Column({ nullable: true })
  previewLink: string;

  @Column({ nullable: true })
  infoLink: string;

  @Column({ nullable: true })
  canonicalVolumeLink: string;

  @Column({ nullable: true })
  saleability: string;

  @Column({ nullable: true })
  isEbook: boolean;
}
