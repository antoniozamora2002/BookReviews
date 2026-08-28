import { createHash } from 'crypto';

/**
 * bcrypt IGNORA todo lo que pase de 72 bytes. Un JWT es mucho mas largo y
 * todos comparten la cabecera y el principio del payload, asi que
 * bcrypt.compare() devolvia true para dos refresh tokens distintos y la
 * rotacion no invalidaba nada.
 *
 * Reducirlo antes a un SHA-256 (64 caracteres hex) mete el valor dentro del
 * limite y hace que cada token sea realmente distinguible.
 */
export function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
