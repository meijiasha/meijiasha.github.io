// admin-script.js

// DOM 元素引用
const storesTableBody = document.getElementById('storesTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');
const noStoresMessage = document.getElementById('noStoresMessage');
const authMessageDiv = document.getElementById('authMessage');
const storeListContainer = document.getElementById('storeListContainer');
const logoutButton = document.getElementById('logoutButton');
const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
const paginationUl = document.getElementById('paginationUl');

// 分頁狀態變數
let currentPage = 1;
let itemsPerPage = 10; // 初始值
let lastFetchedDoc = null; // 用於 'next' 頁的 startAfter (上一批的最後一個)
let firstFetchedDoc = null; // 用於 'prev' 頁的 endBefore (上一批的第一個) - Firestore endBefore 較複雜，先不用
let pageCursors = {}; // 儲存每一 "概念頁" 開始查詢所需的 cursor, pageCursors[N] 是獲取第 N+1 頁時的 startAfter cursor

// 檢查 Firebase 初始化
if (typeof auth === 'undefined' || typeof db === 'undefined' || !auth || !db) {
    console.error("admin-script.js: Firebase 'auth' or 'db' instance is not available.");
    if (authMessageDiv) {
        authMessageDiv.textContent = "Firebase 初始化失敗，無法載入頁面。";
        authMessageDiv.style.display = 'block';
    }
    if (storeListContainer) storeListContainer.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
} else {
    console.log("admin-script.js: 'auth' and 'db' instances are available.");
}

// -----------------------------------------------------------------------------
// 輔助函數定義
// -----------------------------------------------------------------------------
function handleEditStore(storeId) {
    console.log(`準備編輯店家 ID: ${storeId}`);
    window.location.href = `edit-store.html?id=${storeId}`;
}

function addEventListenersToEditButtons() {
    if (!storesTableBody) return;
    const editButtons = storesTableBody.querySelectorAll('.edit-store-btn');
    editButtons.forEach(button => {
        button.removeEventListener('click', handleEditButtonClick);
        button.addEventListener('click', handleEditButtonClick);
    });
}
function handleEditButtonClick() {
    const storeId = this.dataset.id;
    handleEditStore(storeId);
}

async function handleDeleteStore(storeId, storeName) {
    if (!db) { alert("資料庫未連接，無法刪除。"); return; }
    if (confirm(`您確定要刪除店家 "${storeName}" 嗎？此操作無法復原。`)) {
        try {
            await db.collection('stores_taipei').doc(storeId).delete();
            alert(`店家 "${storeName}" 已成功刪除。`);
            // 刪除後，重置到第一頁
            currentPage = 1;
            lastFetchedDoc = null;
            firstFetchedDoc = null;
            pageCursors = {};
            fetchStores('next'); // 從第一頁開始載入
        } catch (error) {
            console.error("刪除店家失敗:", error);
            alert(`刪除店家 "${storeName}" 失敗: ${error.message}`);
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
function handleDeleteButtonClick() {
    const storeId = this.dataset.id;
    const storeName = this.dataset.name;
    handleDeleteStore(storeId, storeName);
}

// -----------------------------------------------------------------------------
// 主要資料獲取與顯示函數 (重命名並重構)
// -----------------------------------------------------------------------------
async function fetchStores(direction = 'next') {
    if (!db) {
        console.error("Firestore 'db' is not initialized.");
        if (noStoresMessage) { noStoresMessage.textContent = "資料庫連接失敗。"; noStoresMessage.style.display = 'table-row'; }
        return;
    }

    console.log(`fetchStores - currentPage: ${currentPage}, direction: ${direction}, itemsPerPage: ${itemsPerPage}`);
    console.log("  - Before query - lastFetchedDoc for 'next':", lastFetchedDoc ? lastFetchedDoc.id : null);
    console.log("  - Before query - pageCursors for 'prev':", JSON.stringify(pageCursors));

    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (noStoresMessage) noStoresMessage.style.display = 'none';
    if (storesTableBody) storesTableBody.innerHTML = '';
    if (paginationUl) paginationUl.innerHTML = '';

    try {
        let query = db.collection('stores_taipei')
                      //.orderBy('lastEditedAt', 'desc'); // **必須有排序才能用 cursor**

        if (direction === 'next') {
            if (lastFetchedDoc) { // 如果 lastFetchedDoc 存在，表示不是第一頁
                console.log("  Querying NEXT page, starting AFTER:", lastFetchedDoc.id);
                query = query.startAfter(lastFetchedDoc);
            } else {
                console.log("  Querying NEXT page (or first page), no startAfter cursor.");
                // lastFetchedDoc 為 null，從頭開始
            }
        } else if (direction === 'prev') {
            // "上一頁" 的 cursor 邏輯：我們需要跳到 "目標上一頁" 的開頭
            // pageCursors[N] 存儲的是獲取第 N+1 頁時的 startAfter cursor (即第 N 頁的最後一個文檔)
            // 所以，要獲取第 C 頁 (currentPage 已經是 C)，
            // 如果 C > 1, 我們需要 pageCursors[C-1] 作為 startAfter
            // 如果 C = 1, 我們不需要 startAfter (即 pageCursors[0] 是 undefined)
            const cursorForPreviousPageStart = pageCursors[currentPage - 1]; // currentPage此時已是目標頁
            if (cursorForPreviousPageStart) {
                console.log(`  Querying PREV page (target page ${currentPage}), starting AFTER cursor for page ${currentPage -1}:`, cursorForPreviousPageStart.id);
                query = query.startAfter(cursorForPreviousPageStart);
            } else if (currentPage === 1){
                console.log("  Querying PREV page, targeting first page. No startAfter cursor.");
                // 不需要 startAfter，因為這是第一頁
            } else {
                console.warn("  Querying PREV page, but no cursor found in pageCursors for page " + (currentPage -1) + ". This shouldn't happen if page navigation is correct. Will fetch from start.");
                currentPage = 1; // 出錯則重置到第一頁
                // lastFetchedDoc 應該為 null 以從頭開始
            }
        }

        query = query.limit(itemsPerPage); // 應用每頁筆數限制
        console.log("  Final query itemsPerPage:", itemsPerPage);

        const documentSnapshots = await query.get();
        console.log(`  Firestore query returned ${documentSnapshots.docs.length} documents.`);

        if (documentSnapshots.empty) {
            console.log('  No documents found for this page or query.');
            if (noStoresMessage) {
                noStoresMessage.textContent = (currentPage === 1 && direction === 'next' && !lastFetchedDoc) ? "目前沒有店家資料。" : "沒有更多店家了。";
                noStoresMessage.style.display = 'table-row';
            }
            renderPaginationUI(true); // 如果空，則認為是最後一頁 (或沒有資料)

            if (currentPage === 1 && direction === 'next') {
                lastFetchedDoc = null; // 重置
                pageCursors = {};    // 清空
            }
            // 如果不是第一頁的 'next' 返回空，lastFetchedDoc 保持為前一頁的最後一個
            // 以便 "上一頁" 按鈕仍然可以工作。
            if(loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        // 更新 cursors 和 pageNavigation
        // firstFetchedDoc = documentSnapshots.docs[0]; // 當前獲取批次的第一個
        const currentBatchLastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1]; // 當前獲取批次的最後一個

        if (direction === 'next') {
            lastFetchedDoc = currentBatchLastDoc; // 這個將用於下一次 "下一頁" 的 startAfter
            pageCursors[currentPage] = lastFetchedDoc; // pageCursors[C] 存的是第 C 頁的最後一個文檔
            console.log(`  NEXT: Updated lastFetchedDoc to ${lastFetchedDoc.id} for page ${currentPage}`);
        } else if (direction === 'prev') {
            // 當我們 "上一頁" 到第 C 頁時，lastFetchedDoc 應該是第 C 頁的最後一個文檔
            // 以便如果用戶再點 "下一頁"，能正確獲取第 C+1 頁
            lastFetchedDoc = currentBatchLastDoc;
            // pageCursors[currentPage] 應該已經被設定過了 (在之前 "下一頁" 到達此頁時)
            // 如果是直接跳轉到某個 "上一頁"，並且之前沒有正向訪問過，pageCursors[currentPage] 可能為空
            // 但我們的 "上一頁" 邏輯是基於 pageCursors[currentPage-1] 的，所以這裡主要是更新 lastFetchedDoc
            console.log(`  PREV: Fetched page ${currentPage}. Updated lastFetchedDoc to ${currentBatchLastDoc.id}`);
        }


        documentSnapshots.forEach(doc => {
            const store = doc.data();
            const storeId = doc.id;
            const row = storesTableBody.insertRow();
            // ... (填充表格 row.innerHTML 的邏輯，包含編輯者和時間格式化) ...
            let lastEditedAtFormatted = 'N/A';
            if (store.lastEditedAt && store.lastEditedAt.toDate) {
                try {
                    lastEditedAtFormatted = store.lastEditedAt.toDate().toLocaleString('zh-TW', { /* ... format options ... */ });
                } catch (e) { lastEditedAtFormatted = '日期錯誤'; }
            }
            let editorDisplay = 'N/A';
            if (store.lastEditedBy && store.lastEditedBy.email) {
                editorDisplay = store.lastEditedBy.email;
            } else if (store.createdBy && store.createdBy.email) {
                editorDisplay = `${store.createdBy.email} (創建)`;
            }
            row.innerHTML = `<td>${store.name || 'N/A'}</td><td>${store.district || 'N/A'}</td><td>${store.category || 'N/A'}</td><td>${store.address || 'N/A'}</td><td>${store.price || 'N/A'}</td><td>${editorDisplay}</td><td>${lastEditedAtFormatted}</td><td><button class="btn btn-sm btn-primary edit-store-btn" data-id="${storeId}">編輯</button><button class="btn btn-sm btn-danger delete-store-btn ms-1" data-id="${storeId}" data-name="${store.name || '該店家'}">刪除</button></td>`;
        });

        addEventListenersToEditButtons();
        addEventListenersToDeleteButtons();
        renderPaginationUI(documentSnapshots.docs.length < itemsPerPage);

    } catch (error) {
        console.error("讀取店家資料失敗:", error);
        if (noStoresMessage) { noStoresMessage.textContent = "讀取店家資料時發生錯誤，請檢查主控台。"; noStoresMessage.style.display = 'table-row'; }
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// -----------------------------------------------------------------------------
// 分頁控制項產生函數 (重命名)
// -----------------------------------------------------------------------------
function renderPaginationUI(isEffectivelyLastPage) {
    if (!paginationUl) return;
    paginationUl.innerHTML = '';
    console.log(`renderPaginationUI - currentPage: ${currentPage}, isEffectivelyLastPage: ${isEffectivelyLastPage}`);

    // 上一頁按鈕
    const prevLi = document.createElement('li');
    prevLi.classList.add('page-item');
    if (currentPage === 1) {
        prevLi.classList.add('disabled');
    }
    const prevLink = document.createElement('a');
    prevLink.classList.add('page-link');
    prevLink.href = '#';
    prevLink.textContent = '上一頁';
    prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            // "上一頁" 時，我們不需要立即設定 lastFetchedDoc，
            // fetchStores 會根據 pageCursors[currentPage-1] (即目標頁的前一頁的最後一個文檔) 來 startAfter
            fetchStores('prev');
        }
    });
    prevLi.appendChild(prevLink);
    paginationUl.appendChild(prevLi);

    // 目前頁碼顯示
    const currentLi = document.createElement('li');
    currentLi.classList.add('page-item', 'active');
    const currentLink = document.createElement('span');
    currentLink.classList.add('page-link');
    currentLink.textContent = currentPage;
    currentLi.appendChild(currentLink);
    paginationUl.appendChild(currentLi);

    // 下一頁按鈕
    const nextLi = document.createElement('li');
    nextLi.classList.add('page-item');
    if (isEffectivelyLastPage) {
        nextLi.classList.add('disabled');
    }
    const nextLink = document.createElement('a');
    nextLink.classList.add('page-link');
    nextLink.href = '#';
    nextLink.textContent = '下一頁';
    nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isEffectivelyLastPage) {
            currentPage++;
            // lastFetchedDoc 應該已經是 "當前顯示頁" 的最後一個文檔 (在 fetchStores 中設定)
            // 所以 fetchStores('next') 會自動使用它
            fetchStores('next');
        }
    });
    nextLi.appendChild(nextLink);
    paginationUl.appendChild(nextLi);
}


// -----------------------------------------------------------------------------
// 事件監聽與初始化
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("admin-script.js (DOMContentLoaded): Firebase 'auth' or 'db' instance is not available.");
        // ... (錯誤處理)
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("後台：使用者已登入:", user.email);
            if (authMessageDiv) authMessageDiv.style.display = 'none';
            if (storeListContainer) storeListContainer.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'block';

            if (itemsPerPageSelect) {
                itemsPerPage = parseInt(itemsPerPageSelect.value, 10); // 從 UI 獲取初始值
                console.log("Initial itemsPerPage from select:", itemsPerPage);
            } else {
                itemsPerPage = 10; // 預設值
                console.log("itemsPerPageSelect not found, using default:", itemsPerPage);
            }
            currentPage = 1;
            lastFetchedDoc = null; // **非常重要：初始載入時，上一批的最後文檔為 null**
            // firstFetchedDoc = null; // 這個變數的用途在簡化後不明顯，可以先不用
            pageCursors = {};     // **清空頁面 cursor 緩存**
            fetchStores('next'); // 初始載入，方向為 'next' (獲取第一頁)
        } else {
            console.log("後台：使用者未登入，將導向登入頁。");
            // ... (未登入處理，導向 login.html)
            window.location.href = 'login.html';
        }
    });

    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (event) => {
            const newItemsPerPage = parseInt(event.target.value, 10);
            console.log("itemsPerPage changed to:", newItemsPerPage);
            if (itemsPerPage !== newItemsPerPage) {
                itemsPerPage = newItemsPerPage;
                currentPage = 1;        // 重設到第一頁
                lastFetchedDoc = null;  // **清除 cursor**
                // firstFetchedDoc = null;
                pageCursors = {};       // **清空頁面 cursor 緩存**
                fetchStores('next');    // 從第一頁開始重新載入
            }
        });
    }

    if (logoutButton && auth) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('使用者已登出');
            }).catch((error) => {
                console.error('登出失敗:', error);
                alert('登出時發生錯誤: ' + error.message);
            });
        });
    }
});