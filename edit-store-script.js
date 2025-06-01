// edit-store-script.js

// DOM 元素
const editStoreForm = document.getElementById('editStoreForm');
const storeDocIdInput = document.getElementById('storeDocId');
const storeNameInput = document.getElementById('editStoreName');
const storeDistrictSelect = document.getElementById('editStoreDistrict');
const storeCategoryInput = document.getElementById('editStoreCategory');
const storeAddressInput = document.getElementById('editStoreAddress');
const storePriceInput = document.getElementById('editStorePrice');
const storeDescriptionTextarea = document.getElementById('editStoreDescription');
const storePlaceIdInput = document.getElementById('editStorePlaceId');
const storeLatInput = document.getElementById('editStoreLat');
const storeLngInput = document.getElementById('editStoreLng');
const formErrorDiv = document.getElementById('formError');
const formSuccessDiv = document.getElementById('formSuccess');
const loadingSpinner = document.getElementById('loadingSpinner');

// 台北市行政區 (與 admin-script.js 中的相同)
const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

// 填充行政區下拉選單
function populateEditDistrictSelect() {
    taipeiDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        storeDistrictSelect.appendChild(option);
    });
}

// 函數：從 URL 獲取查詢參數
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 函數：載入並預填店家資料
async function loadStoreData(docId) {
    if (!db) {
        console.error("Firestore 'db' is not initialized.");
        formErrorDiv.textContent = "資料庫連接失敗，無法載入店家資料。";
        formErrorDiv.style.display = 'block';
        loadingSpinner.style.display = 'none';
        return;
    }
    if (!docId) {
        console.error("未提供店家 ID。");
        formErrorDiv.textContent = "錯誤：未指定要編輯的店家。";
        formErrorDiv.style.display = 'block';
        loadingSpinner.style.display = 'none';
        editStoreForm.style.display = 'none';
        return;
    }

    loadingSpinner.style.display = 'block';
    editStoreForm.style.display = 'none'; // 載入時先隱藏表單

    try {
        const docRef = db.collection('stores_taipei').doc(docId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const storeData = docSnap.data();
            storeDocIdInput.value = docId; // 設定隱藏的 ID 欄位
            storeNameInput.value = storeData.name || '';
            storeDistrictSelect.value = storeData.district || '';
            storeCategoryInput.value = storeData.category || '';
            storeAddressInput.value = storeData.address || '';
            storePriceInput.value = storeData.price || '';
            storeDescriptionTextarea.value = storeData.description || '';
            storePlaceIdInput.value = storeData.place_id || '';
            if (storeData.location) {
                storeLatInput.value = storeData.location.latitude || '';
                storeLngInput.value = storeData.location.longitude || '';
            }
            editStoreForm.style.display = 'block'; // 顯示表單
        } else {
            console.log("找不到該店家資料！ID:", docId);
            formErrorDiv.textContent = "找不到指定的店家資料。可能已被刪除。";
            formErrorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error("載入店家資料失敗:", error);
        formErrorDiv.textContent = "載入店家資料時發生錯誤。";
        formErrorDiv.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// 監聽表單提交事件
editStoreForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!db) {
        console.error("Firestore 'db' is not initialized. Cannot save.");
        formErrorDiv.textContent = "資料庫連接失敗，無法儲存變更。";
        formErrorDiv.style.display = 'block';
        return;
    }

    formErrorDiv.style.display = 'none';
    formSuccessDiv.style.display = 'none';
    const submitButton = editStoreForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 儲存中...';

    const docId = storeDocIdInput.value;
    if (!docId) {
        formErrorDiv.textContent = "錯誤：店家 ID 遺失，無法儲存。";
        formErrorDiv.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = '儲存變更';
        return;
    }

    const updatedData = {
        name: storeNameInput.value.trim(),
        district: storeDistrictSelect.value,
        category: storeCategoryInput.value.trim(),
        address: storeAddressInput.value.trim(),
        price: storePriceInput.value.trim(),
        description: storeDescriptionTextarea.value.trim(),
        place_id: storePlaceIdInput.value.trim(),
    };

    // 處理經緯度
    const lat = parseFloat(storeLatInput.value);
    const lng = parseFloat(storeLngInput.value);

    if (!isNaN(lat) && !isNaN(lng)) {
        updatedData.location = new firebase.firestore.GeoPoint(lat, lng);
    } else if (storeLatInput.value.trim() === '' && storeLngInput.value.trim() === '') {
        // 如果經緯度為空，可以選擇刪除 location 欄位或保留舊值
        // updatedData.location = firebase.firestore.FieldValue.delete(); // 刪除
        // 或者不對 updatedData.location 做任何操作，這樣如果 Firestore 中原本有值，它會被保留
        // 這裡選擇如果都為空，就不主動更新 location，除非有新值
    } else {
        formErrorDiv.textContent = "緯度和經度必須是有效的數字，或都留空。";
        formErrorDiv.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = '儲存變更';
        return;
    }

    // 簡單的前端驗證
    if (!updatedData.name || !updatedData.district || !updatedData.category) {
        formErrorDiv.textContent = "店家名稱、行政區和分類為必填欄位。";
        formErrorDiv.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = '儲存變更';
        return;
    }


    try {
        await db.collection('stores_taipei').doc(docId).set(updatedData, { merge: true }); // 使用 set 和 merge: true 來更新或創建欄位
        formSuccessDiv.textContent = "店家資料已成功儲存！";
        formSuccessDiv.style.display = 'block';
        console.log("店家資料已更新, ID:", docId);
        // 可選：幾秒後自動跳轉回列表頁
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 2000);

    } catch (error) {
        console.error("更新店家資料失敗:", error);
        formErrorDiv.textContent = "儲存店家資料時發生錯誤：" + error.message;
        formErrorDiv.style.display = 'block';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '儲存變更';
    }
});


// 頁面載入時的初始化邏輯
// 檢查 Firebase Auth 是否已初始化
if (typeof auth === 'undefined' || !auth) {
    console.error("edit-store-script.js: Firebase 'auth' instance is not available from HTML.");
    // 可以在此顯示錯誤訊息並阻止後續操作
    const mainContainer = document.querySelector('.container');
    if (mainContainer) mainContainer.innerHTML = '<div class="alert alert-danger">Firebase 認證服務初始化失敗，無法編輯店家。</div>';
} else {
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("編輯頁面：使用者已登入");
            populateEditDistrictSelect(); // 填充行政區下拉選單
            const storeIdToEdit = getQueryParam('id'); // 從 URL 獲取店家 ID
            if (storeIdToEdit) {
                loadStoreData(storeIdToEdit); // 載入並填充表單
            } else {
                console.error("URL 中未找到店家 ID。");
                formErrorDiv.textContent = "錯誤：未指定要編輯的店家。";
                formErrorDiv.style.display = 'block';
                loadingSpinner.style.display = 'none';
                editStoreForm.style.display = 'none';
            }
        } else {
            console.log("編輯頁面：使用者未登入，將導向登入頁。");
            alert("請先登入以編輯店家資料。");
            window.location.href = 'login.html'; // 導向登入頁面
        }
    });
}