import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

/**
 * Una fila por SESION, no por usuario.
 *
 * Antes el hash del refresh token vivia en una columna de User, asi que
 * entrar desde un segundo dispositivo pisaba el token del primero y lo
 * expulsaba en silencio.
 */
@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * jti del JWT. Es la clave de busqueda porque bcrypt no es determinista:
   * no se puede localizar una fila por su hash.
   */
  @Index({ unique: true })
  @Column()
  jti: string;

  /** bcrypt(sha256(token)) — ver token-hash.ts para el porque del sha256 */
  @Column()
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  user: User;
}
