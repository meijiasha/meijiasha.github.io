// import-csv-script.js

// DOM 元素
const csvFileInput = document.getElementById('csvFile');
const loadCsvHeadersBtn = document.getElementById('loadCsvHeadersBtn');
const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
const fieldMappingSection = document.getElementById('fieldMappingSection');
const mappingTableBody = document.getElementById('mappingTableBody');
const processImportBtn = document.getElementById('processImportBtn');
const importStatusSection = document.getElementById('importStatusSection');
const importProgress = document.getElementById('importProgress') ? document.getElementById('importProgress').querySelector('.progress-bar') : null;
const importLog = document.getElementById('importLog');
const backToListBtn = document.getElementById('backToListBtn');


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

// 延遲執行的 Firebase 相關初始化
function initializeCsvImportPage() {
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("CSV Import: Firebase instances not available.");
        if (importLog) importLog.innerHTML = "Firebase 初始化失敗，無法進行匯入。<br>";
        if(loadCsvHeadersBtn) loadCsvHeadersBtn.disabled = true;
        if(processImportBtn) processImportBtn.disabled = true;
        if(downloadTemplateBtn) downloadTemplateBtn.disabled = true;
        return;
    }

    auth.onAuthStateChanged(user => {
        if (!user) {
            alert("請先登入以使用批次匯入功能。");
            window.location.href = 'login.html';
        } else {
            console.log("CSV Import: User is logged in.");
            if(loadCsvHeadersBtn) loadCsvHeadersBtn.disabled = false;
            // processImportBtn 初始應為 disabled，直到資料解析完成
            if(downloadTemplateBtn) downloadTemplateBtn.disabled = false;
        }
    });

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            generateAndDownloadCsvTemplate();
        });
    }

    if (loadCsvHeadersBtn) {
        loadCsvHeadersBtn.addEventListener('click', () => {
            const file = csvFileInput ? csvFileInput.files[0] : null;
            if (!file) {
                alert("請先選擇一個 CSV 檔案！");
                return;
            }

            if(fieldMappingSection) fieldMappingSection.style.display = 'none';
            if(importStatusSection) importStatusSection.style.display = 'none';
            if(mappingTableBody) mappingTableBody.innerHTML = '';
            if(processImportBtn) processImportBtn.disabled = true;
            if(importLog) importLog.innerHTML = "正在解析 CSV 檔案...<br>";

            Papa.parse(file, {
                header: false,
                preview: 1,
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.data && results.data.length > 0 && results.data[0].length > 0) {
                        csvHeaders = results.data[0].map(header => String(header || '').trim());
                        console.log("CSV Headers:", csvHeaders);
                        if(importLog) importLog.innerHTML += "成功解析 CSV 標頭。<br>請進行欄位對應。<br>";
                        renderFieldMappingTable();
                        if(fieldMappingSection) fieldMappingSection.style.display = 'block';
                        parseFullCsvData(file);
                    } else {
                        alert("無法解析 CSV 標頭。");
                        if(importLog) importLog.innerHTML += "<span class='text-danger'>無法解析 CSV 標頭。</span><br>";
                    }
                },
                error: function(error) {
                    console.error("PapaParse 讀取標頭錯誤:", error);
                    alert("讀取 CSV 標頭錯誤：" + error.message);
                    if(importLog) importLog.innerHTML += `<span class='text-danger'>讀取 CSV 標頭錯誤: ${error.message}</span><br>`;
                }
            });
        });
    }

    if (processImportBtn) {
        processImportBtn.addEventListener('click', async () => {
            if (!db || !auth) {
                alert("資料庫或認證未連接。"); return;
            }
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("請重新登入。"); return;
            }
            if (parsedCsvData.length === 0) {
                alert("沒有資料可匯入。"); return;
            }

            processImportBtn.disabled = true;
            if(importStatusSection) importStatusSection.style.display = 'block';
            if(importLog) importLog.innerHTML = "開始匯入程序...<br>";
            if(importProgress) {
                importProgress.style.width = '0%';
                importProgress.textContent = '0%';
                if(importProgress.parentElement) importProgress.parentElement.style.display = 'flex';
            }
            if(backToListBtn) backToListBtn.style.display = 'none';

            // 重新獲取一次批次物件，確保是最新的
            let currentBatch = db.batch();
            let successfulImports = 0;
            let failedImports = 0;
            const totalRows = parsedCsvData.length;
            let operationsInCurrentBatch = 0;

            const fieldMappings = {};
            firestoreFields.forEach(fsField => {
                const selectElement = document.getElementById(`map_${fsField.id}`);
                if (selectElement && selectElement.value) {
                    fieldMappings[fsField.id] = selectElement.value;
                }
            });

            console.log("Field Mappings:", fieldMappings);
            if(importLog) importLog.innerHTML += `欄位對應設定: ${JSON.stringify(fieldMappings)}<br>`;

            for (let i = 0; i < totalRows; i++) {
                const row = parsedCsvData[i];
                const storeData = {};
                let skipRow = false;
                let rowErrors = [];

                for (const fsFieldId in fieldMappings) {
                    const csvHeaderName = fieldMappings[fsFieldId];
                    if (row.hasOwnProperty(csvHeaderName) && row[csvHeaderName] !== null && row[csvHeaderName] !== undefined) {
                        storeData[fsFieldId] = typeof row[csvHeaderName] === 'string' ? String(row[csvHeaderName]).trim() : row[csvHeaderName];
                    } else {
                         // 如果對應的 CSV 欄位不存在或值為 null/undefined，則不在 storeData 中創建該屬性
                         // 除非該 Firestore 欄位是必填的，下方驗證會處理
                    }
                }

                const latCsvHeader = fieldMappings['latitude'];
                const lngCsvHeader = fieldMappings['longitude'];
                let latVal = NaN, lngVal = NaN;

                if (latCsvHeader && row.hasOwnProperty(latCsvHeader) && String(row[latCsvHeader]).trim() !== '') {
                    latVal = parseFloat(row[latCsvHeader]);
                }
                if (lngCsvHeader && row.hasOwnProperty(lngCsvHeader) && String(row[lngCsvHeader]).trim() !== '') {
                    lngVal = parseFloat(row[lngCsvHeader]);
                }

                if (!isNaN(latVal) && !isNaN(lngVal)) {
                    storeData.location = new firebase.firestore.GeoPoint(latVal, lngVal);
                } else if (!isNaN(latVal) || !isNaN(lngVal)) { // 如果只提供了一個或其中一個無效
                    rowErrors.push("緯度和經度必須同時提供有效的數字。");
                }
                // 如果都未提供或都無效，則不設定 location

                firestoreFields.forEach(fsField => {
                    if (fsField.required && (storeData[fsField.id] === undefined || String(storeData[fsField.id]).trim() === '')) {
                        rowErrors.push(`欄位 "${fsField.label}" 為必填。`);
                        skipRow = true;
                    }
                });

                if (skipRow || rowErrors.length > 0) {
                    failedImports++;
                    if(importLog) importLog.innerHTML += `<span class="text-danger">第 ${i + 1} 行資料錯誤: ${rowErrors.join(', ')} (原始: ${JSON.stringify(row).substring(0,100)}...)</span><br>`;
                    updateProgressBar(i + 1, totalRows);
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
                if(importLog) importLog.innerHTML += `<span class="text-success">準備匯入第 ${i + 1} 行: ${storeData.name || '未知名稱'}</span><br>`;
                updateProgressBar(i + 1, totalRows);

                if (operationsInCurrentBatch >= 490) {
                    try {
                        await currentBatch.commit();
                        if(importLog) importLog.innerHTML += `已提交一批 (${operationsInCurrentBatch} 筆) 資料...<br>`;
                        currentBatch = db.batch(); // 重新初始化 batch
                        operationsInCurrentBatch = 0;
                    } catch (batchError) {
                        console.error("批次提交 Firestore 失敗:", batchError);
                        if(importLog) importLog.innerHTML += `<span class="text-danger">批次提交時發生錯誤: ${batchError.message} (此批 ${operationsInCurrentBatch} 筆可能未成功)</span><br>`;
                        failedImports += operationsInCurrentBatch; // 假設這批都失敗
                        successfulImports -= operationsInCurrentBatch;
                        // 這裡可能需要更複雜的重試或錯誤處理機制
                        // 為簡化，我們繼續下一批，但記錄錯誤
                        currentBatch = db.batch(); // 確保有新的 batch
                        operationsInCurrentBatch = 0;
                    }
                }
            }

            try {
                if (operationsInCurrentBatch > 0) { // 提交剩餘的批次
                    await currentBatch.commit();
                    if(importLog) importLog.innerHTML += `最後一批 (${operationsInCurrentBatch} 筆) 資料提交完成。<br>`;
                }
                const finalMessage = `匯入完成！成功: ${successfulImports} 筆, 失敗: ${failedImports} 筆。<br>`;
                if(importLog) importLog.innerHTML += `<strong class="${failedImports > 0 ? 'text-warning' : 'text-success'}">${finalMessage}</strong>`;
                alert(finalMessage.replace(/<br>/g, '\n'));
                if(csvFileInput) csvFileInput.value = "";
                if(backToListBtn) backToListBtn.style.display = 'inline-block';

            } catch (finalCommitError) {
                console.error("最終提交 Firestore 失敗:", finalCommitError);
                if(importLog) importLog.innerHTML += `<span class="text-danger">最終提交時發生錯誤: ${finalCommitError.message}</span><br>`;
                alert("匯入過程中發生錯誤。");
            } finally {
                processImportBtn.disabled = false;
                if(importProgress && importProgress.parentElement) importProgress.parentElement.style.display = 'none';
            }
        });
    }
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
    } else {
        alert("您的瀏覽器不支援自動下載功能。");
        console.log("CSV 範本內容:\n", csvContent);
    }
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
        defaultOption.value = "";
        defaultOption.textContent = "-- 不匯入此欄位 --";
        select.appendChild(defaultOption);
        csvHeaders.forEach(csvHeader => {
            const option = document.createElement('option');
            option.value = csvHeader;
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

function updateProgressBar(current, total) {
    if(!importProgress) return;
    const percentage = Math.round((current / total) * 100);
    importProgress.style.width = percentage + '%';
    importProgress.textContent = percentage + '%';
    importProgress.setAttribute('aria-valuenow', percentage);
}

// 確保在 DOMContentLoaded 後執行 Firebase 相關初始化
document.addEventListener('DOMContentLoaded', initializeCsvImportPage);