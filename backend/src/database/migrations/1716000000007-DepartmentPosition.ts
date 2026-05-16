import { MigrationInterface, QueryRunner } from 'typeorm';

export class DepartmentPosition1716000000007 implements MigrationInterface {
  name = 'DepartmentPosition1716000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Expand departments
    await queryRunner.query(`
      ALTER TABLE "departments"
        ADD COLUMN IF NOT EXISTS "code" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "manager_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "parent_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Expand positions
    await queryRunner.query(`
      ALTER TABLE "positions"
        ADD COLUMN IF NOT EXISTS "department_id" BIGINT,
        ADD COLUMN IF NOT EXISTS "level" INT NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "departments"
        DROP COLUMN IF EXISTS "code",
        DROP COLUMN IF EXISTS "manager_id",
        DROP COLUMN IF EXISTS "parent_id",
        DROP COLUMN IF EXISTS "updated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "positions"
        DROP COLUMN IF EXISTS "department_id",
        DROP COLUMN IF EXISTS "level",
        DROP COLUMN IF EXISTS "updated_at"
    `);
  }
}
