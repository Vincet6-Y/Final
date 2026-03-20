let map;
let autocomplete;
let currentMarker = null; // 搜尋時暫時顯示的標記
let selectedPlaceData = null; // 暫存目前地圖上搜尋選取的地點資訊

let currentDay = 1; // 目前正在編輯第幾天
let totalDays = 1;  // 總天數
let spotsByDay = { 1: [] }; // 儲存所有景點的資料結構

// 🌟 地圖路線與標記管理 (從 officialMap.js 移植)
let directionsService;
let dayRouteRenderers = []; // 存放路線 (Polyline 或 DirectionsRenderer)
let routeMarkers = [];      // 存放有數字的景點標記

// ==========================================
// 1. Google Maps 初始化與搜尋綁定
// ==========================================
function initMap() {
    const defaultCenter = { lat: 35.6895, lng: 139.6917 }; 

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultCenter,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: '2fd53a2f051832ea485534f4' // 沿用你美美的地圖樣式
    });

    directionsService = new google.maps.DirectionsService();

    const input = document.getElementById("mapSearchInput");
    autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    // 當使用者在搜尋框選取地點時觸發
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
            showToast('warning', '找不到該地點的詳細資訊！');
            return;
        }

        // 移動地圖並縮放
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }

        // 放置搜尋暫存標記 (不影響已畫好的路線)
        if (currentMarker) currentMarker.setMap(null);
        currentMarker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            animation: google.maps.Animation.DROP
        });

        // 暫存地點資料，準備加入行程
        selectedPlaceData = {
            locationName: place.name,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            googlePlaceId: place.place_id,
            address: place.formatted_address
        };

        // 顯示底部的控制面板
        $('#panelPlaceName').text(place.name);
        $('#panelPlaceAddress').text(place.formatted_address);
        $('#targetDayText').text(`Day ${currentDay}`);
        
        const panel = $('#placeActionPanel');
        panel.removeClass('hidden');
        setTimeout(() => {
            panel.removeClass('translate-y-4 opacity-0').addClass('translate-y-0 opacity-100');
        }, 50);
    });
}

// 關閉搜尋控制面板
$('#closePanelBtn').on('click', function() {
    $('#placeActionPanel').addClass('translate-y-4 opacity-0').removeClass('translate-y-0 opacity-100');
    setTimeout(() => { $('#placeActionPanel').addClass('hidden'); }, 300);
    if (currentMarker) currentMarker.setMap(null); // 關閉面板時移除暫存標記
});

// ==========================================
// 🌟 核心：計算與繪製路線 (完美移植版)
// ==========================================
async function calculateAndDisplayRoute(dayToCalculate) {
    const places = spotsByDay[dayToCalculate] || [];

    // 1. 清除舊的路線與標記
    dayRouteRenderers.forEach(renderer => renderer.setMap(null));
    dayRouteRenderers = [];
    if (routeMarkers) { routeMarkers.forEach(m => m.setMap(null)); routeMarkers = []; }
    if (currentMarker) { currentMarker.setMap(null); currentMarker = null; }

    const bounds = new google.maps.LatLngBounds();

    // 2. 標記所有景點 (帶有順序數字)
    if (places.length > 0) {
        places.forEach((place, index) => {
            const isFirst = index === 0;
            const isLast = index === places.length - 1;
            let bgColor = "#ea4335"; // 中間點紅色
            if (isFirst) bgColor = "#ff8c00"; // 起點橘色
            else if (isLast && places.length > 1) bgColor = "#008ccf"; // 終點藍色

            const markerLat = parseFloat(place.latitude);
            const markerLng = parseFloat(place.longitude);
            bounds.extend({ lat: markerLat, lng: markerLng });

            const stopMarker = new google.maps.Marker({
                position: { lat: markerLat, lng: markerLng },
                map: map,
                label: { text: String(index + 1), color: "white", fontWeight: "bold", fontSize: "14px" },
                icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: bgColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 14 },
                title: place.locationName, zIndex: 999
            });
            routeMarkers.push(stopMarker);
        });
    }

    // 防呆：如果只有一個點或沒有點
    if (!places || places.length < 2) {
        if (places && places.length === 1 && !bounds.isEmpty()) {
            map.fitBounds(bounds);
            const listener = google.maps.event.addListener(map, "idle", function () {
                if (map.getZoom() > 16) map.setZoom(16);
                google.maps.event.removeListener(listener);
            });
        }
        return;
    }

    // 3. 計算路線 (大眾運輸 / 走路 / 直線)
    const results = [];
    let currentDepartureTime = new Date();
    currentDepartureTime.setDate(currentDepartureTime.getDate() + 7); // 設為未來時間確保大眾運輸有資料
    currentDepartureTime.setHours(8, 0, 0, 0);

    for (let i = 0; i < places.length - 1; i++) {
        const markerLatOrigin = parseFloat(places[i].latitude);
        const markerLngOrigin = parseFloat(places[i].longitude);
        const markerLatDest = parseFloat(places[i + 1].latitude);
        const markerLngDest = parseFloat(places[i + 1].longitude);

        const originTransit = places[i].googlePlaceId ? { placeId: places[i].googlePlaceId } : { lat: markerLatOrigin, lng: markerLngOrigin };
        const destinationTransit = places[i + 1].googlePlaceId ? { placeId: places[i + 1].googlePlaceId } : { lat: markerLatDest, lng: markerLngDest };

        const originPrecise = { lat: markerLatOrigin, lng: markerLngOrigin };
        const destPrecise = { lat: markerLatDest, lng: markerLngDest };

        const transitTime = new Date(currentDepartureTime.getTime());

        const res = await new Promise((resolve) => {
            setTimeout(() => {
                directionsService.route({
                    origin: originTransit, destination: destinationTransit, travelMode: google.maps.TravelMode.TRANSIT, transitOptions: { departureTime: transitTime }
                }, (resT, statusT) => {
                    if (statusT === "OK") {
                        resT._mode = 'TRANSIT'; resolve(resT);
                    } else {
                        directionsService.route({
                            origin: originPrecise, destination: destPrecise, travelMode: google.maps.TravelMode.WALKING
                        }, (resW, statusW) => {
                            if (statusW === "OK" && resW.routes[0].legs[0].distance.value <= 1000) {
                                resW._mode = 'WALKING'; resolve(resW);
                            } else {
                                // 距離過長，畫虛線 (Fake Route)
                                const distKm = getDistanceFromLatLonInKm(markerLatOrigin, markerLngOrigin, markerLatDest, markerLngDest);
                                let finalMode = distKm > 500 ? 'FLIGHT' : 'TRANSIT';
                                let lineColor = distKm > 500 ? '#9c27b0' : '#ff8c00';

                                resolve({
                                    _mode: finalMode, _isFake: true, _color: lineColor,
                                    _path: [{ lat: markerLatOrigin, lng: markerLngOrigin }, { lat: markerLatDest, lng: markerLngDest }],
                                    routes: [{ legs: [] }] // 後台編輯不需要詳細時間估算
                                });
                            }
                        });
                    }
                });
            }, 300); // 避免 API 頻率限制
        });

        results.push(res);
    }

    // 4. 繪製路線到地圖上
    results.forEach((res, index) => {
        if (res) {
            if (res._isFake) {
                const polyline = new google.maps.Polyline({
                    path: res._path, strokeOpacity: 0,
                    icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '15px' }],
                    strokeColor: res._color, strokeWeight: 4, map: map
                });
                dayRouteRenderers.push(polyline);
                if (res._path) res._path.forEach(point => bounds.extend(point));

            } else {
                let routeColor = res._mode === 'WALKING' ? "#008ccf" : "#ff8c00";
                const renderer = new google.maps.DirectionsRenderer({
                    map: map, suppressMarkers: true, polylineOptions: { strokeColor: routeColor, strokeWeight: 5, strokeOpacity: 0.8 }
                });
                renderer.setDirections(res);
                dayRouteRenderers.push(renderer);

                const path = res.routes[0].overview_path;
                if (path && path.length > 0) {
                    path.forEach(point => bounds.extend(point));

                    const markerStart = { lat: parseFloat(places[index].latitude), lng: parseFloat(places[index].longitude) };
                    const markerEnd = { lat: parseFloat(places[index + 1].latitude), lng: parseFloat(places[index + 1].longitude) };

                    const dashedLineOptions = {
                        strokeColor: routeColor, strokeOpacity: 0, strokeWeight: 4,
                        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' }],
                        map: map, zIndex: 1
                    };

                    dayRouteRenderers.push(new google.maps.Polyline({ path: [markerStart, path[0]], ...dashedLineOptions }));
                    dayRouteRenderers.push(new google.maps.Polyline({ path: [path[path.length - 1], markerEnd], ...dashedLineOptions }));
                }
            }
        }
    });

    // 5. 最終對焦地圖視角
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
    }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ==========================================
// 2. 行程編排邏輯 (天數切換、加入景點、刪除、排序)
// ==========================================

$('#daysCount').on('change', function() {
    const newTotal = parseInt($(this).val());
    if (newTotal < 1) return;

    totalDays = newTotal;
    for (let i = 1; i <= totalDays; i++) {
        if (!spotsByDay[i]) spotsByDay[i] = [];
    }
    
    if (currentDay > totalDays) currentDay = totalDays;

    renderDayTabs();
    renderSpotsList();
});

// 🌟 加入景點後，立刻重新計算路線
$('#addSpotBtn').on('click', function() {
    if (!selectedPlaceData) return;

    spotsByDay[currentDay].push({ ...selectedPlaceData }); 
    showToast('success', `已將 ${selectedPlaceData.locationName} 加入 Day ${currentDay}`);
    
    renderSpotsList();
    
    $('#mapSearchInput').val('');
    $('#closePanelBtn').click();
});

function renderDayTabs() {
    const container = $('#dayTabsContainer');
    container.empty();

    for (let i = 1; i <= totalDays; i++) {
        const isActive = (i === currentDay);
        const btnClass = isActive 
            ? "px-4 py-1.5 bg-primary text-background-dark font-bold text-sm rounded-full shrink-0 transition-colors"
            : "px-4 py-1.5 bg-transparent text-slate-400 hover:text-primary font-bold text-sm rounded-full shrink-0 transition-colors cursor-pointer";
        
        container.append(`<button class="day-tab-btn ${btnClass}" data-day="${i}">Day ${i}</button>`);
    }

    $('.day-tab-btn').on('click', function() {
        currentDay = $(this).data('day');
        $('#targetDayText').text(`Day ${currentDay}`); 
        renderDayTabs(); 
        renderSpotsList(); 
    });
}

// 🌟 渲染列表時，同步觸發地圖路線繪製
function renderSpotsList() {
    const container = $('#spotsListContainer');
    container.empty();

    const currentSpots = spotsByDay[currentDay] || [];

    // 每次列表更新，就呼叫路線重繪
    calculateAndDisplayRoute(currentDay);

    if (currentSpots.length === 0) {
        container.append(`<div class="text-center text-slate-500 text-sm py-10 border border-dashed border-slate-600 rounded-lg">Day ${currentDay} 目前沒有景點，請從地圖加入。</div>`);
        return;
    }

    currentSpots.forEach((spot, index) => {
        const upBtn = index > 0 ? `<button class="move-up-btn text-slate-400 hover:text-primary p-1" data-index="${index}"><span class="material-symbols-outlined text-sm">arrow_upward</span></button>` : `<div class="w-6"></div>`;
        const downBtn = index < currentSpots.length - 1 ? `<button class="move-down-btn text-slate-400 hover:text-primary p-1" data-index="${index}"><span class="material-symbols-outlined text-sm">arrow_downward</span></button>` : `<div class="w-6"></div>`;

        let bgColorClass = "bg-primary/20 text-primary"; // 中間點
        if (index === 0) bgColorClass = "bg-[#ff8c00] text-white"; // 起點
        else if (index === currentSpots.length - 1 && currentSpots.length > 1) bgColorClass = "bg-[#008ccf] text-white"; // 終點

        const html = `
            <div class="flex items-center gap-3 bg-background-dark/50 border border-primary/10 p-3 rounded-lg group">
                <div class="flex flex-col items-center">
                    ${upBtn}
                    ${downBtn}
                </div>
                <div class="w-6 h-6 rounded-full ${bgColorClass} flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                    ${index + 1}
                </div>
                <div class="flex-1 overflow-hidden">
                    <h4 class="text-sm font-bold text-slate-200 truncate">${spot.locationName}</h4>
                </div>
                <button class="delete-spot-btn text-slate-500 hover:text-red-400 p-2 transition-colors" data-index="${index}">
                    <span class="material-symbols-outlined text-base">delete</span>
                </button>
            </div>
        `;
        container.append(html);
    });

    // 🌟 綁定事件 (移動與刪除後，重新渲染列表與地圖)
    $('.move-up-btn').on('click', function() {
        const idx = $(this).data('index');
        [currentSpots[idx - 1], currentSpots[idx]] = [currentSpots[idx], currentSpots[idx - 1]];
        renderSpotsList();
    });

    $('.move-down-btn').on('click', function() {
        const idx = $(this).data('index');
        [currentSpots[idx + 1], currentSpots[idx]] = [currentSpots[idx], currentSpots[idx + 1]];
        renderSpotsList();
    });

    $('.delete-spot-btn').on('click', function() {
        const idx = $(this).data('index');
        currentSpots.splice(idx, 1);
        renderSpotsList();
    });
}

renderDayTabs();

// ==========================================
// 3. 組裝 JSON 並送出給後端
// ==========================================
$('#submitPlanBtn').on('click', function() {
    const planName = $('#planName').val().trim();
    const planCity = $('#planCity').val().trim();
    if (!planName || !planCity) {
        showToast('warning', '請填寫行程名稱與主要城市！');
        return;
    }

    const finalSpots = [];
    for (let d = 1; d <= totalDays; d++) {
        if (spotsByDay[d]) {
            spotsByDay[d].forEach((spot, index) => {
                finalSpots.push({
                    dayNumber: d,
                    visitOrder: index + 1,
                    locationName: spot.locationName,
                    longitude: spot.longitude,
                    latitude: spot.latitude,
                    googlePlaceId: spot.googlePlaceId
                });
            });
        }
    }

    const requestData = {
        workId: $('#planWorkId').val() || null,
        planName: planName,
        planCity: planCity,
        daysCount: totalDays,
        spots: finalSpots
    };

    const btn = $(this);
    btn.prop('disabled', true).text('儲存中...');

    $.ajax({
        url: "/backend/contentmanagement/plan/create",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(requestData),
        success: function (response) {
            showToast('success', '行程與景點建立成功！');
            setTimeout(() => { window.location.href = "/backend/contentmanagement"; }, 1500);
        },
        error: function (xhr) {
            showToast('error', '儲存失敗，請檢查資料或稍後再試。');
            btn.prop('disabled', false).text('確認儲存行程與景點');
        }
    });
});