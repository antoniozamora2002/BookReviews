import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/auth/enums/role.enum';
import { digestToken } from 'src/auth/token-hash';

export const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * El hasheo vive aqui y no en el controlador a proposito: antes solo
   * /auth/register hasheaba, asi que POST /users guardaba la contraseña en
   * texto plano. Centralizarlo hace imposible olvidarlo en una ruta nueva.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      ...createUserDto,
      password: await bcrypt.hash(createUserDto.password, SALT_ROUNDS),
    });
    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['reviews'],
    });
  }

  findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['reviews', 'reviews.book'],
      order: {
        reviews: {
          id: 'DESC',
        },
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    const cambios: Partial<User> = { ...updateUserDto };

    // Si viene contraseña nueva, se hashea igual que en create()
    if (updateUserDto.password) {
      cambios.password = await bcrypt.hash(updateUserDto.password, SALT_ROUNDS);
    }

    const updated = this.usersRepository.merge(user, cambios);
    return this.usersRepository.save(updated);
  }

  /** Solo para administradores: el rol nunca se toca desde update(). */
  async updateRole(id: number, role: Role): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    user.role = role;
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }

  async findById(id: number) {
    return this.usersRepository.findOneBy({ id });
  }

  /** Guarda el hash del refresh token en uso (null al cerrar sesion). */
  async setRefreshToken(id: number, refreshToken: string | null) {
    const hashed = refreshToken
      ? await bcrypt.hash(digestToken(refreshToken), SALT_ROUNDS)
      : null;
    await this.usersRepository.update(id, { hashedRefreshToken: hashed });
  }
}
