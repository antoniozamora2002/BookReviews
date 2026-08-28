import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: parseInt(configService.get('DB_PORT') ?? '5432', 10),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],

    // NUNCA en produccion: synchronize deja que TypeORM altere el esquema por
    // su cuenta al arrancar, lo que puede borrar columnas o tablas con datos.
    // Fuera de produccion es comodo y no hay nada que perder.
    synchronize: !isProduction,

    // En produccion el esquema lo construyen las migraciones, no synchronize
    migrationsRun: isProduction,

    logging: false, // muestra logs de SQL
  };
};
