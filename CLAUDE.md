# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CheckPass 打卡通 is a cloud-based attendance and HR management system targeting SMEs, retail stores, and field teams. It integrates LINE OA check-in, attendance tracking, shift scheduling, leave approval, payroll calculation, and employee management into a single platform.

The repository is currently in the **specification phase** — no implementation code exists yet. The primary artifact is `docs/attendance-spec.md`.

## Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases |
| `dev` | Integration branch for active development |

Feature branches should be merged into `dev`, not `main` directly.

## Planned Architecture

All services sit behind an API Gateway. Each domain is a separate service:

```
員工端（LINE / Mobile）
        │
        ▼
 API Gateway
        │
 ├── Auth Service        — JWT, LINE Login
 ├── Attendance Service  — check-in/out, overtime, tardiness
 ├── Shift Service       — schedules, rotation, multi-store
 ├── Leave Service       — apply, approve, leave types
 ├── Payroll Service     — salary calculation, NHI deductions
 ├── Notification Service— LINE Notify, Email, Web Push
 └── HR Service          — employees, departments, positions
        │
        ▼
     Database (PostgreSQL + Redis)
```

## Planned Tech Stack

**Frontend:** Vue 3, PrimeVue, Pinia, Vite

**Backend:** Node.js / NestJS, RESTful API, Socket.IO (real-time notifications)

**Infrastructure:** Docker, Kubernetes, AWS / GCP

**Third-party:** LINE Login, LINE Messaging API, Google Maps API, SMTP

## Key Domain Rules

- **Tardiness:** `check_in_time > shift_start + grace_minutes`
- **Overtime:** `check_out_time > shift_end`
- **Payroll formula:** `total = base_salary + overtime_pay - deductions`
- **Overtime pay:** `hourly_rate × overtime_hours × multiplier`
- **Leave approval flow:** Employee → Manager → HR

## RBAC

Roles: 員工 (Employee), 主管 (Manager), HR, 系統管理員 (Admin). Permissions are module-level with View / Create / Edit / Delete granularity.

## MVP Priority (Phase 1)

Focus implementation in this order: LINE Login → Check-in → Attendance → Leave → Basic RBAC. Shift scheduling, payroll, and reporting come in Phase 2.

## Performance Targets

- API response < 2s
- Check-in write < 1s
- Concurrent users: 5,000

## Security Requirements

JWT auth, HTTPS, GPS spoofing prevention, Audit Log on all mutations, logs retained 180 days.

## Spec Document

Full module specs, API contracts, and data models: [`docs/attendance-spec.md`](docs/attendance-spec.md)
