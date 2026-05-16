import { MigrationInterface, QueryRunner } from 'typeorm';

export class TwoStageLeave1716000000008 implements MigrationInterface {
  name = 'TwoStageLeave1716000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        ADD COLUMN IF NOT EXISTS "manager_approved_by" BIGINT,
        ADD COLUMN IF NOT EXISTS "manager_approved_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "hr_confirmed_by" BIGINT,
        ADD COLUMN IF NOT EXISTS "hr_confirmed_at" TIMESTAMP
    `);

    await queryRunner.query(`
      UPDATE "leave_requests"
      SET "manager_approved_by" = "approved_by",
          "manager_approved_at" = "approved_at",
          "hr_confirmed_by" = "approved_by",
          "hr_confirmed_at" = "approved_at"
      WHERE "status" = 'approved'
        AND "approved_by" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        DROP COLUMN IF EXISTS "manager_approved_by",
        DROP COLUMN IF EXISTS "manager_approved_at",
        DROP COLUMN IF EXISTS "hr_confirmed_by",
        DROP COLUMN IF EXISTS "hr_confirmed_at"
    `);
  }
}
