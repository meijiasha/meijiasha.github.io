# 咩呷啥 (Meijiasha) - 前端重構計畫

本專案是「咩呷啥」網站的前端重構版本，旨在將原有的 Vanilla JS 架構遷移至現代化的 React 生態系，以提升開發效率、維護性與使用者體驗。

## 🚀 技術堆疊 (Tech Stack)

- **核心框架**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **建置工具**: [Vite](https://vitejs.dev/)
- **樣式庫**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 元件**: [Shadcn UI](https://ui.shadcn.com/)
- **路由管理**: [React Router](https://reactrouter.com/)
- **表單處理**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **後端服務**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Functions)

## 📅 目前進度 (Phase 1: Admin System)

已完成後台管理系統的基礎建設與核心功能：

- [x] **專案初始化**: Vite + React + TypeScript + Tailwind CSS + Shadcn UI
- [x] **路由架構**: 實作 `AdminLayout` 與路由保護 (Protected Routes)
- [x] **身分驗證**: 登入頁面 (`LoginPage`)、Firebase Auth 整合、忘記密碼功能
- [x] **店家列表**: 使用 Shadcn Table 展示資料，支援分頁 (Pagination) 與刪除功能
- [x] **店家管理**: 新增與編輯店家表單 (`StoreFormPage`)，整合 Google Maps 連結解析
- [x] **UI/UX 優化**:
    - **手機版適配**: 後台列表在手機上自動切換為卡片式顯示 (Responsive Card View)
    - **操作優化**: 獨立顯示編輯與刪除按鈕，提升操作效率
    - **地址解析**: 優化 Google Maps 地址自動填入邏輯，支援模糊比對 (Fuzzy Matching)

## 🛠️ 安裝與執行 (Setup)

1.  **安裝依賴**:
    ```bash
    npm install
    ```

2.  **設定環境變數**:
    請確保 `src/lib/firebase.ts` 中包含正確的 Firebase 設定，或設定對應的環境變數。

3.  **啟動開發伺服器**:
    ```bash
    npm run dev
    ```

4.  **建置生產版本**:
    ```bash
    npm run build
    ```

## 📂 專案結構

- `src/components`: 共用元件 (包含 Shadcn UI 元件)
- `src/layouts`: 頁面佈局 (如 `AdminLayout`)
- `src/lib`: 工具函式與設定 (如 `firebase.ts`, `utils.ts`)
- `src/pages`: 頁面組件
    - `admin`: 後台相關頁面 (`StoreListPage`, `StoreFormPage`)
    - `auth`: 認證相關頁面 (`LoginPage`)
- `src/types`: TypeScript 型別定義

## 📝 文件紀錄

- `gemini.md`: 詳細的開發日誌與決策紀錄
- `task.md`: 開發任務清單與狀態
- `walkthrough.md`: 功能展示與驗證報告
