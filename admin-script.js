// admin-script.js
console.log("admin-script.js: Script loaded and starts parsing.");

// 全域變數宣告
let storesTableBody, loadingIndicator, authMessageDiv, storeListContainer, logoutButton;
let searchInput, searchButton, clearSearchButton;
let itemsPerPageSelect, paginationUl, paginationContainer;

// 資料快取與狀態
let allStores = []; // 儲存從 Firebase 獲取的所有店家資料
let filteredStores = []; // 儲存篩選和排序後的店家資料
let currentPage = 1;
let itemsPerPage = 10;

// 排序狀態
let currentSortColumn = 'lastEditedAt';
let currentSortDirection = 'desc';

// ----------------------------------------------------------------------------
// Toast 顯示函數
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
// 主要資料獲取與渲染邏輯
// ----------------------------------------------------------------------------

// 從 Firebase 獲取所有店家資料
async function fetchAllStores() {
    if (typeof db === 'undefined' || !db) {
        showToast("資料庫連線失敗。", "danger", "錯誤");
        return;
    }
    loadingIndicator.style.display = 'block';
    storeListContainer.style.display = 'none';
    paginationContainer.style.display = 'none';
    searchInput.disabled = true;
    searchButton.disabled = true;

    try {
        const snapshot = await db.collection('stores_taipei').get();
        allStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filteredStores = [...allStores]; // 初始時，篩選列表等於完整列表
        
        // 預設排序
        sortData(filteredStores, currentSortColumn, currentSortDirection);

        currentPage = 1;
        renderUI(); // 渲染畫面
        showToast(`成功載入 ${allStores.length} 筆店家資料。`, 'success', '載入完成');

    } catch (error) {
        console.error("讀取所有店家資料失敗:", error);
        showToast("讀取店家資料時發生錯誤。", "danger", "錯誤");
    } finally {
        loadingIndicator.style.display = 'none';
        searchInput.disabled = false;
        searchButton.disabled = false;
    }
}

// 渲染畫面 (表格 + 分頁)
function renderUI() {
    storeListContainer.style.display = filteredStores.length > 0 ? 'block' : 'none';
    paginationContainer.style.display = filteredStores.length > 0 ? 'flex' : 'none';
    
    renderTable();
    renderPagination();
}

// 渲染表格
function renderTable() {
    storesTableBody.innerHTML = '';

    if (filteredStores.length === 0) {
        const tr = storesTableBody.insertRow();
        const td = tr.insertCell(0);
        td.colSpan = 8; // 表格總欄位數
        td.textContent = searchInput.value ? '找不到符合條件的店家。' : '目前沒有店家資料。';
        td.style.textAlign = 'center';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredStores.slice(startIndex, endIndex);

    pageData.forEach(store => {
        const row = storesTableBody.insertRow();
        const lastEditedAtFormatted = store.lastEditedAt?.toDate ? store.lastEditedAt.toDate().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A';
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

// 渲染分頁
function renderPagination() {
    paginationUl.innerHTML = '';
    const totalPages = Math.ceil(filteredStores.length / itemsPerPage);

    if (totalPages <= 1) return;

    // 上一頁按鈕
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">上一頁</a>`;
    paginationUl.appendChild(prevLi);

    // 頁碼按鈕
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


// ----------------------------------------------------------------------------
// 搜尋、排序與過濾
// ----------------------------------------------------------------------------

// 執行搜尋
function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm) {
        filteredStores = allStores.filter(store => {
            const name = store.name?.toLowerCase() || '';
            const district = store.district?.toLowerCase() || '';
            const category = store.category?.toLowerCase() || '';
            const address = store.address?.toLowerCase() || '';
            return name.includes(searchTerm) || district.includes(searchTerm) || category.includes(searchTerm) || address.includes(searchTerm);
        });
        clearSearchButton.style.display = 'inline-block';
    } else {
        filteredStores = [...allStores]; // 重置為完整列表
        clearSearchButton.style.display = 'none';
    }
    
    // 排序並渲染
    sortData(filteredStores, currentSortColumn, currentSortDirection);
    currentPage = 1;
    renderUI();
}

// 清除搜尋
function clearSearch() {
    searchInput.value = '';
    performSearch();
}

// 排序資料
function sortData(dataArray, column, direction) {
    dataArray.sort((a, b) => {
        // Helper to get nested property
        const getNestedValue = (obj, path) => path.split('.').reduce((o, k) => (o || {})[k], obj);

        let valA = getNestedValue(a, column);
        let valB = getNestedValue(b, column);

        // Handle timestamp objects
        if (valA?.toDate) valA = valA.toDate();
        if (valB?.toDate) valB = valB.toDate();

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// 更新排序圖示
function updateSortIcons() {
    document.querySelectorAll('th[data-sortable]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const icon = th.querySelector('.sort-icon');
        icon.className = 'sort-icon bi bi-arrow-down-up';

        if (th.dataset.column === currentSortColumn) {
            th.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            icon.className = `sort-icon bi ${currentSortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'}`;
        }
    });
}


// ----------------------------------------------------------------------------
// 事件處理與初始化
// ----------------------------------------------------------------------------

// DOM載入完成後執行
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

    // *** 修正：初始時禁用搜尋框
    searchInput.disabled = true;
    searchButton.disabled = true;

    // 檢查 Firebase 是否初始化
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("Firebase 'auth' or 'db' instance is NOT available. Halting.");
        authMessageDiv.textContent = "Firebase 核心服務初始化失敗。";
        authMessageDiv.style.display = 'block';
        return;
    }

    // 監聽認證狀態
    auth.onAuthStateChanged(user => {
        if (user) {
            authMessageDiv.style.display = 'none';
            logoutButton.style.display = 'block';
            fetchAllStores(); // 登入後載入所有資料
        } else {
            authMessageDiv.textContent = "您需要登入才能查看此頁面。";
            authMessageDiv.style.display = 'block';
            storeListContainer.style.display = 'none';
            paginationContainer.style.display = 'none';
            logoutButton.style.display = 'none';
            // 可選：自動跳轉到登入頁
            if (!window.location.pathname.includes('login.html')) {
                 window.location.href = 'login.html';
            }
        }
    });

    // 綁定事件監聽器
    // 登出
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => showToast("您已成功登出。", "info"));
    });

    // 搜尋
    searchButton.addEventListener('click', performSearch);
    clearSearchButton.addEventListener('click', clearSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch();
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
                        fetchAllStores(); // 重新載入資料
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
            if (page !== currentPage && page > 0 && page <= Math.ceil(filteredStores.length / itemsPerPage)) {
                currentPage = page;
                renderUI();
            }
        }
    });

    // 每頁顯示數量變更
    itemsPerPageSelect.addEventListener('change', (event) => {
        itemsPerPage = parseInt(event.target.value, 10);
        currentPage = 1;
        renderUI();
    });

    // 排序表頭點擊
    document.querySelectorAll('th[data-sortable]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (currentSortColumn === column) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortDirection = 'asc';
            }
            sortData(filteredStores, currentSortColumn, currentSortDirection);
            currentPage = 1;
            renderUI();
            updateSortIcons();
        });
    });
    
    updateSortIcons(); // 初始設定排序圖示
});