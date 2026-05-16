import { MigrationInterface, QueryRunner } from 'typeorm';

export class DomainTables1716000000002 implements MigrationInterface {
  name = 'DomainTables1716000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // attendance_records
    await queryRunner.query(`
      CREATE TABLE "attendance_records" (
        "id" BIGSERIAL NOT NULL,
        "employee_id" BIGINT NOT NULL,
        "shift_schedule_id" BIGINT,
        "type" VARCHAR(20) NOT NULL DEFAULT 'GPS',
        "check_in_time" TIMESTAMP,
        "check_out_time" TIMESTAMP,
        "latitude" DECIMAL(10,7),
        "longitude" DECIMAL(10,7),
        "workplace_latitude" DECIMAL(10,7),
        "workplace_longitude" DECIMAL(10,7),
        "distance_meters" INT,
        "late_minutes" INT NOT NULL DEFAULT 0,
        "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "status" VARCHAR(20) NOT NULL DEFAULT 'on_time',
        "device" VARCHAR(200),
        "note" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attendance_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_attendance_employee_checkin" ON "attendance_records" ("employee_id", "check_in_time")`);

    // shift_types
    await queryRunner.query(`
      CREATE TABLE "shift_types" (
        "id" BIGSERIAL NOT NULL,
        "store_id" BIGINT,
        "shift_name" VARCHAR(100) NOT NULL,
        "start_time" TIME NOT NULL,
        "end_time" TIME NOT NULL,
        "break_minutes" INT NOT NULL DEFAULT 0,
        "min_staff" INT NOT NULL DEFAULT 1,
        "max_staff" INT NOT NULL DEFAULT 10,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shift_types" PRIMARY KEY ("id")
      )
    `);

    // shift_schedules
    await queryRunner.query(`
      CREATE TABLE "shift_schedules" (
        "id" BIGSERIAL NOT NULL,
        "employee_id" BIGINT NOT NULL,
        "shift_type_id" BIGINT NOT NULL,
        "date" DATE NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shift_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shift_schedules_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shift_schedules_shift_type" FOREIGN KEY ("shift_type_id")
          REFERENCES "shift_types"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_shift_schedules_date" ON "shift_schedules" ("date", "shift_type_id")`);

    // leave_types
    await queryRunner.query(`
      CREATE TABLE "leave_types" (
        "id" BIGSERIAL NOT NULL,
        "name" VARCHAR(50) NOT NULL,
        "code" VARCHAR(20) NOT NULL,
        "max_days_per_year" INT,
        CONSTRAINT "UQ_leave_types_code" UNIQUE ("code"),
        CONSTRAINT "PK_leave_types" PRIMARY KEY ("id")
      )
    `);

    // leave_requests
    await queryRunner.query(`
      CREATE TABLE "leave_requests" (
        "id" BIGSERIAL NOT NULL,
        "employee_id" BIGINT NOT NULL,
        "leave_type_id" BIGINT NOT NULL,
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "reason" TEXT,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "approved_by" BIGINT,
        "approved_at" TIMESTAMP,
        "reject_reason" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leave_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leave_requests_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leave_requests_leave_type" FOREIGN KEY ("leave_type_id")
          REFERENCES "leave_types"("id")
      )
    `);

    // payrolls
    await queryRunner.query(`
      CREATE TABLE "payrolls" (
        "id" BIGSERIAL NOT NULL,
        "employee_id" BIGINT NOT NULL,
        "year" INT NOT NULL,
        "month" INT NOT NULL,
        "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "overtime_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "total_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "confirmed_by" BIGINT,
        "confirmed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payrolls_employee_period" UNIQUE ("employee_id", "year", "month"),
        CONSTRAINT "PK_payrolls" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payrolls_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE
      )
    `);

    // Seed default leave types
    await queryRunner.query(`
      INSERT INTO "leave_types" ("name", "code", "max_days_per_year") VALUES
        ('特休', 'ANNUAL', NULL),
        ('病假', 'SICK', 30),
        ('事假', 'PERSONAL', 14),
        ('婚假', 'MARRIAGE', 8),
        ('喪假', 'BEREAVEMENT', 8)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payrolls"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_types"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shift_schedules_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shift_schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shift_types"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_employee_checkin"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_records"`);
  }
}
