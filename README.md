# CheckPass 打卡之星

雲端出勤與人資管理系統

> **dev 分支** — 開發中版本，功能尚未穩定，請勿直接用於生產環境。

## 簡介

CheckPass 打卡之星是一套整合 LINE 打卡、出勤管理、排班、請假簽核、薪資計算與人事管理的雲端人資系統，適用於中小企業、門市及外勤團隊。

## 系統類型

- Web
- LINE OA
- Mobile Web

## 核心功能

| 模組 | 說明 |
|------|------|
| LINE 打卡 | GPS / WiFi / QR Code / 外勤打卡 |
| 出勤管理 | 上下班記錄、遲到早退、加班計算 |
| 排班管理 | 固定班、輪班、自動排班 |
| 請假管理 | 申請、簽核流程、假別管理 |
| 薪資管理 | 薪資計算、加班費、勞健保 |
| 人資管理 | 員工資料、部門、職位、到離職 |
| 通知服務 | LINE Notify、Email、Web Push |

## 技術架構

### Frontend
- Vue 3 + PrimeVue + Pinia + Vite

### Backend
- Node.js / NestJS
- RESTful API
- Socket.IO

### Database
- PostgreSQL
- Redis

### 雲端
- Docker / Kubernetes
- AWS / GCP

## 使用者角色

| 角色 | 權限 |
|------|------|
| 員工 | 打卡、請假、查看班表 |
| 主管 | 簽核、查看部門報表 |
| HR | 員工管理、薪資管理 |
| 系統管理員 | 全系統設定 |

## 分支說明

| 分支 | 用途 |
|------|------|
| `main` | 穩定版本 |
| `dev` | 開發整合分支 |

## 文件

- [系統開發規格書](docs/attendance-spec.md)

## 授權

© 2026 CheckPass. All rights reserved.
