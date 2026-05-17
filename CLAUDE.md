# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CheckPass 打卡通 is a cloud-based attendance and HR management system targeting SMEs, retail stores, and field teams. It integrates LINE OA check-in, attendance tracking, shift scheduling, leave approval, payroll calculation, and employee management into a single platform.

The project is **actively in development**. Full spec: [`docs/attendance-spec.md`](docs/attendance-spec.md)

## Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases |
| `dev`  | Integration branch — all feature work merges here |

Always develop on `dev` or a feature branch merged into `dev`. Never push directly to `main`.

## Actual Architecture (Implemented)

Single NestJS monolith (not microservices). All modules share one PostgreSQL database.

```
員工端（LINE LIFF / Browser / PWA）
        │
        ▼
  NestJS REST API  :3000
        │
  ├── /auth          — LINE Login OAuth, JWT issuance
  ├── /hr            — employee list, detail, role assignment
  ├── /org           — department + position CRUD
  ├── /attendance    — check-in/out, records, summaries, workplace settings
  ├── /shifts        — shift types, schedule, publish
  ├── /leave         — apply, 2-stage approve, reject, cancel
  ├── /payroll       — calculate, confirm, list
  └── /sse           — Server-Sent Events for real-time notifications
        │
        ▼
  PostgreSQL  (TypeORM 0.3)
```

## Tech Stack

**Backend:** NestJS 10, TypeORM 0.3, PostgreSQL, class-validator, @nestjs/schedule (Cron), axios

**Frontend:** Vue 3, PrimeVue 4 (Aura theme), Pinia, Vue Router 4, Vite 5, TypeScript

**Third-party:** LINE Login, LINE Messaging API, Mailjet (email), Leaflet.js

**PWA:** manifest.json + sw.js in `frontend/public/` (no vite-plugin-pwa)

## Critical Rules — Read Before Editing

### URL Paths
- `apiClient` baseURL = `http://localhost:3000` — **no `/api` prefix** in any route path
- Backend controller routes: `/attendance/...`, `/auth/...`, `/hr/...`, `/org/...`, `/leave/...`, `/shifts/...`, `/payroll/...`, `/sse/...`

### Migrations
- All migrations live in `backend/src/database/migrations/`
- Naming: `1716000000000-InitSchema.ts`, `1716000000001-...`, etc. (increment last 3 digits)
- Next migration number: **013**
- Use `IF NOT EXISTS` / `IF EXISTS` in ALTER TABLE for idempotency

### TypeORM Entities
- Use `@Column({ name: 'snake_case' })` when the TypeScript property name differs from the DB column name
- Numeric primary keys are `bigint` in DB but `number` in TypeScript — **actual runtime value is a string** despite the TypeScript type; always use `Number(id)` before strict comparison (`===`)
- Decimal columns come back as strings from PostgreSQL — wrap with `Number(...)` before arithmetic
- `DATE` columns: `pg` driver is configured (via `types.setTypeParser(1082, ...)` in `main.ts`) to return plain `YYYY-MM-DD` strings instead of JavaScript Date objects — never use `toISOString()` to format dates; use local-time methods (`getFullYear/getMonth/getDate`) or the `addDays()` helper in shift.service.ts
- Nullable foreign-key numbers in DTOs require `@Transform(({ value }) => ...)` before `@IsNumber()` — `@IsOptional()` alone does not handle `null` when `enableImplicitConversion: true` is set

### Guards & Decorators
```typescript
@UseGuards(JwtAuthGuard)           // always for protected routes
@UseGuards(RolesGuard)             // add when role restriction needed
@Roles('hr', 'admin')              // roles: employee | manager | hr | admin
@CurrentUser() user: JwtPayload    // { employeeId, roles, name, empNo, lineUserId }
```

JWT payload now includes `name`, `empNo`, `lineUserId` in addition to `employeeId` and `roles` — the frontend auth store reads these directly from the token without an extra API call.

### Frontend Auth
```typescript
const authStore = useAuthStore()
authStore.hasRole('hr')            // check single role
authStore.hasRole('admin')         // roles: employee | manager | hr | admin
```

### Notifications
- LINE push: `notificationService.sendLinePush(lineUserId, text)` — silently skips if `LINE_CHANNEL_ACCESS_TOKEN` not set
- Email: `notificationService.sendEmail(to, subject, html)` — silently skips if `MAILJET_API_KEY` not set
- Always call notification methods with `.catch(() => {})` to avoid blocking the main flow

## File Map

### Backend
```
backend/src/
├── app.module.ts
├── main.ts
├── auth/
│   ├── auth.controller.ts        GET /auth/line/login-url, /auth/line/callback, /auth/profile; POST /auth/dev-login (DEV only)
│   ├── auth.service.ts
│   ├── auth.module.ts            — registers Employee, Role, Department, Position, OrgService, OrgController
│   ├── hr.controller.ts          GET/PATCH /hr/employees, /hr/employees/:id; PATCH /hr/employees/:id/roles (admin only)
│   ├── hr.service.ts
│   ├── dto/hr.dto.ts             — CreateEmployeeDto, UpdateEmployeeDto (both accept departmentId, positionId), AssignRolesDto
│   ├── org.controller.ts         CRUD /org/departments, /org/positions
│   ├── org.service.ts
│   ├── org.dto.ts
│   ├── jwt.strategy.ts
│   └── entities/
│       ├── employee.entity.ts
│       ├── role.entity.ts
│       ├── department.entity.ts
│       └── position.entity.ts
├── attendance/
│   ├── attendance.controller.ts  POST check-in/out, GET records/today/summary/dashboard-stats/department-summary/trend/export; CRUD /workplaces (GET: manager+, write: admin)
│   ├── attendance.service.ts     — GPS validation skipped if no active workplace configured (dev-friendly)
│   ├── attendance.module.ts
│   ├── attendance-scheduler.service.ts  — daily absent marking cron
│   ├── dto/check-in.dto.ts       — AttendanceQueryDto accepts both `limit` and `pageSize`; includes CreateWorkplaceDto, UpdateWorkplaceDto
│   └── entities/
│       ├── attendance-record.entity.ts
│       └── workplace-setting.entity.ts
├── shift/
│   ├── shift.controller.ts       GET/POST/PATCH/DELETE /shifts/types/:id; GET/POST/DELETE /shifts/schedule; GET /shifts/my-schedule, /shifts/schedule/month; POST /shifts/schedule/publish
│   ├── shift.service.ts
│   ├── shift.module.ts
│   ├── dto/shift.dto.ts          — CreateShiftTypeDto, UpdateShiftTypeDto, AssignShiftDto (accepts storeId), PublishScheduleDto
│   └── entities/
│       ├── shift-type.entity.ts  — columns: name (DB: shift_name), graceMinutes, color, minStaff, maxStaff, updatedAt
│       └── shift-schedule.entity.ts  — date column uses pg type parser to return YYYY-MM-DD string; has updatedAt
├── leave/
│   ├── leave.controller.ts       GET types/my-requests/pending-approvals, POST apply, PATCH approve/reject/cancel
│   ├── leave.service.ts          — approve() takes callerRoles[] for 2-stage logic
│   ├── leave.module.ts
│   ├── dto/leave.dto.ts
│   └── entities/
│       ├── leave-request.entity.ts  — status: pending|manager_approved|approved|rejected|cancelled
│       └── leave-type.entity.ts
├── payroll/
│   ├── payroll.controller.ts     GET /payroll, /payroll/list, POST /payroll/calculate, /payroll/:id/confirm
│   ├── payroll.service.ts        — confirm() triggers LINE push + email via NotificationService
│   ├── payroll.module.ts
│   ├── dto/payroll.dto.ts
│   └── entities/payroll.entity.ts  — fields: baseSalary, overtimePay, nhiDeduction, laborDeduction, deduction, totalSalary
├── notification/
│   ├── notification.service.ts   — sendLinePush(), sendEmail(), buildPayrollEmail(), buildCheckInMessage()...
│   └── notification.module.ts    — exports NotificationService; import this module to use notifications
├── sse/
│   ├── sse.controller.ts         GET /sse/stream
│   ├── sse.service.ts
│   └── sse.module.ts
├── common/
│   ├── decorators/current-user.decorator.ts
│   ├── decorators/roles.decorator.ts
│   ├── guards/jwt-auth.guard.ts
│   └── guards/roles.guard.ts     — exports JwtPayload interface
└── database/
    ├── data-source.ts
    ├── database.module.ts
    └── migrations/               — 000 through 012, next is 013
```

### Frontend
```
frontend/src/
├── main.ts                       — PrimeVue setup, global components, Tooltip directive registered
├── App.vue                       — RouterView + Toast + InstallPrompt + SW registration (PROD only)
├── router/index.ts               — all routes with requiresAuth meta
├── stores/
│   ├── auth.ts                   — user, token, hasRole(), initFromStorage()
│   └── notification.ts
├── api/
│   ├── index.ts                  — axios instance, baseURL: http://localhost:3000
│   ├── attendance.ts             — checkIn/Out, getRecords, getWorkHoursSummary, getDashboardStats, getDepartmentSummary, getAttendanceTrend, exportCsv, CRUD workplaces
│   ├── hr.ts                     — createEmployee, listEmployees, getEmployee, updateEmployee (accepts departmentId/positionId), assignRoles
│   ├── org.ts                    — CRUD departments + positions
│   ├── leave.ts                  — getLeaveTypes, apply, getMyRequests, getPendingApprovals, approve, reject, cancel
│   ├── payroll.ts                — getPayroll, listPayrolls, calculate, confirm
│   └── shift.ts                  — getShiftTypes, createShiftType, updateShiftType, deleteShiftType, getSchedule, getMonthSchedule, getMySchedule, assignShift, removeShift, publishSchedule
├── types/index.ts                — all shared TypeScript interfaces
├── components/
│   ├── AppLayout.vue             — sidebar nav, top header, mobile menu, notification bell
│   ├── NotificationBell.vue      — SSE-connected bell
│   └── InstallPrompt.vue         — PWA install banner
└── views/
    ├── LoginView.vue
    ├── LiffCheckinView.vue       — LINE LIFF GPS check-in page
    ├── DashboardView.vue
    ├── AttendanceView.vue
    ├── ShiftView.vue             — drag-drop weekly calendar
    ├── LeaveView.vue             — my requests + manager approve/reject
    ├── LeaveApplyView.vue
    ├── PayrollView.vue           — payslip + HR calculate/confirm section
    ├── BiDashboardView.vue       — BI charts (manager/hr/admin only)
    ├── EmployeeListView.vue
    ├── EmployeeDetailView.vue
    ├── OrgView.vue               — department + position CRUD (hr/admin)
    └── SettingsView.vue          — shift types, roles display, workplace GPS settings
```

## Domain Rules

### Payroll Calculation
```
hourly_rate   = base_salary / 176          (8h × 22 days)
overtime_pay  = hourly_rate × ot_hours × 1.33  (Labour Standards Act Art. 24)
nhi_deduction = base_salary × 0.01551     (健保 5.17% × 30% employee share)
labor_deduction = base_salary × 0.024     (勞保 12% × 20% employee share)
deduction     = nhi_deduction + labor_deduction
total_salary  = base_salary + overtime_pay - deduction
```

### Leave Approval Flow (2-stage)
```
Employee applies → PENDING
Manager approves → MANAGER_APPROVED   (LINE not sent yet)
HR confirms      → APPROVED            (LINE push sent to employee)

HR/admin can skip directly: PENDING → APPROVED
Either stage can reject → REJECTED    (LINE push sent)
```

### GPS Check-in Validation
- Haversine distance check against `workplace_settings.gps_radius_meters` (default 200m)
- If **no active workplace is configured**, GPS/WiFi distance checks are skipped with a warning log (dev-friendly; add a workplace in Settings to enforce location)
- Speed anomaly: logs warning if > 300 km/h since last check-out (does not block check-in)
- WiFi SSID check against `workplace_settings.wifi_ssids` (comma-separated)

### RBAC Sidebar Visibility
```
employee  — dashboard, attendance, shift, leave, payroll
manager   — + bi-dashboard
hr        — + bi-dashboard, employee-list, org
admin     — + bi-dashboard, employee-list, org, settings
```

### Role-based API Access (key restrictions)
- `assignRoles` (`PATCH /hr/employees/:id/roles`) — **admin only**; frontend hides role selector and skips this call for non-admin
- `CRUD workplaces` write — admin only; `GET /attendance/workplaces` — manager/hr/admin
- `createEmployee`, `updateEmployee` — hr/admin

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
# Database
DATABASE_HOST / DATABASE_PORT / DATABASE_NAME / DATABASE_USER / DATABASE_PASSWORD

# JWT
JWT_SECRET                   # long random string
JWT_EXPIRES_IN=7d

# LINE Login (員工登入用)
LINE_LOGIN_CHANNEL_ID        # LINE Developers → LINE Login channel
LINE_LOGIN_CHANNEL_SECRET
LINE_CALLBACK_URL            # https://your-domain/auth/line/callback

# LINE Messaging API (推播通知用，不同 channel)
LINE_CHANNEL_ACCESS_TOKEN    # LINE Developers → Messaging API channel
LINE_CHANNEL_SECRET          # same Messaging API channel secret

# Mailjet (薪資 Email)
MAILJET_API_KEY
MAILJET_SECRET_KEY
MAILJET_FROM_EMAIL           # must be a verified sender in Mailjet
MAILJET_FROM_NAME=CheckPass 打卡通

# App
PORT=3000
APP_URL                      # frontend URL for CORS
CORS_ORIGIN                  # same as APP_URL
```

Missing LINE/Mailjet keys cause the notification to be silently skipped — the app continues to function normally.

## What's NOT Yet Implemented

| Feature | Notes |
|---------|-------|
| QR Code 打卡 | Phase 2 spec item |
| WiFi 打卡獨立流程 | SSID check exists in GPS path; no dedicated WiFi-only check-in UI |
| 報表匯出 PDF | CSV implemented; PDF not |
| Docker / docker-compose | backend Dockerfile exists, no compose file |
| 壓力測試 | Phase 3 |
| 人臉辨識 / Multi-tenant / i18n | Post-MVP roadmap items |

## Dev Login (Local Testing)

`POST /auth/dev-login` (blocked in production) returns `{ accessToken, employee }`.

The login page shows a "開發模式快速登入" panel (only when `import.meta.env.DEV`) with an employee ID input. Enter any valid employee ID to log in without LINE OAuth.
