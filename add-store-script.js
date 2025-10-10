// add-store-script.js
console.log("add-store-script.js: Script loaded.");

// DOM 元素引用
let addStoreForm, storeNameInput, storeDistrictSelect, storeCategoryInput, storeAddressInput, storePriceInput, storeDescriptionTextarea, storeDishesInput, storePlaceIdInput, storeLatInput, storeLngInput, formErrorDiv, formSuccessDiv, googleMapsUrlInput;

// 台北市行政區
const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

// -----------------------------------------------------------------------------
// Helper: 顏色產生函式
// -----------------------------------------------------------------------------
/**
 * Generates a consistent, vibrant color from a string.
 * @param {string} str The input string (category name).
 * @returns {string} An HSL color string.
 */
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

// 填充行政區下拉選單
function populateAddDistrictSelect() {
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
                    storeCategoryInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }
    } catch (error) {
        console.error("Error loading existing categories:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("add-store-script.js: DOMContentLoaded.");

    addStoreForm = document.getElementById('addStoreForm');
    storeNameInput = document.getElementById('addStoreName');
    storeDistrictSelect = document.getElementById('addStoreDistrict');
    storeCategoryInput = document.getElementById('addStoreCategory');
    storeAddressInput = document.getElementById('addStoreAddress');
    storePriceInput = document.getElementById('addStorePrice');
    storeDescriptionTextarea = document.getElementById('addStoreDescription');
    storeDishesInput = document.getElementById('addStoreDishes');
    storePlaceIdInput = document.getElementById('addStorePlaceId');
    storeLatInput = document.getElementById('addStoreLat');
    storeLngInput = document.getElementById('addStoreLng');
    formErrorDiv = document.getElementById('formError');
    formSuccessDiv = document.getElementById('formSuccess');
    googleMapsUrlInput = document.getElementById('googleMapsUrl');

    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("add-store-script.js: Firebase not ready.");
        if (formErrorDiv) { formErrorDiv.textContent = "Firebase 初始化失敗。"; formErrorDiv.style.display = 'block'; }
        if (addStoreForm) addStoreForm.querySelector('button[type="submit"]').disabled = true;
        return;
    }

    // --- Category Preview Logic ---
    const categoryPreview = document.getElementById('category-color-preview');
    if (storeCategoryInput && categoryPreview) {
        storeCategoryInput.addEventListener('input', (e) => {
            const categoryName = e.target.value.trim();
            if (categoryName) {
                const color = generateCategoryColor(categoryName);
                categoryPreview.style.backgroundColor = color;
                categoryPreview.style.color = '#fff';
                categoryPreview.textContent = categoryName;
            } else {
                categoryPreview.style.backgroundColor = '#6c757d';
                categoryPreview.style.color = '#fff';
                categoryPreview.textContent = '預覽';
            }
        });
    }
    // --- End of Category Preview Logic ---

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Add Store Page: User is logged in.");
            populateAddDistrictSelect();
            loadAndDisplayExistingCategories(); // *** 新增：載入現有分類
            if (addStoreForm) addStoreForm.querySelector('button[type="submit"]').disabled = false;
        } else {
            console.log("Add Store Page: User not logged in. Redirecting...");
            showToast("請先登入以新增店家。","warning", "需要登入");
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        }
    });

    if (addStoreForm) {
        addStoreForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!db || !auth) { showToast("服務連接失敗，無法新增。", "danger", "錯誤"); return; }
            const currentUser = auth.currentUser;
            if (!currentUser) { showToast("您似乎已登出，請重新登入。", "warning", "需要認證"); return; }

            const submitButton = addStoreForm.querySelector('button[type="submit"]');
            if(formErrorDiv) formErrorDiv.style.display = 'none';
            if(formSuccessDiv) formSuccessDiv.style.display = 'none';
            if(submitButton) { submitButton.disabled = true; submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 新增中...';}

            const newData = {
                name: storeNameInput ? storeNameInput.value.trim() : '',
                district: storeDistrictSelect ? storeDistrictSelect.value : '',
                category: storeCategoryInput ? storeCategoryInput.value.trim() : '',
                address: storeAddressInput ? storeAddressInput.value.trim() : '',
                price: storePriceInput ? storePriceInput.value.trim() : '',
                description: storeDescriptionTextarea ? storeDescriptionTextarea.value.trim() : '',
                dishes: storeDishesInput ? storeDishesInput.value.trim() : '',
                place_id: storePlaceIdInput ? storePlaceIdInput.value.trim() : '',
                createdBy: { uid: currentUser.uid, email: currentUser.email },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastEditedBy: { uid: currentUser.uid, email: currentUser.email },
                lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const lat = storeLatInput ? parseFloat(storeLatInput.value) : NaN;
            const lng = storeLngInput ? parseFloat(storeLngInput.value) : NaN;
            if (!isNaN(lat) && !isNaN(lng)) { newData.location = new firebase.firestore.GeoPoint(lat, lng); }
            else if ((storeLatInput && storeLatInput.value.trim() !== '') || (storeLngInput && storeLngInput.value.trim() !== '')) {
                if(formErrorDiv) { formErrorDiv.textContent = "緯度和經度需同時提供有效數字或都留空。"; formErrorDiv.style.display = 'block';}
                if(submitButton) { submitButton.disabled = false; submitButton.textContent = '新增店家';}
                return;
            }
            if (!newData.name || !newData.district || !newData.category) {
                if(formErrorDiv) { formErrorDiv.textContent = "店家名稱、行政區和分類為必填。"; formErrorDiv.style.display = 'block';}
                if(submitButton) { submitButton.disabled = false; submitButton.textContent = '新增店家';}
                return;
            }

            try {
                const docRef = await db.collection('stores_taipei').add(newData);
                showToast(`店家 "${newData.name}" 已成功新增！`, "success", "新增成功");
                addStoreForm.reset();
                setTimeout(() => { window.location.href = 'admin.html'; }, 2000);
            } catch (error) {
                console.error("新增店家失敗:", error);
                showToast("新增店家時發生錯誤：" + error.message, "danger", "新增失敗");
            } finally {
                if(submitButton) { submitButton.disabled = false; submitButton.textContent = '新增店家';}
            }
        });
    }
    console.log("add-store-script.js: DOMContentLoaded setup finished.");
});

// -----------------------------------------------------------------------------
// Google Maps URL Parsing and Autocomplete
// -----------------------------------------------------------------------------
let placesService;

function initMap() {
    console.log("Google Maps API loaded.");
    // The PlacesService needs to be attached to a map or a div. 
    // We can create a dummy div for it if we don't have a map on this page.
    const dummyDiv = document.createElement('div');
    placesService = new google.maps.places.PlacesService(dummyDiv);

    const urlInput = document.getElementById('googleMapsUrl');
    if (urlInput) {
        urlInput.addEventListener('input', handleUrlInput);
    }
}

function handleUrlInput(event) {
    const url = event.target.value;
    if (!url || !url.includes('google.com/maps/place')) {
        return;
    }

    // Try to extract the place name from the URL.
    // Example: https://www.google.com/maps/place/Din+Tai+Fung+Xinyi+Store/@[...]
    const match = url.match(/google\.com\/maps\/place\/([^\/]+)/);
    if (match && match[1]) {
        const placeName = decodeURIComponent(match[1].replace(/\+/g, ' '));
        console.log("Extracted place name:", placeName);
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
            console.log("Found place:", place);

            // Populate the form fields
            if (storeNameInput && !storeNameInput.value) {
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
            
            // Also try to set the district
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
            console.warn("Place not found or error:", status);
            showToast('無法從 Google Maps 網址找到對應的店家。', 'warning', '查無資料');
        }
    });
}

console.log("add-store-script.js: Script parsed completely.");