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

// 台北市行政區
const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

// 填充行政區下拉選單
function populateEditDistrictSelect() {
    if (!storeDistrictSelect) return;
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

// 函數：從 URL 獲取查詢參數
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 函數：載入並預填店家資料
async function loadStoreData(docId) {
    if (!db) {
        console.error("Firestore 'db' is not initialized.");
        if(formErrorDiv) { formErrorDiv.textContent = "資料庫連接失敗。"; formErrorDiv.style.display = 'block'; }
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        return;
    }
    if (!docId) {
        console.error("未提供店家 ID。");
        if(formErrorDiv) { formErrorDiv.textContent = "錯誤：未指定店家。"; formErrorDiv.style.display = 'block'; }
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        if(editStoreForm) editStoreForm.style.display = 'none';
        return;
    }

    if(loadingSpinner) loadingSpinner.style.display = 'block';
    if(editStoreForm) editStoreForm.style.display = 'none';

    try {
        const docRef = db.collection('stores_taipei').doc(docId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const storeData = docSnap.data();
            if(storeDocIdInput) storeDocIdInput.value = docId;
            if(storeNameInput) storeNameInput.value = storeData.name || '';
            if(storeDistrictSelect) storeDistrictSelect.value = storeData.district || '';
            if(storeCategoryInput) storeCategoryInput.value = storeData.category || '';
            if(storeAddressInput) storeAddressInput.value = storeData.address || '';
            if(storePriceInput) storePriceInput.value = storeData.price || '';
            if(storeDescriptionTextarea) storeDescriptionTextarea.value = storeData.description || '';
            if(storePlaceIdInput) storePlaceIdInput.value = storeData.place_id || '';
            if (storeData.location) {
                if(storeLatInput) storeLatInput.value = storeData.location.latitude || '';
                if(storeLngInput) storeLngInput.value = storeData.location.longitude || '';
            }
            if(editStoreForm) editStoreForm.style.display = 'block';
        } else {
            console.log("找不到該店家資料！ID:", docId);
            if(formErrorDiv) { formErrorDiv.textContent = "找不到店家資料。"; formErrorDiv.style.display = 'block'; }
        }
    } catch (error) {
        console.error("載入店家資料失敗:", error);
        if(formErrorDiv) { formErrorDiv.textContent = "載入資料失敗。"; formErrorDiv.style.display = 'block'; }
    } finally {
        if(loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

// 監聽表單提交事件
if (editStoreForm) {
    editStoreForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!db || !auth) {
            console.error("Firestore 'db' or 'auth' is not initialized. Cannot save.");
            if(formErrorDiv) { formErrorDiv.textContent = "服務連接失敗。"; formErrorDiv.style.display = 'block'; }
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            if(formErrorDiv) { formErrorDiv.textContent = "請重新登入。"; formErrorDiv.style.display = 'block'; }
            return;
        }

        if(formErrorDiv) formErrorDiv.style.display = 'none';
        if(formSuccessDiv) formSuccessDiv.style.display = 'none';
        const submitButton = editStoreForm.querySelector('button[type="submit"]');
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 儲存中...';
        }

        const docId = storeDocIdInput ? storeDocIdInput.value : null;
        if (!docId) {
            if(formErrorDiv) { formErrorDiv.textContent = "錯誤：店家 ID 遺失。"; formErrorDiv.style.display = 'block'; }
            if(submitButton) { submitButton.disabled = false; submitButton.textContent = '儲存變更';}
            return;
        }

        const updatedData = {
            name: storeNameInput ? storeNameInput.value.trim() : '',
            district: storeDistrictSelect ? storeDistrictSelect.value : '',
            category: storeCategoryInput ? storeCategoryInput.value.trim() : '',
            address: storeAddressInput ? storeAddressInput.value.trim() : '',
            price: storePriceInput ? storePriceInput.value.trim() : '',
            description: storeDescriptionTextarea ? storeDescriptionTextarea.value.trim() : '',
            place_id: storePlaceIdInput ? storePlaceIdInput.value.trim() : '',
            lastEditedBy: {
                uid: currentUser.uid,
                email: currentUser.email
            },
            lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        const lat = storeLatInput ? parseFloat(storeLatInput.value) : NaN;
        const lng = storeLngInput ? parseFloat(storeLngInput.value) : NaN;

        if (!isNaN(lat) && !isNaN(lng)) {
            updatedData.location = new firebase.firestore.GeoPoint(lat, lng);
        } else if ((storeLatInput && storeLatInput.value.trim() !== '') || (storeLngInput && storeLngInput.value.trim() !== '')) {
            if(formErrorDiv) { formErrorDiv.textContent = "緯度和經度需為有效數字或都留空。"; formErrorDiv.style.display = 'block';}
            if(submitButton) { submitButton.disabled = false; submitButton.textContent = '儲存變更';}
            return;
        }

        if (!updatedData.name || !updatedData.district || !updatedData.category) {
            if(formErrorDiv) { formErrorDiv.textContent = "店家名稱、行政區和分類為必填。"; formErrorDiv.style.display = 'block';}
            if(submitButton) { submitButton.disabled = false; submitButton.textContent = '儲存變更';}
            return;
        }

        try {
            await db.collection('stores_taipei').doc(docId).set(updatedData, { merge: true });
            if(formSuccessDiv) { formSuccessDiv.textContent = "店家資料已成功更新！"; formSuccessDiv.style.display = 'block';}
            console.log("店家資料已更新, ID:", docId, "由:", currentUser.email);
            setTimeout(() => {
                if(formSuccessDiv) formSuccessDiv.style.display = 'none';
                window.location.href = 'admin.html';
            }, 2000);

        } catch (error) {
            console.error("更新店家資料失敗:", error);
            if(formErrorDiv) { formErrorDiv.textContent = "儲存失敗：" + error.message; formErrorDiv.style.display = 'block';}
        } finally {
            if(submitButton) { submitButton.disabled = false; submitButton.textContent = '儲存變更';}
        }
    });
}

// 頁面載入時的初始化邏輯
document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("edit-store-script.js: Firebase 'auth' or 'db' instance is not available.");
        const mainContainer = document.querySelector('.container');
        if (mainContainer) mainContainer.innerHTML = '<div class="alert alert-danger">Firebase 初始化失敗。</div>';
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("編輯頁面：使用者已登入");
            populateEditDistrictSelect();
            const storeIdToEdit = getQueryParam('id');
            if (storeIdToEdit) {
                loadStoreData(storeIdToEdit);
            } else {
                console.error("URL 中未找到店家 ID。");
                if(formErrorDiv) { formErrorDiv.textContent = "錯誤：未指定店家。"; formErrorDiv.style.display = 'block';}
                if(loadingSpinner) loadingSpinner.style.display = 'none';
                if(editStoreForm) editStoreForm.style.display = 'none';
            }
        } else {
            console.log("編輯頁面：使用者未登入，將導向登入頁。");
            alert("請先登入以編輯店家資料。");
            window.location.href = 'login.html';
        }
    });
});