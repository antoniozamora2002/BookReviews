import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Book } from 'src/books/entities/book.entity';
import { User } from 'src/users/entities/user.entity';

describe('ReviewsService', () => {
  let service: ReviewsService;

  // Un mock por repositorio: compartir uno solo hace que los tests de
  // create() no puedan distinguir "libro no existe" de "usuario no existe"
  const mockReviewsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
  };
  const mockBooksRepository = { findOneBy: jest.fn() };
  const mockUsersRepository = { findOneBy: jest.fn() };

  const OWNER_ID = 1;
  const OTHER_ID = 99;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useValue: mockReviewsRepository,
        },
        { provide: getRepositoryToken(Book), useValue: mockBooksRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('lanza NotFound si el libro no existe', async () => {
      mockBooksRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create({ rating: 5, comment: 'ok', bookId: 123 }, OWNER_ID),
      ).rejects.toThrow(NotFoundException);

      expect(mockReviewsRepository.save).not.toHaveBeenCalled();
    });

    it('lanza NotFound si el usuario no existe', async () => {
      mockBooksRepository.findOneBy.mockResolvedValue({ id: 123 });
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create({ rating: 5, comment: 'ok', bookId: 123 }, OWNER_ID),
      ).rejects.toThrow(NotFoundException);

      expect(mockReviewsRepository.save).not.toHaveBeenCalled();
    });

    it('asocia la reseña al usuario autenticado, no a uno del body', async () => {
      const book = { id: 123 } as Book;
      const user = { id: OWNER_ID } as User;
      mockBooksRepository.findOneBy.mockResolvedValue(book);
      mockUsersRepository.findOneBy.mockResolvedValue(user);
      mockReviewsRepository.create.mockImplementation((x) => x);
      mockReviewsRepository.save.mockImplementation((x) => Promise.resolve(x));

      await service.create(
        { rating: 4, comment: 'buena', bookId: 123 },
        OWNER_ID,
      );

      expect(mockUsersRepository.findOneBy).toHaveBeenCalledWith({
        id: OWNER_ID,
      });
      expect(mockReviewsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ user, book, rating: 4 }),
      );
    });
  });

  describe('update', () => {
    // El caso que importa: la autorizacion va en el WHERE de la query,
    // no en un if posterior
    it('rechaza una reseña de otro usuario', async () => {
      mockReviewsRepository.findOne.mockResolvedValue(null);

      await expect(service.update(10, { rating: 1 }, OTHER_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockReviewsRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10, user: { id: OTHER_ID } },
        }),
      );
      expect(mockReviewsRepository.save).not.toHaveBeenCalled();
    });

    it('actualiza la reseña propia', async () => {
      const review = { id: 10, rating: 3, comment: 'vieja' };
      mockReviewsRepository.findOne.mockResolvedValue(review);
      mockReviewsRepository.merge.mockImplementation((a, b) =>
        Object.assign(a, b),
      );
      mockReviewsRepository.save.mockImplementation((x) => Promise.resolve(x));

      const res = await service.update(10, { rating: 5 }, OWNER_ID);

      expect(res.rating).toBe(5);
      expect(mockReviewsRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('rechaza borrar una reseña de otro usuario', async () => {
      mockReviewsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(10, OTHER_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockReviewsRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10, user: { id: OTHER_ID } },
        }),
      );
      // Lo critico: no debe llegar al delete
      expect(mockReviewsRepository.delete).not.toHaveBeenCalled();
    });

    it('borra la reseña propia', async () => {
      mockReviewsRepository.findOne.mockResolvedValue({ id: 10 });

      await service.remove(10, OWNER_ID);

      expect(mockReviewsRepository.delete).toHaveBeenCalledWith(10);
    });
  });
});
