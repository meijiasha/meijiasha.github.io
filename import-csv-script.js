// import-csv-script.js
console.log("import-csv-script.js: Script loaded.");

// DOM 元素引用
let csvFileInput, loadCsvHeadersBtn, downloadTemplateBtn, fieldMappingSection, mappingTableBody, processImportBtn, importStatusSection, importProgress, importLog, backToListBtn;

// Firestore 目標欄位定義
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

let csvHeaders = [];
let parsedCsvData = [];

// -----------------------------------------------------------------------------
// Toast 顯示函數
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

function generateAndDownloadCsvTemplate() {
    const headers = firestoreFields.map(field => `"${String(field.label || '').replace(/"/g, '""')}"`).join(',');
    const exampleRow = firestoreFields.map(field => `"${String(field.example || '').replace(/"/g, '""')}"`).join(',');
    const csvContent = `${headers}\n${exampleRow}`;
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "店家資料匯入範本.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else { showToast("您的瀏覽器不支援自動下載。", "warning", "下載提示"); }
}

function parseFullCsvData(file) {
    Papa.parse(file, {
        header: true, skipEmptyLines: true, dynamicTyping: true,
        complete: function(results) {
            parsedCsvData = results.data;
            // console.log("Parsed Full CSV Data:", parsedCsvData);
            if (results.errors.length > 0) {
                showToast(`CSV 資料解析時出現 ${results.errors.length} 個警告，部分資料可能不完整。`, "warning", "解析警告");
            }
            if(processImportBtn) processImportBtn.disabled = false;
        },
        error: function(error) {
            console.error("PapaParse 讀取完整資料錯誤:", error);
            showToast("讀取 CSV 完整資料時發生錯誤：" + error.message, "danger", "讀取錯誤");
            if(processImportBtn) processImportBtn.disabled = true;
        }
    });
}

function renderFieldMappingTable() {
    if(!mappingTableBody || !csvHeaders) return;
    mappingTableBody.innerHTML = '';
    firestoreFields.forEach(fsField => {
        const row = mappingTableBody.insertRow();
        const cellFirestore = row.insertCell();
        const cellCsv = row.insertCell();
        cellFirestore.innerHTML = `${fsField.label} ${fsField.required ? '<span class="text-danger">*</span>' : ''}`;
        const select = document.createElement('select');
        select.classList.add('form-select', 'form-select-sm');
        select.id = `map_${fsField.id}`;
        const defaultOption = document.createElement('option');
        defaultOption.value = ""; defaultOption.textContent = "-- 不匯入此欄位 --";
        select.appendChild(defaultOption);
        csvHeaders.forEach(csvHeader => {
            const option = document.createElement('option');
            option.value = csvHeader; option.textContent = csvHeader;
            if ( (fsField.label && csvHeader && fsField.label.includes(csvHeader)) ||
                 (fsField.id && csvHeader && fsField.id.toLowerCase() === String(csvHeader).toLowerCase()) ) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        cellCsv.appendChild(select);
    });
}

function updateProgressBar(current, total) {
    if(!importProgress) return;
    const percentage = Math.round((current / total) * 100);
    importProgress.style.width = percentage + '%';
    importProgress.textContent = percentage + '%';
    importProgress.setAttribute('aria-valuenow', percentage);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("import-csv-script.js: DOMContentLoaded.");

    csvFileInput = document.getElementById('csvFile');
    loadCsvHeadersBtn = document.getElementById('loadCsvHeadersBtn');
    downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    fieldMappingSection = document.getElementById('fieldMappingSection');
    mappingTableBody = document.getElementById('mappingTableBody');
    processImportBtn = document.getElementById('processImportBtn');
    importStatusSection = document.getElementById('importStatusSection');
    importProgress = document.getElementById('importProgress') ? document.getElementById('importProgress').querySelector('.progress-bar') : null;
    importLog = document.getElementById('importLog');
    backToListBtn = document.getElementById('backToListBtn');

    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("CSV Import: Firebase not ready.");
        if (importLog) importLog.innerHTML = "Firebase 初始化失敗，無法進行匯入。<br>";
        if(loadCsvHeadersBtn) loadCsvHeadersBtn.disabled = true;
        if(processImportBtn) processImportBtn.disabled = true;
        if(downloadTemplateBtn) downloadTemplateBtn.disabled = true;
        return;
    }

    auth.onAuthStateChanged(user => {
        if (!user) {
            showToast("請先登入以使用批次匯入功能。", "warning", "需要登入");
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        } else {
            console.log("CSV Import: User is logged in.");
            if(loadCsvHeadersBtn) loadCsvHeadersBtn.disabled = false;
            if(downloadTemplateBtn) downloadTemplateBtn.disabled = false;
            // processImportBtn 初始應為 disabled
        }
    });

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', generateAndDownloadCsvTemplate);
    }

    if (loadCsvHeadersBtn) {
        loadCsvHeadersBtn.addEventListener('click', () => {
            const file = csvFileInput ? csvFileInput.files[0] : null;
            if (!file) { showToast("請先選擇一個 CSV 檔案！", "warning", "提示"); return; }
            if(fieldMappingSection) fieldMappingSection.style.display = 'none';
            if(importStatusSection) importStatusSection.style.display = 'none';
            if(mappingTableBody) mappingTableBody.innerHTML = '';
            if(processImportBtn) processImportBtn.disabled = true;
            if(importLog) importLog.innerHTML = "正在解析 CSV 檔案...<br>";
            Papa.parse(file, {
                header: false, preview: 1, skipEmptyLines: true,
                complete: function(results) {
                    if (results.data && results.data.length > 0 && results.data[0].length > 0) {
                        csvHeaders = results.data[0].map(header => String(header || '').trim());
                        if(importLog) importLog.innerHTML += "成功解析 CSV 標頭。<br>請進行欄位對應。<br>";
                        renderFieldMappingTable();
                        if(fieldMappingSection) fieldMappingSection.style.display = 'block';
                        parseFullCsvData(file);
                    } else { showToast("無法解析 CSV 標頭。", "danger", "解析失敗"); if(importLog) importLog.innerHTML += "<span class='text-danger'>無法解析 CSV 標頭。</span><br>";}
                },
                error: function(error) { showToast("讀取 CSV 標頭錯誤：" + error.message, "danger", "讀取錯誤"); if(importLog) importLog.innerHTML += `<span class='text-danger'>讀取 CSV 標頭錯誤: ${error.message}</span><br>`;}
            });
        });
    }

    if (processImportBtn) {
        processImportBtn.addEventListener('click', async () => {
            if (!db || !auth) { showToast("服務未連接。", "danger", "錯誤"); return; }
            const currentUser = auth.currentUser;
            if (!currentUser) { showToast("請重新登入。", "warning", "需要認證"); return; }
            if (parsedCsvData.length === 0) { showToast("沒有資料可匯入。", "info", "提示"); return; }

            processImportBtn.disabled = true;
            if(importStatusSection) importStatusSection.style.display = 'block';
            if(importLog) importLog.innerHTML = "開始匯入程序...<br>";
            if(importProgress && importProgress.parentElement) { importProgress.style.width = '0%'; importProgress.textContent = '0%'; importProgress.parentElement.style.display = 'flex';}
            if(backToListBtn) backToListBtn.style.display = 'none';

            let currentBatch = db.batch();
            let successfulImports = 0; let failedImports = 0;
            const totalRows = parsedCsvData.length; let operationsInCurrentBatch = 0;
            const fieldMappings = {};
            firestoreFields.forEach(fsField => { const el = document.getElementById(`map_${fsField.id}`); if (el && el.value) fieldMappings[fsField.id] = el.value; });
            if(importLog) importLog.innerHTML += `欄位對應: ${JSON.stringify(fieldMappings)}<br>`;

            for (let i = 0; i < totalRows; i++) {
                const row = parsedCsvData[i]; const storeData = {}; let skipRow = false; let rowErrors = [];
                for (const fsFieldId in fieldMappings) { const csvHeaderName = fieldMappings[fsFieldId]; if (row.hasOwnProperty(csvHeaderName) && row[csvHeaderName] !== null && row[csvHeaderName] !== undefined) { storeData[fsFieldId] = typeof row[csvHeaderName] === 'string' ? String(row[csvHeaderName]).trim() : row[csvHeaderName]; } }
                const latCsvHeader = fieldMappings['latitude']; const lngCsvHeader = fieldMappings['longitude'];
                let latVal = NaN, lngVal = NaN;
                if (latCsvHeader && row.hasOwnProperty(latCsvHeader) && String(row[latCsvHeader]).trim() !== '') latVal = parseFloat(row[latCsvHeader]);
                if (lngCsvHeader && row.hasOwnProperty(lngCsvHeader) && String(row[lngCsvHeader]).trim() !== '') lngVal = parseFloat(row[lngCsvHeader]);
                if (!isNaN(latVal) && !isNaN(lngVal)) storeData.location = new firebase.firestore.GeoPoint(latVal, lngVal);
                else if (!isNaN(latVal) || !isNaN(lngVal)) rowErrors.push("緯度和經度需同時提供有效數字。");
                firestoreFields.forEach(fsField => { if (fsField.required && (storeData[fsField.id] === undefined || String(storeData[fsField.id]).trim() === '')) { rowErrors.push(`欄位 "${fsField.label}" 為必填。`); skipRow = true; } });
                if (skipRow || rowErrors.length > 0) { failedImports++; if(importLog) importLog.innerHTML += `<span class="text-danger">第 ${i + 1} 行錯誤: ${rowErrors.join(', ')}</span><br>`; updateProgressBar(i + 1, totalRows); continue; }
                storeData.createdBy = { uid: currentUser.uid, email: currentUser.email }; storeData.lastEditedBy = { uid: currentUser.uid, email: currentUser.email };
                storeData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); storeData.lastEditedAt = firebase.firestore.FieldValue.serverTimestamp();
                const newStoreRef = db.collection('stores_taipei').doc(); currentBatch.set(newStoreRef, storeData);
                operationsInCurrentBatch++; successfulImports++;
                if(importLog) importLog.innerHTML += `<span class="text-success">準備匯入第 ${i + 1} 行: ${storeData.name || 'N/A'}</span><br>`; updateProgressBar(i + 1, totalRows);
                if (operationsInCurrentBatch >= 490) {
                    try { await currentBatch.commit(); if(importLog) importLog.innerHTML += `已提交一批 (${operationsInCurrentBatch} 筆)...<br>`; currentBatch = db.batch(); operationsInCurrentBatch = 0; }
                    catch (batchError) { console.error("批次提交失敗:", batchError); if(importLog) importLog.innerHTML += `<span class="text-danger">批次提交錯誤: ${batchError.message}</span><br>`; failedImports += operationsInCurrentBatch; successfulImports -= operationsInCurrentBatch; currentBatch = db.batch(); operationsInCurrentBatch = 0;}
                }
            }
            try {
                if (operationsInCurrentBatch > 0) { await currentBatch.commit(); if(importLog) importLog.innerHTML += `最後一批 (${operationsInCurrentBatch} 筆) 完成。<br>`;}
                const finalMessage = `匯入完成！成功: ${successfulImports} 筆, 失敗: ${failedImports} 筆。`;
                showToast(finalMessage, failedImports > 0 ? "warning" : "success", "匯入結果", 10000); // 延長顯示時間
                if(importLog) importLog.innerHTML += `<strong class="${failedImports > 0 ? 'text-warning' : 'text-success'}">${finalMessage}</strong>`;
                if(csvFileInput) csvFileInput.value = ""; if(backToListBtn) backToListBtn.style.display = 'inline-block';
            } catch (finalCommitError) { showToast("最終提交時發生錯誤。", "danger", "匯入錯誤"); if(importLog) importLog.innerHTML += `<span class="text-danger">最終提交錯誤: ${finalCommitError.message}</span><br>`;}
            finally { processImportBtn.disabled = false; if(importProgress && importProgress.parentElement) importProgress.parentElement.style.display = 'none'; }
        });
    }
    console.log("import-csv-script.js: DOMContentLoaded setup finished.");
});

console.log("import-csv-script.js: Script parsed completely.");