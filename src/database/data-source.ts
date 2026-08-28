import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource para el CLI de TypeORM (migration:generate / run / revert).
 *
 * Existe aparte de typeorm.config.ts porque el CLI se ejecuta fuera de Nest y
 * no tiene un ConfigService del que tirar. Ambos deben describir la MISMA
 * base de datos: si divergen, las migraciones se generarian contra un esquema
 * distinto del que usa la app.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
