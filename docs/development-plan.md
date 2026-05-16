# CheckPass 打卡通 — 開發計畫

版本：v1.0　更新日期：2026-05-16

---

## 總覽

| 階段 | 名稱 | 期間 | 週次 |
|------|------|------|------|
| Phase 0 | 基礎建設 | 2 週 | W1–W2 |
| Phase 1 | MVP 核心 | 12 週 | W3–W14 |
| Phase 2 | 完整功能 | 12 週 | W15–W26 |
| Phase 3 | 進階擴充 | 10 週 | W27–W36 |

總工期：**36 週（約 9 個月）**

---

## Phase 0：基礎建設（W1–W2）

### 目標
建立開發環境、專案骨架與 CI/CD 流程。

### 任務清單

| # | 任務 | 負責 | 工期 |
|---|------|------|------|
| 0-1 | 建立 Monorepo 結構（frontend / backend / infra） | 全端 | 1 天 |
| 0-2 | NestJS 專案初始化、模組分層設計 | 後端 | 2 天 |
| 0-3 | Vue 3 + PrimeVue + Pinia + Vite 初始化 | 前端 | 2 天 |
| 0-4 | PostgreSQL + Redis Docker Compose 設定 | DevOps | 1 天 |
| 0-5 | 資料庫 Schema 設計（employees、roles、permissions） | 後端 | 2 天 |
| 0-6 | CI/CD Pipeline 設定（GitHub Actions） | DevOps | 2 天 |
| 0-7 | Kubernetes 部署配置（Dev 環境） | DevOps | 2 天 |
| 0-8 | API Gateway 路由設定、Swagger 文件框架 | 後端 | 1 天 |

### 里程碑 M0
> **W2 結束**：本地開發環境可啟動、空白 API 可回應、DB migration 工具就緒。

---

## Phase 1：MVP 核心（W3–W14）

### 1-A　認證服務 Auth Service（W3–W4）

**功能範圍**
- LINE Login OAuth 2.0 整合
- JWT 存取權杖與更新權杖
- 基本 RBAC 骨架（User → Role → Permission）

| # | 任務 | 工期 |
|---|------|------|
| 1A-1 | LINE Login 串接、取得使用者 Profile | 3 天 |
| 1A-2 | JWT 簽發、刷新、撤銷 | 2 天 |
| 1A-3 | RBAC 資料表建立（roles、permissions、role_permissions） | 2 天 |
| 1A-4 | Auth Guard、Permission Guard 實作 | 2 天 |
| 1A-5 | 前端 LINE Login 頁、Token 儲存（Pinia） | 1 天 |

### 1-B　打卡服務 Attendance Service — 打卡功能（W5–W7）

**功能範圍**
- GPS 打卡、WiFi 打卡、QR Code 打卡、固定地點打卡、外勤打卡
- `POST /api/attendance/check-in` / `check-out`
- 打卡紀錄寫入 `attendance_records`

| # | 任務 | 工期 |
|---|------|------|
| 1B-1 | `attendance_records` Schema migration | 1 天 |
| 1B-2 | GPS 座標驗證邏輯（Haversine 距離計算） | 2 天 |
| 1B-3 | WiFi SSID / BSSID 驗證 | 1 天 |
| 1B-4 | QR Code 產生（每日動態 Token）與驗證 | 2 天 |
| 1B-5 | 外勤打卡（無地點限制，僅記錄座標） | 1 天 |
| 1B-6 | GPS 防偽檢查（速度異常、模擬器偵測） | 1 天 |
| 1B-7 | LINE Flex Message 打卡成功回傳 | 1 天 |
| 1B-8 | 前端 LINE 選單打卡頁面（Mobile Web） | 3 天 |
| 1B-9 | Google Maps API 整合顯示打卡位置 | 1 天 |

### 1-C　出勤管理 Attendance Service — 出勤邏輯（W8–W10）

**功能範圍**
- 遲到、早退、缺勤、加班計算
- 工時統計
- 後台出勤報表

| # | 任務 | 工期 |
|---|------|------|
| 1C-1 | 遲到規則引擎（check_in > shift_start + grace） | 2 天 |
| 1C-2 | 早退規則引擎（check_out < shift_end） | 1 天 |
| 1C-3 | 缺勤自動標記（排程任務，每日 EOD） | 1 天 |
| 1C-4 | 加班計算（check_out > shift_end，overtime_hours） | 2 天 |
| 1C-5 | 工時彙總 API（日、週、月） | 2 天 |
| 1C-6 | 前端員工出勤明細頁 | 2 天 |
| 1C-7 | 前端主管部門出勤報表頁 | 2 天 |
| 1C-8 | Audit Log 中間件（所有打卡寫入操作） | 1 天 |

### 1-D　請假服務 Leave Service（W11–W12）

**功能範圍**
- 假別：特休、病假、事假、婚假、喪假
- 申請、主管簽核、HR 確認三段流程
- 附件上傳（病假證明等）
- `POST /api/leave/apply`

| # | 任務 | 工期 |
|---|------|------|
| 1D-1 | `leave_types`、`leave_requests`、`leave_approvals` Schema | 1 天 |
| 1D-2 | 請假申請 API 與假別餘額檢查 | 2 天 |
| 1D-3 | 簽核流程狀態機（Pending → Manager → HR → Approved/Rejected） | 2 天 |
| 1D-4 | 附件上傳（S3 / GCS Presigned URL） | 1 天 |
| 1D-5 | 前端員工請假申請表單 | 2 天 |
| 1D-6 | 前端主管 / HR 簽核頁面 | 2 天 |

### 1-E　基本 RBAC 管理介面（W13–W14）

| # | 任務 | 工期 |
|---|------|------|
| 1E-1 | 角色管理 CRUD API | 1 天 |
| 1E-2 | 權限指派 API | 1 天 |
| 1E-3 | 前端角色 / 權限設定頁（Admin） | 3 天 |
| 1E-4 | 前端選單依權限動態顯示 | 2 天 |
| 1E-5 | E2E 整合測試（打卡→出勤→請假流程） | 3 天 |

### 里程碑 M1
> **W14 結束**：員工可透過 LINE 打卡、查詢出勤、申請請假並完成簽核。系統具備基本 RBAC。可對外 Demo。

---

## Phase 2：完整功能（W15–W26）

### 2-A　排班服務 Shift Service（W15–W17）

**功能範圍**
- 班別建立（shift_name、start_time、end_time、break_minutes）
- 固定班、輪班、自動排班
- 多門市班表
- 指定休假日

| # | 任務 | 工期 |
|---|------|------|
| 2A-1 | `shifts`、`shift_schedules`、`stores` Schema | 1 天 |
| 2A-2 | 班別 CRUD API | 1 天 |
| 2A-3 | 員工排班指派 API | 2 天 |
| 2A-4 | 輪班週期設定（N 天輪一次） | 2 天 |
| 2A-5 | 自動排班演算法（依規則填滿空缺） | 3 天 |
| 2A-6 | 多門市班表隔離（store_id 過濾） | 1 天 |
| 2A-7 | 前端班表 Calendar UI（月視圖） | 3 天 |
| 2A-8 | 前端員工查詢個人班表 | 1 天 |

### 2-B　薪資服務 Payroll Service（W18–W20）

**功能範圍**
- 薪資計算：`base_salary + overtime_pay - deductions`
- 加班費：`hourly_rate × overtime_hours × multiplier`
- 勞保、健保、所得稅扣款
- 薪資單產生（PDF）

| # | 任務 | 工期 |
|---|------|------|
| 2B-1 | `payrolls`、`salary_settings` Schema | 1 天 |
| 2B-2 | 薪資計算引擎（依月份彙整出勤資料） | 3 天 |
| 2B-3 | 勞健保費率表維護與扣款計算 | 2 天 |
| 2B-4 | 加班費倍率設定（平日、假日、特休） | 1 天 |
| 2B-5 | 薪資單 PDF 產生 | 2 天 |
| 2B-6 | 薪資審核流程（HR 確認後鎖定） | 1 天 |
| 2B-7 | 前端 HR 薪資計算頁面 | 3 天 |
| 2B-8 | 前端員工薪資單查詢 | 1 天 |

### 2-C　人資服務 HR Service（W21–W22）

**功能範圍**
- 員工資料 CRUD（`employees` 表）
- 部門管理（`departments`）
- 職位管理（`positions`）
- 到職 / 離職流程

| # | 任務 | 工期 |
|---|------|------|
| 2C-1 | `departments`、`positions` Schema 與 CRUD API | 2 天 |
| 2C-2 | 員工完整資料 CRUD API（含 emp_no 自動產生） | 2 天 |
| 2C-3 | 到職流程（帳號開立、LINE 綁定通知） | 2 天 |
| 2C-4 | 離職流程（帳號停用、交接記錄） | 1 天 |
| 2C-5 | 前端員工管理列表 / 表單頁 | 3 天 |

### 2-D　通知服務 Notification Service（W23–W24）

**功能範圍**
- LINE Notify（打卡成功、請假簽核、加班、排班）
- Email（SMTP）
- Web Push（Socket.IO）

| # | 任務 | 工期 |
|---|------|------|
| 2D-1 | 通知服務模組（策略模式，可插拔通知管道） | 2 天 |
| 2D-2 | LINE Messaging API 整合（Flex Message 範本） | 2 天 |
| 2D-3 | SMTP Email 發送（Nodemailer） | 1 天 |
| 2D-4 | Socket.IO 即時推播（後台事件通知） | 2 天 |
| 2D-5 | 通知偏好設定（員工可選擇管道） | 1 天 |
| 2D-6 | 通知發送 Log 記錄與重試機制 | 2 天 |

### 2-E　報表與多公司支援（W25–W26）

| # | 任務 | 工期 |
|---|------|------|
| 2E-1 | 出勤月報表 API（遲到次數、加班時數、缺勤天數） | 2 天 |
| 2E-2 | 薪資彙總報表 API | 1 天 |
| 2E-3 | 前端報表頁（表格 + 折線圖 / 長條圖） | 3 天 |
| 2E-4 | 多公司（tenant）隔離架構（company_id 欄位注入） | 3 天 |
| 2E-5 | 資料備份排程（每日 PostgreSQL dump to S3） | 1 天 |

### 里程碑 M2
> **W26 結束**：系統具備完整排班、薪資、人資、通知功能。支援多公司。可供正式客戶試用（Beta）。

---

## Phase 3：進階擴充（W27–W36）

### 3-A　BI 儀表板（W27–W28）

| # | 任務 | 工期 |
|---|------|------|
| 3A-1 | 出勤趨勢、遲到率、加班統計儀表板 | 4 天 |
| 3A-2 | 薪資成本分析圖表 | 2 天 |
| 3A-3 | 假別使用率報告 | 2 天 |
| 3A-4 | 資料匯出（CSV / Excel） | 2 天 |

### 3-B　AI 排班（W29–W31）

| # | 任務 | 工期 |
|---|------|------|
| 3B-1 | 歷史出勤資料特徵工程 | 3 天 |
| 3B-2 | 排班需求預測模型（人力缺口預警） | 4 天 |
| 3B-3 | 自動排班建議 API（AI 產出草案，主管確認） | 3 天 |
| 3B-4 | 前端 AI 排班建議 UI | 2 天 |

### 3-C　人臉辨識打卡（W32–W33）

| # | 任務 | 工期 |
|---|------|------|
| 3C-1 | 人臉特徵建檔 API（員工到職時上傳） | 2 天 |
| 3C-2 | 打卡時人臉比對（整合第三方 Face API） | 3 天 |
| 3C-3 | 活體偵測（防照片攻擊） | 2 天 |
| 3C-4 | 前端人臉打卡介面（Mobile Web Camera） | 2 天 |

### 3-D　勞基法自動檢查（W34）

| # | 任務 | 工期 |
|---|------|------|
| 3D-1 | 勞基法規則引擎（每週工時上限、強制休息） | 3 天 |
| 3D-2 | 違規預警通知（主管 / HR） | 2 天 |

### 3-E　多國語系 & Mobile App（W35–W36）

| # | 任務 | 工期 |
|---|------|------|
| 3E-1 | i18n 框架導入（vue-i18n，繁中 / 英文 / 日文） | 2 天 |
| 3E-2 | PWA 配置（Offline 支援、App 安裝） | 2 天 |
| 3E-3 | 行動 App 評估（Capacitor 或 Native App） | 2 天 |
| 3E-4 | 壓力測試（5,000 concurrent users）與效能調優 | 3 天 |

### 里程碑 M3
> **W36 結束**：具備 AI 排班、人臉辨識、BI 儀表板、勞基法檢查與 PWA。系統達生產就緒（GA）。

---

## 甘特圖（簡略）

```
週次      1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36
Phase 0   ██ ██
Auth               ██ ██
打卡                     ██ ██ ██
出勤                              ██ ██ ██
請假                                        ██ ██
RBAC                                              ██ ██
                                                          ← M1 →
排班                                                       ██ ██ ██
薪資                                                               ██ ██ ██
人資                                                                        ██ ██
通知                                                                              ██ ██
報表/多公司                                                                              ██ ██
                                                                                               ← M2 →
BI 儀表板                                                                                       ██ ██
AI 排班                                                                                               ██ ██ ██
人臉辨識                                                                                                       ██ ██
勞基法                                                                                                               ██
App/i18n                                                                                                                  ██ ██
                                                                                                                              ← M3 →
```

---

## 里程碑總結

| 里程碑 | 時間點 | 交付內容 |
|--------|--------|---------|
| **M0** | W2 | 開發環境、DB、CI/CD 就緒 |
| **M1** | W14 | LINE 打卡、出勤、請假、基本 RBAC（可 Demo） |
| **M2** | W26 | 排班、薪資、人資、通知、多公司（Beta 上線） |
| **M3** | W36 | AI 排班、人臉辨識、BI、勞基法、PWA（GA 上線） |

---

## 非功能需求驗收時間點

| 需求 | 驗收時間 | 指標 |
|------|---------|------|
| API Response < 2s | M1（W14） | k6 壓測 P95 |
| 打卡寫入 < 1s | M1（W14） | 單次 API 計時 |
| 同時在線 5,000 人 | M3（W36） | 壓力測試 |
| 每日備份 | M2（W26） | S3 備份驗證 |
| 日誌保存 180 天 | M2（W26） | Log 保留政策設定 |

---

## 風險與因應

| 風險 | 影響 | 因應策略 |
|------|------|---------|
| LINE API 政策異動 | 打卡功能中斷 | 抽象化 LINE 依賴，保留 Web 打卡備援 |
| GPS 防偽繞過 | 打卡資料不實 | 多重驗證（GPS + WiFi + 時間戳） |
| 勞基法條文更新 | 規則引擎需重寫 | 規則引擎外部化（設定檔驅動） |
| AI 排班準確率不足 | 主管不信任建議 | 以「建議草案 + 人工確認」模式上線 |
