import { IsEnum } from 'class-validator';
import { Role } from 'src/auth/enums/role.enum';

/**
 * DTO aparte para el rol: mantenerlo fuera de UpdateUserDto garantiza que
 * nadie pueda escalar privilegios colando "role" en un PATCH /users/:id.
 */
export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}
