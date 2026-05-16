# 「打卡通」系統開發規格書

## 1. 文件資訊

| 項目 | 說明 |
|------|------|
| 文件名稱 | 打卡通－雲端出勤與人資管理系統開發規格書 |
| 系統類型 | Web + LINE OA + Mobile Web |
| 適用對象 | 中小企業／門市／外勤團隊 |
| 文件版本 | v1.1 |
| 更新日期 | 2026-05-16 |

---

## 2. 系統目標

建立一套整合：

- LINE 打卡
- 出勤管理
- 排班
- 請假簽核
- 薪資計算
- 人事管理

之雲端人資系統。

---

## 3. 系統架構

### 3.1 架構圖（邏輯）

```
員工端（LINE / Mobile）
        │
        ▼
 API Gateway
        │
 ├── 認證服務 Auth Service     — JWT、LINE Login、員工、部門、職位、RBAC
 ├── 打卡服務 Attendance Service — 打卡、出勤、加班、工時
 ├── 排班服務 Shift Service     — 班別、手動排班日曆
 ├── 請假服務 Leave Service     — 申請、簽核
 └── 薪資服務 Payroll Service   — 薪資計算、Email／LINE 薪資通知
        │
        ▼
     Database (PostgreSQL)
```

> **Notification** 不獨立為服務，改為各 Service 內的共用 Notification Module，
> 統一透過 LINE Messaging API 與 Mailjet 發送。

---

## 4. 使用者角色

| 角色 | 權限 |
|------|------|
| 員工 | 打卡、請假、查看班表 |
| 主管 | 簽核、查看部門報表、排班 |
| HR | 員工管理、薪資管理 |
| 系統管理員 | 全系統設定 |

---

## 5. 功能模組

---

### 5.1 LINE 打卡模組

#### 功能說明

提供員工透過 LINE 完成上下班打卡。

---

#### 打卡類型

| 類型 | 說明 |
|------|------|
| GPS 打卡 | 驗證定位與公司座標距離 |
| WiFi 打卡 | 驗證指定 WiFi SSID／BSSID |
| QR Code 打卡 | 掃描每日動態 QR Code |
| 固定地點打卡 | 指定公司位置（GPS 合併處理） |
| 外勤打卡 | 非固定位置，僅記錄座標 |

---

#### 打卡流程

```
員工點擊 LINE 選單
    ↓
取得 GPS
    ↓
驗證地點（Haversine 距離計算）
    ↓
建立打卡紀錄
    ↓
LINE Messaging API 回傳成功訊息
```

---

#### GPS 防偽

- 距離驗證：打卡座標與公司座標距離超過允許範圍則拒絕
- 速度異常：兩次打卡間位移不合理則標記警告
- 模擬器偵測：不實作（LINE LIFF 環境不可靠，易誤判）

---

#### API 規格

**POST /api/attendance/check-in**

Request

```json
{
  "employeeId": "EMP001",
  "type": "GPS",
  "latitude": 23.001,
  "longitude": 120.123,
  "device": "iPhone"
}
```

Response

```json
{
  "success": true,
  "message": "打卡成功",
  "time": "2026-05-16 09:00:00"
}
```

---

### 5.2 出勤管理模組

#### 功能

- 上下班記錄
- 遲到早退
- 缺勤
- 加班
- 工時計算

---

#### 規則

**遲到規則**

```
上班時間 > 班別開始時間 + 容許分鐘
→ 遲到
```

**加班規則**

```
下班時間 > 班別結束時間
→ 計算加班
```

---

#### 資料表

**attendance_records**

| 欄位 | 型態 |
|------|------|
| id | bigint |
| employee_id | varchar |
| check_in | datetime |
| check_out | datetime |
| status | varchar |
| overtime_hours | decimal |

---

### 5.3 排班管理模組

#### 功能說明

主管透過拖拉日曆介面手動完成排班，系統提供衝突偵測與草稿發布流程。

---

#### 班別設定

管理員預先定義門市的班別，排班時直接使用。

**shift_types 資料表**

| 欄位 | 說明 |
|------|------|
| id | bigint |
| store_id | 所屬門市 |
| shift_name | 班別名稱（如：早班、晚班） |
| start_time | 開始時間 |
| end_time | 結束時間 |
| break_minutes | 休息時間 |
| min_staff | 最少排班人數 |
| max_staff | 最多排班人數 |

---

#### 排班日曆 UI

```
┌──────────────────────────────────────────┐
│  員工列表（左側）  │  日曆（右側）          │
│                   │  5/19   5/20   5/21  │
│  ● 陳小明         │ ┌─────┐┌─────┐┌─────┐│
│  ● 王小華         │ │早班 ││早班 ││早班 ││
│  ● 李小美         │ │陳○  ││王○  ││     ││
│                   │ └─────┘└─────┘└─────┘│
│  （請假中）       │ ┌─────┐┌─────┐┌─────┐│
│  ✕ 林小芳         │ │晚班 ││晚班 ││晚班 ││
│                   │ │李○  ││     ││張○  ││
│                   │ └─────┘└─────┘└─────┘│
└──────────────────────────────────────────┘
```

- 週視圖 / 月視圖切換
- 員工從左側拖入日曆班別格
- 前端使用 **FullCalendar.js**（Vue 3）

---

#### 衝突偵測

拖入時即時檢查，違規時顯示警告：

| 衝突類型 | 處理方式 |
|---------|---------|
| 員工當天已請假 | 左側標記不可拖，拖入跳警告 |
| 員工當天已有班 | 跳警告，確認是否換班 |
| 低於最少人數 | 班別顯示紅色警示 |
| 超過每週工時上限 | 員工名稱標示警告色 |

---

#### 草稿與發布

```
主管編輯（草稿，僅主管可見）
    ↓
確認發布
    ↓
LINE Messaging API 通知員工本週班表
```

---

#### 多門市支援

班別與班表以 `store_id` 隔離，各門市獨立設定班別與排班。

---

### 5.4 請假管理模組

#### 功能

- 請假申請
- 兩段簽核流程（員工 → 主管）
- 假別管理
- 三段流程（員工 → 主管 → HR）為可選設定，預設關閉

---

#### 假別

| 類型 |
|------|
| 特休 |
| 病假 |
| 事假 |
| 婚假 |
| 喪假 |

---

#### 簽核流程

**預設（兩段）**

```
員工送出
    ↓
主管簽核
    ↓
完成
```

**可選開啟（三段）**

```
員工送出
    ↓
主管簽核
    ↓
HR 確認
    ↓
完成
```

---

#### API

**POST /api/leave/apply**

```json
{
  "employeeId": "EMP001",
  "leaveType": "SICK",
  "startDate": "2026-05-20",
  "endDate": "2026-05-20",
  "reason": "感冒"
}
```

---

### 5.5 薪資管理模組

#### 功能

- 薪資計算
- 加班費
- 勞健保
- 薪資通知（Email + LINE，取代 PDF）

---

#### 薪資公式

**薪資**

```
薪資 = 基本薪資 + 加班費 - 扣款
```

**加班費**

```
加班費 = 時薪 × 加班時數 × 倍率
```

---

#### 薪資通知流程

```
HR 確認當月薪資
    ↓
Mailjet 發送 Email（完整薪資明細）
    ↓
LINE Messaging API 推送摘要
（本月薪資 $XX,XXX，詳情請查收 Email）
```

---

#### 薪資表 payrolls

| 欄位 | 型態 |
|------|------|
| employee_id | varchar |
| base_salary | decimal |
| overtime_pay | decimal |
| deduction | decimal |
| total_salary | decimal |

---

### 5.6 人資管理模組

> 人資功能整合於 Auth Service，不獨立為服務。

#### 功能

- 員工資料
- 部門管理
- 職位管理
- 到離職管理

---

#### 員工資料表 employees

| 欄位 | 型態 |
|------|------|
| id | bigint |
| emp_no | varchar |
| name | varchar |
| department_id | bigint |
| position_id | bigint |
| hire_date | date |
| status | varchar |

---

### 5.7 通知模組

> 通知不獨立為服務，由各 Service 內的 Notification Module 統一處理。

#### 通知管道

| 管道 | 用途 |
|------|------|
| LINE Messaging API | 打卡成功、請假簽核結果、排班發布、薪資摘要 |
| Mailjet（Email） | 薪資明細、帳號開立通知 |

> LINE Notify 已停止服務，統一改用 LINE Messaging API。
> 不實作 Web Push。

---

#### 通知事件

| 事件 | LINE | Email |
|------|------|-------|
| 打卡成功 | ✅ | ❌ |
| 請假簽核結果 | ✅ | ❌ |
| 排班發布 | ✅ | ❌ |
| 加班申請 | ✅ | ❌ |
| 薪資發放 | ✅（摘要） | ✅（明細） |
| 帳號開立 | ✅ | ✅ |

---

## 6. 權限管理

### RBAC 模型

```
User
  ↓
Role
  ↓
Permission
```

### 權限範例

| 模組 | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| 出勤 | Y | Y | N | N |
| 排班 | Y | Y | Y | N |
| 薪資 | Y | N | N | N |

---

## 7. 非功能需求

### 效能

| 項目 | 指標 |
|------|------|
| API Response | < 2 秒 |
| 打卡寫入 | < 1 秒 |
| 同時在線人數 | 壓力測試於 Phase 3 驗收，架構設計無狀態可水平擴展 |

---

### 安全性

- JWT 認證
- HTTPS
- GPS 距離驗證與速度異常偵測
- 權限控管
- Audit Log（打卡與薪資異動）

---

### 備份

- 每日備份至雲端儲存（S3 / GCS）
- 日誌保存 180 天

---

## 8. 技術建議

### Frontend

- Vue 3
- PrimeVue
- Pinia
- Vite
- FullCalendar.js（排班日曆）
- Leaflet.js + OpenStreetMap（地圖顯示，取代 Google Maps API）

---

### Backend

- Node.js / NestJS
- RESTful API
- SSE（Server-Sent Events，取代 Socket.IO，用於後台即時通知）

---

### Database

- PostgreSQL

---

### 雲端

- Docker
- Cloud Run 或 Fargate（取代 Kubernetes，Phase 3 視規模評估 K8s）
- AWS / GCP

---

## 9. 第三方整合

| 系統 | 用途 |
|------|------|
| LINE Login | 身分驗證 |
| LINE Messaging API | 所有 LINE 通知（取代 LINE Notify） |
| Mailjet | Email 發送（薪資明細、帳號通知） |
| Leaflet.js + OpenStreetMap | 地圖 UI（打卡位置顯示、地理圍欄設定） |

---

## 10. 系統流程

### 員工每日流程

```
登入 LINE
  ↓
上班打卡
  ↓
查看班表
  ↓
申請請假
  ↓
下班打卡
```

---

## 11. 後續可擴充功能

- 人臉辨識打卡
- BI 儀表板
- 行動 App
- 多國語系
- 多公司（Multi-tenant）

---

## 12. MVP 建議

### 第一階段

優先開發：

1. LINE Login
2. GPS 打卡
3. 出勤記錄與計算
4. 請假（兩段簽核）
5. 基本角色權限

### 第二階段

- WiFi／QR Code 打卡
- 手動排班日曆
- 薪資計算與通知
- 人資管理
- 完整 RBAC

### 第三階段

- 人臉辨識
- BI 分析報表
- App 化
- 壓力測試與效能調優
