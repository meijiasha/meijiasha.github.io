// admin-script.js
console.log("admin-script.js: Script loaded and starts parsing.");

// 全域變數宣告
let storesTableBody, loadingIndicator, noStoresMessage, authMessageDiv, storeListContainer, logoutButton, itemsPerPageSelect, paginationUl;

let currentPage = 1;
let itemsPerPage = 10;
let lastFetchedDoc = null;
let pageCursors = {}; // pageCursors[N] 存儲獲取第 N+1 頁的 startAfter cursor (即第 N 頁的最後一個文檔)
let totalStores = 0;
let totalPages = 0;
const USE_ORDER_BY = false; // 設為 true 以啟用 lastEditedAt 排序 (前提是資料和索引已正確處理)

let currentSortColumn = null;
let currentSortDirection = 'asc';
let tableDataCache = [];

// Firebase 實例 - 這些應該由 HTML 中的 <script> 塊賦值給全域 var db, var auth
// 在頂部做一次檢查，並在 DOMContentLoaded 中再次確認
if (typeof auth === 'undefined' || typeof db === 'undefined' || !auth || !db) {
    console.error("admin-script.js (top-level): Firebase 'auth' or 'db' instance not available from HTML. This is a critical issue.");
} else {
    console.log("admin-script.js (top-level): 'auth' and 'db' instances appear to be available from HTML script block.");
}

// -----------------------------------------------------------------------------
// 輔助函數定義
// -----------------------------------------------------------------------------
function handleEditStore(storeId) {
    console.log(`ACTION: Navigating to edit store ID: ${storeId}`);
    if (storeId) {
        window.location.href = `edit-store.html?id=${storeId}`;
    } else {
        console.error("handleEditStore: storeId is undefined or null. Cannot navigate.");
        alert("無法編輯：店家 ID 缺失。");
    }
}

function addEventListenersToEditButtons() {
    // storesTableBody 已在 DOMContentLoaded 中賦值
    if (!storesTableBody) {
        console.error("addEventListenersToEditButtons: storesTableBody is not defined or not found!");
        return;
    }
    const editButtons = storesTableBody.querySelectorAll('.edit-store-btn');
    editButtons.forEach(button => {
        button.removeEventListener('click', handleEditButtonClick);
        button.addEventListener('click', handleEditButtonClick);
    });
}

function handleEditButtonClick(event) {
    const storeId = event.currentTarget.dataset.id;
    handleEditStore(storeId);
}

async function handleDeleteStore(storeId, storeName) {
    if (typeof db === 'undefined' || !db) {
        alert("資料庫未連接，無法刪除。");
        console.error("handleDeleteStore: 'db' instance is not available.");
        return;
    }
    if (confirm(`您確定要刪除店家 "${storeName}" 嗎？此操作無法復原。`)) {
        console.log(`Attempting to delete store ID: ${storeId}, Name: ${storeName}`);
        try {
            await db.collection('stores_taipei').doc(storeId).delete();
            console.log(`SUCCESS: Store "${storeName}" (ID: ${storeId}) deleted.`);
            alert(`店家 "${storeName}" 已成功刪除。`);

            console.log("Re-fetching total count and resetting to first page after delete...");
            totalStores = await fetchTotalStoresCount(); // 更新全域 totalStores
            if (totalStores > 0 && itemsPerPage > 0) {
                totalPages = Math.ceil(totalStores / itemsPerPage);
            } else {
                totalPages = 0;
            }
            console.log("totalPages after delete and recount:", totalPages);

            currentPage = 1;
            lastFetchedDoc = null;
            pageCursors = {};
            currentSortColumn = null; // 重置排序
            currentSortDirection = 'asc';
            // updateSortIcons(); // 會在 renderTableFromCache 內部調用
            fetchStoresForPage(currentPage); // 從第一頁載入
        } catch (error) {
            console.error("刪除店家失敗:", error);
            alert(`刪除店家 "${storeName}" 失敗: ${error.message}`);
        }
    }
}

function addEventListenersToDeleteButtons() {
    if (!storesTableBody) {
        console.error("addEventListenersToDeleteButtons: storesTableBody is not defined or not found!");
        return;
    }
    const deleteButtons = storesTableBody.querySelectorAll('.delete-store-btn');
    deleteButtons.forEach(button => {
        button.removeEventListener('click', handleDeleteButtonClick);
        button.addEventListener('click', handleDeleteButtonClick);
    });
}
function handleDeleteButtonClick(event) {
    const storeId = event.currentTarget.dataset.id;
    const storeName = event.currentTarget.dataset.name;
    handleDeleteStore(storeId, storeName);
}

async function fetchTotalStoresCount() {
    if (typeof db === 'undefined' || !db) {
        console.error("fetchTotalStoresCount: Firestore 'db' is not initialized or not globally available.");
        return 0;
    }
    try {
        console.log("Attempting to fetch total stores count from 'stores_taipei'...");
        const query = db.collection('stores_taipei');
        let count = 0;
        if (typeof query.count === 'function') {
            console.log("  Using query.count() method for total count.");
            const snapshot = await query.count().get();
            count = snapshot.data().count;
            console.log(`SUCCESS (using query.count()): Total stores: ${count}`);
        } else {
            console.warn("  query.count() is not a function in fetchTotalStoresCount. Falling back. ENSURE SDK v9.9.0+ & CACHE CLEARED.");
            const snapshot = await query.get();
            count = snapshot.size;
            console.log(`SUCCESS (using fallback snapshot.size): Total stores: ${count}`);
        }
        return count;
    } catch (error) {
        console.error("ERROR in fetchTotalStoresCount:", error);
        return 0;
    }
}

// -----------------------------------------------------------------------------
// 主要資料獲取與顯示函數
// -----------------------------------------------------------------------------
async function fetchStoresForPage(targetPage) {
    if (typeof db === 'undefined' || !db) {
        console.error("fetchStoresForPage: Firestore 'db' is not initialized or not globally available.");
        if(noStoresMessage) { noStoresMessage.textContent = "資料庫連接失敗。"; noStoresMessage.style.display = 'table-row';}
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        return;
    }

    console.log(`FETCHING STORES - Target: ${targetPage}, Current Page Var (before update): ${currentPage}, Items: ${itemsPerPage}, Sort: ${currentSortColumn || 'FirestoreDefault'}-${currentSortDirection}`);
    if(loadingIndicator) loadingIndicator.style.display = 'block';
    if(noStoresMessage) noStoresMessage.style.display = 'none';
    if(storesTableBody) storesTableBody.innerHTML = '';
    if(paginationUl) paginationUl.innerHTML = '';

    try {
        let query = db.collection('stores_taipei');
        if (USE_ORDER_BY) {
            query = query.orderBy('lastEditedAt', 'desc');
            // console.log("  Querying with orderBy('lastEditedAt', 'desc').");
        } else {
            query = query.orderBy(firebase.firestore.FieldPath.documentId());
            // console.log("  Querying with orderBy(documentId()) for stable pagination.");
        }

        if (targetPage > 1) {
            const cursorDoc = pageCursors[targetPage - 1];
            if (cursorDoc) {
                // console.log(`  Querying for page ${targetPage}, starting AFTER cursor (last doc of page ${targetPage - 1}):`, cursorDoc.id);
                query = query.startAfter(cursorDoc);
            } else {
                console.warn(`  No cursor found for page ${targetPage - 1} to start after. Resetting to page 1 for this fetch.`);
                currentPage = 1; lastFetchedDoc = null; pageCursors = {}; targetPage = 1;
            }
        } else { // targetPage is 1
            // console.log("  Querying for first page (targetPage=1), no startAfter needed.");
            // lastFetchedDoc 應已由調用者在請求第一頁前設為 null
        }

        query = query.limit(itemsPerPage);
        // console.log("  Final query limit set to:", itemsPerPage);

        const documentSnapshots = await query.get();
        console.log(`  Query returned ${documentSnapshots.docs.length} documents for target page ${targetPage}.`);

        if (documentSnapshots.empty) {
            console.log("  No documents found for this page fetch (or end of data).");
            tableDataCache = [];
            renderTableFromCache();
            renderPaginationUI(true);
            if (targetPage === 1) { lastFetchedDoc = null; pageCursors = {}; }
            if(loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        currentPage = targetPage;
        lastFetchedDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        pageCursors[currentPage] = lastFetchedDoc;
        // console.log(`  Successfully fetched page ${currentPage}. Updated lastFetchedDoc to ${lastFetchedDoc.id}. Updated pageCursors[${currentPage}] to ${pageCursors[currentPage].id}.`);

        tableDataCache = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // console.log("  GLOBAL tableDataCache assigned with:", tableDataCache.length, "items.");

        // console.log("  Calling renderTableFromCache from fetchStoresForPage...");
        renderTableFromCache();

        // console.log("  Calling renderPaginationUI from fetchStoresForPage...");
        renderPaginationUI(documentSnapshots.docs.length < itemsPerPage || currentPage === totalPages);

    } catch (error) {
        console.error("讀取店家資料失敗 (fetchStoresForPage):", error);
        if (noStoresMessage) { noStoresMessage.textContent = "讀取資料時發生錯誤。"; noStoresMessage.style.display = 'table-row'; }
        tableDataCache = [];
        renderTableFromCache();
        renderPaginationUI(true);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function renderTableFromCache() {
    // storesTableBody 和 noStoresMessage 已是全域變數，並在 DOMContentLoaded 中賦值
    // console.log("--- renderTableFromCache CALLED ---");
    // console.log("  Cache size at render:", tableDataCache.length);

    if (!storesTableBody) { console.error("  renderTableFromCache: storesTableBody is not available!"); return; }
    storesTableBody.innerHTML = '';
    // console.log("  storesTableBody cleared in renderTableFromCache.");

    if (tableDataCache.length === 0) {
        // console.log("  tableDataCache is empty in renderTableFromCache.");
        if (noStoresMessage) {
            const isFirstEverLoad = (Object.keys(pageCursors).length === 0 && !lastFetchedDoc && currentPage === 1);
            noStoresMessage.textContent = isFirstEverLoad ? "目前沒有店家資料。" : "此頁沒有資料。";
            noStoresMessage.style.display = 'table-row';
            // console.log("  Displayed 'no stores' message from renderTableFromCache.");
        }
        updateSortIcons();
        return;
    }
    if (noStoresMessage) noStoresMessage.style.display = 'none';

    let dataToRender = [...tableDataCache]; // 創建副本以進行排序

    if (currentSortColumn) {
        // console.log(`  Applying client-side sort in renderTableFromCache: ${currentSortColumn} ${currentSortDirection}`);
        sortDataArray(dataToRender, currentSortColumn, currentSortDirection);
    } else {
        // console.log("  Rendering without client-side sort (using Firestore order from cache).");
    }

    // console.log(`  Starting to render ${dataToRender.length} rows in renderTableFromCache...`);
    dataToRender.forEach((storeData) => {
        const storeId = storeData.id;
        const store = storeData;
        const row = storesTableBody.insertRow();
        let lastEditedAtFormatted = 'N/A'; if (store.lastEditedAt && store.lastEditedAt.toDate) { try { lastEditedAtFormatted = store.lastEditedAt.toDate().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { lastEditedAtFormatted = '日期錯誤'; } }
        let editorDisplay = 'N/A'; if (store.lastEditedBy && store.lastEditedBy.email) { editorDisplay = store.lastEditedBy.email; } else if (store.createdBy && store.createdBy.email) { editorDisplay = `${store.createdBy.email} (創建)`;}
        row.innerHTML = `<td>${store.name || 'N/A'}</td><td>${store.district || 'N/A'}</td><td>${store.category || 'N/A'}</td><td>${store.address || 'N/A'}</td><td>${store.price || 'N/A'}</td><td>${editorDisplay}</td><td>${lastEditedAtFormatted}</td><td><button class="btn btn-sm btn-primary edit-store-btn" data-id="${storeId}">編輯</button><button class="btn btn-sm btn-danger delete-store-btn ms-1" data-id="${storeId}" data-name="${store.name || '該店家'}">刪除</button></td>`;
    });
    // console.log("  Finished rendering rows in renderTableFromCache.");

    addEventListenersToEditButtons();
    addEventListenersToDeleteButtons();
    updateSortIcons();
    // console.log("--- renderTableFromCache FINISHED ---");
}

// -----------------------------------------------------------------------------
// 分頁控制項產生函數
// -----------------------------------------------------------------------------
function renderPaginationUI(isEffectivelyLastPage) {
    // paginationUl 已是全域變數
    if (!paginationUl) { console.error("renderPaginationUI: paginationUl not found!"); return; }
    paginationUl.innerHTML = '';
    // console.log(`RENDER PAGINATION - currentPage: ${currentPage}, totalPages: ${totalPages}, isEffectivelyLastPage: ${isEffectivelyLastPage}`);

    if (totalPages <= 0 ) { /* ... (與之前版本相同) ... */ return; }
    if (totalPages === 1 && isEffectivelyLastPage && totalStores <= itemsPerPage ) { /* ... (與之前版本相同) ... */ return; }

    // ... (上一頁、數字頁碼、下一頁按鈕的生成邏輯與您之前提供的版本完全相同) ...
    // (為保持簡潔，此處省略重複的按鈕生成程式碼，假設它們是正確的)
    // 上一頁按鈕
    const prevLi = document.createElement('li'); prevLi.classList.add('page-item'); if (currentPage === 1) prevLi.classList.add('disabled');
    const prevLink = document.createElement('a'); prevLink.classList.add('page-link'); prevLink.href = '#'; prevLink.textContent = '上一頁';
    prevLink.addEventListener('click', (e) => { e.preventDefault(); if (currentPage > 1) fetchStoresForPage(currentPage - 1); });
    prevLi.appendChild(prevLink); paginationUl.appendChild(prevLi);

    // 數字頁碼
    const maxPageButtons = 5; let startPage, endPage;
    if (totalPages <= maxPageButtons) { startPage = 1; endPage = totalPages; }
    else { const maxPagesBefore = Math.floor(maxPageButtons / 2); const maxPagesAfter = Math.ceil(maxPageButtons / 2) - 1; if (currentPage <= maxPagesBefore) { startPage = 1; endPage = maxPageButtons; } else if (currentPage + maxPagesAfter >= totalPages) { startPage = totalPages - maxPageButtons + 1; endPage = totalPages; } else { startPage = currentPage - maxPagesBefore; endPage = currentPage + maxPagesAfter; }}
    startPage = Math.max(1, startPage); endPage = Math.min(totalPages, endPage);
    if (startPage > 1) { const first = document.createElement('li'); first.classList.add('page-item'); const fl = document.createElement('a'); fl.classList.add('page-link'); fl.href='#'; fl.textContent='1'; fl.dataset.page=1; fl.addEventListener('click', handlePageLinkClick); first.appendChild(fl); paginationUl.appendChild(first); if (startPage > 2) { const el = document.createElement('li'); el.classList.add('page-item', 'disabled'); el.innerHTML=`<span class="page-link">...</span>`; paginationUl.appendChild(el);}}
    for (let i = startPage; i <= endPage; i++) { if (i > 0 && i <= totalPages) { const pl = document.createElement('li'); pl.classList.add('page-item'); if (i === currentPage) {pl.classList.add('active'); pl.setAttribute('aria-current', 'page');} const l = document.createElement('a'); l.classList.add('page-link'); l.href='#'; l.textContent=i; l.dataset.page=i; l.addEventListener('click', handlePageLinkClick); pl.appendChild(l); paginationUl.appendChild(pl);}}
    if (endPage < totalPages) { if (endPage < totalPages - 1) { const el = document.createElement('li'); el.classList.add('page-item', 'disabled'); el.innerHTML=`<span class="page-link">...</span>`; paginationUl.appendChild(el);} const last = document.createElement('li'); last.classList.add('page-item'); const ll = document.createElement('a'); ll.classList.add('page-link'); ll.href='#'; ll.textContent=totalPages; ll.dataset.page=totalPages; ll.addEventListener('click', handlePageLinkClick); last.appendChild(ll); paginationUl.appendChild(last);}

    // 下一頁按鈕
    const nextLi = document.createElement('li'); nextLi.classList.add('page-item'); if (currentPage === totalPages || (isEffectivelyLastPage && currentPage >= totalPages) ) nextLi.classList.add('disabled');
    const nextLink = document.createElement('a'); nextLink.classList.add('page-link'); nextLink.href = '#'; nextLink.textContent = '下一頁';
    nextLink.addEventListener('click', (e) => { e.preventDefault(); if (currentPage < totalPages) fetchStoresForPage(currentPage + 1); });
    nextLi.appendChild(nextLink); paginationUl.appendChild(nextLi);
}

function handlePageLinkClick(e) {
    e.preventDefault();
    const targetPage = parseInt(e.target.dataset.page, 10);
    if (targetPage !== currentPage) {
        fetchStoresForPage(targetPage);
    }
}

// **** 排序相關函數 ****
function initializeSortableHeaders() {
    // document 已是全域的，可以直接用
    const headers = document.querySelectorAll('th[data-sortable]');
    console.log("Initializing sortable headers. Found:", headers.length);
    if (headers.length === 0) {
        console.warn("No sortable table headers (th[data-sortable]) found.");
        return;
    }
    headers.forEach(header => {
        header.removeEventListener('click', handleSortHeaderClick);
        header.addEventListener('click', handleSortHeaderClick);
    });
}

function handleSortHeaderClick() {
    const column = this.dataset.column;
    if (!column) {
        console.error("Sortable header clicked, but data-column attribute is missing.", this);
        return;
    }
    console.log("SORT HEADER CLICKED. Column:", column);
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    console.log(`  New sort state - Column: ${currentSortColumn}, Direction: ${currentSortDirection}`);
    renderTableFromCache(); // 重新渲染，內部會排序並更新圖示和事件
}

function sortDataArray(dataArray, column, direction) {
    if (!dataArray || dataArray.length === 0) return;
    dataArray.sort((a, b) => {
        let valA, valB;
        if (column.includes('.')) {
            const parts = column.split('.');
            valA = parts.reduce((obj, key) => (obj && typeof obj[key] !== 'undefined' && obj[key] !== null) ? obj[key] : undefined, a);
            valB = parts.reduce((obj, key) => (obj && typeof obj[key] !== 'undefined' && obj[key] !== null) ? obj[key] : undefined, b);
        } else { valA = a[column]; valB = b[column]; }
        if (column === 'lastEditedAt') {
            let dateA = null, dateB = null;
            if (valA && typeof valA.toDate === 'function') dateA = valA.toDate(); else if (valA instanceof Date) dateA = valA;
            if (valB && typeof valB.toDate === 'function') dateB = valB.toDate(); else if (valB instanceof Date) dateB = valB;
            valA = dateA; valB = dateB;
        } else if (typeof valA === 'string' && typeof valB === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
        const aIsNil = (valA === undefined || valA === null || valA === ''); const bIsNil = (valB === undefined || valB === null || valB === '');
        if (aIsNil && bIsNil) return 0; if (aIsNil) return direction === 'asc' ? 1 : -1; if (bIsNil) return direction === 'asc' ? -1 : 1;
        if (valA < valB) return direction === 'asc' ? -1 : 1; if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}
function sortCachedData(column, direction) {
    sortDataArray(tableDataCache, column, direction);
}

function updateSortIcons() {
    if (typeof document === 'undefined') return;
    const localTable = document.querySelector('#storeListContainer table');
    if (!localTable) return;
    const headers = localTable.querySelectorAll('thead th[data-sortable]');
    headers.forEach(header => {
        const column = header.dataset.column;
        const iconSpan = header.querySelector('.sort-icon');
        if (!iconSpan) return;
        header.classList.remove('sort-asc', 'sort-desc');
        iconSpan.classList.remove('bi-arrow-up', 'bi-arrow-down');
        iconSpan.classList.add('bi-arrow-down-up');
        if (currentSortColumn === column) {
            if (currentSortDirection === 'asc') {
                header.classList.add('sort-asc');
                iconSpan.classList.remove('bi-arrow-down-up'); iconSpan.classList.add('bi-arrow-up');
            } else {
                header.classList.add('sort-desc');
                iconSpan.classList.remove('bi-arrow-down-up'); iconSpan.classList.add('bi-arrow-down');
            }
        }
    });
}

// -----------------------------------------------------------------------------
// 事件監聽與初始化
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    console.log("admin-script.js: DOMContentLoaded event fired.");

    // 在這裡立即獲取需要在 auth.onAuthStateChanged 之前或獨立於其使用的 DOM 元素
    storesTableBody = document.getElementById('storesTableBody');
    loadingIndicator = document.getElementById('loadingIndicator');
    noStoresMessage = document.getElementById('noStoresMessage');
    authMessageDiv = document.getElementById('authMessage');
    storeListContainer = document.getElementById('storeListContainer');
    logoutButton = document.getElementById('logoutButton');
    itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    paginationUl = document.getElementById('paginationUl');
    console.log("admin-script.js: DOM elements references obtained in DOMContentLoaded.");
    // console.log("  storesTableBody exists:", !!storesTableBody);
    // console.log("  itemsPerPageSelect exists:", !!itemsPerPageSelect);

    // Firebase 實例檢查
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("admin-script.js (DOMContentLoaded): Firebase 'auth' or 'db' instance is NOT available from HTML. Halting further execution.");
        if (authMessageDiv) { authMessageDiv.textContent = "Firebase 核心服務初始化失敗，頁面無法運作。"; authMessageDiv.style.display = 'block'; }
        if (storeListContainer) storeListContainer.style.display = 'none';
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (itemsPerPageSelect) itemsPerPageSelect.disabled = true;
        if (logoutButton) logoutButton.disabled = true;
        return;
    }
    // console.log("admin-script.js (DOMContentLoaded): Firebase 'auth' and 'db' confirmed available.");

    // SDK 版本和 count 方法檢查 (保留用於診斷)
    if (typeof firebase !== 'undefined' && firebase.SDK_VERSION) {
        // console.log("  Firebase SDK Version at DOMContentLoaded:", firebase.SDK_VERSION);
        if (db && typeof db.collection('stores_taipei').count === 'function') {
            // console.log("  Firestore 'count' method IS available on 'db' instance.");
        } else {
            console.error("  Firestore 'count' method IS NOT available or 'db' instance is not fully ready. Check SDK & cache.");
        }
    } else { console.error("  Firebase global object or SDK_VERSION is not available at DOMContentLoaded."); }

    initializeSortableHeaders();
    // console.log("admin-script.js: Sortable headers initialized after DOMContentLoaded.");

    // console.log("admin-script.js: Setting up onAuthStateChanged listener after DOMContentLoaded...");
    auth.onAuthStateChanged(async (user) => {
        // console.log("admin-script.js: onAuthStateChanged triggered. User:", user ? user.email : 'No user');
        if (user) {
            // console.log("  User is logged in:", user.email);
            if (authMessageDiv) authMessageDiv.style.display = 'none';
            if (storeListContainer) storeListContainer.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'block';
            if (itemsPerPageSelect) itemsPerPageSelect.disabled = false;
            if (paginationUl && paginationUl.parentElement) paginationUl.parentElement.parentElement.style.display = 'flex'; // 顯示分頁容器


            if (itemsPerPageSelect) itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
            else itemsPerPage = 10;
            // console.log("  Initial itemsPerPage in onAuthStateChanged:", itemsPerPage);

            // console.log("  Calling fetchTotalStoresCount from onAuthStateChanged...");
            totalStores = await fetchTotalStoresCount();
            // console.log("  GLOBAL totalStores after fetch in onAuthStateChanged:", totalStores);

            if (totalStores > 0 && itemsPerPage > 0) {
                totalPages = Math.ceil(totalStores / itemsPerPage);
            } else { totalPages = 0; }
            // console.log("  Initial totalPages in onAuthStateChanged:", totalPages);

            currentPage = 1;
            lastFetchedDoc = null;
            pageCursors = {};
            currentSortColumn = null;
            currentSortDirection = 'asc';
            // console.log("  Calling fetchStoresForPage(1) from onAuthStateChanged...");
            fetchStoresForPage(currentPage);

        } else {
            console.log("  User is not logged in. Redirecting to login.html");
            if(authMessageDiv) { authMessageDiv.textContent = "您需要登入。"; authMessageDiv.style.display = 'block';}
            if(storeListContainer) storeListContainer.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
            if (itemsPerPageSelect) itemsPerPageSelect.disabled = true;
            if (paginationUl && paginationUl.parentElement) paginationUl.parentElement.parentElement.style.display = 'none';
            window.location.href = 'login.html';
        }
    });

    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', async (event) => {
            itemsPerPage = parseInt(event.target.value, 10);
            totalStores = await fetchTotalStoresCount();
            if (totalStores > 0 && itemsPerPage > 0) { totalPages = Math.ceil(totalStores / itemsPerPage); }
            else { totalPages = 0; }
            currentPage = 1; lastFetchedDoc = null; pageCursors = {};
            currentSortColumn = null; currentSortDirection = 'asc';
            fetchStoresForPage(currentPage);
        });
    } else {
        console.warn("admin-script.js: itemsPerPageSelect element not found for event listener setup.");
    }

    if (logoutButton && auth) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => { console.log('使用者已登出'); })
            .catch((error) => { console.error('登出失敗:', error);});
        });
    } else {
        console.warn("admin-script.js: logoutButton element not found or auth not ready for event listener setup.");
    }
    // console.log("admin-script.js: DOMContentLoaded setup finished.");
});

// console.log("admin-script.js: Script parsed completely.");