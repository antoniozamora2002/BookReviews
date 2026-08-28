import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup-app';
import { Book } from '../src/books/entities/book.entity';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/auth/enums/role.enum';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // configureApp es el MISMO que usa main.ts, no una copia
  const app = configureApp(moduleFixture.createNestApplication());
  await app.init();
  return app;
}

/** "user" es palabra reservada en Postgres, de ahi las comillas. */
export async function resetDb(app: INestApplication): Promise<void> {
  const ds = app.get(DataSource);
  await ds.query(
    'TRUNCATE TABLE "review", "user", "book" RESTART IDENTITY CASCADE',
  );
}

export interface Sesion {
  token: string;
  refreshToken: string;
  id: number;
}

/** Registra un usuario y devuelve sus tokens e id. */
export async function registerAndLogin(
  app: INestApplication,
  email: string,
  password = 'secreto123',
): Promise<Sesion> {
  const registered = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password })
    .expect(201);

  const logged = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    token: logged.body.access_token,
    refreshToken: logged.body.refresh_token,
    id: registered.body.id,
  };
}

/**
 * Crea un admin. El rol se asciende directamente en la BD porque solo un
 * admin puede ascender a otro: hay que romper el huevo-gallina en algun sitio
 * (en produccion, con una migracion de seed o a mano la primera vez).
 */
export async function registerAdmin(
  app: INestApplication,
  email: string,
  password = 'secreto123',
): Promise<Sesion> {
  const registered = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password })
    .expect(201);

  await app
    .get(DataSource)
    .getRepository(User)
    .update(registered.body.id, { role: Role.Admin });

  // Login DESPUES de ascender: el rol viaja dentro del token
  const logged = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    token: logged.body.access_token,
    refreshToken: logged.body.refresh_token,
    id: registered.body.id,
  };
}

/**
 * Inserta un libro directamente en la BD. POST /books llama a la API de
 * Google Books, y un test e2e no debe depender de la red.
 */
export async function seedBook(app: INestApplication): Promise<Book> {
  const repo = app.get(DataSource).getRepository(Book);
  return repo.save(
    repo.create({
      googleId: 'test-google-id',
      title: 'Dune',
      authors: ['Frank Herbert'],
    }),
  );
}
