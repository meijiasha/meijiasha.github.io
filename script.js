// --- 全域變數 ---
let map;
let currentMapMarkers = {};
let infoWindow;
let autocomplete;
let currentSelectedDistrict = null;
let placesService;
let userCurrentLocation = null; // 用於儲存使用者位置

// --- 深色模式地圖樣式 ---
const darkModeMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

// --- 主題切換邏輯 ---
function setDarkMode(isDark) {
    const htmlEl = document.documentElement;
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const darkModeLabel = document.getElementById('darkModeLabel');

    if (isDark) {
        htmlEl.setAttribute('data-bs-theme', 'dark');
        if (darkModeLabel) darkModeLabel.innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
        htmlEl.removeAttribute('data-bs-theme');
        if (darkModeLabel) darkModeLabel.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
    }

    if (map) {
        map.setOptions({ styles: isDark ? darkModeMapStyles : [] });
    }
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (darkModeSwitch) darkModeSwitch.checked = isDark;
}

// --- Helper functions ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// 台北市行政區
const taipeiDistricts = ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"];

// --- 初始化地圖與相關服務 ---
async function initMap() {
    let initialCenter = { lat: 25.0479, lng: 121.5171 };
    let initialZoom = 12;

    // 嘗試獲取使用者位置
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                // 設定超時以避免無限等待
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            initialCenter = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            initialZoom = 15;
            userCurrentLocation = initialCenter; // 儲存使用者位置
            document.getElementById('recommendNearbyBtn').disabled = false; // 啟用按鈕
            console.log("成功獲取使用者位置:", initialCenter);
        } catch (error) {
            console.warn("獲取地理位置失敗或被拒絕。將使用預設位置。", error.message);
        }
    } else {
        console.warn("此瀏覽器不支援地理位置功能。");
    }

    const { Map } = await google.maps.importLibrary("maps");
    map = new Map(document.getElementById("map"), {
        center: initialCenter,
        zoom: initialZoom,
        // mapId: "DEMO_MAP_ID", // 註解掉以啟用客戶端樣式，讓深色模式正常運作
        disableDefaultUI: true,
        zoomControl: true
    });

    // 如果成功獲取使用者位置，則放置一個特殊標記
    if (initialZoom === 15) { 
        new google.maps.Marker({
            map: map,
            position: initialCenter,
            title: "您的目前位置",
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2
            }
        });
    }
    
    const isCurrentlyDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    setDarkMode(isCurrentlyDark);

    infoWindow = new google.maps.InfoWindow();
    placesService = new google.maps.places.PlacesService(map);
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const autocompleteOptions = { fields: ["geometry", "name"], strictBounds: false };
        autocomplete = new google.maps.places.Autocomplete(searchInput, autocompleteOptions);
        autocomplete.addListener("place_changed", handlePlaceSearchSelection);
        setupSearchBarAnimation();
    }
    populateDistrictSelect();
    setupSidebarListeners();
}

// --- UI 清理函式 ---
function clearRandomRecommendation() {
    const resultDiv = document.getElementById('random-recommendation-result');
    if (resultDiv) resultDiv.innerHTML = '';
}

function clearSearchResults() {
    const resultsContainer = document.getElementById('search-results-container');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }
}

// --- 側邊欄邏輯 ---
function populateDistrictSelect() {
    const selectElement = document.getElementById('districtSelect');
    selectElement.innerHTML = '<option selected disabled value="">-- 請選擇 --</option>';
    taipeiDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        selectElement.appendChild(option);
    });
}

function setupSidebarListeners() {
    const districtSelect = document.getElementById('districtSelect');
    const categorySelect = document.getElementById('categorySelect');
    const randomBtn = document.getElementById('randomRecommendBtn');
    districtSelect.addEventListener('change', async (event) => {
        currentSelectedDistrict = event.target.value;
        clearRandomRecommendation();
        clearSearchResults();
        if (currentSelectedDistrict) {
            await loadCategoriesForDistrict(currentSelectedDistrict);
            randomBtn.disabled = false;
        } else {
            categorySelect.innerHTML = '<option selected disabled value="">-- 請先選擇行政區 --</option>';
            categorySelect.disabled = true;
            randomBtn.disabled = true;
            clearMapMarkers();
            currentSelectedDistrict = null;
        }
    });
    categorySelect.addEventListener('change', (event) => {
        const category = event.target.value;
        if (category) {
            clearRandomRecommendation();
            clearSearchResults();
            showStoresByCategory(currentSelectedDistrict, category, true);
        }
    });
    randomBtn.addEventListener('click', () => {
        if (currentSelectedDistrict) {
            clearSearchResults();
            const selectedCategory = categorySelect.value;
            const isOpenNow = document.getElementById('openNowFilter').checked;
            showRandomStores(currentSelectedDistrict, selectedCategory, true, isOpenNow);
        }
    });

    const recommendNearbyBtn = document.getElementById('recommendNearbyBtn');
    recommendNearbyBtn.addEventListener('click', recommendNearbyStores);
}

// --- 資料載入與顯示邏輯 ---
async function loadCategoriesForDistrict(district) {
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '<option>載入中...</option>';
    categorySelect.disabled = true;
    try {
        const snapshot = await db.collection('stores_taipei').where('district', '==', district).get();
        const categories = new Set();
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.category) categories.add(data.category);
            });
        }
        if (categories.size === 0) {
             categorySelect.innerHTML = '<option selected disabled value="">-- 無分類資料 --</option>';
             clearMapMarkers(); 
             return;
        }
        categorySelect.innerHTML = '<option selected disabled value="">-- 請選擇分類 --</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        categorySelect.disabled = false;
        clearMapMarkers();
    } catch (error) {
        console.error("載入分類時發生錯誤:", error);
        categorySelect.innerHTML = '<option selected disabled value="">-- 讀取失敗 --</option>';
    }
}

async function showStoresByCategory(district, category, openFirst = false) {
    try {
        const snapshot = await db.collection('stores_taipei').where('district', '==', district).where('category', '==', category).get();
        const stores = [];
        snapshot.forEach(doc => stores.push({ id: doc.id, ...doc.data() }));
        await displayMarkers(stores, openFirst);
    } catch (error) {
        console.error("依分類查詢店家時發生錯誤:", error);
    }
}

async function showRandomStores(district, category, openFirst, isOpenNow) {
    const resultsDiv = document.getElementById('random-recommendation-result');
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) categorySelect.selectedIndex = 0;

    if (!isOpenNow) {
        if (resultsDiv) resultsDiv.innerHTML = '';
        try {
            const snapshot = await db.collection('stores_taipei').where('district', '==', district).get();
            const allStoresInDistrict = [];
            snapshot.forEach(doc => allStoresInDistrict.push({ id: doc.id, ...doc.data() }));
            if (allStoresInDistrict.length === 0) {
                alert("此區域尚無店家資料可供推薦。");
                return;
            }
            let randomStores = [];
            let fromCategoryCount = 0;
            let fromOthersCount = 0;
            const numToRecommend = 3;
            if (category) {
                let storesInCategory = allStoresInDistrict.filter(s => s.category === category);
                let storesInOtherCategories = allStoresInDistrict.filter(s => s.category !== category);
                shuffleArray(storesInCategory);
                shuffleArray(storesInOtherCategories);
                const takeFromCategory = Math.min(storesInCategory.length, numToRecommend);
                randomStores = storesInCategory.slice(0, takeFromCategory);
                fromCategoryCount = randomStores.length;
                const remainingNeeded = numToRecommend - fromCategoryCount;
                if (remainingNeeded > 0 && storesInOtherCategories.length > 0) {
                    const takeFromOthers = Math.min(remainingNeeded, storesInOtherCategories.length);
                    randomStores.push(...storesInOtherCategories.slice(0, takeFromOthers));
                    fromOthersCount = takeFromOthers;
                }
            } else {
                shuffleArray(allStoresInDistrict);
                randomStores = allStoresInDistrict.slice(0, numToRecommend);
            }
            await displayMarkers(randomStores, openFirst);
            displayRecommendationInSidebar(randomStores, category, fromCategoryCount, fromOthersCount);
        } catch (error) {
            console.error("查詢隨機店家時發生錯誤:", error);
            alert("讀取隨機店家時發生錯誤，請稍後再試。");
        }
    } else {
        if(resultsDiv) resultsDiv.innerHTML = `<div class="text-center text-muted p-2"><div class="spinner-border spinner-border-sm" role="status"></div> 尋找營業中的店家...</div>`;
        try {
            let query = db.collection('stores_taipei').where('district', '==', district);
            if (category) {
                query = query.where('category', '==', category);
            }
            const snapshot = await query.get();
            const potentialStores = [];
            snapshot.forEach(doc => potentialStores.push({ id: doc.id, ...doc.data() }));
            if (potentialStores.length === 0) {
                if(resultsDiv) resultsDiv.innerHTML = `<p class="text-muted small p-2 text-center">此條件下找不到任何店家。</p>`;
                clearMapMarkers();
                return;
            }
            shuffleArray(potentialStores);
            const openStores = await displayAndFilterStores(
                potentialStores, 
                store => store.placeDetails?.opening_hours?.isOpen() === true, 
                3,
                openFirst
            );
            if (openStores.length === 0) {
                 if(resultsDiv) resultsDiv.innerHTML = `<p class="text-muted small p-2 text-center">找不到符合條件且在營業中的店家。</p>`;
            } else {
                const title = `<h6>營業中隨機推薦：</h6>`;
                displayRecommendationInSidebar(openStores, null, 0, 0, title);
            }
        } catch (error) {
            console.error("查詢營業中隨機店家時發生錯誤:", error);
            if(resultsDiv) resultsDiv.innerHTML = `<p class="text-danger small p-2 text-center">搜尋時發生錯誤。</p>`;
        }
    }
}

async function recommendNearbyStores() {
    const resultsDiv = document.getElementById('random-recommendation-result');
    if (!userCurrentLocation) {
        alert("無法獲取您的目前位置，請確認已授權定位服務。");
        return;
    }

    // Clear other UI elements
    clearSearchResults();
    const districtSelect = document.getElementById('districtSelect');
    if (districtSelect) districtSelect.selectedIndex = 0;
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.innerHTML = '<option selected disabled value="">-- 請先選擇行政區 --</option>';
        categorySelect.disabled = true;
    }

    if (resultsDiv) {
        resultsDiv.innerHTML = `<div class="text-center text-muted p-2"><div class="spinner-border spinner-border-sm" role="status"></div> 搜尋附近店家中...</div>`;
    }

    try {
        const snapshot = await db.collection('stores_taipei').get();
        const allStores = [];
        snapshot.forEach(doc => allStores.push({ id: doc.id, ...doc.data() }));

        const searchRadiusKm = 2; // Search within 2km
        const nearbyStores = allStores.map(store => {
            if (!store.location || typeof store.location.latitude !== 'number' || typeof store.location.longitude !== 'number') {
                return null;
            }
            const distance = getDistance(userCurrentLocation.lat, userCurrentLocation.lng, store.location.latitude, store.location.longitude);
            return { ...store, distance };
        }).filter(store => store && store.distance <= searchRadiusKm);

        nearbyStores.sort((a, b) => a.distance - b.distance);

        const top3Results = nearbyStores.slice(0, 3);

        if (top3Results.length > 0) {
            await displayMarkers(top3Results, true);
            const title = `<h6>您附近 ${searchRadiusKm} 公里內的店家：</h6>`;
            displayRecommendationInSidebar(top3Results, null, 0, 0, title);
        } else {
            if (resultsDiv) {
                resultsDiv.innerHTML = `<p class="text-center text-muted p-3">尚未收錄附近店家，我們會盡快收錄讓你知道咩呷啥</p>`;
            }
            clearMapMarkers();
        }
    } catch (error) {
        console.error("搜尋附近店家時發生錯誤:", error);
        if (resultsDiv) {
            resultsDiv.innerHTML = `<p class="text-danger small p-2 text-center">搜尋時發生錯誤。</p>`;
        }
    }
}

// --- 搜尋邏輯 ---
async function handlePlaceSearchSelection() {
    const placeResult = autocomplete.getPlace();
    if (!placeResult || !placeResult.geometry) {
        window.alert("請從建議列表中選擇一個地點。");
        return;
    }
    clearRandomRecommendation();
    const districtSelect = document.getElementById('districtSelect');
    if (districtSelect) districtSelect.selectedIndex = 0;
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.innerHTML = '<option selected disabled value="">-- 請先選擇行政區 --</option>';
        categorySelect.disabled = true;
    }
    const searchLocation = placeResult.geometry.location;
    map.setCenter(searchLocation);
    map.setZoom(15);
    const resultsContainer = document.getElementById('search-results-container');
    resultsContainer.innerHTML = '<div class="p-3 text-center"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div> 搜尋附近店家中...</div>';
    resultsContainer.style.display = 'block';
    try {
        const snapshot = await db.collection('stores_taipei').get();
        const allStores = [];
        snapshot.forEach(doc => allStores.push({ id: doc.id, ...doc.data() }));
        const searchRadiusKm = 1;
        const nearbyStores = allStores.map(store => {
            if (!store.location || typeof store.location.latitude !== 'number' || typeof store.location.longitude !== 'number') return null;
            const distance = getDistance(searchLocation.lat(), searchLocation.lng(), store.location.latitude, store.location.longitude);
            return { ...store, distance };
        }).filter(store => store && store.distance <= searchRadiusKm);
        nearbyStores.sort((a, b) => a.distance - b.distance);
        const topResults = nearbyStores.slice(0, 20);
        await displayMarkers(topResults, false);
        renderSearchResults(topResults);
    } catch (error) {
        console.error("搜尋附近店家時發生錯誤:", error);
        resultsContainer.innerHTML = '<div class="p-3 text-center text-danger">搜尋時發生錯誤。</div>';
    }
}

function renderSearchResults(stores) {
    const container = document.getElementById('search-results-container');
    if (!container) return;
    let content = `
        <div class="search-results-header">
            <h6>附近店家</h6>
            <button id="close-search-results" type="button" class="btn-close" aria-label="Close"></button>
        </div>
        <div class="list-group list-group-flush">
    `;
    if (stores.length === 0) {
        content += '<div class="list-group-item text-center text-muted">附近 1 公里內找不到店家資料。</div>';
    } else {
        stores.forEach(store => {
            content += `
                <a href="#" class="list-group-item list-group-item-action" data-store-id="${store.id}">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${store.name}</h6>
                        <small class="text-muted">${store.distance.toFixed(2)} km</small>
                    </div>
                    <p class="mb-1 small">${store.address || ''}</p>
                    <small class="badge bg-secondary rounded-pill">${store.category || '未分類'}</small>
                </a>
            `;
        });
    }
    content += '</div>';
    container.innerHTML = content;
    container.querySelector('#close-search-results').addEventListener('click', () => {
        clearSearchResults();
        clearMapMarkers();
    });
    container.querySelectorAll('.list-group-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const storeId = e.currentTarget.dataset.storeId;
            const marker = currentMapMarkers[storeId];
            if (marker) {
                map.panTo(marker.position);
                google.maps.event.trigger(marker, 'click');
            }
        });
    });
}

// --- 側邊欄推薦結果顯示 ---
function displayRecommendationInSidebar(stores, category, fromCategoryCount, fromOthersCount, customTitle = null) {
    const resultDiv = document.getElementById('random-recommendation-result');
    if (!resultDiv) return;
    if (!stores || stores.length === 0) {
        resultDiv.innerHTML = '<p class="text-muted small p-2 text-center">找不到可推薦的店家。</p>';
        return;
    }
    let title = customTitle || '<h6>隨機推薦結果：</h6>';
    if (!customTitle && category && fromCategoryCount > 0) {
        title += `<p class="small text-muted mb-2">從「<strong>${category}</strong>」選出 ${fromCategoryCount} 間`;
        if (fromOthersCount > 0) {
            const otherStores = stores.filter(s => s.category !== category);
            const otherCategories = [...new Set(otherStores.map(s => s.category))].filter(Boolean);
            if (otherCategories.length > 0) {
                const otherCategoriesText = otherCategories.map(c => `「${c}」`).join('、');
                title += `，再從 ${otherCategoriesText} 選出 ${fromOthersCount} 間。`;
            } else {
                title += `，再從其他分類選出 ${fromOthersCount} 間。`;
            }
        } else {
            title += `。`;
        }
        title += `</p>`;
    }
    let content = title;
    content += '<div class="list-group">';
    stores.forEach(store => {
        content += `
            <a href="#" class="list-group-item list-group-item-action" data-store-id="${store.id}">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <h6 class="mb-1">${store.name}</h6>
                    <span class="badge bg-secondary rounded-pill">${store.category || '未分類'}</span>
                </div>
                <p class="mb-1 small mt-1">${store.address || '地址未提供'}</p>
            </a>
        `;
    });
    content += '</div>';
    resultDiv.innerHTML = content;
    resultDiv.querySelectorAll('.list-group-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const storeId = e.currentTarget.dataset.storeId;
            const marker = currentMapMarkers[storeId];
            if (marker) {
                map.panTo(marker.position);
                google.maps.event.trigger(marker, 'click');
            }
        });
    });
}

// --- 地圖標記與 InfoWindow ---
function clearMapMarkers() {
    Object.values(currentMapMarkers).forEach(marker => marker.setMap(null));
    currentMapMarkers = {};
    infoWindow.close();
}

async function displayMarkers(stores, openFirst = false) {
    clearMapMarkers();
    if (!stores || stores.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    let firstMarkerOpened = false;
    const detailPromises = stores.map(store => {
        if (store.placeDetails) return Promise.resolve(store);
        if (store.place_id && store.location) {
            const request = { placeId: store.place_id, fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'opening_hours', 'photos', 'types', 'website', 'rating', 'user_ratings_total', 'business_status', 'utc_offset_minutes'] };
            return new Promise((resolve) => {
                placesService.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        resolve({ ...store, placeDetails: place });
                    } else {
                        resolve(store);
                    }
                });
            });
        } else {
            return Promise.resolve(store);
        }
    });
    const storesWithDetails = await Promise.all(detailPromises);
    storesWithDetails.forEach((storeData) => {
        if (!storeData.location) return;
        const position = { lat: storeData.location.latitude, lng: storeData.location.longitude };
        const marker = new google.maps.Marker({ map: map, position: position, title: storeData.name || 'N/A' });
        if (storeData.id) currentMapMarkers[storeData.id] = marker;
        const content = buildInfoWindowContent(storeData);
        marker.addListener('click', () => {
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
        });
        if (openFirst && !firstMarkerOpened && marker && content) {
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
            firstMarkerOpened = true;
        }
        bounds.extend(position);
    });
    if (Object.keys(currentMapMarkers).length > 0) {
        if (stores.length > 1) {
            map.fitBounds(bounds);
        } else {
            map.setCenter(bounds.getCenter());
            map.setZoom(17);
        }
    }
}

async function displayAndFilterStores(stores, filterFn, limit, openFirst) {
    clearMapMarkers();
    if (!stores || stores.length === 0) return [];
    const bounds = new google.maps.LatLngBounds();
    const detailPromises = stores.map(store => {
        if (store.place_id) {
            const request = { placeId: store.place_id, fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'opening_hours', 'photos', 'types', 'website', 'rating', 'user_ratings_total', 'business_status', 'utc_offset_minutes'] };
            return new Promise((resolve) => {
                placesService.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        resolve({ ...store, placeDetails: place });
                    } else {
                        resolve(store);
                    }
                });
            });
        } else {
            return Promise.resolve(store);
        }
    });
    const storesWithDetails = await Promise.all(detailPromises);
    const filteredStores = [];
    for (const storeData of storesWithDetails) {
        if (filteredStores.length >= limit) break;
        if (filterFn(storeData)) {
            filteredStores.push(storeData);
        }
    }
    if (filteredStores.length === 0) {
        return [];
    }
    let firstMarkerOpened = false;
    filteredStores.forEach((storeData) => {
        if (!storeData.location) return;
        const position = { lat: storeData.location.latitude, lng: storeData.location.longitude };
        const marker = new google.maps.Marker({ map: map, position: position, title: storeData.name || 'N/A' });
        if (storeData.id) currentMapMarkers[storeData.id] = marker;
        const content = buildInfoWindowContent(storeData);
        marker.addListener('click', () => {
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
        });
        if (openFirst && !firstMarkerOpened && marker && content) {
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
            firstMarkerOpened = true;
        }
        bounds.extend(position);
    });
    if (Object.keys(currentMapMarkers).length > 0) {
        if (filteredStores.length > 1) {
            map.fitBounds(bounds);
        } else {
            map.setCenter(bounds.getCenter());
            map.setZoom(17);
        }
    }
    return filteredStores;
}

function buildInfoWindowContent(storeData) {
    const placeDetails = storeData.placeDetails;
    let content = `<div style="max-width: 320px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5;">`;
    if (placeDetails?.photos?.length > 0) {
        const photoUrl = placeDetails.photos[0].getUrl({ maxWidth: 300, maxHeight: 150 });
        content += `<img src="${photoUrl}" alt="${storeData.name}" style="width: 100%; height: auto; margin-bottom: 10px; border-radius: 4px;">`;
    }
    content += `<h5 style="margin-top: 0; margin-bottom: 8px; font-size: 1.1em; font-weight: 600;">${storeData.name || 'N/A'}</h5>`;
    if (storeData.price) content += `<p style="margin: 0 0 10px 0; color: #444;"><strong style="color: #333;">每人平均消費約:</strong> ${storeData.price}</p>`;
    if (placeDetails?.rating) content += `<p style="margin: 0 0 6px 0;"><span style="color: #FBBC05; font-size: 1.1em;">★</span> ${placeDetails.rating.toFixed(1)} <span style="color: #70757a; font-size: 0.85em; margin-left: 6px;">(${placeDetails.user_ratings_total || 0} 則評論)</span></p>`;
    content += `<p style="margin: 0 0 6px 0;"><strong>分類:</strong> ${storeData.category || '未分類'}`;
    if (placeDetails?.price_level !== undefined) content += `  •   <span title="價格等級" style="color: #555;">${ '$'.repeat(placeDetails.price_level || 0) || '免費'}</span>`;
    content += `</p>`;
    content += `<p style="margin: 0 0 6px 0;"><strong>地址:</strong> ${storeData.address || placeDetails?.formatted_address || 'N/A'}</p>`;
    if (placeDetails?.formatted_phone_number) content += `<p style="margin: 0 0 6px 0;"><strong>電話:</strong> <a href="tel:${placeDetails.formatted_phone_number}" style="color: #007bff;">${placeDetails.formatted_phone_number}</a></p>`;
    content += `<div style="margin: 0 0 8px 0;"><strong>營業時間:</strong> `;
    if (placeDetails?.opening_hours) {
        const isOpen = placeDetails.opening_hours.isOpen();
        if (isOpen === true) {
            content += `<span style="color: #28a745; font-weight: bold;">營業中</span>`;
        } else if (isOpen === false) {
            content += `<span style="color: #dc3545; font-weight: bold;">休息中</span>`;
        } else {
            content += `<span style="color: #6c757d; font-weight: bold;">營業時間不詳</span>`;
        }
        if (placeDetails.opening_hours.weekday_text) {
            content += `<ul style="padding-left: 18px; font-size: 0.85em; color: #5f6368; list-style-type: none;">`;
            placeDetails.opening_hours.weekday_text.forEach(t => { content += `<li style="margin-bottom: 2px;">${t}</li>`; });
            content += `</ul>`;
        }
    } else {
        content += `<span style="color: #999;">N/A</span>`;
    }
    content += `</div>`;
    if (placeDetails?.website) content += `<p style="margin: 0 0 10px 0;"><a href="${placeDetails.website}" target="_blank" style="color: #007bff;">店家網站 <i class="bi bi-box-arrow-up-right" style="font-size: 0.8em;"></i></a></p>`;
    if (storeData.description) content += `<p style="margin: 0 0 10px 0; color: #555;"><strong style="color: #333;">簡介:</strong> ${storeData.description}</p>`;
    content += `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeData.address || storeData.name)}&query_place_id=${storeData.place_id || ''}" target="_blank" class="btn btn-sm btn-outline-primary mt-1" style="font-size: 0.85em; padding: 4px 8px;">在 Google 地圖上查看</a>`;
    content += `</div>`;
    return content;
}

// --- 其他 UI 邏輯 ---
function setupSearchBarAnimation() {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.querySelector('.search-container');
    if (!searchButton || !searchInput || !searchContainer) return;
    searchButton.addEventListener('click', (event) => { event.preventDefault(); searchContainer.classList.add('active'); searchInput.focus(); });
    searchInput.addEventListener('blur', () => { setTimeout(() => { const activeElement = document.activeElement; if ( searchInput.value === '' && (!activeElement || !activeElement.closest('.pac-container'))) { searchContainer.classList.remove('active'); } }, 150); });
    searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') event.preventDefault(); });
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    setDarkMode(savedTheme === 'dark');
    if(darkModeSwitch) {
        darkModeSwitch.addEventListener('change', (event) => {
            setDarkMode(event.target.checked);
        });
    }
});