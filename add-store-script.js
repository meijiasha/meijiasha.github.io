
// add-store-script.js
console.log("add-store-script.js: Script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("add-store-script.js: DOMContentLoaded.");

    // --- 1. DOM Element References ---
    const addStoreForm = document.getElementById('addStoreForm');
    const storeNameInput = document.getElementById('addStoreName');
    const storeDistrictSelect = document.getElementById('addStoreDistrict');
    const storeCategoryInput = document.getElementById('addStoreCategory');
    const storeAddressInput = document.getElementById('addStoreAddress');
    const storePriceInput = document.getElementById('addStorePrice');
    const storeDescriptionTextarea = document.getElementById('addStoreDescription');
    const storeDishesInput = document.getElementById('addStoreDishes');
    const storePlaceIdInput = document.getElementById('addStorePlaceId');
    const storeLatInput = document.getElementById('addStoreLat');
    const storeLngInput = document.getElementById('addStoreLng');
    const formErrorDiv = document.getElementById('formError');
    const googleMapsUrlInput = document.getElementById('googleMapsUrl');
    const existingCategoriesContainer = document.getElementById('existingCategoriesContainer');
    const categoryPreview = document.getElementById('category-color-preview');

    // --- 2. Firebase Readiness Check ---
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("add-store-script.js: Firebase not ready.");
        if (formErrorDiv) { formErrorDiv.textContent = "Firebase 初始化失敗。"; formErrorDiv.style.display = 'block'; }
        if (addStoreForm) addStoreForm.querySelector('button[type="submit"]').disabled = true;
        return;
    }

    // --- 3. Authentication and Initialization ---
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Add Store Page: User is logged in.");
            // Use common functions to initialize the form
            populateDistrictSelect(storeDistrictSelect);
            loadAndDisplayExistingCategories(db, existingCategoriesContainer, storeCategoryInput);
            initCategoryPreview(storeCategoryInput, categoryPreview);
            
            if (addStoreForm) addStoreForm.querySelector('button[type="submit"]').disabled = false;
        } else {
            console.log("Add Store Page: User not logged in. Redirecting...");
            showToast("請先登入以新增店家。", "warning", "需要登入");
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        }
    });

    // --- 4. Form Submission Logic ---
    if (addStoreForm) {
        addStoreForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentUser = auth.currentUser;
            if (!currentUser) { 
                showToast("您似乎已登出，請重新登入。", "warning", "需要認證"); 
                return; 
            }

            const submitButton = addStoreForm.querySelector('button[type="submit"]');
            if(formErrorDiv) formErrorDiv.style.display = 'none';
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
            if (!isNaN(lat) && !isNaN(lng)) { 
                newData.location = new firebase.firestore.GeoPoint(lat, lng); 
            }

            if (!newData.name || !newData.district || !newData.category) {
                if(formErrorDiv) { formErrorDiv.textContent = "店家名稱、行政區和分類為必填。"; formErrorDiv.style.display = 'block';}
                if(submitButton) { submitButton.disabled = false; submitButton.textContent = '新增店家';}
                return;
            }

            try {
                await db.collection('stores_taipei').add(newData);
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

// --- 5. Google Maps API Integration ---
// This function is called by the Google Maps script tag in the HTML.
function initMap() {
    console.log("Google Maps API loaded, initializing autofill for Add page.");
    const formElements = {
        name: document.getElementById('addStoreName'),
        address: document.getElementById('addStoreAddress'),
        placeId: document.getElementById('addStorePlaceId'),
        lat: document.getElementById('addStoreLat'),
        lng: document.getElementById('addStoreLng'),
        district: document.getElementById('addStoreDistrict')
    };
    const googleMapsUrlInput = document.getElementById('googleMapsUrl');
    
    // In add mode, we allow overwriting the name field.
    initGoogleMapsAutofill(googleMapsUrlInput, formElements, true);
}

console.log("add-store-script.js: Script parsed completely.");
