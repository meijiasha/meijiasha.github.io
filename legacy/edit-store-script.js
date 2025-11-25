
// edit-store-script.js
console.log("edit-store-script.js: Script loaded.");

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function loadStoreData(docId, formElements) {
    const { db, formErrorDiv, loadingSpinner, editStoreForm, name, district, category, address, price, description, dishes, placeId, lat, lng, docIdInput } = formElements;

    if (!db) {
        if(formErrorDiv) { formErrorDiv.textContent = "資料庫連接失敗。"; formErrorDiv.style.display = 'block'; }
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        return;
    }

    if(loadingSpinner) loadingSpinner.style.display = 'block';
    if(editStoreForm) editStoreForm.style.display = 'none';

    try {
        const docRef = db.collection('stores_taipei').doc(docId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const storeData = docSnap.data();
            if(docIdInput) docIdInput.value = docId;
            if(name) name.value = storeData.name || '';
            if(district) district.value = storeData.district || '';
            if(category) {
                category.value = storeData.category || '';
                category.dispatchEvent(new Event('input', { bubbles: true })); // Trigger preview
            }
            if(address) address.value = storeData.address || '';
            if(price) price.value = storeData.price || '';
            if(description) description.value = storeData.description || '';
            if(dishes) dishes.value = storeData.dishes || '';
            if(placeId) placeId.value = storeData.place_id || '';
            if (storeData.location) {
                if(lat) lat.value = storeData.location.latitude || '';
                if(lng) lng.value = storeData.location.longitude || '';
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

    // --- 1. DOM Element References ---
    const formElements = {
        editStoreForm: document.getElementById('editStoreForm'),
        docIdInput: document.getElementById('storeDocId'),
        name: document.getElementById('editStoreName'),
        district: document.getElementById('editStoreDistrict'),
        category: document.getElementById('editStoreCategory'),
        address: document.getElementById('editStoreAddress'),
        price: document.getElementById('editStorePrice'),
        description: document.getElementById('editStoreDescription'),
        dishes: document.getElementById('editStoreDishes'),
        placeId: document.getElementById('editStorePlaceId'),
        lat: document.getElementById('editStoreLat'),
        lng: document.getElementById('editStoreLng'),
        formErrorDiv: document.getElementById('formError'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        googleMapsUrlInput: document.getElementById('googleMapsUrl'),
        existingCategoriesContainer: document.getElementById('existingCategoriesContainer'),
        categoryPreview: document.getElementById('category-color-preview')
    };

    // --- 2. Firebase Readiness Check ---
    if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
        console.error("edit-store-script.js: Firebase not ready.");
        if (formElements.formErrorDiv) { formElements.formErrorDiv.textContent = "Firebase 初始化失敗。"; formElements.formErrorDiv.style.display = 'block'; }
        if (formElements.editStoreForm) formElements.editStoreForm.style.display = 'none';
        if (formElements.loadingSpinner) formElements.loadingSpinner.style.display = 'none';
        return;
    }
    formElements.db = db; // Add db to formElements for loadStoreData

    // --- 3. Authentication and Initialization ---
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Edit Store Page: User is logged in.");
            populateDistrictSelect(formElements.district);
            loadAndDisplayExistingCategories(db, formElements.existingCategoriesContainer, formElements.category);
            initCategoryPreview(formElements.category, formElements.categoryPreview);

            // 動態載入 Google Maps API
            loadGoogleMapsScript();

            const storeIdToEdit = getQueryParam('id');
            if (storeIdToEdit) {
                loadStoreData(storeIdToEdit, formElements);
            } else {
                if(formElements.formErrorDiv) { formElements.formErrorDiv.textContent = "錯誤：未指定店家。"; formElements.formErrorDiv.style.display = 'block'; }
                if(formElements.loadingSpinner) formElements.loadingSpinner.style.display = 'none';
                if(formElements.editStoreForm) formElements.editStoreForm.style.display = 'none';
            }
        } else {
            console.log("Edit Store Page: User not logged in. Redirecting...");
            showToast("請先登入以編輯店家資料。", "warning", "需要登入");
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        }
    });

    // --- 4. Form Submission Logic ---
    if (formElements.editStoreForm) {
        formElements.editStoreForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentUser = auth.currentUser;
            if (!currentUser) { showToast("請重新登入。", "warning", "需要認證"); return; }

            const submitButton = formElements.editStoreForm.querySelector('button[type="submit"]');
            if(formElements.formErrorDiv) formElements.formErrorDiv.style.display = 'none';
            if(submitButton) { submitButton.disabled = true; submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 儲存中...';}

            const docId = formElements.docIdInput ? formElements.docIdInput.value : null;
            if (!docId) {
                if(formElements.formErrorDiv) { formElements.formErrorDiv.textContent = "錯誤：店家 ID 遺失。"; formElements.formErrorDiv.style.display = 'block';}
                if(submitButton) { submitButton.disabled = false; submitButton.textContent = '儲存變更';}
                return;
            }

            const updatedData = {
                name: formElements.name ? formElements.name.value.trim() : '',
                district: formElements.district ? formElements.district.value : '',
                category: formElements.category ? formElements.category.value.trim() : '',
                address: formElements.address ? formElements.address.value.trim() : '',
                price: formElements.price ? formElements.price.value.trim() : '',
                description: formElements.description ? formElements.description.value.trim() : '',
                dishes: formElements.dishes ? formElements.dishes.value.trim() : '',
                place_id: formElements.placeId ? formElements.placeId.value.trim() : '',
                lastEditedBy: { uid: currentUser.uid, email: currentUser.email },
                lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const lat = formElements.lat ? parseFloat(formElements.lat.value) : NaN;
            const lng = formElements.lng ? parseFloat(formElements.lng.value) : NaN;
            if (!isNaN(lat) && !isNaN(lng)) { updatedData.location = new firebase.firestore.GeoPoint(lat, lng); }

            if (!updatedData.name || !updatedData.district || !updatedData.category) {
                if(formElements.formErrorDiv) { formElements.formErrorDiv.textContent = "店家名稱、行政區和分類為必填。"; formElements.formErrorDiv.style.display = 'block';}
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

// --- 5. Google Maps API Integration ---
function initMap() {
    console.log("Google Maps API loaded, initializing autofill for Edit page.");
    const formElements = {
        name: document.getElementById('editStoreName'),
        address: document.getElementById('editStoreAddress'),
        placeId: document.getElementById('editStorePlaceId'),
        lat: document.getElementById('editStoreLat'),
        lng: document.getElementById('editStoreLng'),
        district: document.getElementById('editStoreDistrict')
    };
    const googleMapsUrlInput = document.getElementById('googleMapsUrl');
    
    // In edit mode, we still allow overwriting fields as the user might want to refresh data from Google Maps.
    initGoogleMapsAutofill(googleMapsUrlInput, formElements, true);
}

console.log("edit-store-script.js: Script parsed completely.");
