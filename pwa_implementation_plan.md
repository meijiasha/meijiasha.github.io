# PWA Implementation Plan (Progressive Web App)

本文件詳細說明將「咩呷啥」網站升級為 PWA (Progressive Web App) 的步驟。PWA 將提供安裝到桌面/手機、離線瀏覽能力以及更接近原生 App 的體驗。

## 1. 技術選擇

我們將使用 **`vite-plugin-pwa`**。這是 Vite 生態系中最標準且功能強大的 PWA 解決方案，它基於 Google 的 Workbox，能自動處理 Service Worker 的生成與資源快取。

## 2. 實作步驟

### 步驟 1: 安裝套件

安裝 `vite-plugin-pwa` 用於建置流程，以及 `workbox-window` 用於前端與 Service Worker 溝通（例如處理更新提示）。

```bash
npm install vite-plugin-pwa workbox-window
```

### 步驟 2: 設定 Vite Config (`vite.config.ts`)

在 `vite.config.ts` 中引入並設定 `VitePWA` plugin。這會定義 PWA 的核心行為。

**主要設定項目：**
*   **`registerType: 'autoUpdate'`**: 讓 Service Worker 自動更新（或者選擇 `'prompt'` 讓使用者手動點擊更新）。建議初期使用 `'autoUpdate'` 簡化流程，或 `'prompt'` 提供更好的使用者體驗。
*   **`includeAssets`**: 指定需要被快取的靜態資源（如 favicon, logo, fonts）。
*   **`manifest`**: 定義 `manifest.webmanifest` 的內容，包含 App 名稱、圖示、顏色等。

```typescript
// 範例設定
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'logo.svg'],
  manifest: {
    name: '咩呷啥 - 今天吃什麼',
    short_name: '咩呷啥',
    description: '幫你決定今天吃什麼的隨機美食推薦 App',
    theme_color: '#ef962e',
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
})
```

### 步驟 3: 準備 PWA 圖示

PWA 需要特定尺寸的圖示（至少需要 192x192 和 512x512 的 PNG 檔）。
*   **來源**: 我們現有的 `public/logo.svg`。
*   **行動**: 需要將 SVG 轉換為 PNG 格式的 `pwa-192x192.png` 和 `pwa-512x512.png` 並放入 `public` 資料夾。

### 步驟 4: 註冊 Service Worker

雖然 `vite-plugin-pwa` 可以自動注入註冊腳本，但為了更好的控制（例如處理更新），我們通常會在 `src/main.tsx` 或專門的 `src/pwa.ts` 中使用 `workbox-window` 進行註冊。

### 步驟 5: 處理更新提示 (Optional but Recommended)

如果選擇 `registerType: 'prompt'`，我們需要製作一個 UI 元件（如 Toast 或 Alert），當檢測到新版本時顯示：「發現新內容，請點擊重新整理」。

## 3. 檔案變更清單

| 檔案 | 動作 | 說明 |
| :--- | :--- | :--- |
| `package.json` | 修改 | 新增 `vite-plugin-pwa` 和 `workbox-window` |
| `vite.config.ts` | 修改 | 加入 PWA Plugin 設定 |
| `public/pwa-192x192.png` | 新增 | PWA 圖示 (需生成) |
| `public/pwa-512x512.png` | 新增 | PWA 圖示 (需生成) |
| `src/App.tsx` | 修改 | (可選) 加入 PWA 更新提示元件 |

## 4. 驗證方式

1.  **Lighthouse 測試**: 使用 Chrome DevTools 的 Lighthouse 跑分，確認 "PWA" 項目是否達標。
2.  **安裝測試**: 在 Chrome/Safari 網址列確認是否出現「安裝」圖示。
3.  **離線測試**: 關閉網路，重新整理頁面，確認 App 仍能載入並顯示基本介面（地圖可能因無網路無法載入圖磚，但 App 骨架應可運作）。

## 5. 待確認事項

*   **更新策略**: 您希望 App 有新版本時是「自動背景更新並在下次開啟時生效」(Auto Update)，還是「跳出提示詢問使用者是否更新」(Prompt)？(預設建議先用 Auto Update 較簡單，或 Prompt 體驗較好)
*   **圖示生成**: 是否需要我協助將 SVG 轉檔為 PNG？ (我可以使用工具或請您提供)
