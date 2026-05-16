import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRoles1716000000001 implements MigrationInterface {
  name = 'SeedRoles1716000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description") VALUES
        ('employee', '一般員工 — 打卡與請假'),
        ('manager', '主管 — 排班與假單審核'),
        ('hr', 'HR 人事 — 薪資與人員管理'),
        ('admin', '系統管理員 — 完整存取權')
    `);

    // Insert permissions
    await queryRunner.query(`
      INSERT INTO "permissions" ("module", "action") VALUES
        ('attendance', 'view'),
        ('attendance', 'create'),
        ('shift', 'view'),
        ('shift', 'create'),
        ('shift', 'edit'),
        ('leave', 'view'),
        ('leave', 'create'),
        ('leave', 'edit'),
        ('payroll', 'view'),
        ('payroll', 'create'),
        ('payroll', 'edit'),
        ('payroll', 'delete'),
        ('hr', 'view'),
        ('hr', 'create'),
        ('hr', 'edit'),
        ('hr', 'delete')
    `);

    // employee role permissions: attendance view/create + leave view/create
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r, "permissions" p
      WHERE r.name = 'employee'
        AND (
          (p.module = 'attendance' AND p.action IN ('view', 'create'))
          OR (p.module = 'leave' AND p.action IN ('view', 'create'))
        )
    `);

    // manager role permissions: attendance view + shift view/create/edit + leave view/edit
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r, "permissions" p
      WHERE r.name = 'manager'
        AND (
          (p.module = 'attendance' AND p.action = 'view')
          OR (p.module = 'shift' AND p.action IN ('view', 'create', 'edit'))
          OR (p.module = 'leave' AND p.action IN ('view', 'edit'))
        )
    `);

    // hr role permissions: hr view/create/edit + payroll view
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r, "permissions" p
      WHERE r.name = 'hr'
        AND (
          (p.module = 'hr' AND p.action IN ('view', 'create', 'edit'))
          OR (p.module = 'payroll' AND p.action = 'view')
        )
    `);

    // admin role permissions: all permissions
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r, "permissions" p
      WHERE r.name = 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions"`);
    await queryRunner.query(`DELETE FROM "permissions"`);
    await queryRunner.query(`DELETE FROM "roles"`);
  }
}
