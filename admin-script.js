// admin-script.js
console.log("admin-script.js: Script loaded and starts parsing.");

// 全域變數宣告
let storesTableBody, loadingIndicator, noStoresMessage, authMessageDiv, storeListContainer, logoutButton, itemsPerPageSelect, paginationUl, paginationContainer;

let currentPage = 1;
let itemsPerPage = 10;
let lastFetchedDoc = null;
let pageCursors = {};
let totalStores = 0;
let totalPages = 0;
const USE_ORDER_BY = false;

let currentSortColumn = null;
let currentSortDirection = 'asc';
let tableDataCache = [];

// Firebase 實例 - 由 HTML 初始化並賦值給全域 var db, var auth

// -----------------------------------------------------------------------------
// Toast 顯示函數
// -----------------------------------------------------------------------------
/**
 * 顯示 Bootstrap Toast 通知
 * @param {string} message 要顯示的訊息
 * @param {string} type 'success', 'danger', 'warning', 'info' (對應 Bootstrap 背景色)
 * @param {string} title Toast 標題 (可選)
 * @param {number} delay 自動隱藏的延遲時間 (毫秒)，設為 0 或 false 則不自動隱藏
 */
function showToast(message, type = 'info', title = '通知', delay = 5000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error("Toast container (.toast-container) not found on the page!");
        alert(`${title}: ${message}`); // Fallback
        return;
    }

    const toastId = 'toast-' + new Date().getTime();
    const toastBgClass = {
        success: 'bg-success',
        danger: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    }[type] || 'bg-primary'; // 預設使用 primary 或 info

    const iconClass = {
        success: 'bi-check-circle-fill',
        danger: 'bi-x-octagon-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    }[type] || 'bi-info-circle-fill';

    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}">
            <div class="toast-header text-white ${toastBgClass}">
                <i class="bi ${iconClass} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small class="text-white-50">剛剛</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, {
            delay: delay && delay > 0 ? delay : undefined,
            autohide: delay && delay > 0
        });
        toastElement.addEventListener('hidden.bs.toast', function () {
            toastElement.remove();
        });
        toast.show();
    } else {
        console.error(`Failed to find toast element with id: ${toastId}`);
        alert(`${title}: ${message}`); // Fallback
    }
}


// -----------------------------------------------------------------------------
// 輔助函數定義
// -----------------------------------------------------------------------------
function handleEditStore(storeId) {
    // console.log(`ACTION: Navigating to edit store ID: ${storeId}`);
    if (storeId) {
        window.location.href = `edit-store.html?id=${storeId}`;
    } else {
        console.error("handleEditStore: storeId is undefined or null. Cannot navigate.");
        showToast("無法編輯：店家 ID 缺失。", "danger", "錯誤");
    }
}

function addEventListenersToEditButtons() {
    if (!storesTableBody) return;
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
        showToast("資料庫未連接，無法刪除。", "danger", "錯誤");
        console.error("handleDeleteStore: 'db' instance is not available.");
        return;
    }
    if (confirm(`您確定要刪除店家 "${storeName}" 嗎？此操作無法復原。`)) {
        // console.log(`Attempting to delete store ID: ${storeId}, Name: ${storeName}`);
        try {
            await db.collection('stores_taipei').doc(storeId).delete();
            // console.log(`SUCCESS: Store "${storeName}" (ID: ${storeId}) deleted.`);
            showToast(`店家 "${storeName}" 已成功刪除。`, "success", "刪除成功");

            totalStores = await fetchTotalStoresCount();
            if (totalStores > 0 && itemsPerPage > 0) { totalPages = Math.ceil(totalStores / itemsPerPage); }
            else { totalPages = 0; }

            currentPage = 1; lastFetchedDoc = null; pageCursors = {};
            currentSortColumn = null; currentSortDirection = 'asc';
            fetchStoresForPage(currentPage);
        } catch (error) {
            console.error("刪除店家失敗:", error);
            showToast(`刪除店家 "${storeName}" 失敗: ${error.message}`, "danger", "刪除失敗");
        }
    }
}
function addEventListenersToDeleteButtons() {
    if (!storesTableBody) return;
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
        console.error("fetchTotalStoresCount: Firestore 'db' is not initialized.");
        return 0;
    }
    try {
        const query = db.collection('stores_taipei');
        let count = 0;
        if (typeof query.count === 'function') {
            const snapshot = await query.count().get();
            count = snapshot.data().count;
        } else {
            console.warn("query.count() is not a function in fetchTotalStoresCount. Falling back.");
            const snapshot = await query.select(firebase.firestore.FieldPath.documentId()).get();
            count = snapshot.size;
        }
        // console.log(`Total stores count: ${count}`);
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
    if (typeof db === 'undefined' || !db) { /* ... (錯誤處理) ... */ return; }
    // console.log(`FETCHING STORES - Target: ${targetPage}, Current: ${currentPage}, Items: ${itemsPerPage}, Sort: ${currentSortColumn || 'FirestoreDefault'}-${currentSortDirection}`);
    if(loadingIndicator) loadingIndicator.style.display = 'block';
    if(noStoresMessage) noStoresMessage.style.display = 'none';
    if(storesTableBody) storesTableBody.innerHTML = '';
    if(paginationUl) paginationUl.innerHTML = '';

    try {
        let query = db.collection('stores_taipei');
        if (USE_ORDER_BY) { query = query.orderBy('lastEditedAt', 'desc'); }
        else { query = query.orderBy(firebase.firestore.FieldPath.documentId()); }

        if (targetPage > 1) {
            const cursorDoc = pageCursors[targetPage - 1];
            if (cursorDoc) { query = query.startAfter(cursorDoc); }
            else { currentPage = 1; lastFetchedDoc = null; pageCursors = {}; targetPage = 1; }
        }
        query = query.limit(itemsPerPage);
        const documentSnapshots = await query.get();

        if (documentSnapshots.empty) {
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
        tableDataCache = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTableFromCache();
        renderPaginationUI(documentSnapshots.docs.length < itemsPerPage || currentPage === totalPages);

    } catch (error) {
        console.error("讀取店家資料失敗 (fetchStoresForPage):", error);
        if (noStoresMessage) { noStoresMessage.textContent = "讀取資料時發生錯誤。"; noStoresMessage.style.display = 'table-row'; }
        tableDataCache = []; renderTableFromCache(); renderPaginationUI(true);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function renderTableFromCache() {
    if (!storesTableBody) { return; }
    storesTableBody.innerHTML = '';

    if (tableDataCache.length === 0) {
        if (noStoresMessage) {
            const isFirstEverLoad = (Object.keys(pageCursors).length === 0 && !lastFetchedDoc && currentPage === 1);
            noStoresMessage.textContent = isFirstEverLoad ? "目前沒有店家資料。" : "此頁沒有資料。";
            noStoresMessage.style.display = 'table-row';
        }
        updateSortIcons(); return;
    }
    if (noStoresMessage) noStoresMessage.style.display = 'none';

    let dataToRender = [...tableDataCache];
    if (currentSortColumn) { sortDataArray(dataToRender, currentSortColumn, currentSortDirection); }

    dataToRender.forEach((storeData) => {
        const storeId = storeData.id; const store = storeData; const row = storesTableBody.insertRow();
        let lastEditedAtFormatted = 'N/A'; if (store.lastEditedAt && store.lastEditedAt.toDate) { try { lastEditedAtFormatted = store.lastEditedAt.toDate().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { lastEditedAtFormatted = '日期錯誤'; } }
        let editorDisplay = 'N/A'; if (store.lastEditedBy && store.lastEditedBy.email) { editorDisplay = store.lastEditedBy.email; } else if (store.createdBy && store.createdBy.email) { editorDisplay = `${store.createdBy.email} (創建)`;}
        row.innerHTML = `<td>${store.name || 'N/A'}</td><td>${store.district || 'N/A'}</td><td>${store.category || 'N/A'}</td><td>${store.address || 'N/A'}</td><td>${store.price || 'N/A'}</td><td>${editorDisplay}</td><td>${lastEditedAtFormatted}</td><td><button class="btn btn-sm btn-primary edit-store-btn" data-id="${storeId}">編輯</button><button class="btn btn-sm btn-danger delete-store-btn ms-1" data-id="${storeId}" data-name="${store.name || '該店家'}">刪除</button></td>`;
    });
    addEventListenersToEditButtons();
    addEventListenersToDeleteButtons();
    updateSortIcons();
}

// -----------------------------------------------------------------------------
// 分頁控制項產生函數
// -----------------------------------------------------------------------------
function renderPaginationUI(isEffectivelyLastPage) {
    if (!paginationUl) return;
    paginationUl.innerHTML = '';
    if (totalPages <= 0 ) { return; }
    if (totalPages === 1 && isEffectivelyLastPage && totalStores <= itemsPerPage ) {
        const currentLi = document.createElement('li'); currentLi.classList.add('page-item', 'active');
        const currentLink = document.createElement('span'); currentLink.classList.add('page-link'); currentLink.textContent = currentPage;
        currentLi.appendChild(currentLink); paginationUl.appendChild(currentLi);
        return;
    }
    const prevLi = document.createElement('li'); prevLi.classList.add('page-item'); if (currentPage === 1) prevLi.classList.add('disabled');
    const prevLink = document.createElement('a'); prevLink.classList.add('page-link'); prevLink.href = '#'; prevLink.textContent = '上一頁';
    prevLink.addEventListener('click', (e) => { e.preventDefault(); if (currentPage > 1) fetchStoresForPage(currentPage - 1); });
    prevLi.appendChild(prevLink); paginationUl.appendChild(prevLi);
    const maxPageButtons = 5; let startPage, endPage;
    if (totalPages <= maxPageButtons) { startPage = 1; endPage = totalPages; }
    else { const maxPagesBefore = Math.floor(maxPageButtons / 2); const maxPagesAfter = Math.ceil(maxPageButtons / 2) - 1; if (currentPage <= maxPagesBefore) { startPage = 1; endPage = maxPageButtons; } else if (currentPage + maxPagesAfter >= totalPages) { startPage = totalPages - maxPageButtons + 1; endPage = totalPages; } else { startPage = currentPage - maxPagesBefore; endPage = currentPage + maxPagesAfter; }}
    startPage = Math.max(1, startPage); endPage = Math.min(totalPages, endPage);
    if (startPage > 1) { const first = document.createElement('li'); first.classList.add('page-item'); const fl = document.createElement('a'); fl.classList.add('page-link'); fl.href='#'; fl.textContent='1'; fl.dataset.page=1; fl.addEventListener('click', handlePageLinkClick); first.appendChild(fl); paginationUl.appendChild(first); if (startPage > 2) { const el = document.createElement('li'); el.classList.add('page-item', 'disabled'); el.innerHTML=`<span class="page-link">...</span>`; paginationUl.appendChild(el);}}
    for (let i = startPage; i <= endPage; i++) { if (i > 0 && i <= totalPages) { const pl = document.createElement('li'); pl.classList.add('page-item'); if (i === currentPage) {pl.classList.add('active'); pl.setAttribute('aria-current', 'page');} const l = document.createElement('a'); l.classList.add('page-link'); l.href='#'; l.textContent=i; l.dataset.page=i; l.addEventListener('click', handlePageLinkClick); pl.appendChild(l); paginationUl.appendChild(pl);}}
    if (endPage < totalPages) { if (endPage < totalPages - 1) { const el = document.createElement('li'); el.classList.add('page-item', 'disabled'); el.innerHTML=`<span class="page-link">...</span>`; paginationUl.appendChild(el);} const last = document.createElement('li'); last.classList.add('page-item'); const ll = document.createElement('a'); ll.classList.add('page-link'); ll.href='#'; ll.textContent=totalPages; ll.dataset.page=totalPages; ll.addEventListener('click', handlePageLinkClick); last.appendChild(ll); paginationUl.appendChild(last);}
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
    const localTable = document.querySelector('#storeListContainer table');
    if (!localTable) { return; }
    const headers = localTable.querySelectorAll('thead th[data-sortable]');
    if (headers.length === 0) { return; }
    headers.forEach(header => {
        header.removeEventListener('click', handleSortHeaderClick);
        header.addEventListener('click', handleSortHeaderClick);
    });
}

function handleSortHeaderClick() {
    const column = this.dataset.column;
    if (!column) { return; }
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    renderTableFromCache();
}

function sortDataArray(dataArray, column, direction) { /* ... (與之前版本相同) ... */ }
function sortCachedData(column, direction) { sortDataArray(tableDataCache, column, direction); }
function updateSortIcons() { /* ... (與之前版本相同) ... */ }


// -----------------------------------------------------------------------------
// 事件監聽與初始化
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    console.log("admin-script.js: DOMContentLoaded event fired.");

    storesTableBody = document.getElementById('storesTableBody');
    loadingIndicator = document.getElementById('loadingIndicator');
    noStoresMessage = document.getElementById('noStoresMessage');
    authMessageDiv = document.getElementById('authMessage');
    storeListContainer = document.getElementById('storeListContainer');
    logoutButton = document.getElementById('logoutButton');
    itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    paginationUl = document.getElementById('paginationUl');
    paginationContainer = document.getElementById('paginationContainer');
    console.log("admin-script.js: DOM elements obtained.");

    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("admin-script.js (DOMContentLoaded): Firebase 'auth' or 'db' instance is NOT available. Halting.");
        if (authMessageDiv) { authMessageDiv.textContent = "Firebase 核心服務初始化失敗。"; authMessageDiv.style.display = 'block'; }
        if (storeListContainer) storeListContainer.style.display = 'none';
        // ... (其他UI禁用)
        return;
    }

    // SDK 版本和 count 方法檢查
    if (typeof firebase !== 'undefined' && firebase.SDK_VERSION) {
        if (db && typeof db.collection('stores_taipei').count === 'function') {
             console.log("  Firestore 'count' method IS available on 'db' instance.");
        } else {
            console.error("  Firestore 'count' method IS NOT available or 'db' instance is not fully ready. Check SDK & cache.");
        }
    } else { console.error("  Firebase global object or SDK_VERSION is not available at DOMContentLoaded."); }

    initializeSortableHeaders();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if (authMessageDiv) authMessageDiv.style.display = 'none';
            if (storeListContainer) storeListContainer.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'block';
            if (itemsPerPageSelect) itemsPerPageSelect.disabled = false;
            if (paginationContainer) paginationContainer.style.display = 'flex';

            if (itemsPerPageSelect) itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
            else itemsPerPage = 10;

            totalStores = await fetchTotalStoresCount();
            if (totalStores > 0 && itemsPerPage > 0) { totalPages = Math.ceil(totalStores / itemsPerPage); }
            else { totalPages = 0; }

            currentPage = 1; lastFetchedDoc = null; pageCursors = {};
            currentSortColumn = null; currentSortDirection = 'asc';
            fetchStoresForPage(currentPage);
        } else {
            if(authMessageDiv) { authMessageDiv.textContent = "您需要登入。"; authMessageDiv.style.display = 'block';}
            if(storeListContainer) storeListContainer.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
            if (itemsPerPageSelect) itemsPerPageSelect.disabled = true;
            if (paginationContainer) paginationContainer.style.display = 'none';
            const currentPath = window.location.pathname.toLowerCase();
            if (!currentPath.endsWith('login.html') && !currentPath.endsWith('login.html/')) {
                window.location.href = 'login.html';
            }
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
    }

    if (logoutButton && auth) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => { console.log('使用者已登出'); showToast("您已成功登出。", "info", "登出通知");})
            .catch((error) => { console.error('登出失敗:', error); showToast(`登出失敗: ${error.message}`, "danger", "錯誤");});
        });
    }
    console.log("admin-script.js: DOMContentLoaded setup finished.");
});

console.log("admin-script.js: Script parsed completely.");