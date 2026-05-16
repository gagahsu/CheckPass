import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShiftTypeEnhancements1716000000005 implements MigrationInterface {
  name = 'ShiftTypeEnhancements1716000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shift_types"
        ADD COLUMN IF NOT EXISTS "grace_minutes" INT NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS "color" VARCHAR(20) NOT NULL DEFAULT '#06b6d4'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shift_types"
        DROP COLUMN IF EXISTS "grace_minutes",
        DROP COLUMN IF EXISTS "color"
    `);
  }
}
