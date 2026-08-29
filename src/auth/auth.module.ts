import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { ProfileController } from './profile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshToken]),
    PassportModule,
    // Sin secreto ni expiracion por defecto: AuthService los pasa explicitos
    // en cada sign, porque access y refresh usan secretos distintos
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({}),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, ProfileController],
})
export class AuthModule {}
