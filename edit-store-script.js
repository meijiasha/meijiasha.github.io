// edit-store-script.js
console.log("edit-store-script.js: Script loaded.");

// DOM 元素引用
let editStoreForm, storeDocIdInput, storeNameInput, storeDistrictSelect, storeCategoryInput, storeAddressInput, storePriceInput, storeDescriptionTextarea, storePlaceIdInput, storeLatInput, storeLngInput, formErrorDiv, formSuccessDiv, loadingSpinner;

// 台北市行政區
const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

// -----------------------------------------------------------------------------
// Toast 顯示函數
// -----------------------------------------------------------------------------
function showToast(message, type = 'info', title = '通知', delay = 5000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) { console.error("Toast container not found!"); alert(`${title}: ${message}`); return; }
    const toastId = 'toast-' + new Date().getTime();
    const toastBgClass = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }[type] || 'bg-primary';
    const iconClass = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-info-circle-fill';
    const toastHTML = `<div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}"><div class="toast-header text-white ${toastBgClass}"><i class="bi ${iconClass} me-2"></i><strong class="me-auto">${title}</strong><small class="text-white-50">剛剛</small><button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button></div><div class="toast-body">${message}</div></div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, { delay: delay && delay > 0 ? delay : undefined, autohide: delay && delay > 0 });
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
        toast.show();
    } else { alert(`${title}: ${message}`); }
}

function populateEditDistrictSelect() {
    if (!storeDistrictSelect) return;
    while (storeDistrictSelect.options.length > 1) { storeDistrictSelect.remove(1); }
    taipeiDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district; option.textContent = district;
        storeDistrictSelect.appendChild(option);
    });
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function loadStoreData(docId) {
    if (!db) {
        if(formErrorDiv) { formErrorDiv.textContent = "資料庫連接失敗。"; formErrorDiv.style.display = 'block'; }
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        return;
    }
    if (!docId) {
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
            if(formErrorDiv) { formErrorDiv.textContent = "找不到店家資料。"; formErrorDiv.style.display = 'block'; }
        }
    } catch (error) {
        console.error("載入店家資料失敗:", error);
        if(formErrorDiv) { formErrorDiv.textContent = "載入資料失敗。"; formErrorDiv.style.display = 'block'; }
    } finally {
        if(loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("edit-store-script.js: DOMContentLoaded.");

    editStoreForm = document.getElementById('editStoreForm');
    storeDocIdInput = document.getElementById('storeDocId');
    storeNameInput = document.getElementById('editStoreName');
    storeDistrictSelect = document.getElementById('editStoreDistrict');
    storeCategoryInput = document.getElementById('editStoreCategory');
    storeAddressInput = document.getElementById('editStoreAddress');
    storePriceInput = document.getElementById('editStorePrice');
    storeDescriptionTextarea = document.getElementById('editStoreDescription');
    storePlaceIdInput = document.getElementById('editStorePlaceId');
    storeLatInput = document.getElementById('editStoreLat');
    storeLngInput = document.getElementById('editStoreLng');
    formErrorDiv = document.getElementById('formError');
    formSuccessDiv = document.getElementById('formSuccess');
    loadingSpinner = document.getElementById('loadingSpinner');

    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("edit-store-script.js: Firebase not ready.");
        if (formErrorDiv) { formErrorDiv.textContent = "Firebase 初始化失敗。"; formErrorDiv.style.display = 'block'; }
        if (editStoreForm) editStoreForm.style.display = 'none'; // 隱藏表單
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Edit Store Page: User is logged in.");
            populateEditDistrictSelect();
            const storeIdToEdit = getQueryParam('id');
            if (storeIdToEdit) {
                loadStoreData(storeIdToEdit);
            } else {
                if(formErrorDiv) { formErrorDiv.textContent = "錯誤：未指定店家。"; formErrorDiv.style.display = 'block'; }
                if(loadingSpinner) loadingSpinner.style.display = 'none';
                if(editStoreForm) editStoreForm.style.display = 'none';
            }
        } else {
            console.log("Edit Store Page: User not logged in. Redirecting...");
            showToast("請先登入以編輯店家資料。", "warning", "需要登入");
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        }
    });

    if (editStoreForm) {
        editStoreForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!db || !auth) { showToast("服務連接失敗。", "danger", "錯誤"); return; }
            const currentUser = auth.currentUser;
            if (!currentUser) { showToast("請重新登入。", "warning", "需要認證"); return; }

            const submitButton = editStoreForm.querySelector('button[type="submit"]');
            if(formErrorDiv) formErrorDiv.style.display = 'none';
            if(formSuccessDiv) formSuccessDiv.style.display = 'none';
            if(submitButton) { submitButton.disabled = true; submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 儲存中...';}

            const docId = storeDocIdInput ? storeDocIdInput.value : null;
            if (!docId) {
                if(formErrorDiv) { formErrorDiv.textContent = "錯誤：店家 ID 遺失。"; formErrorDiv.style.display = 'block';}
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
                lastEditedBy: { uid: currentUser.uid, email: currentUser.email },
                lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const lat = storeLatInput ? parseFloat(storeLatInput.value) : NaN;
            const lng = storeLngInput ? parseFloat(storeLngInput.value) : NaN;
            if (!isNaN(lat) && !isNaN(lng)) { updatedData.location = new firebase.firestore.GeoPoint(lat, lng); }
            else if ((storeLatInput && storeLatInput.value.trim() !== '') || (storeLngInput && storeLngInput.value.trim() !== '')) {
                if(formErrorDiv) { formErrorDiv.textContent = "緯度和經度需有效數字或都留空。"; formErrorDiv.style.display = 'block';}
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
                showToast("店家資料已成功更新！", "success", "更新成功");
                setTimeout(() => { window.location.href = 'admin.html'; }, 2000);
            } catch (error) {
                console.error("更新店家資料失敗:", error);
                showToast("儲存店家資料失敗：" + error.message, "danger", "更新失敗");
            } finally {
                if(submitButton) { submitButton.disabled = false; submitButton.textContent = '儲存變更';}
            }
        });
    }
    console.log("edit-store-script.js: DOMContentLoaded setup finished.");
});

console.log("edit-store-script.js: Script parsed completely.");