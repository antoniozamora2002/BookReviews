import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
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
      });

      await expect(
        service.validateUser('a@test.com', 'contraseña-incorrecta'),
      ).resolves.toBeNull();
    });

    it('devuelve el usuario SIN la contraseña cuando las credenciales son validas', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        password: hash,
      });

      const res = await service.validateUser('a@test.com', PLAIN);

      expect(res).toEqual({ id: 1, email: 'a@test.com' });
      expect(res).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('firma el token con sub = id del usuario', async () => {
      mockJwtService.sign.mockReturnValue('token-firmado');

      const res = await service.login({ id: 7, email: 'a@test.com' });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        username: 'a@test.com',
        sub: 7,
      });
      expect(res).toEqual({ access_token: 'token-firmado' });
    });
  });
});
