import {
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  IsBoolean,
} from 'class-validator';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  authors?: string[];

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  publishedDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  isbn13?: string;

  @IsOptional()
  @IsString()
  isbn10?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsInt()
  pageCount?: number;

  @IsOptional()
  @IsInt()
  averageRating?: number;

  @IsOptional()
  @IsInt()
  ratingsCount?: number;

  @IsOptional()
  @IsString()
  maturityRating?: string;

  @IsOptional()
  @IsString()
  previewLink?: string;

  @IsOptional()
  @IsString()
  infoLink?: string;

  @IsOptional()
  @IsString()
  canonicalVolumeLink?: string;

  @IsOptional()
  @IsString()
  saleability?: string;

  @IsOptional()
  @IsBoolean()
  isEbook?: boolean;
}
