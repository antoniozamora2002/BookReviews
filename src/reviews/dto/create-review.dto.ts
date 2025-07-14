// create-review.dto.ts
import {
  IsInt,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MaxLength(500)
  comment: string;

  @IsInt()
  @IsPositive()
  bookId: number; // ID interno de tu base de datos (Book.id)
}
