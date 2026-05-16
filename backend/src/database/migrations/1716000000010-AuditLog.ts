import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLog1716000000010 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id"          BIGSERIAL PRIMARY KEY,
        "actor_id"    INTEGER       NOT NULL,
        "action"      VARCHAR(100)  NOT NULL,
        "entity_type" VARCHAR(50)   NOT NULL,
        "entity_id"   INTEGER       NULL,
        "payload"     JSONB         NULL,
        "ip_address"  VARCHAR(45)   NULL,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor"  ON "audit_logs" ("actor_id");`);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");`);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_ts"     ON "audit_logs" ("created_at" DESC);`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "audit_logs";`);
  }
}
