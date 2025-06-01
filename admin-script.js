// admin-script.js

// DOM 元素引用
const storesTableBody = document.getElementById('storesTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');
const noStoresMessage = document.getElementById('noStoresMessage');
const authMessageDiv = document.getElementById('authMessage');
const storeListContainer = document.getElementById('storeListContainer'); // 表格容器

// 檢查 Firebase 是否已在 HTML 中成功初始化
if (typeof auth === 'undefined' || typeof db === 'undefined' || !auth || !db) {
    console.error("admin-script.js: Firebase 'auth' or 'db' instance is not available from HTML.");
    if (authMessageDiv) authMessageDiv.textContent = "Firebase 初始化失敗，無法載入頁面。請檢查主控台。";
    if (authMessageDiv) authMessageDiv.style.display = 'block';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    // 停止後續執行，因為 Firebase 未就緒
    // throw new Error("Firebase not initialized in HTML."); // 或者更柔和地處理
} else {
    console.log("admin-script.js: 'auth' and 'db' instances are available.");
}


// 函數：讀取並顯示店家列表
async function fetchAndDisplayStores() {
    if (!db) {
        console.error("Firestore 'db' is not initialized or available.");
        noStoresMessage.textContent = "資料庫連接失敗。";
        noStoresMessage.style.display = 'table-row'; // 以表格行方式顯示
        return;
    }

    loadingIndicator.style.display = 'block';
    noStoresMessage.style.display = 'none';
    storesTableBody.innerHTML = ''; // 清空現有列表

    try {
        const snapshot = await db.collection('stores_taipei').orderBy('name', 'asc').get(); // 按名稱升序排序

        if (snapshot.empty) {
            console.log('Firestore 中沒有找到店家資料。');
            noStoresMessage.textContent = "目前沒有店家資料。";
            noStoresMessage.style.display = 'table-row';
            loadingIndicator.style.display = 'none';
            return;
        }

        snapshot.forEach(doc => {
            const store = doc.data();
            const storeId = doc.id; // 獲取文件 ID

            const row = storesTableBody.insertRow();
            row.innerHTML = `
                <td>${store.name || 'N/A'}</td>
                <td>${store.district || 'N/A'}</td>
                <td>${store.category || 'N/A'}</td>
                <td>${store.address || 'N/A'}</td>
                <td>${store.price || 'N/A'}</td> <!--//*{ 假設您 Firestore 有 price 欄位 }*/-->
                <td>
                    <button class="btn btn-sm btn-primary edit-store-btn" data-id="${storeId}">編輯</button>
                    <!--/*{ 可以稍後加入刪除按鈕 }*/-->
                    <!--{/*--> <button class="btn btn-sm btn-danger delete-store-btn" data-id="${storeId}" data-name="${store.name || ''}">刪除</button> <!--*/}-->
                </td>
            `;
        });

        // 為所有編輯按鈕加上事件監聽器
        addEventListenersToEditButtons();

    } catch (error) {
        console.error("讀取店家資料失敗:", error);
        noStoresMessage.textContent = "讀取店家資料時發生錯誤，請檢查主控台。";
        noStoresMessage.style.display = 'table-row';
        // alert("讀取店家資料失敗: " + error.message);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// 函數：為編輯按鈕加上事件監聽器
function addEventListenersToEditButtons() {
    const editButtons = document.querySelectorAll('.edit-store-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const storeId = this.dataset.id;
            handleEditStore(storeId);
        });
    });
}

// 函數：處理編輯按鈕點擊 (目前僅 console.log)
function handleEditStore(storeId) {
    console.log(`點擊了編輯按鈕，店家 ID: ${storeId}`);
    alert(`準備編輯店家 ID: ${storeId} (實際編輯功能待實現)`);
    // 之後的步驟：
    // 1. 可以跳轉到一個新的編輯頁面，並將 storeId 作為 URL 參數傳遞。
    // 2. 或者，可以在當前頁面彈出一個模態框 (modal) 並預填該店家的資料。
    // window.location.href = `edit-store.html?id=${storeId}`; // 跳轉範例
}


// 監聽 Firebase Auth 狀態變化
// (確保 auth 實例已定義)
if (auth) {
    auth.onAuthStateChanged(user => {
        if (user) {
            // 使用者已登入
            console.log("後台：使用者已登入:", user.email);
            authMessageDiv.style.display = 'none'; // 隱藏 "需要登入" 訊息
            storeListContainer.style.display = 'block'; // 顯示店家列表容器
            fetchAndDisplayStores(); // 載入並顯示店家資料
        } else {
            // 使用者未登入
            console.log("後台：使用者未登入。");
            authMessageDiv.textContent = "您需要登入才能訪問此後台頁面。"; // 更新訊息
            authMessageDiv.style.display = 'block'; // 顯示 "需要登入" 訊息
            storeListContainer.style.display = 'none'; // 隱藏店家列表容器
            loadingIndicator.style.display = 'none'; // 隱藏載入中
            storesTableBody.innerHTML = ''; // 清空可能存在的舊列表
            noStoresMessage.style.display = 'none';

            // **重要：實際應用中，您應該將使用者導向到登入頁面**
            // 例如: window.location.href = 'login.html';
            // 目前為了簡化，僅顯示訊息。
            alert("請先登入以訪問後台管理頁面。");
            window.location.href = 'login.html';
        }
    });
} else {
    console.error("admin-script.js: Firebase 'auth' instance is not available. Cannot set up auth state listener.");
    if (authMessageDiv) authMessageDiv.textContent = "Firebase 認證服務初始化失敗。";
    if (authMessageDiv) authMessageDiv.style.display = 'block';
    if (storeListContainer) storeListContainer.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// (可選) 登出按鈕邏輯
// const logoutButton = document.getElementById('logoutButton');
// if (logoutButton && auth) {
//     logoutButton.addEventListener('click', () => {
//         auth.signOut().then(() => {
//             console.log('使用者已登出');
//             // window.location.href = 'login.html'; // 導向登入頁
//         }).catch((error) => {
//             console.error('登出失敗:', error);
//         });
//     });
// }

//(可選) 登出按鈕邏輯
const logoutButton = document.getElementById('logoutButton');
if (logoutButton && auth) {
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            console.log('使用者已登出');
            // window.location.href = 'login.html'; // 導向登入頁
        }).catch((error) => {
            console.error('登出失敗:', error);
        });
    });
}