import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Alias con nombre de AuthGuard('jwt'), para no repetir el string magico. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
