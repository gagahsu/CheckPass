# 「打卡通」系統開發規格書（參考版）

## 1. 文件資訊

| 項目 | 說明 |
|------|------|
| 文件名稱 | 打卡通－雲端出勤與人資管理系統開發規格書 |
| 系統類型 | Web + LINE OA + Mobile Web |
| 適用對象 | 中小企業／門市／外勤團隊 |
| 文件版本 | v1.0 |
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
 ├── 認證服務 Auth Service
 ├── 打卡服務 Attendance Service
 ├── 排班服務 Shift Service
 ├── 請假服務 Leave Service
 ├── 薪資服務 Payroll Service
 ├── 通知服務 Notification Service
 └── 人資服務 HR Service
        │
        ▼
     Database
```

---

## 4. 使用者角色

| 角色 | 權限 |
|------|------|
| 員工 | 打卡、請假、查看班表 |
| 主管 | 簽核、查看部門報表 |
| HR | 員工管理、薪資管理 |
| 系統管理員 | 全系統設定 |

---

## 5. 功能模組

---

### 5.1 LINE 打卡模組

#### 功能說明

提供員工透過 LINE 完成上下班打卡。

---

#### 功能需求

**打卡類型**

| 類型 | 說明 |
|------|------|
| GPS 打卡 | 驗證定位 |
| WiFi 打卡 | 驗證指定 WiFi |
| QR Code 打卡 | 掃描 QRCode |
| 固定地點打卡 | 指定公司位置 |
| 外勤打卡 | 非固定位置 |

---

**打卡流程**

```
員工點擊 LINE 選單
    ↓
取得 GPS
    ↓
驗證地點
    ↓
建立打卡紀錄
    ↓
回傳成功訊息
```

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

#### 功能

- 建立班別
- 排班
- 輪班
- 多門市班表

---

#### 班別資料

| 欄位 | 說明 |
|------|------|
| shift_name | 班別名稱 |
| start_time | 開始時間 |
| end_time | 結束時間 |
| break_minutes | 休息時間 |

---

#### 排班功能

支援：

- 固定班
- 輪班
- 自動排班
- 指定休假

---

### 5.4 請假管理模組

#### 功能

- 請假申請
- 簽核流程
- 假別管理
- 附件上傳

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

```
員工送出
    ↓
主管簽核
    ↓
HR確認
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
- 薪資單

---

#### 薪資公式

**基本薪資**

```
薪資 = 基本薪資 + 加班費 - 扣款
```

**加班費**

```
加班費 = 時薪 × 加班時數 × 倍率
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

#### 通知方式

| 類型 | 說明 |
|------|------|
| LINE Notify | LINE 通知 |
| Email | 電子郵件 |
| 系統推播 | Web Push |

---

#### 通知事件

- 打卡成功
- 請假簽核
- 加班申請
- 排班通知

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

---

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
| 同時在線 | 5000 users |
| 打卡寫入 | < 1 秒 |

---

### 安全性

- JWT 認證
- HTTPS
- GPS 防偽
- 權限控管
- Audit Log

---

### 備份

- 每日資料備份
- 異地備援
- 日誌保存 180 天

---

## 8. 技術建議

### Frontend

- Vue 3
- PrimeVue
- Pinia
- Vite

---

### Backend

- Node.js / NestJS
- RESTful API
- Socket.IO（即時通知）

---

### Database

- PostgreSQL
- Redis

---

### 雲端

- Docker
- Kubernetes
- AWS / GCP

---

## 9. 第三方整合

| 系統 | 用途 |
|------|------|
| LINE Login | 身分驗證 |
| LINE Messaging API | 通知 |
| Google Maps API | GPS |
| SMTP | Email |

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

- AI 排班
- 人臉辨識打卡
- BI 儀表板
- 勞基法自動檢查
- 行動 App
- 多國語系

---

## 12. MVP 建議

### 第一階段

優先開發：

1. LINE Login
2. 打卡
3. 出勤
4. 請假
5. 基本權限

---

### 第二階段

- 排班
- 薪資
- 報表
- 多公司

---

### 第三階段

- AI 功能
- 分析報表
- App 化
