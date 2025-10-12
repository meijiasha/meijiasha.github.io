// admin-script.js (Refactored for Server-Side Search)
console.log("admin-script.js: Script loaded and starts parsing.");

// DOM 元素引用
let storesTableBody, loadingIndicator, authMessageDiv, storeListContainer, logoutButton;
let searchInput, searchButton, clearSearchButton;
let itemsPerPageSelect, paginationUl, paginationContainer;
let totalStoresCountSpan; // 新增：店家總數顯示元素

// 狀態管理
let currentPage = 1;
let itemsPerPage = 10;
let currentSearchQuery = '';
let totalStores = 0;
let currentSortBy = 'name'; // Default sort column
let currentSortOrder = 'asc'; // Default sort order

// Firebase Services
let callSearchStores;

// ----------------------------------------------------------------------------
// Toast 顯示函數 (從舊版保留)
// ----------------------------------------------------------------------------
function showToast(message, type = 'info', title = '通知', delay = 5000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error("Toast container not found!");
        alert(`${title}: ${message}`);
        return;
    }
    const toastId = 'toast-' + new Date().getTime();
    const toastBgClass = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }[type] || 'bg-primary';
    const iconClass = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-info-circle-fill';
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}">
            <div class="toast-header text-white ${toastBgClass}">
                <i class="bi ${iconClass} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small class="text-white-50">剛剛</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: delay > 0 ? delay : undefined, autohide: delay > 0 });
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    toast.show();
}

// ----------------------------------------------------------------------------
// 主要資料獲取與渲染邏輯 (重構後)
// ----------------------------------------------------------------------------

// 統一的資料獲取函式
async function fetchStores(query = '', page = 1, sortBy = currentSortBy, sortOrder = currentSortOrder) {
    if (!callSearchStores) {
        showToast("後端服務連接失敗。", "danger", "錯誤");
        return;
    }

    loadingIndicator.style.display = 'block';
    storeListContainer.style.display = 'none';
    paginationContainer.style.display = 'none';
    searchInput.disabled = true;
    searchButton.disabled = true;

    currentSearchQuery = query;
    currentPage = page;
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;

    try {
        const result = await callSearchStores({ 
            query: currentSearchQuery, 
            page: currentPage, 
            perPage: itemsPerPage,
            sortBy: currentSortBy,
            sortOrder: currentSortOrder
        });

        const { stores, total } = result.data;
        totalStores = total;
        if (totalStoresCountSpan) {
            totalStoresCountSpan.textContent = `${totalStores} 筆`;
        }

        renderTable(stores);
        renderPagination();
        updateSortIcons();

        storeListContainer.style.display = 'block';
        if (total > 0) {
            paginationContainer.style.display = 'flex';
        }

    } catch (error) {
        console.error("搜尋店家時發生錯誤:", error);
        showToast(`讀取資料時發生錯誤: ${error.message}`, "danger", "錯誤");
        storesTableBody.innerHTML = '';
        const tr = storesTableBody.insertRow();
        const td = tr.insertCell(0);
        td.colSpan = 8;
        td.textContent = '讀取資料失敗，請檢查後端函式是否正確部署或查看 Console 錯誤。'
        td.className = 'text-center text-danger';
        storeListContainer.style.display = 'block';

    } finally {
        loadingIndicator.style.display = 'none';
        searchInput.disabled = false;
        searchButton.disabled = false;
    }
}

// 渲染表格 (現在接收 stores 參數)
function renderTable(stores) {
    storesTableBody.innerHTML = '';

    if (stores.length === 0) {
        const tr = storesTableBody.insertRow();
        const td = tr.insertCell(0);
        td.colSpan = 8; // 表格總欄位數
        td.textContent = searchInput.value ? '找不到符合條件的店家。' : '目前沒有店家資料。';
        td.className = 'text-center';
        return;
    }

    stores.forEach(store => {
        const row = storesTableBody.insertRow();
        // Firestore timestamp might be a string after going through Cloud Function, or an object
        let lastEditedAtFormatted = 'N/A';
        if (store.lastEditedAt) {
            const date = store.lastEditedAt._seconds ? new Date(store.lastEditedAt._seconds * 1000) : new Date(store.lastEditedAt);
            lastEditedAtFormatted = date.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
        }
        
        const editorDisplay = store.lastEditedBy?.email || (store.createdBy?.email ? `${store.createdBy.email} (創建)` : 'N/A');

        row.innerHTML = `
            <td class="col-name">${store.name || 'N/A'}</td>
            <td>${store.district || 'N/A'}</td>
            <td>${store.category || 'N/A'}</td>
            <td class="col-address">${store.address || 'N/A'}</td>
            <td>${store.price || 'N/A'}</td>
            <td class="col-editor">${editorDisplay}</td>
            <td class="col-time">${lastEditedAtFormatted}</td>
            <td class="col-actions">
                <button class="btn btn-sm btn-primary edit-store-btn" data-id="${store.id}">編輯</button>
                <button class="btn btn-sm btn-danger delete-store-btn ms-1" data-id="${store.id}" data-name="${store.name || '該店家'}">刪除</button>
            </td>
        `;
    });
}

// 渲染分頁 (現在使用 totalStores)
function renderPagination() {
    paginationUl.innerHTML = '';
    const totalPages = Math.ceil(totalStores / itemsPerPage);

    if (totalPages <= 1) return;

    // 上一頁按鈕
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">上一頁</a>`;
    paginationUl.appendChild(prevLi);

    // 頁碼按鈕 (此處可以加入更複雜的頁碼顯示邏輯，例如 `...`)
    for (let i = 1; i <= totalPages; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        paginationUl.appendChild(pageLi);
    }

    // 下一頁按鈕
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">下一頁</a>`;
    paginationUl.appendChild(nextLi);
}

// 更新排序圖示
function updateSortIcons() {
    document.querySelectorAll('th[data-sortable]').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        const icon = header.querySelector('.sort-icon');
        if (icon) {
            icon.className = 'sort-icon bi bi-arrow-down-up'; // Reset to default
        }

        if (header.dataset.column === currentSortBy) {
            header.classList.add(`sort-${currentSortOrder}`);
            if (icon) {
                icon.className = `sort-icon bi bi-arrow-${currentSortOrder === 'asc' ? 'up' : 'down'}`;
            }
        }
    });
}

// ----------------------------------------------------------------------------
// 事件處理與初始化 (重構後)
// ----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 獲取 DOM 元素
    storesTableBody = document.getElementById('storesTableBody');
    loadingIndicator = document.getElementById('loadingIndicator');
    authMessageDiv = document.getElementById('authMessage');
    storeListContainer = document.getElementById('storeListContainer');
    logoutButton = document.getElementById('logoutButton');
    itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    paginationUl = document.getElementById('paginationUl');
    paginationContainer = document.getElementById('paginationContainer');
    searchInput = document.getElementById('searchInput');
    searchButton = document.getElementById('searchButton');
    clearSearchButton = document.getElementById('clearSearchButton');
    totalStoresCountSpan = document.getElementById('totalStoresCount'); // 初始化店家總數顯示元素

    // 檢查 Firebase 是否初始化
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db || typeof firebase.functions === 'undefined') {
        console.error("Firebase services are NOT available. Halting.");
        authMessageDiv.textContent = "Firebase 核心服務初始化失敗。";
        authMessageDiv.style.display = 'block';
        return;
    }

    // Initialize Firebase Functions explicitly from the app instance and specify the region
    const functions = firebase.app().functions('us-central1');
    // 如果您在非 asia-east1 區域部署，請更改這裡
    // functions.useFunctionsEmulator('http://localhost:5001'); // 開發時使用模擬器
    callSearchStores = functions.httpsCallable('searchStores');

    // 監聽認證狀態
    auth.onAuthStateChanged(user => {
        if (user) {
            authMessageDiv.style.display = 'none';
            logoutButton.style.display = 'block';
            fetchStores(); // 登入後載入第一頁資料
        } else {
            authMessageDiv.textContent = "您需要登入才能查看此頁面。";
            authMessageDiv.style.display = 'block';
            storeListContainer.style.display = 'none';
            paginationContainer.style.display = 'none';
            logoutButton.style.display = 'none';
            if (!window.location.pathname.includes('login.html')) {
                 window.location.href = 'login.html';
            }
        }
    });

    // 綁定事件監聽器
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => showToast("您已成功登出。", "info"));
    });

    // 搜尋
    searchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        fetchStores(searchTerm, 1);
        clearSearchButton.style.display = searchTerm ? 'inline-block' : 'none';
    });
    clearSearchButton.addEventListener('click', () => {
        searchInput.value = '';
        fetchStores('', 1);
        clearSearchButton.style.display = 'none';
    });
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            searchButton.click();
        }
    });

    // 表格點擊事件 (編輯/刪除)
    storesTableBody.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-store-btn')) {
            window.location.href = `edit-store.html?id=${target.dataset.id}`;
        }
        if (target.classList.contains('delete-store-btn')) {
            if (confirm(`您確定要刪除店家 "${target.dataset.name}" 嗎？此操作無法復原。`)) {
                db.collection('stores_taipei').doc(target.dataset.id).delete()
                    .then(() => {
                        showToast(`店家 "${target.dataset.name}" 已成功刪除。`, "success");
                        fetchStores(currentSearchQuery, currentPage); // 重新載入當前頁
                    })
                    .catch(error => {
                        console.error("刪除店家失敗:", error);
                        showToast(`刪除店家失敗: ${error.message}`, "danger");
                    });
            }
        }
    });

    // 分頁點擊
    paginationUl.addEventListener('click', (event) => {
        event.preventDefault();
        const target = event.target;
        if (target.tagName === 'A' && target.dataset.page) {
            const page = parseInt(target.dataset.page, 10);
            if (page !== currentPage && page > 0) { // 移除上限檢查，讓後端處理
                fetchStores(currentSearchQuery, page);
            }
        }
    });

    // 每頁顯示數量變更
    itemsPerPageSelect.addEventListener('change', (event) => {
        itemsPerPage = parseInt(event.target.value, 10);
        fetchStores(currentSearchQuery, 1); // 回到第一頁
    });

    // 排序功能
    document.querySelectorAll('th[data-sortable]').forEach(header => {
        header.style.cursor = 'pointer'; // 恢復可點擊游標
        header.title = '點擊排序';
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (column) {
                if (currentSortBy === column) {
                    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSortBy = column;
                    currentSortOrder = 'asc'; // Default to asc when changing column
                }
                fetchStores(currentSearchQuery, 1, currentSortBy, currentSortOrder); // 回到第一頁並應用排序
            }
        });
    });

    // 初始載入後更新排序圖示
    updateSortIcons();
});

