import { Test, TestingModule } from '@nestjs/testing';
import { ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import * as request from 'supertest';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { User } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let app: INestApplication;

  const mockReviewsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);

    app = module.createNestApplication();
    // Mismo wiring que main.ts
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Regresion: GET /reviews carga relations: ['user'] y llegaba a filtrar
  // el hash bcrypt porque el ClassSerializerInterceptor solo estaba en
  // UsersController
  it('no expone el password del usuario en la relacion', async () => {
    const user = new User();
    user.id = 1;
    user.email = 'test@test.com';
    user.password = '$2b$10$hashfalsoquenodebesalir';

    const book = new Book();
    book.id = 7;
    book.title = 'Dune';

    const review = new Review();
    review.id = 42;
    review.rating = 5;
    review.comment = 'Excelente';
    review.user = user;
    review.book = book;

    mockReviewsService.findAll.mockResolvedValue([review]);

    const res = await request(app.getHttpServer()).get('/reviews').expect(200);

    expect(JSON.stringify(res.body)).not.toContain('$2b$');
    expect(res.body[0].user).toBeDefined();
    expect(res.body[0].user.password).toBeUndefined();
    expect(res.body[0].user.email).toBe('test@test.com');
  });
});
