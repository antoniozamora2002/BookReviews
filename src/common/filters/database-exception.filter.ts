import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorPostgres {
  code?: string;
  detail?: string;
}

/**
 * Traduce los errores de Postgres a respuestas HTTP con sentido.
 *
 * Sin esto, un email duplicado subia como QueryFailedError sin capturar: el
 * cliente recibia un 500 opaco y el log se llenaba con el volcado entero del
 * driver.
 *
 * Acotado a QueryFailedError a proposito: el resto de excepciones las sigue
 * gestionando Nest con su comportamiento por defecto.
 */
@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  private static readonly MAPA: Record<
    string,
    { status: number; message: string }
  > = {
    // unique_violation
    '23505': {
      status: HttpStatus.CONFLICT,
      message: 'Ya existe un recurso con esos datos',
    },
    // foreign_key_violation
    '23503': {
      status: HttpStatus.BAD_REQUEST,
      message: 'Referencia a un recurso que no existe',
    },
    // not_null_violation
    '23502': {
      status: HttpStatus.BAD_REQUEST,
      message: 'Falta un campo obligatorio',
    },
    // invalid_text_representation
    '22P02': {
      status: HttpStatus.BAD_REQUEST,
      message: 'Formato de dato invalido',
    },
  };

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const { code, detail } = exception as unknown as ErrorPostgres;

    const conocido = code ? DatabaseExceptionFilter.MAPA[code] : undefined;
    const status = conocido?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = conocido?.message ?? 'Error interno del servidor';

    // El "detail" de Postgres incluye los VALORES ("Key (email)=(a@b.com)"),
    // asi que se registra en el servidor pero nunca se devuelve al cliente
    this.logger.warn(
      `Postgres ${code ?? 'sin codigo'}: ${detail ?? exception.message}`,
    );

    respuesta.status(status).json({ statusCode: status, message });
  }
}
