import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/auth/enums/role.enum';
import { digestToken } from 'src/auth/token-hash';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // La fuga original: POST /users guardaba la contrasena tal cual porque
    // solo /auth/register hasheaba
    it('nunca persiste la contrasena en texto plano', async () => {
      mockUserRepository.create.mockImplementation((x) => x);
      mockUserRepository.save.mockImplementation((x) => Promise.resolve(x));

      await service.create({ email: 'a@test.com', password: 'secreto123' });

      const creado = mockUserRepository.create.mock.calls[0][0];
      expect(creado.password).not.toBe('secreto123');
      // Y el hash tiene que ser valido, no solo distinto
      await expect(bcrypt.compare('secreto123', creado.password)).resolves.toBe(
        true,
      );
    });
  });

  describe('update', () => {
    it('lanza NotFound si el usuario no existe', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(404, { email: 'x@test.com' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('hashea tambien la contrasena nueva en un update', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({ id: 1 });
      mockUserRepository.merge.mockImplementation((a, b) =>
        Object.assign(a, b),
      );
      mockUserRepository.save.mockImplementation((x) => Promise.resolve(x));

      const res = await service.update(1, { password: 'nuevaclave' });

      expect(res.password).not.toBe('nuevaclave');
      await expect(bcrypt.compare('nuevaclave', res.password)).resolves.toBe(
        true,
      );
    });

    it('mezcla los cambios sobre el usuario existente', async () => {
      const user = { id: 1, email: 'viejo@test.com' };
      mockUserRepository.findOneBy.mockResolvedValue(user);
      mockUserRepository.merge.mockImplementation((a, b) =>
        Object.assign(a, b),
      );
      mockUserRepository.save.mockImplementation((x) => Promise.resolve(x));

      const res = await service.update(1, { email: 'nuevo@test.com' });

      expect(res.email).toBe('nuevo@test.com');
    });
  });

  describe('setRefreshToken', () => {
    it('guarda el refresh token hasheado, no en claro', async () => {
      await service.setRefreshToken(1, 'token-en-claro');

      const [, cambios] = mockUserRepository.update.mock.calls[0];
      expect(cambios.hashedRefreshToken).not.toBe('token-en-claro');
      await expect(
        bcrypt.compare(
          digestToken('token-en-claro'),
          cambios.hashedRefreshToken,
        ),
      ).resolves.toBe(true);
    });

    it('guarda null al cerrar sesion', async () => {
      await service.setRefreshToken(1, null);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        hashedRefreshToken: null,
      });
    });
  });

  describe('updateRole', () => {
    it('lanza NotFound si el usuario no existe', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.updateRole(404, Role.Admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cambia el rol', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({
        id: 1,
        role: Role.User,
      });
      mockUserRepository.save.mockImplementation((x) => Promise.resolve(x));

      const res = await service.updateRole(1, Role.Admin);

      expect(res.role).toBe(Role.Admin);
    });
  });

  describe('findOne', () => {
    it('carga las resenas y su libro', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, reviews: [] });

      await service.findOne(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          relations: ['reviews', 'reviews.book'],
        }),
      );
    });
  });

  describe('findByEmail', () => {
    it('busca por email exacto', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await service.findByEmail('a@test.com');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        email: 'a@test.com',
      });
    });
  });
});
