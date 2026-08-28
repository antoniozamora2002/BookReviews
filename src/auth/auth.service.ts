import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Role } from './enums/role.enum';
import { digestToken } from './token-hash';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';

export interface TokenPayload {
  sub: number;
  username: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      // Fuera la contraseña y el refresh token guardado
      const {
        password: _password,
        hashedRefreshToken: _hashed,
        ...result
      } = user;
      return result;
    }
    return null;
  }

  private async generarTokens(id: number, email: string, role: Role) {
    const payload: TokenPayload = { sub: id, username: email, role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      }),
      // jti unico: sin el, dos refresh emitidos en el mismo segundo tendrian
      // identico payload e identico iat, saldrian byte a byte iguales y la
      // rotacion no invalidaria nada
      this.jwtService.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: REFRESH_TOKEN_TTL,
        },
      ),
    ]);

    return { access_token, refresh_token };
  }

  async login(user: { id: number; email: string; role: Role }) {
    const tokens = await this.generarTokens(user.id, user.email, user.role);
    await this.usersService.setRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  /**
   * Rotacion: cada refresh emite un par nuevo e invalida el anterior. Si a
   * alguien le roban un refresh token, en cuanto el usuario legitimo refresque
   * el robado deja de servir.
   */
  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException('Sesion no activa');
    }

    const coincide = await bcrypt.compare(
      digestToken(refreshToken),
      user.hashedRefreshToken,
    );
    if (!coincide) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const tokens = await this.generarTokens(user.id, user.email, user.role);
    await this.usersService.setRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async logout(userId: number) {
    await this.usersService.setRefreshToken(userId, null);
    return { message: 'Sesion cerrada' };
  }
}
