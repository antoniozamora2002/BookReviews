import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { Role } from './enums/role.enum';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
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
    // El hasheo ya no vive aqui: delega en UsersService.create, la unica
    // puerta por la que se crean usuarios
    it('delega en UsersService sin manipular la contrasena', async () => {
      mockUsersService.create.mockResolvedValue({ id: 1, email: 'a@test.com' });

      const dto = { email: 'a@test.com', password: 'secreto123' };
      await controller.register(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
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

    it('devuelve ambos tokens con credenciales validas', async () => {
      const user = { id: 1, email: 'a@test.com', role: Role.User };
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue({
        access_token: 'a',
        refresh_token: 'r',
      });

      const res = await controller.login({
        email: 'a@test.com',
        password: 'buena',
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(res).toEqual({ access_token: 'a', refresh_token: 'r' });
    });
  });

  describe('logout', () => {
    it('cierra solo la sesion del refresh token presentado', async () => {
      await controller.logout({ refresh_token: 'refresh-de-este-aparato' });

      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'refresh-de-este-aparato',
      );
    });

    it('logout-all usa el id del token, no uno del body', async () => {
      await controller.logoutAll({
        userId: 42,
        email: 'a@test.com',
        role: Role.User,
      });

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith(42);
    });
  });
});
