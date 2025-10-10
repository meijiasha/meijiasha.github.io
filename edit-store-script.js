// edit-store-script.js
console.log("edit-store-script.js: Script loaded.");

// DOM 元素引用
let editStoreForm, storeDocIdInput, storeNameInput, storeDistrictSelect, storeCategoryInput, storeAddressInput, storePriceInput, storeDescriptionTextarea, storeDishesInput, storePlaceIdInput, storeLatInput, storeLngInput, formErrorDiv, formSuccessDiv, loadingSpinner, googleMapsUrlInput;

// 台北市行政區
const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

// -----------------------------------------------------------------------------
// Helper: 顏色產生函式
// -----------------------------------------------------------------------------
function generateCategoryColor(str) {
  if (!str) return 'hsl(0, 0%, 80%)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`; 
}

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

// 載入並顯示已存在的分類
async function loadAndDisplayExistingCategories() {
    if (!db) return;
    const container = document.getElementById('existingCategoriesContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('stores_taipei').get();
        const categories = snapshot.docs.map(doc => doc.data().category).filter(Boolean);
        const uniqueCategories = [...new Set(categories)].sort();

        if (uniqueCategories.length > 0) {
            container.innerHTML = '<small class="text-muted">點擊使用現有分類:</small><br>' +
                uniqueCategories.map(cat => {
                    const color = generateCategoryColor(cat);
                    return `<span class="badge rounded-pill me-1 mb-1" style="background-color: ${color}; cursor: pointer;" data-category="${cat}">${cat}</span>`;
                }).join('');

            container.addEventListener('click', (event) => {
                const target = event.target;
                if (target.tagName === 'SPAN' && target.dataset.category) {
                    storeCategoryInput.value = target.dataset.category;
                }
            });
        }
    } catch (error) {
        console.error("Error loading existing categories:", error);
    }
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
            if(storeDishesInput) storeDishesInput.value = storeData.dishes || '';
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
    storeDishesInput = document.getElementById('editStoreDishes');
    storePlaceIdInput = document.getElementById('editStorePlaceId');
    storeLatInput = document.getElementById('editStoreLat');
    storeLngInput = document.getElementById('editStoreLng');
    formErrorDiv = document.getElementById('formError');
    formSuccessDiv = document.getElementById('formSuccess');
    loadingSpinner = document.getElementById('loadingSpinner');
    googleMapsUrlInput = document.getElementById('googleMapsUrl'); // 新增的元素

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
            loadAndDisplayExistingCategories(); // *** 新增：載入現有分類
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
                dishes: storeDishesInput ? storeDishesInput.value.trim() : '',
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

// -----------------------------------------------------------------------------
// Google Maps URL Parsing and Autocomplete
// -----------------------------------------------------------------------------
let placesService;

function initMap() {
    console.log("Google Maps API loaded for edit page.");
    const dummyDiv = document.createElement('div');
    placesService = new google.maps.places.PlacesService(dummyiv);

    if (googleMapsUrlInput) {
        googleMapsUrlInput.addEventListener('input', handleUrlInput);
    }
}

function handleUrlInput(event) {
    const url = event.target.value;
    if (!url || !url.includes('google.com/maps/place')) {
        return;
    }

    const match = url.match(/google\.com\/maps\/place\/([^\/]+)/);
    if (match && match[1]) {
        const placeName = decodeURIComponent(match[1].replace(/\+/g, ' '));
        findPlaceDetails(placeName);
    }
}

function findPlaceDetails(query) {
    const request = {
        query: query,
        fields: ['name', 'place_id', 'formatted_address', 'geometry'],
    };

    placesService.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const place = results[0];
            
            // Populate the form fields
            if (storeNameInput) {
                storeNameInput.value = place.name;
            }
            if (storeAddressInput) {
                storeAddressInput.value = place.formatted_address;
            }
            if (storePlaceIdInput) {
                storePlaceIdInput.value = place.place_id;
            }
            if (place.geometry && place.geometry.location) {
                if (storeLatInput) {
                    storeLatInput.value = place.geometry.location.lat();
                }
                if (storeLngInput) {
                    storeLngInput.value = place.geometry.location.lng();
                }
            }
            
            if (storeDistrictSelect && place.formatted_address) {
                for (const district of taipeiDistricts) {
                    if (place.formatted_address.includes(district)) {
                        storeDistrictSelect.value = district;
                        break;
                    }
                }
            }

            showToast('已從 Google Maps 網址自動填入店家資訊！', 'success', '自動帶入成功');

        } else {
            showToast('無法從 Google Maps 網址找到對應的店家。', 'warning', '查無資料');
        }
    });
}