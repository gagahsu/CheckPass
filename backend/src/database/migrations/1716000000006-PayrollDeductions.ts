import { MigrationInterface, QueryRunner } from 'typeorm';

export class PayrollDeductions1716000000006 implements MigrationInterface {
  name = 'PayrollDeductions1716000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payrolls"
        ADD COLUMN IF NOT EXISTS "nhi_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "labor_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payrolls"
        DROP COLUMN IF EXISTS "nhi_deduction",
        DROP COLUMN IF EXISTS "labor_deduction"
    `);
  }
}
