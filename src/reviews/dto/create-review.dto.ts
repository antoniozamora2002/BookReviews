// create-review.dto.ts
import { IsInt, IsString } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  rating: number;

  @IsString()
  comment: string;

  @IsInt()
  bookId: number; // ID interno de tu base de datos (Book.id)
}
