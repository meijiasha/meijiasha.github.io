# 咩呷啥 (Meijiasha) - 前端重構計畫

本專案是「咩呷啥」網站的前端重構版本，旨在將原有的 Vanilla JS 架構遷移至現代化的 React 生態系，以提升開發效率、維護性與使用者體驗。

## 🚀 技術堆疊 (Tech Stack)

- **核心框架**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **建置工具**: [Vite](https://vitejs.dev/)
- **樣式庫**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 元件**: [Shadcn UI](https://ui.shadcn.com/)
- **路由管理**: [React Router](https://reactrouter.com/)
- **表單處理**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **地圖整合**: [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

## 📅 目前進度 (Current Progress)

### 第一階段：後台管理系統 (Phase 1: Admin System) ✅
- [x] **完整功能**: 登入驗證、店家列表管理、新增/編輯表單
- [x] **UI/UX**: 響應式設計、深色模式支援、Google Maps 地址自動填入

### 第二階段：前台地圖 (Phase 2: Frontend Map) ✅
- [x] **React 遷移**: 將舊版首頁完全遷移至 React 架構 (`MainLayout`)
- [x] **地圖功能**: 整合 Google Maps、使用者定位、深色地圖樣式
- [x] **側邊欄**: 實作響應式側邊欄 (Desktop: 固定 / Mobile: Drawer)
- [x] **推薦系統**: 隨機推薦卡片 UI 與邏輯遷移

### 第三階段：PWA 支援 (Phase 3: PWA Support) ✅
- [x] **安裝支援**: 支援安裝至桌面與手機主畫面
- [x] **離線能力**: Service Worker 快取與離線頁面支援

## 🛠️ 安裝與執行 (Setup)

1.  **安裝依賴**:
    ```bash
    npm install
    ```

2.  **設定環境變數**:
    請確保 `.env` 或 `src/lib/config.ts` 中包含正確的 API Key 設定。

3.  **啟動開發伺服器**:
    ```bash
    npm run dev
    ```

4.  **建置生產版本**:
    ```bash
    npm run build
    ```

## 📂 專案結構

- `src/components`:
    - `map`: 地圖相關元件 (`MapContainer`, `StoreMarker`)
    - `sidebar`: 側邊欄元件 (`ControlPanel`, `StoreListPanel`)
    - `ui`: Shadcn UI 基礎元件
- `src/layouts`: 頁面佈局 (`MainLayout`, `AdminLayout`)
- `src/lib`: 工具函式 (`firebase.ts`, `locations.ts`)
- `src/pages`:
    - `admin`: 後台管理頁面
    - `auth`: 登入頁面
- `src/hooks`: 自定義 Hooks (`useStores`, `useRecommendation`)
- `src/store`: Zustand 狀態管理 (`useAppStore`)

## 📝 文件紀錄

- `gemini.md`: 詳細的開發日誌與決策紀錄
- `task.md`: 開發任務清單與狀態
- `walkthrough.md`: 功能展示與驗證報告
- `pwa_implementation_plan.md`: PWA 實作計畫細節
