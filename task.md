# 任務清單

## 第一階段：後台管理系統 (Phase 1: Admin System)
- [x] **專案初始化**: Vite + React + TypeScript + Tailwind CSS + Shadcn UI
- [x] **路由架構**: 實作 `AdminLayout` 與路由保護 (Protected Routes)
- [x] **身分驗證**: 登入頁面 (`LoginPage`)、Firebase Auth 整合、忘記密碼功能
- [x] **店家列表**: 使用 Shadcn Table 展示資料，支援分頁 (Pagination) 與刪除功能
- [x] **店家管理**: 新增與編輯店家表單 (`StoreFormPage`)，整合 Google Maps 連結解析
- [x] **UI/UX 優化**: 手機版適配、操作優化、地址解析模糊比對

## 第二階段：前台地圖 (Phase 2: Frontend Map)
- [x] **地圖整合**: 整合 `@vis.gl/react-google-maps`
- [x] **側邊欄功能**: 實作側邊欄店家列表與篩選功能
- [x] **地圖標記**: 遷移地圖標記 (Markers) 與 InfoWindow 邏輯
- [x] **狀態管理**: 使用 Zustand 管理地圖狀態與篩選條件
- [x] **推薦卡片**: 遷移隨機推薦功能的 UI

## PWA 實作 (PWA Implementation)
- [x] **套件安裝**: 安裝 `vite-plugin-pwa` 與 `workbox-window`
- [x] **Vite 設定**: 設定 `vite.config.ts` 中的 PWA plugin
- [x] **圖示準備**: 生成 PWA 所需的圖示 (192x192, 512x512)
- [x] **Service Worker**: 註冊 Service Worker 並處理更新提示

## Maintenance
- [x] Git History Cleanup (Unified author to meijiasha.tw@gmail.com)

## 其他優化
- [ ] **效能優化**: 實作店家列表的分頁或虛擬滾動 (Virtual Scrolling)
- [ ] **多縣市支援**: 確保前台與後台皆完整支援多縣市架構
