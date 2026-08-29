// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Review } from 'src/reviews/entities/review.entity';
import { Exclude } from 'class-transformer';
import { Role } from 'src/auth/enums/role.enum';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  // El rol NUNCA se acepta desde el body: CreateUserDto no lo declara y
  // forbidNonWhitelisted rechaza el campo. Solo un admin puede cambiarlo.
  @Column({ type: 'enum', enum: Role, default: Role.User })
  role: Role;

  // Una sesion activa por dispositivo
  @OneToMany(() => RefreshToken, (token) => token.user)
  @Exclude()
  refreshTokens: RefreshToken[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];
}
