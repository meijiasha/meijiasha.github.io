
// store-form-common.js
console.log("store-form-common.js: Script loaded.");

// -----------------------------------------------------------------------------
// SHARED CONSTANTS & HELPERS
// -----------------------------------------------------------------------------

const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

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

/**
 * Displays a Bootstrap Toast notification.
 * @param {string} message The message to display.
 * @param {string} type 'success', 'danger', 'warning', 'info'.
 * @param {string} title The title of the toast.
 * @param {number} delay Delay in ms for autohide. 0 for no autohide.
 */
function showToast(message, type = 'info', title = '通知', delay = 5000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) { 
        console.error("Toast container not found!"); 
        alert(`${title}: ${message}`); 
        return; 
    }
    const toastId = 'toast-' + new Date().getTime();
    const toastBgClass = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }[type] || 'bg-primary';
    const iconClass = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-info-circle-fill';
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}">
            <div class="toast-header text-white ${toastBgClass}">
                <i class="bi ${iconClass} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small class="text-white-50">剛剛</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, { delay: delay && delay > 0 ? delay : undefined, autohide: delay && delay > 0 });
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
        toast.show();
    } else { 
        alert(`${title}: ${message}`); 
    }
}

// -----------------------------------------------------------------------------
// FORM INITIALIZATION & UI LOGIC
// -----------------------------------------------------------------------------

/**
 * Populates the district select dropdown.
 * @param {HTMLSelectElement} selectElement The <select> element for districts.
 */
function populateDistrictSelect(selectElement) {
    if (!selectElement) return;
    while (selectElement.options.length > 1) { selectElement.remove(1); }
    taipeiDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district; 
        option.textContent = district;
        selectElement.appendChild(option);
    });
}

/**
 * Loads existing categories from Firestore and displays them as clickable badges.
 * @param {firebase.firestore.Firestore} db The Firestore instance.
 * @param {HTMLElement} container The container to display badges in.
 * @param {HTMLInputElement} categoryInput The category input field to populate on click.
 */
async function loadAndDisplayExistingCategories(db, container, categoryInput) {
    if (!db || !container || !categoryInput) return;

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
                    categoryInput.value = target.dataset.category;
                    // Dispatch an input event to trigger any listeners (like the color preview)
                    categoryInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }
    } catch (error) {
        console.error("Error loading existing categories:", error);
    }
}

/**
 * Initializes the category color preview functionality.
 * @param {HTMLInputElement} categoryInput The category input field.
 * @param {HTMLElement} previewElement The element to show the color preview.
 */
function initCategoryPreview(categoryInput, previewElement) {
    if (!categoryInput || !previewElement) return;
    
    const updatePreview = () => {
        const categoryName = categoryInput.value.trim();
        if (categoryName) {
            const color = generateCategoryColor(categoryName);
            previewElement.style.backgroundColor = color;
            previewElement.style.color = '#fff';
            previewElement.textContent = categoryName;
        } else {
            previewElement.style.backgroundColor = '#6c757d';
            previewElement.style.color = '#fff';
            previewElement.textContent = '預覽';
        }
    };
    
    categoryInput.addEventListener('input', updatePreview);
    // Initial call to set the state
    updatePreview();
}


// -----------------------------------------------------------------------------
// GOOGLE MAPS AUTOCOMPLETE LOGIC
// -----------------------------------------------------------------------------

/**
 * Dynamically loads the Google Maps script.
 */
function loadGoogleMapsScript() {
    // Check if the script is already loaded or being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        console.log("Google Maps script already loading or loaded.");
        return;
    }

    if (typeof GOOGLE_MAPS_API_KEY === 'undefined') {
        console.error("Google Maps API Key not found. Please check config.js");
        showToast("無法載入地圖資源，請聯繫網站管理員。", "danger", "設定錯誤");
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap&language=zh-TW®ion=TW`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.error("Google Maps script failed to load.");
        showToast("Google Maps 服務載入失敗，請檢查網路連線或 API 金鑰設定。", "danger", "載入失敗");
    };
    document.head.appendChild(script);
}

/**
 * Initializes the Google Maps Places service and sets up the URL input listener.
 * @param {HTMLInputElement} urlInput The input for the Google Maps URL.
 * @param {object} formElements A map of form elements to populate.
 * @param {boolean} shouldOverwriteName A flag to decide if the store name should be overwritten.
 */
function initGoogleMapsAutofill(urlInput, formElements, shouldOverwriteName = true) {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.error("Google Maps Places API not loaded.");
        return;
    }
    
    if (urlInput) {
        urlInput.addEventListener('input', (event) => handleUrlInput(event, formElements, shouldOverwriteName));
    }
}

function handleUrlInput(event, formElements, shouldOverwriteName) {
    const url = event.target.value;
    if (!url || !url.includes('google.com/maps/place')) {
        console.log("handleUrlInput: URL is not a Google Maps place URL or is empty.");
        return;
    }

    let placeId = null;
    // Attempt to extract Place ID from the URL
    // Updated regex to capture Place ID from various Google Maps URL formats
    // It looks for either 'placeid/' or '!1s' followed by the ID.
    const placeIdMatch = url.match(/(?:placeid\/|!1s)([^&/?]+)/);
    if (placeIdMatch && placeIdMatch[1]) {
        placeId = placeIdMatch[1];
        console.log("handleUrlInput: Extracted Place ID:", placeId);
        fetchPlaceDetailsById(placeId, url, formElements, shouldOverwriteName);
    } else {
        // Fallback to extracting place name if no Place ID is found
        const nameMatch = url.match(/google\.com\/maps\/place\/([^\/]+)/);
        if (nameMatch && nameMatch[1]) {
            const placeName = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
            console.log("handleUrlInput: Extracted Place Name:", placeName);
            fetchPlaceDetailsByName(placeName, formElements, shouldOverwriteName);
        } else {
            console.warn("handleUrlInput: Could not extract Place ID or Name from URL.");
            showToast('無法從 Google Maps 網址解析店家資訊。', 'warning', '解析失敗');
        }
    }
}

async function fetchPlaceDetailsById(placeId, originalUrl, formElements, shouldOverwriteName) {
    try {
        const { place } = await google.maps.places.Place.fromPlaceId({
            placeId: placeId,
            fields: ['displayName', 'id', 'formattedAddress', 'location'],
        });

        if (place) {
            console.log("fetchPlaceDetailsById: Place details fetched successfully:", place);
            populateFormFields(place, formElements, shouldOverwriteName);
            showToast('已從 Google Maps 網址自動填入店家資訊！', 'success', '自動帶入成功');
        } else {
            console.warn("fetchPlaceDetailsById: No place found for ID:", placeId);
            showToast('無法從 Google Maps 網址找到對應的店家 (Place ID 查詢失敗)。', 'warning', '查無資料');
            // Fallback to name search if ID fails
            const nameMatch = originalUrl.match(/google\.com\/maps\/place\/([^\/]+)/);
            if (nameMatch && nameMatch[1]) {
                const placeName = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
                console.log("fetchPlaceDetailsById: Falling back to name search:", placeName);
                fetchPlaceDetailsByName(placeName, formElements, shouldOverwriteName);
            }
        }
    } catch (error) {
        console.error("fetchPlaceDetailsById: Error fetching place details by ID:", error);
        showToast('無法從 Google Maps 網址找到對應的店家 (Place ID 查詢失敗)。', 'warning', '查無資料');
        // Fallback to name search on error
        const nameMatch = originalUrl.match(/google\.com\/maps\/place\/([^\/]+)/);
        if (nameMatch && nameMatch[1]) {
            const placeName = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
            console.log("fetchPlaceDetailsById: Falling back to name search on error:", placeName);
            fetchPlaceDetailsByName(placeName, formElements, shouldOverwriteName);
        }
    }
}

async function fetchPlaceDetailsByName(query, formElements, shouldOverwriteName) {
    try {
        const { places } = await google.maps.places.Place.searchByText({
            textQuery: query,
            fields: ['displayName', 'id', 'formattedAddress', 'location'],
        });

        if (places && places.length > 0) {
            const place = places[0];
            console.log("fetchPlaceDetailsByName: Place details fetched successfully:", place);
            populateFormFields(place, formElements, shouldOverwriteName);
            showToast('已從 Google Maps 網址自動填入店家資訊！', 'success', '自動帶入成功');
        } else {
            console.warn("fetchPlaceDetailsByName: No place found for query:", query);
            showToast('無法從 Google Maps 網址找到對應的店家 (名稱查詢失敗)。', 'warning', '查無資料');
        }
    } catch (error) {
        console.error("fetchPlaceDetailsByName: Error fetching place details by name:", error);
        showToast('無法從 Google Maps 網址找到對應的店家 (名稱查詢失敗)。', 'warning', '查無資料');
    }
}

function populateFormFields(place, formElements, shouldOverwriteName) {
    // Populate form fields
    if (formElements.name && (shouldOverwriteName || !formElements.name.value)) {
        formElements.name.value = place.displayName;
    }
    if (formElements.address) formElements.address.value = place.formattedAddress;
    if (formElements.placeId) formElements.placeId.value = place.id;
    if (place.location) {
        if (formElements.lat) formElements.lat.value = place.location.lat();
        if (formElements.lng) formElements.lng.value = place.location.lng();
    }
    
    if (formElements.district && place.formattedAddress) {
        for (const district of taipeiDistricts) {
            if (place.formattedAddress.includes(district)) {
                formElements.district.value = district;
                break;
            }
        }
    }
}
