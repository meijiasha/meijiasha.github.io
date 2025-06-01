// add-store-script.js

// DOM 元素 (ID 與 add-store.html 中的表單欄位對應)
const addStoreForm = document.getElementById('addStoreForm');
const storeNameInput = document.getElementById('addStoreName');
const storeDistrictSelect = document.getElementById('addStoreDistrict');
const storeCategoryInput = document.getElementById('addStoreCategory');
const storeAddressInput = document.getElementById('addStoreAddress');
const storePriceInput = document.getElementById('addStorePrice');
const storeDescriptionTextarea = document.getElementById('addStoreDescription');
const storePlaceIdInput = document.getElementById('addStorePlaceId');
const storeLatInput = document.getElementById('addStoreLat');
const storeLngInput = document.getElementById('addStoreLng');
const formErrorDiv = document.getElementById('formError');
const formSuccessDiv = document.getElementById('formSuccess');

// 台北市行政區
const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

// 填充行政區下拉選單
function populateAddDistrictSelect() {
    if (!storeDistrictSelect) return; // 如果元素不存在則返回
    // 清空現有選項 (除了第一個 "-- 請選擇 --")
    while (storeDistrictSelect.options.length > 1) {
        storeDistrictSelect.remove(1);
    }
    taipeiDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        storeDistrictSelect.appendChild(option);
    });
}

// 監聽表單提交事件
if (addStoreForm) {
    addStoreForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!db || !auth) {
            console.error("Firestore 'db' or 'auth' is not initialized. Cannot save.");
            if (formErrorDiv) {
                formErrorDiv.textContent = "資料庫或認證服務連接失敗，無法新增店家。";
                formErrorDiv.style.display = 'block';
            }
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            if (formErrorDiv) {
                formErrorDiv.textContent = "您似乎已登出，請重新登入後再試。";
                formErrorDiv.style.display = 'block';
            }
            return;
        }

        if (formErrorDiv) formErrorDiv.style.display = 'none';
        if (formSuccessDiv) formSuccessDiv.style.display = 'none';
        const submitButton = addStoreForm.querySelector('button[type="submit"]');
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 新增中...';
        }

        const newData = {
            name: storeNameInput ? storeNameInput.value.trim() : '',
            district: storeDistrictSelect ? storeDistrictSelect.value : '',
            category: storeCategoryInput ? storeCategoryInput.value.trim() : '',
            address: storeAddressInput ? storeAddressInput.value.trim() : '',
            price: storePriceInput ? storePriceInput.value.trim() : '',
            description: storeDescriptionTextarea ? storeDescriptionTextarea.value.trim() : '',
            place_id: storePlaceIdInput ? storePlaceIdInput.value.trim() : '',
            createdBy: {
                uid: currentUser.uid,
                email: currentUser.email
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastEditedBy: {
                uid: currentUser.uid,
                email: currentUser.email
            },
            lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const lat = storeLatInput ? parseFloat(storeLatInput.value) : NaN;
        const lng = storeLngInput ? parseFloat(storeLngInput.value) : NaN;

        if (!isNaN(lat) && !isNaN(lng)) {
            newData.location = new firebase.firestore.GeoPoint(lat, lng);
        } else if ((storeLatInput && storeLatInput.value.trim() !== '') || (storeLngInput && storeLngInput.value.trim() !== '')) {
            if (formErrorDiv) {
                formErrorDiv.textContent = "緯度和經度必須同時提供有效的數字，或都留空。";
                formErrorDiv.style.display = 'block';
            }
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = '新增店家';
            }
            return;
        }

        if (!newData.name || !newData.district || !newData.category) {
            if (formErrorDiv) {
                formErrorDiv.textContent = "店家名稱、行政區和分類為必填欄位。";
                formErrorDiv.style.display = 'block';
            }
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = '新增店家';
            }
            return;
        }

        try {
            const docRef = await db.collection('stores_taipei').add(newData);
            if (formSuccessDiv) {
                formSuccessDiv.textContent = `店家 "${newData.name}" 已成功新增！`;
                formSuccessDiv.style.display = 'block';
            }
            console.log("新店家已新增, ID:", docRef.id, "由:", currentUser.email);
            addStoreForm.reset(); // 清空表單
             // 可選：幾秒後自動跳轉回列表頁
            setTimeout(() => {
                if (formSuccessDiv) formSuccessDiv.style.display = 'none'; // 隱藏成功訊息再跳轉
                window.location.href = 'admin.html';
            }, 2500);

        } catch (error) {
            console.error("新增店家失敗:", error);
            if (formErrorDiv) {
                formErrorDiv.textContent = "新增店家時發生錯誤：" + error.message;
                formErrorDiv.style.display = 'block';
            }
        } finally {
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = '新增店家';
            }
        }
    });
}

// 頁面載入時的初始化邏輯
// 確保在 DOMContentLoaded 後執行，或 auth, db 實例已確認可用
document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("add-store-script.js: Firebase 'auth' or 'db' instance is not available from HTML.");
        const mainContainer = document.querySelector('.container');
        if (mainContainer) mainContainer.innerHTML = '<div class="alert alert-danger">Firebase 初始化失敗，無法新增店家。</div>';
        return; // 阻止後續執行
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("新增頁面：使用者已登入");
            populateAddDistrictSelect();
        } else {
            console.log("新增頁面：使用者未登入，將導向登入頁。");
            alert("請先登入以新增店家資料。");
            window.location.href = 'login.html';
        }
    });
});