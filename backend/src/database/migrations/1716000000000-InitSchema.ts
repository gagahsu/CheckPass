import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1716000000000 implements MigrationInterface {
  name = 'InitSchema1716000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // departments
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" BIGSERIAL NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departments" PRIMARY KEY ("id")
      )
    `);

    // positions
    await queryRunner.query(`
      CREATE TABLE "positions" (
        "id" BIGSERIAL NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_positions" PRIMARY KEY ("id")
      )
    `);

    // employees
    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" BIGSERIAL NOT NULL,
        "emp_no" VARCHAR(20) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "email" VARCHAR(200),
        "line_user_id" VARCHAR(100),
        "department_id" BIGINT,
        "position_id" BIGINT,
        "hire_date" DATE,
        "status" VARCHAR(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_employees_emp_no" UNIQUE ("emp_no"),
        CONSTRAINT "UQ_employees_email" UNIQUE ("email"),
        CONSTRAINT "UQ_employees_line_user_id" UNIQUE ("line_user_id"),
        CONSTRAINT "PK_employees" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employees_department" FOREIGN KEY ("department_id")
          REFERENCES "departments"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_employees_position" FOREIGN KEY ("position_id")
          REFERENCES "positions"("id") ON DELETE SET NULL
      )
    `);

    // roles
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" BIGSERIAL NOT NULL,
        "name" VARCHAR(50) NOT NULL,
        "description" VARCHAR(200),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // permissions
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" BIGSERIAL NOT NULL,
        "module" VARCHAR(50) NOT NULL,
        "action" VARCHAR(20) NOT NULL,
        CONSTRAINT "UQ_permissions_module_action" UNIQUE ("module", "action"),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      )
    `);

    // role_permissions (join table)
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" BIGINT NOT NULL,
        "permission_id" BIGINT NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id")
          REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id")
          REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    // employee_roles (join table)
    await queryRunner.query(`
      CREATE TABLE "employee_roles" (
        "employee_id" BIGINT NOT NULL,
        "role_id" BIGINT NOT NULL,
        CONSTRAINT "PK_employee_roles" PRIMARY KEY ("employee_id", "role_id"),
        CONSTRAINT "FK_employee_roles_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employee_roles_role" FOREIGN KEY ("role_id")
          REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse FK dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "positions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
  }
}
