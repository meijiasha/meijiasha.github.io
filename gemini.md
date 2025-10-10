### 功能新增：列出行政區所有店家

在側邊欄新增了「列出本行政區所有店家」的功能，讓使用者可以一次瀏覽特定區域的所有店家資料。

1.  **介面新增**:
    _ **`index.html`**: 在側邊欄的「隨機推薦」按鈕下方，新增了一個「<i class="bi bi-card-list"></i>
    列出本行政區所有店家」按鈕。
    _ **`index.html`**: 新增了一個 ID 為 `all-stores-panel` 的 `div` 結構，作為從右側滑出的店家列表面板。 \* **`style.css`**: 為新的右側面板新增了樣式，包含其定位、尺寸、背景、陰影，並使用 `transform`
    屬性實現了滑入/滑出的過渡動畫。同時也定義了面板內部分頁元件的樣式。

2.  **功能實作 (`script.js`)**:
    - **啟用時機**: 當使用者從下拉選單選擇了一個行政區後，此按鈕會變為可點擊狀態。
    - **資料查詢**: 點擊按鈕後，會向 Firebase 發送查詢，獲取該行政區內的所有店家資料，並將結果依「分類」及「店名」排序。
    - **面板互動**:
      - 一個包含所有店家列表的面板會從畫面右側滑入。
      - 面板頂部會顯示該行政區的店家總數。
      - 右上角提供一個關閉按鈕，可將面板隱藏。
    - **分頁功能 (Pagination)**:
      - 店家列表以分頁形式呈現，每頁最多顯示 10 間店家。
      - 面板底部會動態產生分頁控制項 (上一頁、頁碼、下一頁)，方便使用者瀏覽。
    - **地圖連動**: 點擊列表中的任何一家店，地圖會自動平移至該店家位置，並彈出其詳細資訊視窗。

---

# Gemini AI 開發紀錄

此文件記錄了由 Gemini AI 協助完成的開發任務。

## 2025 年 10 月 10 日

### 後台功能擴充與錯誤修復

- **功能新增 (新增/編輯頁面分類標籤)**:
  _ **目標**: 在「新增店家」 (`add-store.html`) 和「編輯店家」 (`edit-store.html`)
  頁面的「分類」輸入框下方，顯示資料庫中已存在的分類，並以可點擊的標籤 (badge) 形式呈現，以提升輸入效率和資料一致性。
  _ **介面修改**:
  _ **`add-store.html` / `edit-store.html`**: 在分類輸入框下方新增 `<div id="existingCategoriesContainer">` 容器。
  _ **腳本修改**:
  _ **`add-store-script.js` / `edit-store-script.js`**:
  _ 新增 `generateCategoryColor` 函式，用於為分類標籤產生一致的顏色。
  _ 新增 `loadAndDisplayExistingCategories` 函式，負責從 Firestore 獲取所有不重複的分類。
  _ 將獲取的分類渲染為可點擊的 Bootstrap 標籤，並加入事件監聽，點擊後會自動填入分類輸入框。
  _ 在 `auth.onAuthStateChanged` 認證成功後呼叫此函式。
  _ **錯誤修復**:
  _ **問題**: 初版實作時，`loadAndDisplayExistingCategories` 函式因使用 `db.collection(...).select('category')`
  語法，在當前 Firebase SDK 環境下觸發 `TypeError: db.collection(...).select is not function` 錯誤，導致分類標籤無法顯示。
  _ **解決方案**: 移除 `.select('category')`，改為獲取完整文件後再提取 `category` 欄位。此修正解決了功能無法載入的問題。 \* **偵錯訊息清理**: 移除了為偵錯而加入的 `console.log` 訊息。

- **錯誤修復 (後台搜尋)**:
  _ **問題**: `admin.html` 的搜尋功能在特定情況下無效。經查，此問題由兩個原因造成： 1. **競爭條件 (Race Condition)**: 使用者可以在所有店家資料從 Firebase
  載入完成前，就進行搜尋操作，導致搜尋對象為空列表。 2. **瀏覽器快取**: 使用者的瀏覽器可能載入了舊版的 `admin-script.js` 檔案，其中不包含搜尋功能的正確邏輯。
  _ **解決方案**:\n 1. 在 `admin-script.js` 中加入保護機制，頁面載入時先禁用搜尋框，待所有資料載入完成後再啟用。 2. 透過請使用者「強制重新整理」頁面，解決了快取問題，並驗證了功能正常。 3. 最後，移除了為偵錯而加入的 `console.log` 訊息，保持程式碼整潔。

- **功能擴充 (編輯頁面)**:
  _ **目標**: 將「透過 Google Maps 網址自動填入」的功能，從「新增店家」頁面擴充至「編輯店家」頁面。
  _ **實作**:\n
  _ **`edit-store.html`**: 比照 `add-store.html`，加入了 Google Maps 網址輸入框，並引入了 Google Maps Places API 的
  script 標籤。
  _ **`edit-store-script.js`**: 加入了與 `add-store-script.js`
  相似的邏輯，可解析使用者貼上的網址，並用獲取的最新資訊（Place ID、經緯度、地址等）覆寫表單中的現有欄位。

### 後台管理功能：店家列表搜尋

為了提升後台管理的效率，在店家列表頁面 (`admin.html`) 新增了客戶端搜尋功能。

- **介面修改 (`admin.html`)**:

  - 在頁面標題下方，新增一個包含輸入框、搜尋按鈕、清除按鈕的搜尋列。

- **腳本重構與功能實作 (`admin-script.js`)**:
  _ **資料載入策略變更**: 將原有的「分頁載入」邏輯，重構為「一次性全部載入」。登入後，會將所有店家資料從 Firebase
  下載並快取在前端，以實現即時的客戶端搜尋。
  _ **搜尋邏輯**:
  _ 監聽搜尋框的輸入與按鈕點擊事件。
  _ 根據使用者輸入的關鍵字，對快取的完整店家列表進行篩選。篩選欄位包含：店家名稱、行政區、分類、地址。
  _ 搜尋為大小寫不敏感 (case-insensitive)。
  _ **動態渲染**: 表格內容與分頁控制項，現在會根據篩選後的結果動態產生，提供即時的視覺回饋。

### 功能新增：透過 Google Maps 網址自動填入店家資訊

為了加速店家資料的建檔流程，在「新增店家」頁面實作了新功能，允許使用者透過貼上 Google Maps 網址來自動化大部分的資料輸入。

- **介面修改 (`add-store.html`)**:

  - 在「店家名稱」下方新增了一個「Google Maps 網址」的輸入欄位。
  - 為了呼叫 Places API，在頁面中補上了 Google Maps API 的 script 標籤，並啟用 `places` 函式庫。

- **功能實作 (`add-store-script.js`)**:

  - 為新的網址輸入框加入 `input` 事件監聽。
  - 當使用者貼上**完整格式**的 Google Maps 網址時 (例如 `https://www.google.com/maps/place/...`)，腳本會自動解析出店家名稱。
  - 使用 `google.maps.places.PlacesService` 的 `findPlaceFromQuery` 方法，向 Google Places API 查詢店家詳細資訊。
  - 成功獲取資料後，會自動將店名、地址、Google Place ID、緯度、經度等資訊填入表單的對應欄位中，並跳出成功提示。

- **問題修正與使用者引導**:\n
  _ **問題**: 初步測試發現，此功能無法處理 `https://maps.app.goo.gl/`
  這類的短網址，因為前端腳本因瀏覽器安全限制，無法追蹤短網址的重新導向。
  _ **解決方案**: 與使用者溝通後，決定不採用需要修改後端的複雜方案，而是在介面上提供更清晰的指引。 \* **`add-store.html`**: 修改了網址輸入框下方的提示文字，明確告知使用者需貼上**完整的 Google Maps 網址**
  ，並註明不支援短網址格式，以避免使用者混淆。

### 介面與字體更新

- **LINE Bot 互動優化**:\n
  _ **修改前**: 點擊導覽列的「LINE Bot」會直接開啟新分頁。
  _ **修改後 (`index.html`)**: 現在點擊會彈出一個 Modal 視窗，視窗內提供清晰的 QR Code
  以及「點此加入」按鈕，讓使用者在不離開當前頁面的情況下也能方便地加入 LINE Bot。\n
- **全站字體統一**:\n
  - **目標**: 統一網站視覺風格，提升文字閱讀質感。\n
  - **實作 (`index.html`, `style.css`)**:\n
    1.  從 Google Fonts 引入 `Noto Sans TC` 字體 (思源黑體 - 繁體中文)。
    2.  在主要樣式表 `style.css` 中，將其設定為全站的預設字體。\n

### UI/UX 體驗優化：動畫與顏色

為提升網站整體的精緻度與使用體驗，進行了多項介面優化。

#### 1. 互動微動畫

- **目標**: 為使用者的操作提供即時、流暢的視覺回饋。\n
- **實作 (`style.css`, `script.js`)**:\n
  _ **通用互動**: 為網站中大部分的按鈕、列表項目加入了平滑的過渡動畫，在滑鼠懸停 (hover) 時會微上浮並產生陰影，點擊 (click)
  時則有下壓的模擬回饋。\n
  _ **地圖標記動畫**: 當使用者從任何列表中點擊一個店家時，地圖上對應的標記 (marker)
  會產生一次「跳動」動畫，有效吸引使用者的注意力。\n \* **列表載入動畫**: 為所有動態載入的店家列表（隨機推薦、搜尋結果、所有店家列表）新增了交錯淡入 (staggered fade-in)
  的動畫，讓項目以更生動、不突兀的方式呈現。\n

#### 2. 分類標籤顏色系統

- **目標**: 讓不同店家分類擁有專屬顏色，方便使用者快速識別。\n
- **實作**:\n
  _ **顏色自動產生 (`script.js`)**: 新增了一個 `generateCategoryColor` 函式，此函式能根據分類名稱的字串，以雜湊 (hash)
  演算法為基礎，固定地產生一個獨特且視覺舒適的 HSL 顏色。\n
  _ **動態應用顏色**: 修改了所有列表的渲染邏輯，讓分類標籤 (badge)
  的背景色不再是固定的，而是由上述函式動態產生，並確保文字顏色永遠清晰可讀。\n \* **即時顏色預覽 (`add-store.html`, `add-store-script.js`)**:
  在「新增店家」頁面，為「分類」輸入框新增了即時預覽功能。當管理者輸入分類名稱時，右側會出現一個顏色標籤，即時顯示該分類未來在網站
  上會呈現的顏色。\n

### 功能優化：店家列表增加分類快速篩選

優化了「列出本行政區所有店家」的右側面板功能，提升使用者體驗。

- **`script.js`**:\n
  _ **點擊篩選**: 使用者現在可以直接點擊店家列表中顯示的「分類」標籤 (badge)。
  _ **自動刷新**: 點擊後，列表會自動刷新，只顯示該行政區內所有符合該分類的店家，無須重新選擇下拉選單。\n
  _ **更新標題**: 面板標題會同步更新，明確顯示目前的篩選條件。\n
  _ **新增「顯示全部」按鈕**:
  當列表經過分類篩選後，標題旁會出現此按鈕，方便使用者快速清除篩選條件，返回查看行政區內的所有店家。\n

### 技術與架構改善

- **程式碼重構 (Refactoring)**:\n
  _ **目標**: 統一店家列表項目的 HTML 產生邏輯，降低程式碼重複性，提升長期可維護性。\n
  _ **實作 (`script.js`)**: 新增一個共用的 `createStoreListItemHTML` 函式，此函式作為產生列表項目的統一模板。接著，重構
  `displayRecommendationInSidebar`、`renderSearchResults` 與 `renderStoreListPage`
  這三個函式，讓它們全部呼叫此共用函式來建立列表，而不是各自維護一套 HTML 結構。\n
  ---\n

## 2025 年 10 月 9 日

### 功能新增：導覽列新增 LINE Bot 連結

為了讓使用者能更方便地加入 LINE Bot，在主畫面的上方導覽列中新增了一個直接連結。

- **`index.html`**: 在導覽列的 `<ul>` 列表中，加入了一個新的 `<li>` 項目。\n
  _ 連結文字為「<i class="bi bi-line"></i> LINE Bot」，包含了 LINE 的圖示，提升辨識度。\n
  _ 連結網址為 `https://lin.ee/Qn1ZQIx`，並設定 `target="_blank"`
  ，確保點擊後會在新的分頁開啟，而不會中斷使用者目前的地圖瀏覽。\n
  ---\n

## 2025 年 10 月 5 日

### 介面優化：響應式側邊欄

將網站側邊欄在不同裝置上的行為進行了優化，以改善手機版的瀏覽體驗。

1.  **手機版側邊欄 (Mobile View)**:\n
    - 將原本在手機版會佔據版面的固定側邊欄，修改為 Bootstrap 的 **Offcanvas** 元件。\n
    - 現在側邊欄在手機上預設為隱藏，可透過點擊導覽列左上角的「列表」圖示按鈕滑出。\n
    - 此互動包含平順的滑入滑出動畫，提升了操作體驗。\n
2.  **桌面版側邊欄 (Desktop View)**:\n
    - 在桌面版（螢幕寬度大於 768px）上，側邊欄維持原本的設計，永久固定顯示在畫面左側。\n
    - 透過 CSS Media Query 覆寫 Offcanvas 的行為，使其在桌面版上無縫整合回原有的 Flexbox 佈局中。\n
3.  **程式碼修改**:\n
    - **`index.html`**: 結構調整，將側邊欄改為 Offcanvas，並在導覽列新增對應的觸發按鈕。\n
    - **`style.css`**: 新增 Media Query，區分桌面版與手機版的側邊欄樣式，確保在兩種模式下都能正確顯示。\n

### 錯誤修復：手機版側邊欄無法關閉

修復了在手機版上打開側邊欄後，沒有提供關閉按鈕導致無法關閉的問題。

- **`index.html`**: 在側邊欄的標頭 (`sidebar-header`) 中，補上了 Bootstrap Offcanvas 所需的標準關閉按鈕 (`<button
class="btn-close" ...>`)。\n
- **`style.css`**: 調整了 `sidebar-header` 的 CSS，使用 Flexbox 屬性 (`flex-grow: 1`)
  確保新加入的關閉按鈕能正確靠右對齊，而不會與標題重疊。\n

### 功能新增：啟動時自動定位

為提升使用者體驗，在網頁啟動時增加了自動讀取使用者目前位置的功能。

- **`script.js`**:\n
  _ 修改 `initMap` 函式，在載入地圖前，使用瀏覽器的 `navigator.geolocation.getCurrentPosition` API 請求使用者位置。\n
  _ 若使用者授權，地圖中心會設為使用者的目前位置，並將縮放等級設為
  15。同時，會在該位置顯示一個特殊的藍色圓點標記，方便使用者辨識。\n \* 若使用者拒絕授權、或瀏覽器不支援，地圖則會維持以「台北市」為中心的預設視圖。\n
- **`style.css`**:\n
  - 新增 `.user-location-marker` class，為使用者的位置標記提供藍色圓點的視覺樣式。\n

### 功能新增：推薦附近店家

新增了依據使用者目前位置，推薦附近店家的功能。

- **`index.html`**:\n
  - 在側邊欄加入了「<i class="bi bi-geo-alt-fill"></i> 推薦附近店家」按鈕，並預設為禁用狀態。\n
- **`script.js`**:\n
  - 當網頁成功獲取使用者位置後，會將「推薦附近店家」按鈕啟用。\n
  - 新增 `recommendNearbyStores` 函式，點擊按鈕後會執行以下邏輯：\n
    1.  讀取 Firebase 中所有店家資料。\n
    2.  計算各店家與使用者位置的距離。\n
    3.  篩選出 2 公里內的店家，並按距離排序。\n
    4.  選取最近的 3 間店家，顯示在地圖及側邊欄。\n
  - 若 2 公里內沒有任何店家，則會在側邊欄顯示「尚未收錄附近店家，我們會盡快收錄讓你知道咩呷啥」的提示訊息。\n

### 錯誤修復：地圖暗色模式

修復了網站在切換到暗色模式時，Google 地圖沒有同步變更主題的問題。

1.  **問題分析**:\n
    _ 初步嘗試發現，地圖初始化時使用的 `mapId` 屬性會強制啟用向量地圖 (Vector Map)，導致透過 `styles`
    陣列設定的客戶端自訂樣式（暗色主題）失效。\n
    _ 移除 `mapId` 後，雖然理論上應啟用自訂樣式，但卻導致地圖載入失敗。\n
    _ 經由瀏覽器 Console 的錯誤訊息 `地圖在初始化時未使用有效的地圖 ID，因此將無法使用進階標記`
    ，最終確認了根本原因：專案中使用的 `AdvancedMarkerElement` (進階標記) **必須**依賴 `mapId` 才能運作。\n
    _ 這產生了一個無法兩全的衝突：**暗色主題需要移除 `mapId`**，而**進階標記需要保留 `mapId`**。\n
2.  **解決方案**:\n
    - 與使用者溝通後，決定優先實現「地圖暗色模式」功能。\n
    - 將地圖標記從較新的 `AdvancedMarkerElement` 降級為傳統的 `google.maps.Marker`。\n
    - 這個修改雖然會讓地圖上的圖釘變回傳統樣式，但解除了對 `mapId` 的依賴，使得暗色主題可以正常套用。\n
3.  **程式碼修改**:\n
    _ **`script.js`**:\n
    _ 在 `initMap` 函式中，將用於顯示使用者位置的 `AdvancedMarkerElement` 替換為 `google.maps.Marker`，並使用 `icon`
    屬性重新實現了藍色圓點樣式。\n
    _ 在 `displayMarkers` 和 `displayAndFilterStores` 函式中，將店家標記的 `AdvancedMarkerElement` 全部替換為
    `google.maps.Marker`。\n
    _ 移除了程式碼中所有不再需要的 `google.maps.importLibrary(\"marker\")` 呼叫。\n \* 最終確保 `initMap` 中的 `mapId` 維持註解狀態，讓暗色樣式得以生效。\n

### 錯誤修復：修正地圖載入失敗的語法錯誤

在解決地圖暗色模式的過程中，因手動解決 git 衝突及多次修改，不慎在 `script.js` 的 `displayMarkers` 及 `displayAndFilterStores`
函式中，意外刪除了 `forEach` 迴圈的關鍵部分。

- **問題**: 此語法錯誤導致整個 JavaScript 腳本執行失敗，使得地圖無法載入，暗色模式切換等功能也完全失效。\n
- **解決方案**: 使用 `write_file` 工具，以一個經過驗證的、完全正確的 `script.js` 版本覆蓋掉損壞的檔案，從而恢復了被意外刪除的
  `forEach` 迴圈，讓程式邏輯恢復正常。\n
  ---\n

## 2025 年 9 月 13 日

### 功能更新與介面優化

今天進行了以下幾項功能的開發與介面調整：

1.  **介面佈局重構**:\n
    - 將原有的漢堡選單觸發的側邊欄，修改為永久固定顯示的側邊欄佈局。\n
    - 此修改涉及 `index.html` 的結構調整與 `style.css` 的樣式更新，並在側邊欄頂部加入了 `LOGO.svg`。\n
    - 將側邊欄背景色調整為純白色 (`#ffffff`)，提升視覺一致性。\n
2.  **分類篩選器優化**:\n
    - 將原本的分類按鈕列表，修改為更節省空間的下拉式選單 (`<select>`)。\n
    - 相關的 `script.js` 邏輯也已更新，以對應下拉選單的操作。\n
3.  **隨機推薦功能增強**:\n
    _ **側邊欄結果顯示**:
    現在點擊「隨機推薦店家」後，推薦結果除了顯示在地圖上，也會同步列表在側邊欄中。列表中的店家是可點擊的，點擊後會將地圖平移至店家位
    置並打開資訊視窗。\n
    _ **智慧推薦邏輯**:\n
    _ 推薦功能現在會判斷使用者是否已選擇分類。\n
    _ 若已選擇分類，會優先從該分類尋找店家。如果數量不足，會從同行政區的其他分類隨機補足至 3 間。\n
    _ **推薦結果描述優化**:\n
    _ 推薦標題會動態說明結果來源，例如：「從「**咖啡廳**」選出 2 間，再從「早午餐」、「小吃」選出 1 間。」\n \* 在推薦的店家列表中，每家店的分類會以 Bootstrap 的膠囊樣式 (badge) 顯示，使資訊更清晰。\n
    ---\n

## 資訊安全掃描 (2025 年 9 月 13 日)

對專案檔案進行了初步的資訊安全掃描，主要檢查硬編碼 (hardcoded) 的 API 金鑰或敏感資訊。

### 掃描結果

- **發現問題**: 在多個 HTML 檔案中，直接寫入了 Firebase 和 Google Maps 的 API
  金鑰。這表示金鑰是公開的，任何訪客都能輕易取得。\n
- **受影響的檔案**:\n
  - `index.html`\n
  - `add-store.html`\n
  - `admin.html`\n
  - `code.html`\n
  - `edit-store.html`\n
  - `geocode.html`\n
  - `import-csv.html`\n
  - `login.html`\n
- **金鑰範例**:\n
  - Firebase Key: `apiKey: "AIzaSyA4sQav5EeZowQKRya14xeG9Lj3TyMQdM4"`\n
  - Google Maps Key: `...src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCtd5KFPQASnh_nOmkACetkvgkyATSWEuw&..."`\n

### 風險評估

將 API 金鑰直接寫在前端的 HTML 或 JavaScript 檔案中，會讓任何存取網站的人都能輕易看到這些金鑰。這可能導致：

- **金鑰濫用**: 未經授權的人可能使用您的金鑰，在他們自己的專案中呼叫 Google Maps 或 Firebase
  服務，造成您的帳戶產生非預期的費用。\n
- **超出配額**: 惡意使用可能快速消耗您的服務配額，導致您的網站功能中斷。\n

### 改善建議

強烈建議將 API 金鑰從程式碼中移除，並採取更安全的管理方式。常見的做法是：

1.  **使用環境變數**: 在開發和部署環境中設定環境變數來儲存 API
    金鑰。您的後端或建置過程可以讀取這些變數，並將它們安全地注入到應用程式中，而不是直接寫在原始碼裡。\n
2.  **金鑰限制 (Key Restriction)**:\n - **Google Maps API Key**: 在 Google Cloud Console 中，為您的 Maps API 金鑰設定「HTTP
    參照網址」限制。將其設定為只允許來自您網站的網域 (例如 `meijiasha.github.io/*`)
    的請求。這樣可以防止他人在自己的網站上使用您的金鑰。\n - **Firebase API Key**: Firebase 的 `apiKey` 通常被認為是公開的，但您必須搭配設定嚴格的 **Firebase 安全規則 (Security
    Rules)** 來保護您的資料庫，確保只有經過授權的使用者才能讀寫資料。\n
    基於目前的專案結構 (純前端 GitHub Pages 網站)，最直接有效的改善方法是為您的 **Google Maps API 金鑰設定 HTTP 參照網址限制**。\n
    ---\n

## 2025 年 9 月 23 日

### LINE Bot 整合與店家菜色功能開發

今天完成了 LINE Bot 的初步整合，並為店家資料新增了「推薦菜色」功能。

1.  **LINE Bot 後端服務建立**：\n
    _ 在專案根目錄下建立了獨立的 `line-bot-backend/` 資料夾，用於存放 LINE Bot 的 Node.js 後端程式碼。\n
    _ `line-bot-backend/package.json` 包含了 `express`, `@line/bot-sdk`, `firebase-admin` 等必要依賴。\n
    _ `line-bot-backend/line-bot-server.js` 實作了 LINE Webhook 接收、Firebase
    資料查詢、智慧推薦邏輯（根據行政區和分類推薦最多 3 間店家）。
    _ Bot 回覆訊息採用 LINE Flex Message 的卡片輪播格式，每張卡片包含店家名稱、分類、地址及 Google 地圖連結。\n
2.  **Zeabur 部署流程設定**：\n
    _ 指導使用者將 `line-bot-backend` 服務部署至 Zeabur，並設定正確的「Root Directory」和環境變數 (`CHANNEL_ACCESS_TOKEN`,
    `CHANNEL_SECRET`, `FIREBASE_SERVICE_ACCOUNT`)。\n
    _ 解決了 `Error: Cannot find module '/src/index.js'` 的啟動錯誤，透過明確設定 Zeabur 的「Start Command」為 `node
line-bot-server.js`。\n
3.  **LINE Bot 回應模式修正**：\n
    - 解決了 LINE Bot 同時發送程式回覆和預設自動回應的問題。\n
    - 指導使用者在 LINE Official Account Manager 中將「回應模式」設定為「Bot」，並停用「自動回應」和「歡迎訊息」。\n
4.  **店家「推薦菜色」功能**：\n
    _ **資料庫擴充**：在 `add-store.html` 和 `edit-store.html` 的表單中新增了「推薦菜色」 (`dishes`) 輸入欄位。\n
    _ **前端邏輯**：修改了 `add-store-script.js` 和 `edit-store-script.js`，使其能正確讀取、儲存和更新 Firebase 中店家的
    `dishes` 欄位。\n \* **後端顯示**：更新了 `line-bot-server.js` 中的 `createStoreCarousel` 函式，使 LINE Bot
    在推薦卡片中顯示店家的「推薦菜色」（若有資料）。\n

### 目前進度與下一步

- **目前狀態**：LINE Bot 的核心推薦功能和「推薦菜色」顯示功能已完成程式碼實作並部署。\n
- **待解決問題**：使用者回報 LINE Bot 在推薦「大安區」時，只顯示 2 張卡片而非預期的 3 張。經偵錯後，確認為 Zeabur
  部署同步問題，目前已正常顯示 3 張卡片。\n
- **偵錯階段**：已在 `line-bot-server.js` 的 `getRecommendations` 函式中加入了偵錯日誌 (`console.log`)，以確認從 Firebase
  實際查詢到的店家數量。這個版本已提交並推送到 GitHub，正在 Zeabur 上部署。偵錯日誌已確認問題解決，並已從程式碼中移除。\n
  ---\n

## 未來功能規劃

### 依定位推薦附近店家

- **功能描述**：允許使用者在 LINE 上分享其地理位置後，透過輸入「推薦 [分類]」（例如：「推薦 拉麵店」），Bot
  能根據使用者當前位置，推薦附近最多 3 間符合條件的店家。\n
- **實作挑戰**：\n
  - 處理 LINE 的 `location` 訊息事件，提取經緯度。\n
  - 暫時儲存使用者最近一次的地理位置資訊。\n
  - 實作地理位置查詢邏輯，從 Firebase 篩選出指定半徑內的店家。\n
  - 將地理位置篩選與現有推薦邏輯結合。\n
- **預計階段**：\n
  1.  接收並暫存定位訊息。\n
  2.  實作地理位置查詢（計算距離）。\n
  3.  整合文字指令與回覆。\n
