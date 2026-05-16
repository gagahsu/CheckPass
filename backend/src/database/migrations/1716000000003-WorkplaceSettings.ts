import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkplaceSettings1716000000003 implements MigrationInterface {
  name = 'WorkplaceSettings1716000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workplace_settings" (
        "id" BIGSERIAL NOT NULL,
        "store_id" BIGINT,
        "name" VARCHAR(100) NOT NULL,
        "latitude" DECIMAL(10,7) NOT NULL,
        "longitude" DECIMAL(10,7) NOT NULL,
        "gps_radius_meters" INT NOT NULL DEFAULT 200,
        "wifi_ssids" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workplace_settings" PRIMARY KEY ("id")
      )
    `);

    // Default company workplace — update coordinates to match actual location
    await queryRunner.query(`
      INSERT INTO "workplace_settings" ("name", "latitude", "longitude", "gps_radius_meters", "is_active")
      VALUES ('總公司', 25.0339600, 121.5644680, 200, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "workplace_settings"`);
  }
}
