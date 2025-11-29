# Google Maps API 除錯指南

本指南將協助您在本地端執行除錯工具，以測試 Google Maps API 的回傳結果，並解決「自動填入」功能的問題。

## 1. 前置準備

### 1.1 確認 API 金鑰設定
由於 Google Maps API 有安全性限制，請確保您的 API 金鑰已允許本地端伺服器存取。

1.  前往 [Google Cloud Console](https://console.cloud.google.com/)。
2.  選擇您的專案。
3.  進入 **API 和服務** > **憑證**。
4.  點擊您的 API 金鑰 (`AIzaSyDSQZ7B7N4HHTWx_EDC72v9-1rmV1K1srk`)。
5.  在 **網站限制 (HTTP 參照位址)** 中，確認已加入以下項目：
    *   `http://localhost:8000/*`

### 1.2 準備本地伺服器
您需要一個簡單的 HTTP 伺服器來執行除錯頁面。Mac 內建了 Python，可以直接使用。

## 2. 啟動除錯工具

1.  開啟終端機 (Terminal)。
2.  進入專案的 `public` 資料夾：
    ```bash
    cd /Users/seraphwu/meijiasha.github.io/public
    ```
    *(請根據您的實際路徑調整)*

3.  啟動 Python HTTP 伺服器：
    ```bash
    python3 -m http.server 8000
    ```
    看到 `Serving HTTP on :: port 8000` 表示啟動成功。

4.  開啟瀏覽器，訪問以下網址：
    [http://localhost:8000/debug_maps.html](http://localhost:8000/debug_maps.html)

## 3. 使用除錯工具

除錯頁面提供了一個簡單的介面，讓您可以輸入店名、地址或 Google Maps 網址進行測試。

1.  **輸入查詢**：在輸入框中貼上您有問題的 Google Maps 網址，或是輸入店名/地址。
    *   *範例網址*：`https://www.google.com/maps/place/...`
    *   *範例店名*：`峰老滷湘川麻辣滷味-土城金城店`
2.  **點擊 Search**：按下按鈕開始搜尋。
3.  **查看結果**：
    *   **Address Components**：這是 Google 回傳的原始地址元件資料。
    *   **Detection Logic**：這是系統嘗試解析「縣市」與「行政區」的過程。
    *   **Matched District**：如果成功偵測到行政區，會顯示綠色文字；失敗則顯示紅色。

## 4. 分析問題

*   **如果 Matched District 顯示 None**：
    *   請查看 **Address Components** 列表中，是否有出現該行政區的名稱 (例如 `土城區`)。
    *   檢查該元件的 `types` 是什麼 (例如 `locality`, `sublocality_level_1` 等)。
    *   如果 Google 回傳的資料中根本沒有該行政區的名稱，代表 Google Maps 資料庫中該地點的資訊不完整。
    *   如果有名稱但系統沒抓到，請將該元件的 `types` 記錄下來，我們可以據此調整程式碼邏輯。

## 5. 結束除錯

完成後，在終端機按 `Ctrl + C` 即可停止伺服器。
