import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShiftScheduleUpdatedAt1716000000012 implements MigrationInterface {
  name = 'ShiftScheduleUpdatedAt1716000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }
}
