import { IsString } from 'class-validator';

export class CreateBookDto {
  @IsString()
  googleId: string;
}
