import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeaveAttachment1716000000009 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "leave_requests"
        ADD COLUMN IF NOT EXISTS "attachment_url" VARCHAR(500) NULL;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "attachment_url"`);
  }
}
