# Gemini AI 開發紀錄

此文件記錄了由 Gemini AI 協助完成的開發任務。

## 2025年9月13日

### 功能更新與介面優化

今天進行了以下幾項功能的開發與介面調整：

1.  **介面佈局重構**:
    *   將原有的漢堡選單觸發的側邊欄，修改為永久固定顯示的側邊欄佈局。
    *   此修改涉及 `index.html` 的結構調整與 `style.css` 的樣式更新，並在側邊欄頂部加入了 `LOGO.svg`。
    *   將側邊欄背景色調整為純白色 (`#ffffff`)，提升視覺一致性。

2.  **分類篩選器優化**:
    *   將原本的分類按鈕列表，修改為更節省空間的下拉式選單 (`<select>`)。
    *   相關的 `script.js` 邏輯也已更新，以對應下拉選單的操作。

3.  **隨機推薦功能增強**:
    *   **側邊欄結果顯示**: 現在點擊「隨機推薦店家」後，推薦結果除了顯示在地圖上，也會同步列表在側邊欄中。列表中的店家是可點擊的，點擊後會將地圖平移至店家位置並打開資訊視窗。
    *   **智慧推薦邏輯**:
        *   推薦功能現在會判斷使用者是否已選擇分類。
        *   若已選擇分類，會優先從該分類尋找店家。如果數量不足，會從同行政區的其他分類隨機補足至 3 間。
    *   **推薦結果描述優化**:
        *   推薦標題會動態說明結果來源，例如：「從「**咖啡廳**」選出 2 間，再從「早午餐」、「小吃」選出 1 間。」
        *   在推薦的店家列表中，每家店的分類會以 Bootstrap 的膠囊樣式 (badge) 顯示，使資訊更清晰。

---

## 資訊安全掃描 (2025年9月13日)

對專案檔案進行了初步的資訊安全掃描，主要檢查硬編碼 (hardcoded) 的 API 金鑰或敏感資訊。

### 掃描結果

-   **發現問題**: 在多個 HTML 檔案中，直接寫入了 Firebase 和 Google Maps 的 API 金鑰。這表示金鑰是公開的，任何訪客都能輕易取得。

-   **受影響的檔案**:
    -   `index.html`
    -   `add-store.html`
    -   `admin.html`
    -   `code.html`
    -   `edit-store.html`
    -   `geocode.html`
    -   `import-csv.html`
    -   `login.html`

-   **金鑰範例**:
    -   Firebase Key: `apiKey: "AIzaSyA4sQav5EeZowQKRya14xeG9Lj3TyMQdM4"`
    -   Google Maps Key: `...src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCtd5KFPQASnh_nOmkACetkvgkyATSWEuw&..."`

### 風險評估

將 API 金鑰直接寫在前端的 HTML 或 JavaScript 檔案中，會讓任何存取網站的人都能輕易看到這些金鑰。這可能導致：

-   **金鑰濫用**: 未經授權的人可能使用您的金鑰，在他們自己的專案中呼叫 Google Maps 或 Firebase 服務，造成您的帳戶產生非預期的費用。
-   **超出配額**: 惡意使用可能快速消耗您的服務配額，導致您的網站功能中斷。

### 改善建議

強烈建議將 API 金鑰從程式碼中移除，並採取更安全的管理方式。常見的做法是：

1.  **使用環境變數**: 在開發和部署環境中設定環境變數來儲存 API 金鑰。您的後端或建置過程可以讀取這些變數，並將它們安全地注入到應用程式中，而不是直接寫在原始碼裡。
2.  **金鑰限制 (Key Restriction)**:
    -   **Google Maps API Key**: 在 Google Cloud Console 中，為您的 Maps API 金鑰設定「HTTP 參照網址」限制。將其設定為只允許來自您網站的網域 (例如 `meijiasha.github.io/*`) 的請求。這樣可以防止他人在自己的網站上使用您的金鑰。
    -   **Firebase API Key**: Firebase 的 `apiKey` 通常被認為是公開的，但您必須搭配設定嚴格的 **Firebase 安全規則 (Security Rules)** 來保護您的資料庫，確保只有經過授權的使用者才能讀寫資料。

基於目前的專案結構 (純前端 GitHub Pages 網站)，最直接有效的改善方法是為您的 **Google Maps API 金鑰設定 HTTP 參照網址限制**。