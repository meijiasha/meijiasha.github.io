// --- 全域變數 ---
// (保持不變)
let map;
let currentMapMarkers = [];
let infoWindow;
let autocomplete;
let currentSelectedDistrict = null;
let placesService;

// 台北市行政區
// (保持不變)
const taipeiDistricts = [
    "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
    "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
];

// --- 初始化地圖與相關服務 ---
// (保持不變)
async function initMap() {
    const taipeiCenter = { lat: 25.0479, lng: 121.5171 };

    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    map = new Map(document.getElementById("map"), {
        center: taipeiCenter,
        zoom: 12,
        mapId: "DEMO_MAP_ID",
        disableDefaultUI: true,
        zoomControl: true
    });

    infoWindow = new google.maps.InfoWindow();
    placesService = new google.maps.places.PlacesService(map);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const taipeiBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(24.96, 121.45),
            new google.maps.LatLng(25.21, 121.66)
        );
        const autocompleteOptions = {
            fields: ["formatted_address","description","geometry", "name","price", "place_id"],
            strictBounds: false,
            bounds: taipeiBounds
        };
        autocomplete = new google.maps.places.Autocomplete(searchInput, autocompleteOptions);
        autocomplete.addListener("place_changed", handlePlaceSearchSelection);
        setupSearchBarAnimation();
    }

    populateDistrictSelect();
    setupSidebarListeners();
}

// --- 側邊欄相關邏輯 ---
// (保持不變 - 上次修改已確保點擊分類時 openFirst 為 true)
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
    const categoryListDiv = document.getElementById('categoryList');
    const randomBtn = document.getElementById('randomRecommendBtn');

    districtSelect.addEventListener('change', async (event) => {
        currentSelectedDistrict = event.target.value;
        if (currentSelectedDistrict) {
            await loadCategoriesForDistrict(currentSelectedDistrict);
            randomBtn.disabled = false;
        } else {
            categoryListDiv.innerHTML = '<p class="text-muted small">請先選擇行政區</p>';
            randomBtn.disabled = true;
            clearMapMarkers();
            currentSelectedDistrict = null;
        }
    });

    categoryListDiv.addEventListener('click', (event) => {
        const target = event.target.closest('.list-group-item');
        if (target && target.dataset.category) {
            const category = target.dataset.category;
            const activeItem = categoryListDiv.querySelector('.list-group-item.active');
            if (activeItem) activeItem.classList.remove('active');
            target.classList.add('active');
            console.log(`點擊分類: ${category} (於 ${currentSelectedDistrict})`);
            // 確認這裡 openFirst 是 true
            showStoresByCategory(currentSelectedDistrict, category, true);
        }
    });

    randomBtn.addEventListener('click', () => {
        if (currentSelectedDistrict) {
            // 隨機推薦時 openFirst 也是 true
            showRandomStores(currentSelectedDistrict, true);
        }
    });
}

async function loadCategoriesForDistrict(district) {
    const categoryListDiv = document.getElementById('categoryList');
    categoryListDiv.innerHTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"><span class="visually-hidden">載入中...</span></div>';
    try {
        const snapshot = await db.collection('stores_taipei')
                                 .where('district', '==', district).get();
        if (snapshot.empty) {
            categoryListDiv.innerHTML = '<p class="text-muted small">此區域無店家資料</p>';
            clearMapMarkers(); return;
        }
        const categories = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.category) categories.add(data.category);
        });
        if (categories.size === 0) {
             categoryListDiv.innerHTML = '<p class="text-muted small">此區域店家無分類資料</p>';
             clearMapMarkers(); return;
        }
        let categoryHTML = '';
        categories.forEach(category => {
            categoryHTML += `<button type="button" class="list-group-item list-group-item-action" data-category="${category}"> ${category} </button>`;
        });
        categoryListDiv.innerHTML = categoryHTML;
        clearMapMarkers();
    } catch (error) {
        console.error("載入分類時發生錯誤:", error);
        categoryListDiv.innerHTML = '<p class="text-danger small">讀取分類失敗，請稍後再試</p>';
    }
}

async function showStoresByCategory(district, category, openFirst = false) {
    console.log(`查詢店家 - 行政區: ${district}, 分類: ${category}`);
    try {
        const snapshot = await db.collection('stores_taipei')
                                 .where('district', '==', district)
                                 .where('category', '==', category).get();
        const stores = [];
        snapshot.forEach(doc => stores.push({ id: doc.id, ...doc.data() }));
        if (stores.length === 0) console.log("在此行政區找不到符合此分類的店家。");
        await displayMarkers(stores, openFirst);
    } catch (error) {
        console.error("依分類查詢店家時發生錯誤:", error);
    }
}

async function showRandomStores(district, openFirst = true) {
     console.log(`查詢隨機店家 - 行政區: ${district}`);
     try {
        const snapshot = await db.collection('stores_taipei')
                                 .where('district', '==', district).get();
        const allStoresInDistrict = [];
        snapshot.forEach(doc => allStoresInDistrict.push({ id: doc.id, ...doc.data() }));
        if (allStoresInDistrict.length === 0) { alert("此區域尚無店家資料可供推薦。"); return; }
        for (let i = allStoresInDistrict.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allStoresInDistrict[i], allStoresInDistrict[j]] = [allStoresInDistrict[j], allStoresInDistrict[i]];
        }
        const randomStores = allStoresInDistrict.slice(0, 3);
        const activeItem = document.querySelector('#categoryList .list-group-item.active');
        if (activeItem) activeItem.classList.remove('active');
        await displayMarkers(randomStores, openFirst);
     } catch (error) {
        console.error("查詢隨機店家時發生錯誤:", error);
        alert("讀取隨機店家時發生錯誤，請稍後再試。");
     }
}

// --- 地圖標記 (Marker) 與資訊視窗 (InfoWindow) 相關邏輯 ---
// (clearMapMarkers 保持不變)
function clearMapMarkers() {
    currentMapMarkers.forEach(marker => marker.setMap(null));
    currentMapMarkers = [];
    infoWindow.close();
}

// (displayMarkers 保持不變 - 其核心邏輯已包含 openFirst 處理)
async function displayMarkers(stores, openFirst = false) {
    clearMapMarkers();

    if (!stores || stores.length === 0) {
        console.log("沒有店家資料可供顯示。"); return;
    }

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const bounds = new google.maps.LatLngBounds();
    let firstMarkerOpened = false;

    const detailPromises = stores.map(store => {
        if (store.place_id && store.location && typeof store.location.latitude === 'number' && typeof store.location.longitude === 'number') {
            const request = {
                placeId: store.place_id,
                fields: [
                    'name', 'formatted_address', 'geometry', 'formatted_phone_number',
                    'opening_hours', 'photos', 'types', 'website',
                    'rating', 'user_ratings_total'
                ]
            };
            return new Promise((resolve) => {
                placesService.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        resolve({ ...store, placeDetails: place });
                    } else {
                        console.error(`無法取得 Place ID 為 ${store.place_id} 的詳細資訊: ${status}`);
                        resolve(store); // 返回原始 store 資料
                    }
                });
            });
        } else {
            console.warn(`店家 "${store.name || '未知名稱'}" 缺少 place_id 或有效 location。`);
            return Promise.resolve(store);
        }
    });

    try {
        const storesWithDetails = await Promise.all(detailPromises);

        storesWithDetails.forEach((storeData, index) => {
            if (!storeData.location || typeof storeData.location.latitude !== 'number' || typeof storeData.location.longitude !== 'number') {
                console.warn(`跳過店家 "${storeData.name || '未知名稱'}" 因缺少有效位置。`);
                return;
            }
            const position = { lat: storeData.location.latitude, lng: storeData.location.longitude };
            const marker = new AdvancedMarkerElement({ map: map, position: position, title: storeData.name || '店家名稱 N/A' });
            currentMapMarkers.push(marker);
            const content = buildInfoWindowContent(storeData); // ***修改點在這裡***

            marker.addListener('click', () => {
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
            });

            if (openFirst && !firstMarkerOpened && marker && content) { // 檢查 marker 和 content 是否有效
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
                firstMarkerOpened = true;
            }
            bounds.extend(position);
        });

        if (currentMapMarkers.length > 0) {
            map.fitBounds(bounds);
            if (currentMapMarkers.length === 1) {
                 setTimeout(() => {
                     if (map.getZoom() > 17) map.setZoom(17);
                     else if (map.getZoom() < 15) map.setZoom(15);
                 }, 150);
            } else if (currentMapMarkers.length > 1 && bounds.getNorthEast().equals(bounds.getSouthWest())) {
                  map.setCenter(bounds.getCenter());
                  map.setZoom(17);
            }
        }
    } catch (error) {
        console.error("處理店家詳細資訊或建立標記時發生錯誤:", error);
    }
}

// *** 修改 buildInfoWindowContent 函數以確保價格區間顯示 ***

function buildInfoWindowContent(storeData) {
    const placeDetails = storeData.placeDetails;
    let content = `<div style="max-width: 320px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5;">`;

    if (placeDetails?.photos?.length > 0) {
        const photoUrl = placeDetails.photos[0].getUrl({ maxWidth: 300, maxHeight: 150 });
        content += `<img src="${photoUrl}" alt="${storeData.name}" style="width: 100%; height: auto; margin-bottom: 10px; border-radius: 4px;">`;
    }

    content += `<h5 style="margin-top: 0; margin-bottom: 8px; font-size: 1.1em; font-weight: 600;">${storeData.name || '店家名稱 N/A'}</h5>`;

     // 🔥 顯示自訂價格欄位 (來自 Firebase)
     if (storeData.price) {
        content += `<p style="margin: 0 0 10px 0; color: #444;"><strong style="color: #333;">每人平均消費約:</strong> ${storeData.price}</p>`;
    }

    
    if (placeDetails?.rating) {
        content += `<p style="margin: 0 0 6px 0;">
            <span style="color: #FBBC05; font-size: 1.1em;">★</span> ${placeDetails.rating.toFixed(1)}
            <span style="color: #70757a; font-size: 0.85em; margin-left: 6px;">(${placeDetails.user_ratings_total || 0} 則評論)</span>
        </p>`;
    }

    content += `<p style="margin: 0 0 6px 0;"><strong>分類:</strong> ${storeData.category || '未分類'}`;
    if (placeDetails?.price_level !== undefined) {
        const price = '$'.repeat(placeDetails.price_level || 0) || '免費';
        content += `   •   <span title="價格等級" style="color: #555;">${price}</span>`;
    }
    content += `</p>`;

    content += `<p style="margin: 0 0 6px 0;"><strong>地址:</strong> ${storeData.address || placeDetails?.formatted_address || 'N/A'}</p>`;

    if (placeDetails?.formatted_phone_number) {
        content += `<p style="margin: 0 0 6px 0;"><strong>電話:</strong> <a href="tel:${placeDetails.formatted_phone_number}" style="color: #007bff;">${placeDetails.formatted_phone_number}</a></p>`;
    }

    content += `<div style="margin: 0 0 8px 0;"><strong>營業時間:</strong> `;
    if (placeDetails?.opening_hours) {
        const isOpen = placeDetails.opening_hours.isOpen();
        content += `<span style="color: ${isOpen ? '#28a745' : '#dc3545'}; font-weight: bold;">${isOpen ? '營業中' : '休息中'}</span>`;
        if (placeDetails.opening_hours.weekday_text) {
            content += `<ul style="padding-left: 18px; font-size: 0.85em; color: #5f6368; list-style-type: none;">`;
            placeDetails.opening_hours.weekday_text.forEach(t => {
                content += `<li style="margin-bottom: 2px;">${t}</li>`;
            });
            content += `</ul>`;
        }
    } else {
        content += `<span style="color: #999;">N/A</span>`;
    }
    content += `</div>`;

    if (placeDetails?.website) {
        content += `<p style="margin: 0 0 10px 0;"><a href="${placeDetails.website}" target="_blank" style="color: #007bff;">店家網站 <i class="bi bi-box-arrow-up-right" style="font-size: 0.8em;"></i></a></p>`;
    }
/*
        // 🔥 顯示自訂價格欄位 (來自 Firebase)
        if (storeData.price) {
            content += `<p style="margin: 0 0 10px 0; color: #444;"><strong style="color: #333;">價格範圍:</strong> ${storeData.price}</p>`;
        }
        */
    
        // 🔥 新增 description 顯示區塊
        if (storeData.description) {
            content += `<p style="margin: 0 0 10px 0; color: #555;"><strong style="color: #333;">簡介:</strong> ${storeData.description}</p>`;
        }
    
        content += `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeData.address || storeData.name)}&query_place_id=${storeData.place_id || ''}" target="_blank" class="btn btn-sm btn-outline-primary mt-1" style="font-size: 0.85em; padding: 4px 8px;">在 Google 地圖上查看</a>`;
        content += `</div>`;
        return content;
    
}


function handlePlaceSearchSelection() {
    infoWindow.close();
    // clearMapMarkers(); // 可選：是否清除側邊欄結果

    const placeResult = autocomplete.getPlace();
    if (!placeResult || !placeResult.place_id) {
        window.alert("請從建議列表中選擇一個地點。"); return;
    }

    const request = {
        placeId: placeResult.place_id,
        fields: [
            'name', 'formatted_address', 'geometry', 'formatted_phone_number',
            'opening_hours', 'price_level', 'photos', 'types', 'website',
            'rating', 'user_ratings_total'
        ]
    };

    placesService.getDetails(request, async (placeDetails, status) => {
         if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails && placeDetails.geometry) {
             if (placeDetails.geometry.viewport) map.fitBounds(placeDetails.geometry.viewport);
             else { map.setCenter(placeDetails.geometry.location); map.setZoom(17); }

             const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
             const searchMarker = new AdvancedMarkerElement({ map, position: placeDetails.geometry.location, title: placeDetails.name });

             const simulatedStoreData = {
                 name: placeDetails.name, address: placeDetails.formatted_address, place_id: placeResult.place_id,
                 location: { latitude: placeDetails.geometry.location.lat(), longitude: placeDetails.geometry.location.lng() },
                 placeDetails: placeDetails
             };
             const content = buildInfoWindowContent(simulatedStoreData);

             infoWindow.setContent(content);
             infoWindow.open(map, searchMarker);
             searchMarker.addListener('click', () => { infoWindow.setContent(content); infoWindow.open(map, searchMarker); });
             // currentMapMarkers.push(searchMarker); // 可選
         } else {
            console.error("無法取得搜尋地點的詳細資訊: ", status);
            window.alert("無法取得地點 '" + (placeResult.name || placeResult.place_id) + "' 的詳細資訊。");
         }
    });
}

// --- 設定搜尋框動畫 (如果保留搜尋框) ---
// (保持不變)
function setupSearchBarAnimation() {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.querySelector('.search-container');
    if (!searchButton || !searchInput || !searchContainer) return;
    searchButton.addEventListener('click', (event) => { event.preventDefault(); searchContainer.classList.add('active'); searchInput.focus(); });
    searchInput.addEventListener('blur', () => { setTimeout(() => { const activeElement = document.activeElement; if ( searchInput.value === '' && (!activeElement || !activeElement.closest('.pac-container'))) { searchContainer.classList.remove('active'); } }, 150); });
    searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') event.preventDefault(); });
}