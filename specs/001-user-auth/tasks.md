# 任務清單：使用者驗證與儀表板系統

**輸入**：來自 `/specs/001-user-auth/` 的設計文件
**前置條件**：plan.md（必須）、spec.md（用於使用者故事）

**測試**：✅ 本功能在 plan.md 的 Constitution Check 中明確要求單元/整合/端對端測試與覆蓋率目標，因此本任務清單包含測試任務。

**組織方式**：任務依使用者故事分組，讓每個故事都能獨立實作與獨立驗收。

## 格式：`[ID] [P?] [Story] 描述`

- **[P]**：可平行執行（不同檔案、無未完成相依）
- **[Story]**：任務所屬的使用者故事（例如 US1、US2、US3）
- 描述中需包含明確的檔案路徑

---

## 第 1 階段：設定（共用基礎設施）

**目的**：專案初始化與基本結構

- [ ] T001 在 repository root 建立 Next.js 專案骨架（App Router）（app/、package.json）
- [ ] T002 在 tailwind.config.js 與 app/globals.css 設定 Tailwind CSS
- [ ] T003 [P] 建立環境變數範本 .env.example 與 .env.local（JWT secrets、expiry、bcrypt rounds）
- [ ] T004 [P] 建立測試工具設定檔：jest.config.js、playwright.config.js
- [ ] T005 [P] 依 plan.md 結構建立基礎資料夾：actions/、controllers/、services/、domain/、infrastructure/、components/、data/、logs/、lib/
- [ ] T006 建立空的 JSON 資料檔：data/users.json、data/sessions.json、data/security-logs.json
- [ ] T007 在 app/layout.tsx 與 app/page.tsx 建立基本 Next.js 版型/頁面骨架
- [ ] T008 [P] 初始化 shadcn/ui（建立 components.json、設定 tsconfig paths/alias、建立 lib/utils.ts）
- [ ] T009 [P] 透過 shadcn/ui 加入基礎元件：components/ui/button.tsx、components/ui/input.tsx、components/ui/alert.tsx
- [ ] T010 [P] 透過 shadcn/ui 加入 toast 元件：components/ui/toast.tsx、components/ui/toaster.tsx、components/ui/use-toast.ts
- [ ] T011 在 app/layout.tsx 掛載 toast provider（Toaster），確保全站可顯示成功/系統/錯誤 toast

---

## 第 2 階段：基礎（阻塞性前置）

**目的**：任何使用者故事開始前都必須完成的核心基礎建設

- [ ] T012 在 infrastructure/database/jsonDb.ts 實作 JSON 資料讀寫 + 檔案鎖定
- [ ] T013 在 infrastructure/database/dbConfig.ts 實作 DB 路徑設定
- [ ] T014 在 infrastructure/security/passwordHasher.ts 實作密碼雜湊工具（bcryptjs）
- [ ] T015 在 infrastructure/security/jwtManager.ts 實作 JWT 工具（產生/驗證）
- [ ] T016 在 infrastructure/security/rateLimiter.ts 實作基礎速率限制/鎖定輔助
- [ ] T017 在 infrastructure/logging/logger.ts 與 infrastructure/logging/logConfig.ts 實作日誌核心
- [ ] T018 實作 repositories：infrastructure/repositories/userRepository.ts、sessionRepository.ts、securityLogRepository.ts
- [ ] T019 實作 domain enums：domain/enums/UserRole.ts、domain/enums/UserStatus.ts、domain/enums/SecurityEventType.ts
- [ ] T020 實作 domain models：domain/models/User.ts、domain/models/Session.ts、domain/models/SecurityLog.ts
- [ ] T021 實作 domain validators：domain/validators/userValidator.ts、domain/validators/authValidator.ts
- [ ] T022 在 services/securityService.ts 實作安全規則服務（嘗試次數追蹤、5 次失敗鎖 15 分鐘）
- [ ] T023 在 services/authService.ts 實作身份驗證協調服務（註冊/登入/登出）
- [ ] T024 在 middleware.ts 實作受保護路由（app/(protected)/\*）的保護與重新導向（未登入導向 /login 並附帶 reason 供 toast 呈現）
- [ ] T025 [P] 建立 toast 訊息統一規範/輔助函式在 lib/toast.ts（成功/系統/錯誤三類）

**檢查點**：基礎完成後，使用者故事可開始平行開發

---

## 第 3 階段：使用者故事 1－使用者註冊（Priority: P1）🎯 MVP

**目標**：新使用者可用 email+password 註冊；註冊成功後自動登入並導向儀表板；成功/錯誤訊息以 toast 呈現（email 重複、格式不符、密碼不足）。

**獨立驗收**：直接訪問註冊頁，提交表單後可在 data/users.json 看到新帳號；註冊成功會導向儀表板且以 toast 顯示成功訊息。

### 使用者故事 1 的測試

- [x] T026 [P] [US1] 在 tests/unit/domain/validators/userValidator.test.ts 建立 email/password 驗證的單元測試
- [x] T027 [P] [US1] 在 tests/unit/infrastructure/security/passwordHasher.test.ts 建立密碼雜湊的單元測試
- [x] T028 [US1] 在 tests/integration/auth-flow.test.ts 建立註冊流程的整合測試
- [x] T029 [US1] 在 tests/e2e/register.spec.ts 建立註冊的端對端測試情境（驗證 toast 呈現）

### 使用者故事 1 的實作

- [x] T030 [P] [US1] 在 actions/authActions.ts 實作 registerAction(formData)（註冊成功後建立 session、寫入 httpOnly cookie；回傳可用於 toast 的結果/錯誤碼與導向目的地）
- [x] T031 [P] [US1] 在 components/auth/RegisterForm.tsx 建立 RegisterForm 元件（成功/錯誤以 toast 呈現；成功後導向儀表板）
- [x] T032 [US1] 在 app/(auth)/register/page.tsx 建立註冊頁（串接 RegisterForm）
- [ ] T033 [US1] 在 infrastructure/repositories/userRepository.ts 實作使用者建立與 email 唯一性檢查
- [ ] T034 [US1] 在 infrastructure/repositories/securityLogRepository.ts 增加註冊事件的安全日誌記錄

**檢查點**：US1 完成且可獨立驗收

---

## 第 4 階段：使用者故事 2－使用者登入（Priority: P1）

**目標**：已註冊使用者可登入，成功導向儀表板；登入失敗以通用錯誤 toast 顯示；連續 5 次失敗鎖定 15 分鐘並以 toast 呈現。

**獨立驗收**：使用預置帳號（寫入 data/users.json）或先手動建立一筆使用者資料，在登入頁輸入正確/錯誤密碼，驗證導向與鎖定行為；勾選/未勾選「記住我」時 cookie 行為符合規格；系統/錯誤訊息以 toast 呈現。

### 使用者故事 2 的測試

- [x] T035 [P] [US2] 在 tests/unit/services/securityService.test.ts 建立登入嘗試鎖定的單元測試
- [x] T036 [P] [US2] 在 tests/unit/infrastructure/security/jwtManager.test.ts 建立 JWT 管理工具的單元測試
- [x] T037 [US2] 在 tests/integration/auth-flow.test.ts 建立登入流程 + 鎖定的整合測試
- [x] T038 [US2] 在 tests/e2e/login.spec.ts 建立登入的端對端測試情境（驗證 toast 呈現）

### 使用者故事 2 的實作

- [x] T039 [P] [US2] 在 actions/authActions.ts 實作 loginAction(formData)（支援 rememberMe；寫入 httpOnly cookie：勾選時為持久 cookie、未勾選時為 session cookie；回傳可用於 toast 的結果/錯誤碼）
- [x] T040 [P] [US2] 在 components/auth/LoginForm.tsx 建立 LoginForm 元件（加入「記住我」checkbox；成功/錯誤以 toast 呈現）
- [x] T041 [US2] 在 app/(auth)/login/page.tsx 建立登入頁（版型參考 designs/login-ui.png；讀取 reason/狀態並以 toast 呈現系統訊息）
- [ ] T042 [US2] 在 services/securityService.ts 與 services/authService.ts 套用鎖定規則
- [ ] T043 [US2] 透過 securityLogRepository 將登入成功/失敗事件寫入 data/security-logs.json

**檢查點**：US2 完成且可獨立驗收

---

## 第 5 階段：使用者故事 3－使用者登出（Priority: P2）

**目標**：已登入使用者可登出，清除會話並導向登入；登出後不能存取受保護頁面（含上一頁）；登出成功/系統訊息以 toast 呈現。

**獨立驗收**：登入後在儀表板點擊登出，應回到登入頁並顯示 toast；直接訪問 /dashboard 會被 middleware 導向登入並顯示系統 toast。

### 使用者故事 3 的測試

- [x] T044 [US3] 在 tests/integration/auth-flow.test.ts 建立登出 + 受保護路由重新導向的整合測試
- [x] T045 [US3] 在 tests/e2e/dashboard.spec.ts 建立登出的端對端測試情境（驗證 toast 呈現）

### 使用者故事 3 的實作

- [x] T046 [P] [US3] 在 actions/authActions.ts 實作 logoutAction()（清除 cookies、撤銷 session；回傳 toast 結果）
- [x] T047 [US3] 在 app/(protected)/dashboard/page.tsx 實作登出 UI（按鈕/呼叫；成功/錯誤 toast）
- [ ] T048 [US3] 在 infrastructure/repositories/sessionRepository.ts 實作 session 撤銷的持久化
- [ ] T049 [US3] 透過 securityLogRepository 將登出事件寫入 data/security-logs.json

**檢查點**：US3 完成且可獨立驗收

---

## 第 6 階段：使用者故事 4－儀表板檢視（Priority: P2）

**目標**：已登入使用者可看到儀表板，顯示歡迎訊息與基本使用者資訊（email、註冊日期）。

**獨立驗收**：成功登入後進入 /dashboard，頁面顯示「歡迎，[email]」與 createdAt；未登入訪問會被導向登入並顯示系統 toast。

### 使用者故事 4 的測試

- [x] T050 [US4] 在 tests/integration/user-management.test.ts 建立儀表板使用者資訊的整合測試
- [x] T051 [US4] 在 tests/e2e/dashboard.spec.ts 建立儀表板檢視的端對端測試

### 使用者故事 4 的實作

- [x] T052 [P] [US4] 在 actions/userActions.ts 實作 getUserInfoAction()
- [x] T053 [P] [US4] 在 components/dashboard/UserInfo.tsx 建立儀表板使用者資訊卡片
- [x] T054 [US4] 在 app/(protected)/dashboard/page.tsx 實作儀表板頁（使用 getUserInfoAction）

**檢查點**：US4 完成且可獨立驗收

---

## 第 7 階段：使用者故事 5－管理者使用者管理（Priority: P3）

**目標**：admin 可管理使用者（建立/停用(啟用)/重設密碼）；user 不可執行任何管理操作（權限不足 toast）。

**獨立驗收**：以手動預置的 admin 登入後，進入管理頁面可建立使用者、停用使用者、重設密碼；以一般 user 登入後訪問管理頁面/動作應被拒絕。

### 使用者故事 5 的測試

- [ ] T060 [US5] 在 tests/integration/user-management.test.ts 增加 admin 管理使用者流程的整合測試（含權限拒絕）
- [ ] T061 [US5] 在 tests/e2e/admin-users.spec.ts 建立管理者使用者管理的端對端測試情境（驗證 toast 呈現）

### 使用者故事 5 的實作

- [ ] T062 [P] [US5] 在 actions/adminActions.ts 實作 adminCreateUserAction/adminSetUserStatusAction/adminResetUserPasswordAction（RBAC 驗證 + 結果/錯誤碼供 toast）
- [ ] T063 [US5] 在 services/userService.ts 加入管理用例（建立/停用(啟用)/重設密碼）
- [ ] T064 [US5] 在 app/(protected)/admin/users/page.tsx 建立最小可用的管理頁面（列表 + 建立 + 停用/啟用 + 重設密碼；成功/錯誤 toast）
- [ ] T065 [US5] 在 middleware.ts（或等效機制）加入 admin 路由保護：非 admin 訪問 /admin/\* 需拒絕並導向，且以 toast 顯示「權限不足」

**檢查點**：US5 完成且可獨立驗收

---

## 第 8 階段：收尾與跨切關注

**目的**：影響多個使用者故事的改善項

- [ ] T055 [P] 在 specs/001-user-auth/quickstart.md 補上 quickstart 指南（如何執行、測試、端對端步驟；包含手動預置第一個 admin：以資料種子/資料檔方式預先建立 role=admin 的帳號）
- [ ] T056 [P] 在 specs/001-user-auth/research.md 補上研究紀錄（JWT cookie flags、expiry、rotation 決策；「記住我」持久 cookie 行為；RBAC admin 路由保護；shadcn/ui 與 Tailwind 協同注意事項）
- [ ] T057 在 actions/authActions.ts 強化安全預設（cookie secure/sameSite/httpOnly）與錯誤訊息（避免洩漏敏感資訊；錯誤以 toast 呈現）
- [ ] T058 在 middleware.ts 與 services/authService.ts 加入 session 過期（閒置 30 分鐘）處理（過期導向登入並以 toast 顯示系統訊息）
- [ ] T059 [P] 在 package.json 增加覆蓋率目標設定與 CI 友善的測試指令

---

## 相依與執行順序

### 階段相依

- **設定（第 1 階段）**：無相依，可立即開始
- **基礎（第 2 階段）**：相依於第 1 階段完成，且會阻塞所有使用者故事
- **使用者故事（第 3+ 階段）**：皆相依於第 2 階段完成
- **收尾（最後階段）**：相依於所需的使用者故事完成

### 使用者故事相依

- **US1（P1）**：只相依基礎（第 2 階段）
- **US2（P1）**：只相依基礎（第 2 階段）（若已有測試使用者，US1 非必要）
- **US3（P2）**：完整流程相依 US2，但可用預置 session 進行驗證
- **US4（P2）**：相依 US2（需要已驗證的使用者）

### 平行執行機會

- 標記 [P] 的設定任務可平行執行（包含 shadcn/ui 初始化與元件加入）
- 基礎階段中，UI/toast 輔助（T025）可與基礎設施（T012–T023）平行
- 基礎完成後，US1 與 US2 可由不同人員平行開發
- 各故事內標記 [P] 的測試可平行撰寫/執行

---

## 平行執行範例：使用者故事 1

- Task：T026 [P] [US1] 在 tests/unit/domain/validators/userValidator.test.ts 建立單元測試
- Task：T027 [P] [US1] 在 tests/unit/infrastructure/security/passwordHasher.test.ts 建立單元測試
- Task：T030 [P] [US1] 在 actions/authActions.ts 實作 registerAction
- Task：T031 [P] [US1] 在 components/auth/RegisterForm.tsx 建立 RegisterForm

## 平行執行範例：使用者故事 2

- Task：T035 [P] [US2] 在 tests/unit/services/securityService.test.ts 建立單元測試
- Task：T036 [P] [US2] 在 tests/unit/infrastructure/security/jwtManager.test.ts 建立單元測試
- Task：T039 [P] [US2] 在 actions/authActions.ts 實作 loginAction
- Task：T040 [P] [US2] 在 components/auth/LoginForm.tsx 建立 LoginForm

---

## 實作策略

### MVP 優先

1. 完成第 1 階段（設定）
2. 完成第 2 階段（基礎）
3. 完成第 3 階段（US1）
4. 驗收 US1：可註冊 + 成功/錯誤 toast 正確

### 漸進式交付

- 完成 US1+US2 後即可展示「註冊 → 自動登入 → 導向儀表板」與「登入 → 導向儀表板」，且流程訊息皆以 toast 呈現
- 再補 US4（儀表板資訊）與 US3（登出）
