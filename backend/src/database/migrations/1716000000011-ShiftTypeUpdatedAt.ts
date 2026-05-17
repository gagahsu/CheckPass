import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShiftTypeUpdatedAt1716000000011 implements MigrationInterface {
  name = 'ShiftTypeUpdatedAt1716000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shift_types"
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "shift_schedules"
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shift_schedules"
        DROP COLUMN IF EXISTS "updated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "shift_types"
        DROP COLUMN IF EXISTS "updated_at"
    `);
  }
}
