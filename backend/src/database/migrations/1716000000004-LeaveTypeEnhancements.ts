import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeaveTypeEnhancements1716000000004 implements MigrationInterface {
  name = 'LeaveTypeEnhancements1716000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leave_types"
        ADD COLUMN IF NOT EXISTS "is_paid" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "requires_attachment" BOOLEAN NOT NULL DEFAULT false
    `);

    // Update existing types
    await queryRunner.query(`
      UPDATE "leave_types" SET "is_paid" = false WHERE "code" = 'PERSONAL'
    `);
    await queryRunner.query(`
      UPDATE "leave_types" SET "requires_attachment" = true WHERE "code" IN ('MARRIAGE', 'BEREAVEMENT')
    `);

    // Insert additional leave types
    await queryRunner.query(`
      INSERT INTO "leave_types" ("name", "code", "max_days_per_year", "is_paid", "requires_attachment") VALUES
        ('產假',   'MATERNITY',  NULL, true,  true),
        ('陪產假', 'PATERNITY',  NULL, true,  true),
        ('其他',   'OTHER',      NULL, false, false)
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "leave_types" WHERE "code" IN ('MATERNITY','PATERNITY','OTHER')`);
    await queryRunner.query(`
      ALTER TABLE "leave_types"
        DROP COLUMN IF EXISTS "is_paid",
        DROP COLUMN IF EXISTS "requires_attachment"
    `);
  }
}
