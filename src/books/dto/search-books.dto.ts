import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Sin este DTO, `q` llegaba como undefined y la URL acababa con
 * q=undefined: la API respondia 200 con resultados de buscar literalmente
 * la palabra "undefined", gastando cuota en cada llamada.
 */
export class SearchBooksDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q: string;
}
