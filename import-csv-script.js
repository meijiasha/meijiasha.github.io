// import-csv-script.js
console.log("import-csv-script.js: Script loaded.");

// DOM 元素引用 (在 DOMContentLoaded 中獲取)
let csvFileInput, loadCsvPreviewBtn, downloadTemplateBtn,
    csvPreviewSection, csvPreviewThead, csvPreviewTbody,
    fieldMappingSection, mappingTableBody, processImportBtn,
    importStatusSection, importProgressContainer, importProgressBar, importLog, importSummary,
    backToListBtn, importAgainBtn;

// Firestore 目標欄位定義 (與之前相同)
const firestoreFields = [
    { id: 'name', label: '店家名稱', required: true, example: '美味小吃部' },
    { id: 'district', label: '行政區', required: true, example: '大安區' },
    { id: 'category', label: '分類', required: true, example: '小吃' },
    { id: 'address', label: '地址', required: false, example: '台北市某某路100號' },
    { id: 'price', label: '每人平均消費約', required: false, example: '$100-200' },
    { id: 'description', label: '簡介', required: false, example: '提供道地台灣小吃。' },
    { id: 'place_id', label: 'Google Place ID', required: false, example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' },
    { id: 'latitude', label: '緯度', required: false, isGeo: true, example: '25.0330' },
    { id: 'longitude', label: '經度', required: false, isGeo: true, example: '121.5654' }
];

let csvRawHeaders = []; // 儲存 CSV 檔案的原始標頭 (未清理)
let csvCleanHeaders = []; // 儲存清理後的 CSV 標頭 (用於對應)
let parsedCsvData = []; // 儲存解析後的 CSV 資料 (物件陣列)
let csvPreviewData = []; // 儲存用於預覽的前幾行原始數據

// -----------------------------------------------------------------------------
// Toast 顯示函數 (與其他 JS 檔案中的 showToast 相同)
// -----------------------------------------------------------------------------
function showToast(message, type = 'info', title = '通知', delay = 5000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) { console.error("Toast container not found!"); alert(`${title}: ${message}`); return; }
    const toastId = 'toast-' + new Date().getTime();
    const toastBgClass = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }[type] || 'bg-primary';
    const iconClass = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-info-circle-fill';
    const toastHTML = `<div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}"><div class="toast-header text-white ${toastBgClass}"><i class="bi ${iconClass} me-2"></i><strong class="me-auto">${title}</strong><small class="text-white-50">剛剛</small><button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button></div><div class="toast-body">${message}</div></div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, { delay: delay && delay > 0 ? delay : undefined, autohide: delay && delay > 0 });
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
        toast.show();
    } else { alert(`${title}: ${message}`); }
}

// 產生並下載 CSV 範本 (與之前相同)
function generateAndDownloadCsvTemplate() { /* ... (與之前版本相同) ... */ }

// **** 新增：渲染 CSV 預覽表格 ****
function renderCsvPreview() {
    if (!csvPreviewThead || !csvPreviewTbody) return;
    csvPreviewThead.innerHTML = '';
    csvPreviewTbody.innerHTML = '';

    if (csvRawHeaders.length > 0) {
        const headerRow = csvPreviewThead.insertRow();
        csvRawHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
    }

    csvPreviewData.forEach(rowDataArray => {
        const bodyRow = csvPreviewTbody.insertRow();
        rowDataArray.forEach(cellData => {
            const td = bodyRow.insertCell();
            td.textContent = cellData;
        });
    });

    if(csvPreviewSection) csvPreviewSection.style.display = 'block';
}


// 解析 CSV (獲取標頭和預覽數據，然後是完整數據)
function parseCsvFile(file) {
    if (!file) return;
    if(importLog) importLog.innerHTML = "正在解析 CSV 檔案，請稍候...<br>";
    if(processImportBtn) processImportBtn.disabled = true; // 開始解析時禁用匯入按鈕

    // 第一次解析：獲取標頭和預覽數據 (前6行，1行標頭 + 5行數據)
    Papa.parse(file, {
        preview: 6, // 讀取前6行
        skipEmptyLines: true,
        complete: function(resultsPreview) {
            if (resultsPreview.data && resultsPreview.data.length > 0) {
                csvRawHeaders = resultsPreview.data[0]; // 原始標頭，用於預覽
                csvCleanHeaders = csvRawHeaders.map(h => String(h || '').trim()); // 清理後的標頭，用於對應
                csvPreviewData = resultsPreview.data.slice(1); // 預覽數據 (不含標頭)

                console.log("CSV Raw Headers:", csvRawHeaders);
                console.log("CSV Clean Headers:", csvCleanHeaders);
                console.log("CSV Preview Data:", csvPreviewData);

                if(importLog) importLog.innerHTML += "成功解析 CSV 標頭和預覽資料。<br>請檢查預覽並進行欄位對應。<br>";
                renderCsvPreview();
                renderFieldMappingTable(); // 產生欄位對應表格
                if(fieldMappingSection) fieldMappingSection.style.display = 'block';

                // 第二次解析：獲取所有數據 (使用清理後的標頭)
                Papa.parse(file, {
                    header: true, // 使用第一行作為鍵名
                    skipEmptyLines: true,
                    dynamicTyping: true, // 嘗試自動轉換類型
                    transformHeader: header => String(header || '').trim(), // 清理實際數據的標頭
                    complete: function(resultsFull) {
                        parsedCsvData = resultsFull.data;
                        console.log("Parsed Full CSV Data objects:", parsedCsvData);
                        if (resultsFull.errors.length > 0) {
                            console.warn("CSV 完整資料解析時出現警告:", resultsFull.errors);
                            if(importLog) importLog.innerHTML += `<span class='text-warning'>CSV 完整資料解析時出現 ${resultsFull.errors.length} 個警告，部分資料可能不完整或格式錯誤。</span><br>`;
                        }
                        if(importLog) importLog.innerHTML += `共解析到 ${parsedCsvData.length} 筆有效資料記錄 (不含標頭行)。<br>`;
                        if(processImportBtn) processImportBtn.disabled = parsedCsvData.length === 0; // 如果沒有數據則禁用
                        showToast(`CSV 解析完成，共 ${parsedCsvData.length} 筆資料待匯入。`, "info", "解析完成");
                    },
                    error: function(errorFull) {
                        console.error("PapaParse 讀取完整資料錯誤:", errorFull);
                        showToast("讀取 CSV 完整資料時發生錯誤：" + errorFull.message, "danger", "讀取錯誤");
                        if(importLog) importLog.innerHTML += `<span class='text-danger'>讀取 CSV 完整資料時發生錯誤: ${errorFull.message}</span><br>`;
                        if(processImportBtn) processImportBtn.disabled = true;
                    }
                });

            } else {
                showToast("無法解析 CSV 檔案，可能是空檔案或格式不正確。", "danger", "解析失敗");
                if(importLog) importLog.innerHTML += "<span class='text-danger'>無法解析 CSV 檔案。</span><br>";
            }
        },
        error: function(errorPreview) {
            console.error("PapaParse 讀取預覽資料錯誤:", errorPreview);
            showToast("讀取 CSV 預覽資料時發生錯誤：" + errorPreview.message, "danger", "讀取錯誤");
            if(importLog) importLog.innerHTML += `<span class='text-danger'>讀取 CSV 預覽資料時發生錯誤: ${errorPreview.message}</span><br>`;
        }
    });
}


// 產生欄位對應表格 (修改以反映新的 HTML 結構)
function renderFieldMappingTable() {
    if(!mappingTableBody || !csvCleanHeaders) return;
    mappingTableBody.innerHTML = '';
    firestoreFields.forEach(fsField => {
        const row = mappingTableBody.insertRow();
        const cellCsv = row.insertCell(); // CSV 欄位在左側
        const cellArrow = row.insertCell();
        const cellFirestore = row.insertCell(); // Firestore 欄位在右側

        cellArrow.innerHTML = '<i class="bi bi-arrow-right-short"></i>';
        cellArrow.classList.add('text-center');
        cellFirestore.innerHTML = `${fsField.label} ${fsField.required ? '<span class="text-danger">*</span>' : ''}`;

        const select = document.createElement('select');
        select.classList.add('form-select', 'form-select-sm');
        select.id = `map_${fsField.id}`;
        select.setAttribute('data-firestore-field', fsField.id); // 儲存目標 Firestore 欄位

        const defaultOption = document.createElement('option');
        defaultOption.value = ""; defaultOption.textContent = "-- 不匯入此欄位 --";
        select.appendChild(defaultOption);

        csvCleanHeaders.forEach(csvHeader => {
            const option = document.createElement('option');
            option.value = csvHeader; // select 的 value 是 CSV 中的 header
            option.textContent = csvHeader;
            if ( (fsField.label && csvHeader && fsField.label.includes(csvHeader)) ||
                 (fsField.id && csvHeader && fsField.id.toLowerCase() === String(csvHeader).toLowerCase()) ) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        cellCsv.appendChild(select);
    });
}

// 更新進度條 (與之前相同)
function updateProgressBar(current, total) { /* ... (與之前版本相同) ... */ }

// 開始匯入資料按鈕事件 (大幅修改以提供更詳細的回饋)
async function processImport() {
    if (!db || !auth) { showToast("服務未連接。", "danger", "錯誤"); return; }
    const currentUser = auth.currentUser;
    if (!currentUser) { showToast("請重新登入。", "warning", "需要認證"); return; }
    if (parsedCsvData.length === 0) { showToast("沒有資料可匯入。", "info", "提示"); return; }

    if(processImportBtn) processImportBtn.disabled = true;
    if(loadCsvPreviewBtn) loadCsvPreviewBtn.disabled = true; // 匯入中禁用重新載入
    if(csvFileInput) csvFileInput.disabled = true; // 匯入中禁用檔案選擇

    if(importStatusSection) importStatusSection.style.display = 'block';
    if(importLog) importLog.innerHTML = "<strong>匯入程序開始...</strong><br>";
    if(importProgressContainer && importProgressBar) {
        importProgressBar.style.width = '0%';
        importProgressBar.textContent = '0%';
        importProgressContainer.style.display = 'block';
    }
    if(importSummary) importSummary.style.display = 'none';
    if(backToListBtn) backToListBtn.style.display = 'none';
    if(importAgainBtn) importAgainBtn.style.display = 'none';


    let currentBatch = db.batch();
    let successfulImports = 0;
    let failedImports = 0;
    const totalRowsToProcess = parsedCsvData.length;
    let operationsInCurrentBatch = 0;
    const batchCommitSize = 490; // Firestore 批次上限 500，預留一些

    // 獲取使用者設定的欄位對應關係
    const fieldMappings = {}; // key: firestoreFieldId, value: csvHeaderName
    mappingTableBody.querySelectorAll('select').forEach(selectElement => {
        if (selectElement.value) { // 只有當選擇了 CSV 欄位時
            fieldMappings[selectElement.dataset.firestoreField] = selectElement.value;
        }
    });

    console.log("Field Mappings for import:", fieldMappings);
    if(importLog) importLog.innerHTML += `使用的欄位對應: ${JSON.stringify(fieldMappings)}<br>`;

    for (let i = 0; i < totalRowsToProcess; i++) {
        const csvRowData = parsedCsvData[i]; // 這是 PapaParse 解析出來的物件，key 是清理後的 CSV 標頭
        const storeData = {}; // 準備寫入 Firestore 的數據
        let rowErrors = [];
        let skipRow = false;

        // 根據對應關係組裝 storeData
        firestoreFields.forEach(fsField => {
            const csvHeaderName = fieldMappings[fsField.id]; // 找到 Firestore 欄位對應的 CSV 標頭
            if (csvHeaderName && csvRowData.hasOwnProperty(csvHeaderName)) {
                let value = csvRowData[csvHeaderName];
                storeData[fsField.id] = (typeof value === 'string') ? value.trim() : value;
            } else if (fsField.required) {
                rowErrors.push(`必要的 Firestore 欄位 "${fsField.label}" 沒有找到對應的 CSV 欄位或值為空。`);
                skipRow = true;
            }
        });

        if (skipRow) {
            failedImports++;
            if(importLog) importLog.innerHTML += `<span class="text-danger">第 ${i + 1} 行 (名稱: ${csvRowData[fieldMappings['name']] || '未知'}) 因缺少必要欄位對應而被跳過: ${rowErrors.join('; ')}</span><br>`;
            updateProgressBar(i + 1, totalRowsToProcess);
            continue;
        }

        // 特殊處理經緯度
        let latVal = NaN, lngVal = NaN;
        const latCsvMappedHeader = fieldMappings['latitude'];
        const lngCsvMappedHeader = fieldMappings['longitude'];

        if (latCsvMappedHeader && csvRowData.hasOwnProperty(latCsvMappedHeader) && String(csvRowData[latCsvMappedHeader]).trim() !== '') {
            latVal = parseFloat(csvRowData[latCsvMappedHeader]);
        }
        if (lngCsvMappedHeader && csvRowData.hasOwnProperty(lngCsvMappedHeader) && String(csvRowData[lngCsvMappedHeader]).trim() !== '') {
            lngVal = parseFloat(csvRowData[lngCsvMappedHeader]);
        }

        if (!isNaN(latVal) && !isNaN(lngVal)) {
            storeData.location = new firebase.firestore.GeoPoint(latVal, lngVal);
        } else if (!isNaN(latVal) || !isNaN(lngVal)) { // 如果只提供了一個或其中一個無效
            rowErrors.push("緯度和經度必須同時提供有效的數字才能設定位置。");
        }
        // 如果都未提供或都無效，則不設定 location

        // 資料驗證 (基於 Firestore 欄位定義)
        firestoreFields.forEach(fsField => {
            if (fsField.required && (storeData[fsField.id] === undefined || String(storeData[fsField.id]).trim() === '')) {
                // 這個檢查理論上已在前面對應時處理，但再次確認
                if (!rowErrors.includes(`欄位 "${fsField.label}" 為必填。`)) { // 避免重複錯誤訊息
                     rowErrors.push(`欄位 "${fsField.label}" 為必填。`);
                }
                skipRow = true;
            }
        });

        if (skipRow || rowErrors.length > 0) {
            failedImports++;
            if(importLog) importLog.innerHTML += `<span class="text-danger">第 ${i + 1} 行資料驗證失敗 (名稱: ${storeData.name || '未知'}): ${rowErrors.join('; ')}</span><br>`;
            updateProgressBar(i + 1, totalRowsToProcess);
            continue;
        }

        // 自動加入創建/編輯資訊
        storeData.createdBy = { uid: currentUser.uid, email: currentUser.email };
        storeData.lastEditedBy = { uid: currentUser.uid, email: currentUser.email };
        storeData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        storeData.lastEditedAt = firebase.firestore.FieldValue.serverTimestamp();

        const newStoreRef = db.collection('stores_taipei').doc();
        currentBatch.set(newStoreRef, storeData);
        operationsInCurrentBatch++;
        successfulImports++;
        // if(importLog) importLog.innerHTML += `<span class="text-info">準備匯入第 ${i + 1} 行: ${storeData.name || 'N/A'}</span><br>`; // Log 太頻繁
        updateProgressBar(i + 1, totalRowsToProcess);

        if (operationsInCurrentBatch >= batchCommitSize || (i === totalRowsToProcess - 1 && operationsInCurrentBatch > 0) ) {
            try {
                await currentBatch.commit();
                if(importLog) importLog.innerHTML += `<span class="text-success">成功提交一批 (${operationsInCurrentBatch} 筆) 資料到 Firestore...</span><br>`;
                currentBatch = db.batch();
                operationsInCurrentBatch = 0;
            } catch (batchError) {
                console.error("批次提交 Firestore 失敗:", batchError);
                if(importLog) importLog.innerHTML += `<span class="text-danger">批次提交時發生錯誤: ${batchError.message} (此批 ${operationsInCurrentBatch} 筆資料可能未成功匯入)</span><br>`;
                failedImports += operationsInCurrentBatch;
                successfulImports -= operationsInCurrentBatch; // 從成功計數中減去失敗的
                currentBatch = db.batch(); // 即使失敗，也重新初始化 batch 以便後續（如果有）
                operationsInCurrentBatch = 0;
                 // 可以在這裡決定是否終止整個匯入過程
            }
        }
    } // end of for loop

    // 最終的摘要和清理
    const finalMessage = `匯入程序完成！<br>成功匯入: <strong>${successfulImports}</strong> 筆店家資料。<br>失敗或跳過: <strong>${failedImports}</strong> 筆店家資料。`;
    if(importSummary) {
        importSummary.innerHTML = finalMessage;
        importSummary.classList.remove('alert-info', 'alert-success', 'alert-danger', 'alert-warning');
        importSummary.classList.add(failedImports > 0 ? 'alert-warning' : 'alert-success');
        importSummary.style.display = 'block';
    }
    if(importLog) importLog.innerHTML += `<strong>${finalMessage.replace(/<br>/g, '\n')}</strong>`; // 日誌中也顯示摘要

    showToast(finalMessage.replace(/<br>/g, ' '), failedImports > 0 ? "warning" : "success", "匯入結果", 15000); // 延長 Toast 顯示時間

    if(processImportBtn) processImportBtn.disabled = false; // 可以重新匯入
    if(loadCsvPreviewBtn) loadCsvPreviewBtn.disabled = false;
    if(csvFileInput) csvFileInput.disabled = false;
    if(csvFileInput) csvFileInput.value = ""; // 清空檔案選擇器

    if(importProgressContainer && importProgressBar) {
        importProgressBar.style.width = '100%';
        importProgressBar.textContent = '完成';
        setTimeout(() => { // 延遲隱藏進度條
            if(importProgressContainer) importProgressContainer.style.display = 'none';
        }, 3000);
    }
    if(backToListBtn) backToListBtn.style.display = 'inline-block';
    if(importAgainBtn) importAgainBtn.style.display = 'inline-block';
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("import-csv-script.js: DOMContentLoaded.");

    csvFileInput = document.getElementById('csvFile');
    loadCsvPreviewBtn = document.getElementById('loadCsvPreviewBtn');
    downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    csvPreviewSection = document.getElementById('csvPreviewSection');
    csvPreviewThead = document.getElementById('csvPreviewThead');
    csvPreviewTbody = document.getElementById('csvPreviewTbody');
    fieldMappingSection = document.getElementById('fieldMappingSection');
    mappingTableBody = document.getElementById('mappingTableBody');
    processImportBtn = document.getElementById('processImportBtn');
    importStatusSection = document.getElementById('importStatusSection');
    importProgressContainer = document.getElementById('importProgressContainer');
    importProgressBar = document.getElementById('importProgressBar');
    importLog = document.getElementById('importLog');
    importSummary = document.getElementById('importSummary');
    backToListBtn = document.getElementById('backToListBtn');
    importAgainBtn = document.getElementById('importAgainBtn');


    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("CSV Import: Firebase not ready.");
        showToast("Firebase 初始化失敗，頁面功能受限。", "danger", "初始化錯誤");
        if(loadCsvPreviewBtn) loadCsvPreviewBtn.disabled = true;
        if(downloadTemplateBtn) downloadTemplateBtn.disabled = true;
        return;
    }

    auth.onAuthStateChanged(user => {
        if (!user) {
            showToast("請先登入以使用此功能。", "warning", "需要登入");
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        } else {
            if(loadCsvPreviewBtn) loadCsvPreviewBtn.disabled = false;
            if(downloadTemplateBtn) downloadTemplateBtn.disabled = false;
        }
    });

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', generateAndDownloadCsvTemplate);
    }

    if (loadCsvPreviewBtn) {
        loadCsvPreviewBtn.addEventListener('click', () => {
            const file = csvFileInput ? csvFileInput.files[0] : null;
            if (!file) { showToast("請先選擇一個 CSV 檔案！", "warning", "提示"); return; }
            // 重置 UI
            if(fieldMappingSection) fieldMappingSection.style.display = 'none';
            if(importStatusSection) importStatusSection.style.display = 'none';
            if(csvPreviewSection) csvPreviewSection.style.display = 'none';
            if(mappingTableBody) mappingTableBody.innerHTML = '';
            if(processImportBtn) processImportBtn.disabled = true;
            parsedCsvData = []; csvRawHeaders = []; csvCleanHeaders = []; csvPreviewData = [];

            parseCsvFile(file);
        });
    }

    if (processImportBtn) {
        processImportBtn.addEventListener('click', processImport);
    }

    if (importAgainBtn) {
        importAgainBtn.addEventListener('click', () => {
            // 重置UI到初始狀態
            if(csvFileInput) csvFileInput.value = ""; // 清空檔案選擇器
            if(csvPreviewSection) csvPreviewSection.style.display = 'none';
            if(fieldMappingSection) fieldMappingSection.style.display = 'none';
            if(importStatusSection) importStatusSection.style.display = 'none';
            if(processImportBtn) processImportBtn.disabled = true;
            if(loadCsvPreviewBtn) loadCsvPreviewBtn.disabled = false;
            if(csvFileInput) csvFileInput.disabled = false;
            if(importLog) importLog.innerHTML = "請選擇新的 CSV 檔案進行匯入。<br>";
            parsedCsvData = []; csvRawHeaders = []; csvCleanHeaders = []; csvPreviewData = [];
        });
    }

    console.log("import-csv-script.js: DOMContentLoaded setup finished.");
});

console.log("import-csv-script.js: Script parsed completely.");