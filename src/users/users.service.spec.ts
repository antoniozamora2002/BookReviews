import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('lanza NotFound si el usuario no existe', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(404, { email: 'x@test.com' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
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

  describe('findOne', () => {
    it('carga las reseñas y su libro', async () => {
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
