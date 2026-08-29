import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshTokenSessions1788020566358 implements MigrationInterface {
  name = 'RefreshTokenSessions1788020566358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("id" SERIAL NOT NULL, "jti" character varying NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e532a5fe469da358494917ce2b" ON "refresh_token" ("jti") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "hashedRefreshToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_8e913e288156c133999341156ad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_8e913e288156c133999341156ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "hashedRefreshToken" character varying`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e532a5fe469da358494917ce2b"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_token"`);
  }
}
