import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { BooksService } from './books.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('BooksService', () => {
  let service: BooksService;

  const mockBookRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Book), useValue: mockBookRepository },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  const realFetch = global.fetch;
  afterEach(() => {
    // clearAllMocks, no restoreAllMocks: los jest.fn() manuales de arriba
    // no son spies y restore no les borra el historial de llamadas
    jest.clearAllMocks();
    global.fetch = realFetch;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchBooks', () => {
    it('escapa la query en la URL', async () => {
      mockConfigService.get.mockReturnValue('APIKEY');
      mockHttpService.get.mockReturnValue(of({ data: { totalItems: 0 } }));

      await service.searchBooks('cien años de soledad');

      const url = mockHttpService.get.mock.calls[0][0] as string;
      expect(url).toContain('q=cien%20a%C3%B1os%20de%20soledad');
      expect(url).not.toContain(' ');
    });
  });

  describe('create', () => {
    const googleVolume = {
      id: 'gid-1',
      volumeInfo: {
        title: 'Dune',
        authors: ['Frank Herbert'],
        language: 'es',
        industryIdentifiers: [
          { type: 'ISBN_10', identifier: '0441013597' },
          { type: 'ISBN_13', identifier: '9780441013593' },
        ],
        imageLinks: { thumbnail: 'http://img/1.jpg' },
      },
      saleInfo: { saleability: 'FOR_SALE', isEbook: true },
    };

    it('extrae el ISBN correcto de industryIdentifiers', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(googleVolume),
      });
      mockBookRepository.create.mockImplementation((x) => x);
      mockBookRepository.save.mockImplementation((x) => Promise.resolve(x));

      await service.create({ googleId: 'gid-1' });

      expect(mockBookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: 'gid-1',
          title: 'Dune',
          isbn13: '9780441013593',
          isbn10: '0441013597',
          thumbnail: 'http://img/1.jpg',
          isEbook: true,
        }),
      );
    });

    it('no revienta si faltan campos opcionales', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({ id: 'gid-2', volumeInfo: { title: 'X' } }),
      });
      mockBookRepository.create.mockImplementation((x) => x);
      mockBookRepository.save.mockImplementation((x) => Promise.resolve(x));

      await service.create({ googleId: 'gid-2' });

      expect(mockBookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'X',
          authors: [],
          isbn13: undefined,
          thumbnail: undefined,
        }),
      );
    });

    it('lanza NotFound si Google devuelve error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: { code: 404 } }),
      });

      await expect(service.create({ googleId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBookRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('lanza NotFound si el libro no existe', async () => {
      mockBookRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(404, { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBookRepository.save).not.toHaveBeenCalled();
    });
  });
});
