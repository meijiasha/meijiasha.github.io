// admin-script.js

// DOM 元素引用
const storesTableBody = document.getElementById('storesTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');
const noStoresMessage = document.getElementById('noStoresMessage');
const authMessageDiv = document.getElementById('authMessage');
const storeListContainer = document.getElementById('storeListContainer');
const logoutButton = document.getElementById('logoutButton');

// 檢查 Firebase 是否已在 HTML 中成功初始化
if (typeof auth === 'undefined' || typeof db === 'undefined' || !auth || !db) {
    console.error("admin-script.js: Firebase 'auth' or 'db' instance is not available from HTML.");
    if (authMessageDiv) authMessageDiv.textContent = "Firebase 初始化失敗，無法載入頁面。請檢查主控台。";
    if (authMessageDiv) authMessageDiv.style.display = 'block';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (storeListContainer) storeListContainer.style.display = 'none';
} else {
    console.log("admin-script.js: 'auth' and 'db' instances are available.");
}

// 函數：讀取並顯示店家列表
async function fetchAndDisplayStores() {
    if (!db) {
        console.error("Firestore 'db' is not initialized or available.");
        if(noStoresMessage) {
            noStoresMessage.textContent = "資料庫連接失敗。";
            noStoresMessage.style.display = 'table-row';
        }
        return;
    }

    if(loadingIndicator) loadingIndicator.style.display = 'block';
    if(noStoresMessage) noStoresMessage.style.display = 'none';
    if(storesTableBody) storesTableBody.innerHTML = '';

    try {
        const snapshot = await db.collection('stores_taipei')
                                 .orderBy('lastEditedAt', 'desc')
                                 .get();

        if (snapshot.empty) {
            console.log('Firestore 中沒有找到店家資料。');
            if(noStoresMessage) {
                noStoresMessage.textContent = "目前沒有店家資料。";
                noStoresMessage.style.display = 'table-row';
            }
            if(loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        snapshot.forEach(doc => {
            const store = doc.data();
            const storeId = doc.id;

            const row = storesTableBody.insertRow();

            let lastEditedAtFormatted = 'N/A';
            if (store.lastEditedAt && store.lastEditedAt.toDate) {
                try {
                    lastEditedAtFormatted = store.lastEditedAt.toDate().toLocaleString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    });
                } catch (e) {
                    console.warn("無法格式化 lastEditedAt:", store.lastEditedAt, e);
                    lastEditedAtFormatted = '日期格式錯誤';
                }
            }
            let editorDisplay = 'N/A';
            if (store.lastEditedBy && store.lastEditedBy.email) {
                editorDisplay = store.lastEditedBy.email;
            } else if (store.createdBy && store.createdBy.email) {
                editorDisplay = `${store.createdBy.email} (創建)`;
            }


            row.innerHTML = `
                <td>${store.name || 'N/A'}</td>
                <td>${store.district || 'N/A'}</td>
                <td>${store.category || 'N/A'}</td>
                <td>${store.address || 'N/A'}</td>
                <td>${store.price || 'N/A'}</td>
                <td>${editorDisplay}</td>
                <td>${lastEditedAtFormatted}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-store-btn" data-id="${storeId}">編輯</button>
                    <button class="btn btn-sm btn-danger delete-store-btn ms-1" data-id="${storeId}" data-name="${store.name || '該店家'}">刪除</button>
                </td>
            `;
        });

        addEventListenersToEditButtons();
        addEventListenersToDeleteButtons(); // 新增：為刪除按鈕加上監聽器

    } catch (error) {
        console.error("讀取店家資料失敗:", error);
        if(noStoresMessage) {
            noStoresMessage.textContent = "讀取店家資料時發生錯誤。";
            noStoresMessage.style.display = 'table-row';
        }
    } finally {
        if(loadingIndicator) loadingIndicator.style.display = 'none';
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

// 函數：處理編輯按鈕點擊
function handleEditStore(storeId) {
    console.log(`準備編輯店家 ID: ${storeId}`);
    window.location.href = `edit-store.html?id=${storeId}`;
}

// **** 新增：為刪除按鈕加上事件監聽器 ****
function addEventListenersToDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-store-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const storeId = this.dataset.id;
            const storeName = this.dataset.name;
            handleDeleteStore(storeId, storeName);
        });
    });
}

// **** 新增：處理刪除按鈕點擊 ****
async function handleDeleteStore(storeId, storeName) {
    if (!db) {
        alert("資料庫未連接，無法刪除。");
        return;
    }
    if (confirm(`您確定要刪除店家 "${storeName}" 嗎？此操作無法復原。`)) {
        console.log(`準備刪除店家 ID: ${storeId}, 名稱: ${storeName}`);
        try {
            await db.collection('stores_taipei').doc(storeId).delete();
            console.log(`店家 "${storeName}" (ID: ${storeId}) 已成功刪除。`);
            alert(`店家 "${storeName}" 已成功刪除。`);
            fetchAndDisplayStores(); // 重新載入列表
        } catch (error) {
            console.error("刪除店家失敗:", error);
            alert(`刪除店家 "${storeName}" 失敗: ${error.message}`);
        }
    }
}


// 監聽 Firebase Auth 狀態變化
document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("admin-script.js: Firebase 'auth' or 'db' instance is not available.");
        if (authMessageDiv) {
            authMessageDiv.textContent = "Firebase 初始化失敗。";
            authMessageDiv.style.display = 'block';
        }
        if (storeListContainer) storeListContainer.style.display = 'none';
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("後台：使用者已登入:", user.email);
            if(authMessageDiv) authMessageDiv.style.display = 'none';
            if(storeListContainer) storeListContainer.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'block';
            fetchAndDisplayStores();
        } else {
            console.log("後台：使用者未登入。");
            if(authMessageDiv) {
                authMessageDiv.textContent = "您需要登入才能訪問此後台頁面。";
                authMessageDiv.style.display = 'block';
            }
            if(storeListContainer) storeListContainer.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
            if(loadingIndicator) loadingIndicator.style.display = 'none';
            if(storesTableBody) storesTableBody.innerHTML = '';
            if(noStoresMessage) noStoresMessage.style.display = 'none';

            // alert("請先登入以訪問後台管理頁面。"); // 登入頁面會處理，這裡可以不用 alert
            window.location.href = 'login.html';
        }
    });

    if (logoutButton && auth) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('使用者已登出');
                // onAuthStateChanged 會處理跳轉
            }).catch((error) => {
                console.error('登出失敗:', error);
                alert('登出時發生錯誤: ' + error.message);
            });
        });
    }
});