import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Antes el body de /auth/login era un tipo TypeScript inline. Los tipos se
 * borran al compilar, asi que el ValidationPipe no tenia nada que validar y
 * el endpoint aceptaba cualquier cosa.
 */
export class LoginDto {
  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  password: string;
}
