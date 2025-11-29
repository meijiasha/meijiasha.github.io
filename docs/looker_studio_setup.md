# Looker Studio 設定指南

本指南將協助您將 Google Analytics 4 (GA4) 數據連接至 Looker Studio，建立報表並嵌入至您的網站後台。

## 事前檢查：確認 GA4 運作中

在開始 Looker Studio 設定前，請先確認您的 Google Analytics 是否已接收到數據：

1.  **程式碼已設定**: 我已經幫您在網站程式碼中啟用了 GA 追蹤 (使用 ID: `G-07JZNDTJN7`)。
2.  **驗證數據**:
    *   開啟您的網站並隨意瀏覽幾頁。
    *   前往 [Google Analytics](https://analytics.google.com/)。
    *   點擊左側選單的 **「報表」** > **「即時」 (Realtime)**。
    *   您應該會看到「過去 30 分鐘的使用者」數字大於 0，這代表 GA 正在正常運作。
    *   *注意：若您是剛啟用，歷史報表可能需要 24-48 小時才會出現數據，但「即時」報表應該會立即顯示。*

## 步驟 1：登入並建立報表

1.  前往 [Looker Studio](https://lookerstudio.google.com/) 並使用您的 Google 帳號登入。
2.  點擊左上角的 **「建立」 (Create)** 按鈕，選擇 **「報表」 (Report)**。

## 步驟 2：連接 Google Analytics 數據

1.  在「新增資料至報表」視窗中，選擇 **「Google Analytics (分析)」**。
2.  選擇您的帳戶 (**meijiasha**) 和資源 (**meijiasha-64de6** 或相關名稱)。
3.  點擊 **「加入」 (Add)**。
4.  系統會跳出確認視窗，點擊 **「新增至報表」 (Add to report)**。

## 步驟 3：設計您的報表

現在您已經進入編輯介面，可以開始新增圖表：

*   **新增圖表**：點擊上方工具列的 **「新增圖表」 (Add a chart)**。
    *   **計分卡 (Scorecard)**：適合顯示「總瀏覽量」、「使用者人數」等單一數字。
    *   **時間序列圖 (Time series)**：適合顯示「每日流量趨勢」。
    *   **圓餅圖 (Pie chart)**：適合顯示「使用者來源」、「裝置類型」等分佈。
*   **調整樣式**：點擊圖表後，使用右側的 **「樣式」 (Style)** 面板調整顏色、字體等，使其符合網站風格 (例如使用橘色系)。

## 步驟 4：取得嵌入代碼

1.  完成報表設計後，點擊右上角的 **「分享」 (Share)** 按鈕旁的下拉選單 (或是點擊 **「檔案」 (File)** 選單)。
2.  選擇 **「嵌入報表」 (Embed report)**。
3.  勾選 **「啟用嵌入功能」 (Enable embedding)**。
4.  選擇 **「嵌入程式碼」 (Embed Code)**。
5.  **複製** 顯示的 iframe 代碼。
    *   代碼範例：
        ```html
        <iframe width="600" height="450" src="https://lookerstudio.google.com/embed/reporting/..." frameborder="0" style="border:0" allowfullscreen></iframe>
        ```

## 步驟 5：嵌入至網站後台

1.  回到您的專案程式碼。
2.  開啟檔案：`src/pages/admin/AnalyticsPage.tsx`。
3.  找到標示為 `Looker Studio iframe` 的區塊。
4.  將複製的 iframe 代碼貼上，並稍作調整以符合 React 語法 (例如將 `style="border:0"` 改為 `style={{ border: 0 }}`)。
5.  將 `width` 和 `height` 設為 `100%` 以適應容器大小。

### 程式碼範例 (`src/pages/admin/AnalyticsPage.tsx`)：

```tsx
<CardContent className="h-full pb-12">
    {/* 貼上您的 iframe 代碼，並調整如下 */}
    <iframe 
        width="100%" 
        height="100%" 
        src="https://lookerstudio.google.com/embed/reporting/YOUR_REPORT_ID/page/YOUR_PAGE_ID" 
        frameBorder="0" 
        style={{ border: 0 }} 
        allowFullScreen
    ></iframe>
</CardContent>
```

## 常見問題

*   **權限問題**：請確保您的 Looker Studio 報表分享設定為 **「任何擁有連結的人均可檢視」** (Unlisted) 或特定網域可檢視，否則後台可能會顯示「無權限存取」。
    *   點擊右上角 **「分享」** -> **「管理存取權」** -> 將連結分享設定改為 **「公開 - 任何擁有連結的人皆可檢視」** (若您希望嚴格控管，則需邀請特定 Google 帳號)。
