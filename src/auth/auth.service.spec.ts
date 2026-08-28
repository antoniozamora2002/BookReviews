import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { Role } from './enums/role.enum';
import { digestToken } from './token-hash';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    setRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((k: string) => `valor-de-${k}`),
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

      await expect(
        service.validateUser('nadie@test.com', PLAIN),
      ).resolves.toBeNull();
    });

    it('devuelve null si la contraseña no coincide', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        password: hash,
        role: Role.User,
      });

      await expect(
        service.validateUser('a@test.com', 'contraseña-incorrecta'),
      ).resolves.toBeNull();
    });

    it('no devuelve ni la contraseña ni el refresh token guardado', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        password: hash,
        role: Role.User,
        hashedRefreshToken: 'hash-guardado',
      });

      const res = await service.validateUser('a@test.com', PLAIN);

      expect(res).toEqual({ id: 1, email: 'a@test.com', role: Role.User });
      expect(res).not.toHaveProperty('password');
      expect(res).not.toHaveProperty('hashedRefreshToken');
    });
  });

  describe('login', () => {
    it('emite ambos tokens y guarda el hash del refresh', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-tok')
        .mockResolvedValueOnce('refresh-tok');

      const res = await service.login({
        id: 7,
        email: 'a@test.com',
        role: Role.User,
      });

      expect(res).toEqual({
        access_token: 'access-tok',
        refresh_token: 'refresh-tok',
      });
      expect(mockUsersService.setRefreshToken).toHaveBeenCalledWith(
        7,
        'refresh-tok',
      );
    });

    it('incluye el rol en el payload del token', async () => {
      mockJwtService.signAsync.mockResolvedValue('tok');

      await service.login({ id: 7, email: 'a@test.com', role: Role.Admin });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 7, username: 'a@test.com', role: Role.Admin },
        expect.anything(),
      );
    });

    it('firma access y refresh con secretos DISTINTOS', async () => {
      mockJwtService.signAsync.mockResolvedValue('tok');

      await service.login({ id: 7, email: 'a@test.com', role: Role.User });

      const [, opcionesAccess] = mockJwtService.signAsync.mock.calls[0];
      const [, opcionesRefresh] = mockJwtService.signAsync.mock.calls[1];
      expect(opcionesAccess.secret).not.toBe(opcionesRefresh.secret);
    });
  });

  describe('refresh', () => {
    it('rechaza un token con firma invalida', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(service.refresh('token-malo')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si el usuario no tiene sesion activa', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      mockUsersService.findById.mockResolvedValue({
        id: 1,
        hashedRefreshToken: null,
      });

      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza un refresh token que no coincide con el guardado', async () => {
      const guardado = await bcrypt.hash(digestToken('token-viejo'), 10);
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      mockUsersService.findById.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        role: Role.User,
        hashedRefreshToken: guardado,
      });

      await expect(service.refresh('token-distinto')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rota el token: emite uno nuevo y reemplaza el guardado', async () => {
      const actual = 'refresh-actual';
      const guardado = await bcrypt.hash(digestToken(actual), 10);
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      mockUsersService.findById.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        role: Role.User,
        hashedRefreshToken: guardado,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-nuevo')
        .mockResolvedValueOnce('refresh-nuevo');

      const res = await service.refresh(actual);

      expect(res.refresh_token).toBe('refresh-nuevo');
      expect(mockUsersService.setRefreshToken).toHaveBeenCalledWith(
        1,
        'refresh-nuevo',
      );
    });
  });

  describe('logout', () => {
    it('borra el refresh token guardado', async () => {
      await service.logout(3);

      expect(mockUsersService.setRefreshToken).toHaveBeenCalledWith(3, null);
    });
  });
});
