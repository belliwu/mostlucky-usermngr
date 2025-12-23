# Implementation Plan: 使用者驗證與儀表板系統

**Branch**: `001-user-auth` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-user-auth/spec.md`

## Summary

建立使用者驗證系統，使用 Next.js App Router 實作註冊、登入、登出功能，並提供簡單的儀表板頁面。註冊成功後會自動登入並導向儀表板；登入提供「記住我」以支援持久登入。系統採用 RBAC（`admin`/`user`），並提供最小可用的管理者使用者管理能力（建立使用者、停用/啟用使用者、重設密碼）。第一個 `admin` 帳號由部署者手動預先建立（資料種子/資料檔/資料庫預置）。

**技術方針**：

- 使用 Next.js 15 (App Router) 作為全端框架
- 使用 Server Actions 處理表單提交與身份驗證
- 使用 JSON 檔案作為輕量級資料儲存
- 使用 JWT (JSON Web Token) 進行身份驗證與會話管理
- 使用 bcryptjs（bcrypt）進行密碼加密
- 使用 httpOnly cookies 儲存 JWT；「記住我」以 cookie 是否為持久 cookie 表達
- 使用 Tailwind CSS 進行樣式設計
- 使用 shadcn/ui（以 CLI 產生元件原始碼）與 Tailwind token 協同，避免自製基礎 UI 元件
- 盡量最小化外部依賴，優先使用內建功能與可維護的通用套件

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20+  
**Primary Dependencies**:

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 3.4+
- shadcn/ui（CLI 產生元件原始碼到專案內，樣式以 Tailwind tokens 為準）
- shadcn/ui 相關相依（依實際使用的元件而定）：Radix UI 相關套件、class-variance-authority、clsx、tailwind-merge
- jsonwebtoken (JWT 產生與驗證)
- bcryptjs (密碼加密)

**Storage**: JSON 檔案 (開發階段) - 儲存於 `data/` 目錄，未來可輕易遷移至資料庫  
**Testing**: Jest + React Testing Library (單元測試) + Playwright (端對端測試)  
**Target Platform**: Web 瀏覽器 (Chrome, Firefox, Safari, Edge 最新版本)  
**Project Type**: Web application (Next.js 全端應用)  
**Performance Goals**:

- 頁面載入時間 < 1 秒
- 登入驗證回應 < 500ms
- 支援 100+ 同時使用者

**Constraints**:

- 不使用外部驗證服務 (如 NextAuth.js, Auth0)
- 不使用 ORM 或資料庫函式庫
- 程式碼必須易讀，避免過度抽象
- 每個模組 < 400 行程式碼

**Scale/Scope**:

- 預計支援 1000+ 使用者帳號
- 4 個主要頁面 (註冊、登入、儀表板、首頁)
- 約 1500-2000 行程式碼 (不含測試)

## UI/UX Design Reference

### 登入頁面設計

**設計檔案**: `specs/001-user-auth/designs/login-ui.png`

**設計重點**：

- **左側區域**：品牌展示區

  - 大型背景圖（雲層意象，營造信任感）
  - 系統名稱「梁維環控平台」醒目顯示
  - 簡潔優雅的視覺呈現

- **右側區域**：登入表單
  - 系統 Logo（藍色雲朵圖示）
  - 標題：「梁維環控平台 | 登入」
  - 副標題：「請輸入帳號及密碼!!」
  - 表單欄位：
    - 登入帳號（Email 輸入框，附驗證標記）
    - 登入密碼（密碼輸入框，附遮罩與驗證標記）
    - 「忘記密碼？」連結（右上角）
  - 主要動作：「登入驗證」按鈕（藍綠色漸層）
  - 次要動作：「尚未擁有帳號？立即註冊」連結
  - 頁尾：Copyright © 2025 梁維環控平台

**設計原則應用於實作**：

1. **配色方案** (Tailwind CSS)

   - 主色：藍綠色 (`cyan-500`, `teal-500`)
   - 背景：淺灰藍 (`slate-50`, `blue-50`)
   - 表單背景：白色 (`white`)
   - 陰影：柔和陰影 (`shadow-xl`)

2. **版面配置**

   - 左右分割 (50/50 或 40/60)
   - 響應式設計：手機版僅顯示表單區
   - 垂直居中對齊

3. **表單元素**

   - 圓角輸入框 (`rounded-lg`)
   - 清楚的標籤與佔位符
   - 即時驗證回饋（紅色 × 標記）
   - 密碼顯示/隱藏切換

4. **可存取性 (a11y)**
   - 適當的 ARIA 標籤
   - 鍵盤導航支援
   - 高對比度文字
   - 錯誤訊息清楚易讀

**其他頁面設計**：

- 註冊頁面：沿用相同的左右分割佈局，調整表單欄位
- 儀表板頁面：簡潔的頂部導航 + 卡片式資訊展示
- 所有頁面維持一致的品牌色彩與視覺語言

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ 完整測試要求

- [x] 單元測試：所有工具函數、驗證邏輯、加密功能
- [x] API 測試：所有 Server Actions 的輸入/輸出驗證
- [x] 整合測試：端對端使用者流程 (註冊 → 登入 → 儀表板 → 登出)
- [x] 測試覆蓋率目標：80%+

### ✅ 程式碼可讀性與命名規範

- [x] 使用描述性函數名稱 (如 `hashPassword`, `verifyPassword`, `createUser`)
- [x] 所有複雜邏輯包含中文或英文註解
- [x] 統一使用 camelCase (TypeScript) 和 PascalCase (React 元件)
- [x] 避免過度抽象，優先使用直觀的實作方式

### ✅ 模組化設計與 SRP

- [x] 每個模組專注單一職責：
  - `services/authService.ts` - 身份驗證用例協調（註冊/登入/登出）
  - `infrastructure/database/jsonDb.ts` - JSON 檔資料讀寫（含檔案鎖定）
  - `domain/validators/*.ts` - 輸入驗證（email/password 等）
  - `infrastructure/security/*.ts` - 密碼雜湊與 JWT 管理
- [x] 所有模組 < 400 行程式碼
- [x] 函數遵循單一職責原則

### ✅ 設計模式與模組關聯性

- [x] Repository Pattern：資料存取層（`infrastructure/repositories/*.ts`）抽象化儲存細節
- [x] Strategy Pattern：支援多種密碼加密策略 (bcrypt 風格)
- [x] Middleware Pattern：驗證中介層保護受保護路由
- [x] 使用依賴注入避免緊耦合

### ✅ 安全性基本規範

- [x] 密碼使用 bcryptjs 雜湊儲存（rounds 依環境設定，預設建議 10-12）
- [x] 實作 RBAC (基本 user/admin 角色)
- [x] 敏感資料加密儲存
- [x] 所有 API 端點驗證身份與權限
- [x] 記錄安全事件到 `data/security-logs.json`（並可視需要輸出到 logs/）
- [x] 輸入驗證防止注入攻擊
- [x] 錯誤訊息不洩露敏感資訊

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              # 本檔案 (技術實作計畫)
├── spec.md              # 功能規格
├── research.md          # 技術研究 (下一步建立)
├── data-model.md        # 資料模型設計 (下一步建立)
├── quickstart.md        # 快速開始指南 (下一步建立)
├── contracts/           # API 合約定義 (下一步建立)
│   ├── auth.md          # 身份驗證 API
│   └── user.md          # 使用者資料 API
├── designs/             # UI/UX 設計資源
│   └── login-ui.png     # 登入頁面設計稿
├── tasks.md             # 任務清單 (/speckit.tasks 產生)
└── checklists/
    └── requirements.md  # 需求檢查清單
```

### Source Code (repository root)

採用 **分層架構 (Layered Architecture)** 設計：

```text
<repository-root>/
│
├── ========== LAYER 1: Presentation Layer ==========
├── app/                           # Next.js App Router (前端頁面)
│   ├── (auth)/                    # 身份驗證路由群組 (未登入使用者)
│   │   ├── login/
│   │   │   └── page.tsx           # 登入頁面
│   │   └── register/
│   │       └── page.tsx           # 註冊頁面
│   ├── (protected)/               # 受保護路由群組 (需登入)
│   │   └── dashboard/
│   │       └── page.tsx           # 儀表板頁面
│   │   └── admin/
│   │       └── users/
│   │           └── page.tsx        # 管理者：使用者管理（需 admin）
│   ├── api/                       # API Routes (選用，若需要 RESTful API)
│   │   └── auth/
│   │       └── route.ts           # 身份驗證 API 端點
│   ├── layout.tsx                 # 根佈局
│   ├── page.tsx                   # 首頁
│   └── globals.css                # 全域樣式 (Tailwind)
│
├── components/                    # React UI 元件 (Presentation)
│   ├── ui/                        # UI 通用元件
│   │   ├── button.tsx             # shadcn/ui 產生/管理的按鈕元件
│   │   ├── input.tsx              # shadcn/ui 產生/管理的輸入框元件
│   │   └── alert.tsx              # shadcn/ui 產生/管理的提示元件
│   │   ├── toast.tsx              # shadcn/ui 產生/管理的 toast 元件
│   │   ├── toaster.tsx            # shadcn/ui 產生/管理的 Toaster
│   │   └── use-toast.ts           # shadcn/ui 產生/管理的 toast hook
│   ├── auth/                      # 身份驗證相關元件
│   │   ├── LoginForm.tsx          # 登入表單 (< 150 行)
│   │   └── RegisterForm.tsx       # 註冊表單 (< 150 行)
│   └── dashboard/
│       └── UserInfo.tsx           # 使用者資訊卡片 (< 100 行)

├── lib/                           # 共用前端輔助
│   ├── utils.ts                   # shadcn/ui 依賴的 className 合併工具
│   └── toast.ts                   # toast 訊息統一規範/輔助函式
│
├── ========== LAYER 2: Controller Layer ==========
├── controllers/                   # 控制器層 (處理 HTTP 請求)
│   ├── authController.ts          # 身份驗證控制器 (< 200 行)
│   │   # - handleLogin(request)
│   │   # - handleRegister(request)
│   │   # - handleLogout(request)
│   │   # - 解析請求、調用服務、返回回應
│   └── userController.ts          # 使用者控制器 (< 150 行)
│       # - handleGetUserInfo(request)
│       # - handleUpdateUser(request)
│
├── actions/                       # Next.js Server Actions (Controller 替代方案)
│   ├── authActions.ts             # 身份驗證動作 (< 200 行)
│   │   # - registerAction(formData)
│   │   # - loginAction(formData)
│   │   # - logoutAction()
│   └── userActions.ts             # 使用者動作 (< 150 行)
│       # - getUserInfoAction()
│   └── adminActions.ts            # 管理者動作 (< 250 行)
│       # - adminCreateUserAction(formData)
│       # - adminSetUserStatusAction(userId, status)
│       # - adminResetUserPasswordAction(userId, newPassword)
│
├── middleware.ts                  # Next.js 中介軟體 (< 100 行)
│   # - 驗證 JWT token
│   # - 保護受保護路由
│   # - 重新導向未登入使用者
│
├── ========== LAYER 3: Service Layer ==========
├── services/                      # 服務層 (Use Cases & 業務邏輯)
│   ├── authService.ts             # 身份驗證服務 (< 300 行)
│   │   # - login(email, password)
│   │   # - register(userData)
│   │   # - logout(userId)
│   │   # - refreshToken(refreshToken)
│   │   # - 協調多個 domain 與 infrastructure
│   ├── userService.ts             # 使用者服務 (< 250 行)
│   │   # - getUserById(userId)
│   │   # - updateUserProfile(userId, data)
│   │   # - deactivateUser(userId)
│   │   # - 使用者相關業務邏輯
│   └── securityService.ts         # 安全服務 (< 250 行)
│       # - validateLoginAttempt(email)
│       # - lockAccount(userId, reason)
│       # - unlockAccount(userId)
│       # - 安全相關業務規則
│
├── ========== LAYER 4: Domain Layer ==========
├── domain/                        # 領域層 (核心業務實體與規則)
│   ├── models/                    # 資料模型
│   │   ├── User.ts                # 使用者實體 (< 200 行)
│   │   │   # - class User { id, email, passwordHash, role, status, ... }
│   │   │   # - 實體驗證方法: isActive(), hasRole()
│   │   ├── Session.ts             # 會話實體 (< 150 行)
│   │   │   # - class Session { userId, token, expiresAt, ... }
│   │   │   # - isExpired(), refresh()
│   │   └── SecurityLog.ts         # 安全日誌實體 (< 100 行)
│   │       # - class SecurityLog { userId, event, timestamp, ... }
│   │
│   ├── validators/                # 領域驗證規則
│   │   ├── userValidator.ts       # 使用者驗證 (< 150 行)
│   │   │   # - validateEmail(email)
│   │   │   # - validatePassword(password)
│   │   │   # - validateUserData(userData)
│   │   └── authValidator.ts       # 身份驗證驗證 (< 100 行)
│   │       # - validateLoginCredentials(email, password)
│   │
│   └── enums/                     # 領域列舉
│       ├── UserRole.ts            # 使用者角色 (< 50 行)
│       │   # - USER, ADMIN
│       ├── UserStatus.ts          # 使用者狀態 (< 50 行)
│       │   # - ACTIVE, LOCKED, INACTIVE
│       └── SecurityEventType.ts   # 安全事件類型 (< 50 行)
│           # - LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ...
│
├── ========== LAYER 5: Infrastructure Layer ==========
├── infrastructure/                # 基礎設施層
│   ├── repositories/              # 資料存取 (Repository Pattern)
│   │   ├── userRepository.ts      # 使用者資料庫操作 (< 300 行)
│   │   │   # - findById(id)
│   │   │   # - findByEmail(email)
│   │   │   # - create(userData)
│   │   │   # - update(id, data)
│   │   │   # - delete(id)
│   │   ├── sessionRepository.ts   # 會話資料庫操作 (< 200 行)
│   │   │   # - create(sessionData)
│   │   │   # - findByToken(token)
│   │   │   # - deleteByUserId(userId)
│   │   └── securityLogRepository.ts # 安全日誌操作 (< 150 行)
│   │       # - create(logData)
│   │       # - findByUserId(userId, limit)
│   │
│   ├── database/                  # 資料庫連接與配置
│   │   ├── jsonDb.ts              # JSON 檔案資料庫工具 (< 250 行)
│   │   │   # - read(filePath)
│   │   │   # - write(filePath, data)
│   │   │   # - 檔案鎖定機制
│   │   └── dbConfig.ts            # 資料庫配置 (< 100 行)
│   │       # - 資料檔案路徑設定
│   │
│   ├── security/                  # 安全工具
│   │   ├── passwordHasher.ts      # 密碼加密工具 (< 150 行)
│   │   │   # - hash(password) - 使用 bcryptjs（bcrypt）
│   │   │   # - verify(password, hash)
│   │   ├── jwtManager.ts          # JWT 管理工具 (< 200 行)
│   │   │   # - generateAccessToken(payload)
│   │   │   # - generateRefreshToken(payload)
│   │   │   # - verifyToken(token)
│   │   │   # - decodeToken(token)
│   │   └── rateLimiter.ts         # 速率限制器 (< 150 行)
│   │       # - checkLimit(identifier)
│   │       # - 防暴力破解
│   │
│   ├── logging/                   # 日誌系統
│   │   ├── logger.ts              # 日誌記錄器 (< 200 行)
│   │   │   # - info(message, metadata)
│   │   │   # - error(message, metadata)
│   │   │   # - security(event, metadata)
│   │   └── logConfig.ts           # 日誌配置 (< 100 行)
│   │       # - 日誌格式、儲存路徑
│   │
│   └── config/                    # 應用配置
│       ├── appConfig.ts           # 應用配置 (< 100 行)
│       │   # - 載入環境變數
│       │   # - JWT secret, session 設定
│       └── constants.ts           # 常數定義 (< 100 行)
│           # - TOKEN_EXPIRY, MAX_LOGIN_ATTEMPTS
│
├── ========== Data & Logs ==========
├── data/                          # 資料儲存 (開發用)
│   ├── users.json                 # 使用者資料
│   ├── sessions.json              # 會話資料
│   └── security-logs.json         # 安全日誌

※ 第一個 `admin` 帳號由部署者手動預先建立（例如在 `data/users.json` 預置一筆 `role=admin` 的使用者）。
│
├── logs/                          # 日誌輸出
│   ├── app.log                    # 應用日誌
│   └── security.log               # 安全事件日誌
│
├── ========== Tests ==========
├── tests/                         # 測試檔案
│   ├── unit/                      # 單元測試
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   │   └── User.test.ts
│   │   │   └── validators/
│   │   │       └── userValidator.test.ts
│   │   ├── services/
│   │   │   ├── authService.test.ts
│   │   │   ├── userService.test.ts
│   │   │   └── securityService.test.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   └── userRepository.test.ts
│   │   │   └── security/
│   │   │       ├── passwordHasher.test.ts
│   │   │       └── jwtManager.test.ts
│   │   └── controllers/
│   │       └── authController.test.ts
│   ├── integration/               # 整合測試
│   │   ├── auth-flow.test.ts      # 完整身份驗證流程
│   │   └── user-management.test.ts
│   └── e2e/                       # 端對端測試 (Playwright)
│       ├── register.spec.ts
│       ├── login.spec.ts
│       └── dashboard.spec.ts
│
├── ========== Configuration ==========
├── public/                        # 靜態資源
│   └── favicon.ico
│
├── tailwind.config.js             # Tailwind 設定
├── next.config.js                 # Next.js 設定
├── package.json                   # 專案依賴
├── jest.config.js                 # Jest 設定
├── playwright.config.js           # Playwright 設定
├── .env.local                     # 環境變數 (不提交)
│   # JWT_SECRET=...
│   # JWT_ACCESS_EXPIRY=15m
│   # JWT_REFRESH_EXPIRY=7d
│   # BCRYPT_ROUNDS=12
└── .env.example                   # 環境變數範例
```

**Architecture Decision - 分層架構說明**:

採用 **5 層架構 (5-Layer Architecture)**，嚴格遵循依賴方向規則：

```
┌─────────────────────────────────────────────┐
│   Layer 1: Presentation (app/, components/) │
│   - Next.js 頁面、React 元件                  │
│   - 使用者介面呈現                            │
└────────────────┬────────────────────────────┘
                 ↓ 依賴
┌─────────────────────────────────────────────┐
│   Layer 2: Controller (controllers/, actions/) │
│   - HTTP 請求處理                            │
│   - 輸入驗證與回應格式化                     │
└────────────────┬────────────────────────────┘
                 ↓ 依賴
┌─────────────────────────────────────────────┐
│   Layer 3: Service (services/)              │
│   - 業務邏輯協調                              │
│   - Use Cases 實作                           │
└────────────────┬────────────────────────────┘
                 ↓ 依賴
┌─────────────────────────────────────────────┐
│   Layer 4: Domain (domain/)                 │
│   - 核心業務實體 (User, Session)              │
│   - 業務規則與驗證                            │
└────────────────┬────────────────────────────┘
                 ↓ 依賴
┌─────────────────────────────────────────────┐
│   Layer 5: Infrastructure (infrastructure/) │
│   - Repository (資料存取)                    │
│   - 外部服務 (JWT, bcryptjs, logging)        │
│   - 配置管理                                 │
└─────────────────────────────────────────────┘
```

**各層職責明確定義**：

1. **Presentation Layer** (app/, components/)

   - Next.js 頁面路由 (page.tsx)
   - React UI 元件
   - 使用者互動處理
   - 不包含業務邏輯

2. **Controller Layer** (controllers/, actions/, middleware.ts)

   - 接收 HTTP 請求
   - 解析請求參數 (formData, query, body)
   - 調用 Service Layer
   - 格式化回應 (JSON, redirect)
   - Next.js Server Actions 作為控制器的現代替代方案

3. **Service Layer** (services/)

   - 實作 Use Cases (註冊、登入、登出)
   - 協調多個 Domain 實體
   - 調用 Infrastructure Layer (Repository, Security)
   - 業務邏輯編排
   - 事務管理

4. **Domain Layer** (domain/)

   - 核心業務實體 (User, Session, SecurityLog)
   - 實體方法 (isActive, hasRole, isExpired)
   - 業務規則驗證 (validateEmail, validatePassword)
   - 領域列舉 (UserRole, UserStatus, EventType)
   - 不依賴任何外部框架或函式庫

5. **Infrastructure Layer** (infrastructure/)
   - Repository Pattern: 資料存取抽象
   - 外部工具封裝 (bcryptjs, jsonwebtoken)
   - 配置管理 (環境變數載入)
   - 日誌系統
   - 可替換性設計 (JSON → Database)

**依賴規則**：

- 上層可以依賴下層
- 下層不可依賴上層
- Domain Layer 完全獨立，不依賴任何外部框架
- Infrastructure Layer 實作由 Domain/Service 定義的介面

```

**Structure Decision**:

採用 **Next.js App Router 架構** (Web application)，原因：

1. **全端整合**：Next.js 同時處理前端與後端，無需分離 backend/frontend
2. **Server Actions**：利用 Next.js 15 的 Server Actions 處理表單提交，取代傳統 API 路由
3. **檔案路由**：App Router 的資料夾結構直觀，易於理解與維護
4. **路由群組**：使用 `(auth)` 和 `(protected)` 分離公開與受保護頁面
5. **模組化**：`services/` 目錄包含可重用的業務邏輯服務，符合 SRP 原則
6. **最小依賴**：核心依賴 Next.js、React、Tailwind CSS、JWT、bcryptjs


**與專案憲法的對齊**：

- ✅ 每個模組 < 400 行，職責單一明確
- ✅ 元件檔案 < 150 行，易於理解
- ✅ 測試結構清晰，涵蓋單元、整合、端對端
- ✅ Repository Pattern 抽象資料存取，未來可輕易替換為資料庫
- ✅ Domain Layer 完全獨立，符合 DDD 原則
- ✅ 清晰的分層架構，符合 SOLID 原則
- ✅ 每層職責明確，符合單一職責原則 (SRP)

**分層架構的優勢**：

1. **可測試性**：每層可獨立測試
2. **可維護性**：職責清晰，易於定位問題
3. **可擴展性**：新增功能時影響範圍最小
4. **可替換性**：Infrastructure Layer 可輕易替換實作 (JSON → PostgreSQL)
5. **符合 SOLID**：依賴倒置、開放封閉、單一職責原則

## Complexity Tracking

> **本專案無違反憲法原則的項目**

本實作計畫完全符合專案憲法的所有要求：

✅ **模組大小**：所有模組均 < 400 行
✅ **單一職責**：每個模組、類別、函數都有明確的單一職責
✅ **設計模式**：適當使用 Repository、Strategy、Middleware 模式
✅ **測試完整**：涵蓋單元、整合、端對端測試
✅ **安全性**：密碼加密、RBAC、日誌記錄、輸入驗證
✅ **可讀性**：避免過度抽象，使用描述性命名

## Phase 0: Research & Technology Validation

### 研究主題

1. **Next.js 15 Server Actions 最佳實踐**

   - 如何在 Server Actions 中處理表單驗證
   - 錯誤處理與使用者回饋機制
   - Server Actions 的安全性考量

2. **JWT (JSON Web Token) 最佳實踐**

   - Access Token 與 Refresh Token 策略
   - JWT payload 結構設計
   - Token 過期時間設定（Access: 15 分鐘, Refresh: 7 天）
   - Token 儲存方式（httpOnly cookies vs localStorage）

3. **bcrypt 密碼加密**

   - bcrypt salt rounds 設定（推薦 10-12 rounds）
   - 密碼雜湊與驗證流程
   - 效能考量與安全性平衡

4. **Next.js JWT 會話管理**

   - 使用 httpOnly cookies 儲存 JWT
   - secure、sameSite 標誌設定
   - Token 刷新機制
   - 登出時的 Token 撤銷策略

5. **JSON 檔案資料庫**

   - 安全的檔案讀寫 (避免競爭條件)
   - 資料一致性保證
   - 效能考量與未來遷移路徑

6. **Tailwind CSS 和 shadcn/ui表單設計**
   - 無障礙 (a11y) 表單實踐
   - 錯誤狀態視覺回饋
   - 響應式設計模式

### 研究輸出

將建立 `research.md` 包含：

- 每個主題的決策與理由
- 考慮的替代方案
- 程式碼範例與參考連結
- 潛在風險與緩解策略

## Phase 1: Design & Contracts

### 資料模型設計 (data-model.md)

定義三個核心實體：

1. **User (使用者)**

   - 欄位、驗證規則、關聯性
   - 角色：`admin` / `user`
   - 狀態轉換圖 (active ↔ inactive; active → locked)

2. **Session (會話)**

   - 欄位、過期邏輯
   - 與 User 的關聯

3. **SecurityLog (安全日誌)**
   - 事件類型、記錄欄位
   - 查詢與分析需求

### API 合約 (contracts/)

定義 Server Actions 的輸入/輸出規格：

1. **auth.md**

   - `registerAction(email, password)` → `{success, error, redirectTo}`（註冊成功後自動登入並導向）
   - `loginAction(email, password)` → `{success, error, redirectTo}`
   - `logoutAction()` → `{success}`

2. **user.md**
   - `getUserInfoAction()` → `{user: {email, createdAt}, error}`

3. **admin.md**

   - `adminCreateUserAction(email, password)` → `{success, error}`
   - `adminSetUserStatusAction(userId, status)` → `{success, error}`
   - `adminResetUserPasswordAction(userId, newPassword)` → `{success, error}`

### 快速開始指南 (quickstart.md)

包含：

- 環境設定步驟
- 本地開發啟動流程
- 測試執行指令
- 常見問題排解

## Next Steps

執行以下命令繼續工作流程：

1. **完成 Phase 0 研究**：手動建立 `research.md` 或使用 AI 輔助研究
2. **完成 Phase 1 設計**：建立 `data-model.md`、`contracts/`、`quickstart.md`
3. **執行 `/speckit.tasks`**：產生詳細的實作任務清單
4. **開始實作**：按照任務清單逐步實作功能

## Implementation Notes

### 關鍵技術決策

1. **為何選擇 JSON 檔案而非資料庫？**

   - 簡化開發環境設定
   - 無需安裝與維護資料庫伺服器
   - 程式碼範例更易理解
   - 未來可輕易遷移至 SQLite、PostgreSQL 等

2. **為何不使用 NextAuth.js？**

   - 符合「最小依賴」原則
   - 更好地理解身份驗證機制
   - 完全掌控安全性實作
   - 程式碼更透明易維護

3. **為何使用 Server Actions 而非 API Routes？**

   - Next.js 15 推薦的現代模式
   - 簡化表單處理邏輯
   - 自動 CSRF 保護
   - 更好的型別安全 (TypeScript)

4. **為何使用 JWT 進行身份驗證？**

   - 無狀態（Stateless）：伺服器不需儲存會話資料
   - 可擴展性：適合分散式系統與微服務架構
   - 跨域支援：適合 SPA 與行動應用
   - 標準化：業界廣泛採用的標準（RFC 7519）
   - 包含使用者資訊：減少資料庫查詢

5. **為何使用 bcrypt 進行密碼加密？**
   - 業界標準：專為密碼設計的單向雜湊函數
   - 自適應性：可調整計算成本（salt rounds）
   - 內建 salt：自動處理 salt 生成與儲存
   - 抗暴力破解：計算密集型，減緩攻擊速度

### 風險與緩解

| 風險                  | 影響 | 緩解策略                                           |
| --------------------- | ---- | -------------------------------------------------- |
| JSON 檔案並發寫入衝突 | 中   | 使用檔案鎖定機制，記錄錯誤日誌                     |
| JWT token 洩露        | 高   | 使用 httpOnly cookies，短期 Access Token (15 分鐘) |
| Refresh token 被盜用  | 高   | Token rotation，一次性使用，記錄使用歷史           |
| 密碼加密效能瓶頸      | 低   | bcrypt rounds 設為 10-12 (平衡安全與效能)          |
| 暴力破解攻擊          | 中   | 實作帳號鎖定機制 (5 次失敗鎖定 15 分鐘)            |
| XSS 攻擊              | 中   | React 自動轉義，httpOnly cookies 防止 JS 存取      |

### 效能優化策略

1. **懶載入**：儀表板元件使用 dynamic import
2. **快取**：使用 Next.js 的自動靜態優化
3. **圖片優化**：使用 `next/image` (如果需要)
4. **程式碼分割**：App Router 自動處理

### 未來擴展性

本架構設計支援以下擴展：

1. **資料庫遷移**：只需修改 `services/userService.ts`，其他程式碼無需變更
2. **第三方登入**：在 `services/authService.ts` 新增 OAuth 策略
3. **多因素驗證**：新增 `services/mfaService.ts` 模組
4. **管理後台**：新增或擴展 `app/(protected)/admin/` 路由群組
5. **API 對外開放**：新增 `app/api/` 路由處理程式，JWT 已支援 API 驗證
```
