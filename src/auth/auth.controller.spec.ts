import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('nunca persiste la contraseña en texto plano', async () => {
      mockUsersService.create.mockImplementation((dto) =>
        Promise.resolve({ id: 1, ...dto }),
      );

      await controller.register({
        email: 'a@test.com',
        password: 'secreto123',
      });

      const persisted = mockUsersService.create.mock.calls[0][0];
      expect(persisted.password).not.toBe('secreto123');
      // Y el hash tiene que ser valido, no solo distinto
      await expect(
        bcrypt.compare('secreto123', persisted.password),
      ).resolves.toBe(true);
    });

    it('no devuelve la contraseña en la respuesta', async () => {
      mockUsersService.create.mockImplementation((dto) =>
        Promise.resolve({ id: 1, ...dto }),
      );

      const res = await controller.register({
        email: 'a@test.com',
        password: 'secreto123',
      });

      expect(res).not.toHaveProperty('password');
      expect(res).toEqual({ id: 1, email: 'a@test.com' });
    });
  });

  describe('login', () => {
    it('lanza Unauthorized con credenciales invalidas', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login({ email: 'a@test.com', password: 'mala' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('devuelve el token con credenciales validas', async () => {
      const user = { id: 1, email: 'a@test.com' };
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue({ access_token: 'tok' });

      const res = await controller.login({
        email: 'a@test.com',
        password: 'buena',
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(res).toEqual({ access_token: 'tok' });
    });
  });
});
