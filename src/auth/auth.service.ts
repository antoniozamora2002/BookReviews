import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService, SALT_ROUNDS } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { Role } from './enums/role.enum';
import { digestToken } from './token-hash';
import { RefreshToken } from './entities/refresh-token.entity';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
  sub: number;
  username: string;
  role: Role;
  jti?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokens: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _password, ...result } = user;
      return result;
    }
    return null;
  }

  private async generarTokens(id: number, email: string, role: Role) {
    const payload: TokenPayload = { sub: id, username: email, role };

    // jti unico: sin el, dos refresh emitidos en el mismo segundo tendrian
    // identico payload e identico iat, saldrian byte a byte iguales y la
    // rotacion no invalidaria nada
    const jti = randomUUID();

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      }),
      this.jwtService.signAsync(
        { ...payload, jti },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: REFRESH_TOKEN_TTL,
        },
      ),
    ]);

    return { access_token, refresh_token, jti };
  }

  private async hashDe(token: string) {
    return bcrypt.hash(digestToken(token), SALT_ROUNDS);
  }

  async login(user: { id: number; email: string; role: Role }) {
    const { access_token, refresh_token, jti } = await this.generarTokens(
      user.id,
      user.email,
      user.role,
    );

    // Limpieza barata: cada login retira las sesiones ya caducadas del usuario
    await this.refreshTokens.delete({
      user: { id: user.id },
      expiresAt: LessThan(new Date()),
    });

    // save() crea una fila NUEVA: los demas dispositivos siguen conectados
    await this.refreshTokens.save(
      this.refreshTokens.create({
        jti,
        tokenHash: await this.hashDe(refresh_token),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        user: { id: user.id } as User,
      }),
    );

    return { access_token, refresh_token };
  }

  /** Localiza y valida la sesion a la que pertenece un refresh token. */
  private async buscarSesion(refreshToken: string): Promise<RefreshToken> {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const sesion = await this.refreshTokens.findOne({
      where: { jti: payload.jti },
      relations: ['user'],
    });

    if (!sesion || sesion.expiresAt.getTime() < Date.now()) {
      if (sesion) await this.refreshTokens.delete(sesion.id);
      throw new UnauthorizedException('Sesion no activa');
    }

    const coincide = await bcrypt.compare(
      digestToken(refreshToken),
      sesion.tokenHash,
    );
    if (!coincide) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    return sesion;
  }

  /**
   * Rotacion: cada refresh emite un par nuevo e invalida el anterior, pero
   * solo el de ESTA sesion. Los demas dispositivos no se ven afectados.
   */
  async refresh(refreshToken: string) {
    const sesion = await this.buscarSesion(refreshToken);
    const { user } = sesion;

    const nuevos = await this.generarTokens(user.id, user.email, user.role);

    sesion.jti = nuevos.jti;
    sesion.tokenHash = await this.hashDe(nuevos.refresh_token);
    sesion.expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.refreshTokens.save(sesion);

    return {
      access_token: nuevos.access_token,
      refresh_token: nuevos.refresh_token,
    };
  }

  /** Cierra solo la sesion del refresh token presentado. */
  async logout(refreshToken: string) {
    const sesion = await this.buscarSesion(refreshToken);
    await this.refreshTokens.delete(sesion.id);
    return { message: 'Sesion cerrada' };
  }

  /** Cierra todas las sesiones del usuario, en todos sus dispositivos. */
  async logoutAll(userId: number) {
    await this.refreshTokens.delete({ user: { id: userId } });
    return { message: 'Todas las sesiones cerradas' };
  }
}
