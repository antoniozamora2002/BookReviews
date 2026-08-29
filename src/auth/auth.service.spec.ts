import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { Role } from './enums/role.enum';
import { digestToken } from './token-hash';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = { findByEmail: jest.fn(), findById: jest.fn() };
  const mockJwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const mockConfigService = { get: jest.fn((k: string) => 'valor-' + k) };
  const mockRefreshTokens = {
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve(x)),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  // Hash real, no un string cualquiera: asi el test ejercita bcrypt.compare
  // de verdad en vez de mockearlo
  const PLAIN = 'secreto123';
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash(PLAIN, 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokens,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('devuelve null si el email no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.validateUser('x@t.com', PLAIN)).resolves.toBeNull();
    });

    it('devuelve null si la contrasena no coincide', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@t.com',
        password: hash,
        role: Role.User,
      });
      await expect(
        service.validateUser('a@t.com', 'incorrecta'),
      ).resolves.toBeNull();
    });

    it('no devuelve la contrasena', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@t.com',
        password: hash,
        role: Role.User,
      });
      const res = await service.validateUser('a@t.com', PLAIN);
      expect(res).toEqual({ id: 1, email: 'a@t.com', role: Role.User });
      expect(res).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('emite ambos tokens', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-tok')
        .mockResolvedValueOnce('refresh-tok');

      const res = await service.login({
        id: 7,
        email: 'a@t.com',
        role: Role.User,
      });

      expect(res).toEqual({
        access_token: 'access-tok',
        refresh_token: 'refresh-tok',
      });
    });

    // El bug del multi-dispositivo: antes se PISABA una columna de User, asi
    // que entrar desde otro aparato expulsaba al anterior
    it('crea una sesion NUEVA en vez de pisar la anterior', async () => {
      mockJwtService.signAsync.mockResolvedValue('tok');

      await service.login({ id: 7, email: 'a@t.com', role: Role.User });

      expect(mockRefreshTokens.save).toHaveBeenCalledWith(
        expect.objectContaining({ jti: expect.any(String), user: { id: 7 } }),
      );
    });

    it('guarda el token hasheado, nunca en claro', async () => {
      mockJwtService.signAsync.mockResolvedValue('refresh-en-claro');

      await service.login({ id: 7, email: 'a@t.com', role: Role.User });

      const guardado = mockRefreshTokens.save.mock.calls[0][0];
      expect(guardado.tokenHash).not.toBe('refresh-en-claro');
      await expect(
        bcrypt.compare(digestToken('refresh-en-claro'), guardado.tokenHash),
      ).resolves.toBe(true);
    });

    it('firma access y refresh con secretos DISTINTOS', async () => {
      mockJwtService.signAsync.mockResolvedValue('tok');

      await service.login({ id: 7, email: 'a@t.com', role: Role.User });

      const [, opcAccess] = mockJwtService.signAsync.mock.calls[0];
      const [, opcRefresh] = mockJwtService.signAsync.mock.calls[1];
      expect(opcAccess.secret).not.toBe(opcRefresh.secret);
    });
  });

  describe('refresh', () => {
    const sesionCon = async (token: string) => ({
      id: 55,
      jti: 'jti-actual',
      tokenHash: await bcrypt.hash(digestToken(token), 10),
      expiresAt: new Date(Date.now() + 60000),
      user: { id: 1, email: 'a@t.com', role: Role.User },
    });

    it('rechaza un token con firma invalida', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('bad sig'));
      await expect(service.refresh('malo')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza un token sin jti', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      await expect(service.refresh('sin-jti')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si la sesion no existe', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'x' });
      mockRefreshTokens.findOne.mockResolvedValue(null);
      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza y borra una sesion caducada', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'x' });
      mockRefreshTokens.findOne.mockResolvedValue({
        id: 55,
        expiresAt: new Date(Date.now() - 60000),
      });

      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokens.delete).toHaveBeenCalledWith(55);
    });

    it('rechaza un token que no coincide con el hash guardado', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'x' });
      mockRefreshTokens.findOne.mockResolvedValue(await sesionCon('viejo'));
      await expect(service.refresh('distinto')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rota SOLO esa sesion: reutiliza la fila y le cambia el jti', async () => {
      const actual = 'refresh-actual';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        jti: 'jti-actual',
      });
      mockRefreshTokens.findOne.mockResolvedValue(await sesionCon(actual));
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-nuevo')
        .mockResolvedValueOnce('refresh-nuevo');

      const res = await service.refresh(actual);

      expect(res.refresh_token).toBe('refresh-nuevo');
      const guardado = mockRefreshTokens.save.mock.calls[0][0];
      expect(guardado.id).toBe(55); // misma fila, no una nueva
      expect(guardado.jti).not.toBe('jti-actual');
    });
  });

  describe('logout', () => {
    it('borra solo la sesion del token presentado', async () => {
      const token = 'refresh-de-este-dispositivo';
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'jti-1' });
      mockRefreshTokens.findOne.mockResolvedValue({
        id: 99,
        tokenHash: await bcrypt.hash(digestToken(token), 10),
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 1 },
      });

      await service.logout(token);

      expect(mockRefreshTokens.delete).toHaveBeenCalledWith(99);
    });
  });

  describe('logoutAll', () => {
    it('borra todas las sesiones del usuario', async () => {
      await service.logoutAll(3);
      expect(mockRefreshTokens.delete).toHaveBeenCalledWith({
        user: { id: 3 },
      });
    });
  });
});
