import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import {
  CurrentUser,
  JwtUser,
} from 'src/auth/decorators/current-user.decorator';

// ClassSerializerInterceptor se aplica de forma global en setup-app.ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Antes bastaba con estar autenticado para leer, modificar o borrar
   * CUALQUIER usuario. Estar logueado no es lo mismo que estar autorizado.
   */
  private verificarAcceso(actor: JwtUser, objetivoId: number): void {
    if (actor.role !== Role.Admin && actor.userId !== objetivoId) {
      throw new ForbiddenException('No puedes operar sobre otro usuario');
    }
  }

  // El registro publico es /auth/register; esto es alta manual de admin
  @Roles(Role.Admin)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Roles(Role.Admin)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: JwtUser,
  ) {
    this.verificarAcceso(actor, id);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: JwtUser,
  ) {
    this.verificarAcceso(actor, id);
    return this.usersService.update(id, updateUserDto);
  }

  @Roles(Role.Admin)
  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtUser) {
    this.verificarAcceso(actor, id);
    return this.usersService.remove(id);
  }
}
