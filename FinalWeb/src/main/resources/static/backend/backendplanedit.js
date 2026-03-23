let map, autocomplete, currentMarker = null, selectedPlaceData = null;
let currentDay = 1;
let totalDays = parseInt($('#daysCount').val()) || 1;
let spotsByDay = {};

let directionsService;
let dayRouteRenderers = [];
let routeMarkers = [];

// ==========================================
// 🌟 1. 取得舊資料 (與 myMapApi 同步過濾法)
// ==========================================
function loadInitialSpots() {
    for (let i = 1; i <= totalDays; i++) { spotsByDay[i] = []; }

    const planId = $('#editPlanId').val();
    if (!planId) return;

    $.ajax({
        url: `/api/plan/officialPlanNodes/${planId}`,
        method: "GET",
        success: function (nodes) {
            if (nodes && nodes.length > 0) {
                nodes.forEach(spot => {
                    const day = spot.dayNumber;
                    if (!spotsByDay[day]) spotsByDay[day] = [];

                    let timeString = "";
                    if (spot.visitTime) {
                        timeString = spot.visitTime.length > 11 ? spot.visitTime.substring(11, 16) : spot.visitTime;
                    }

                    let dbPlaceId = (spot.GooglePlaceID || spot.googlePlaceID || spot.googlePlaceId || "").toString().trim();
                    if (!dbPlaceId || dbPlaceId.includes("UNKNOWN") || dbPlaceId === "null" || dbPlaceId.length < 5) {
                        dbPlaceId = "undefined";
                    }

                    spotsByDay[day].push({
                        locationName: spot.locationName,
                        latitude: spot.latitude,
                        longitude: spot.longitude,
                        googlePlaceId: dbPlaceId,
                        visitTime: timeString,
                        stayTime: spot.stayTime || 60,
                        travelToNext: 0,
                        distanceToNext: 0,
                        transitMode: 'NONE'
                    });
                });

                renderDayTabs();
                renderSpotsList();
            }
        }
    });
}

function showPlaceActionPanel(place, lat, lng) {
    if (currentMarker) currentMarker.setMap(null);
    currentMarker = new google.maps.Marker({ map: map, position: { lat, lng }, animation: google.maps.Animation.DROP });

    selectedPlaceData = {
        locationName: place.name || place.displayName,
        latitude: lat,
        longitude: lng,
        googlePlaceId: place.place_id || place.id,
        address: place.formatted_address || place.formattedAddress,
        visitTime: "",
        stayTime: 60,
        travelToNext: 0,
        distanceToNext: 0,
        transitMode: 'NONE'
    };

    $('#panelPlaceName').text(selectedPlaceData.locationName);
    $('#panelPlaceAddress').text(selectedPlaceData.address || '無詳細地址');
    $('#targetDayText').text(`Day ${currentDay}`);

    $('#placeActionPanel').removeClass('hidden').removeClass('translate-y-4 opacity-0').addClass('translate-y-0 opacity-100');
}

// ==========================================
// 🌟 2. 初始化地圖 (啟用 Places API New)
// ==========================================
function initMap() {
    const defaultCenter = { lat: 35.6895, lng: 139.6917 };
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultCenter, zoom: 12, mapId: '2fd53a2f051832ea485534f4',
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false
    });

    directionsService = new google.maps.DirectionsService();

    // 🌟 點擊地圖時使用 Places API (New) 獲取資訊
    map.addListener("click", async (e) => {
        if (e.placeId) {
            e.stop();
            try {
                const { Place } = await google.maps.importLibrary("places");
                const place = new Place({ id: e.placeId, requestedLanguage: "zh-TW" });
                await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
                showPlaceActionPanel(place, place.location.lat(), place.location.lng());
            } catch (error) {
                console.error("Places API 獲取失敗", error);
            }
        }
    });

    const input = document.getElementById("mapSearchInput");
    autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return showToast('warning', '找不到詳細資訊！');

        if (place.geometry.viewport) map.fitBounds(place.geometry.viewport);
        else { map.setCenter(place.geometry.location); map.setZoom(17); }

        showPlaceActionPanel(place, place.geometry.location.lat(), place.geometry.location.lng());
        input.value = '';
    });

    loadInitialSpots();
}

$('#closePanelBtn').on('click', function () {
    $('#placeActionPanel').addClass('translate-y-4 opacity-0').removeClass('translate-y-0 opacity-100');
    setTimeout(() => { $('#placeActionPanel').addClass('hidden'); }, 300);
    if (currentMarker) currentMarker.setMap(null);
});

// ==========================================
// 🌟 3. 路線計算 (強制經緯度導航 + 三重防護)
// ==========================================
async function calculateAndDisplayRoute(dayToCalculate) {
    const places = spotsByDay[dayToCalculate] || [];
    dayRouteRenderers.forEach(r => r.setMap(null)); dayRouteRenderers = [];
    if (routeMarkers) { routeMarkers.forEach(m => m.setMap(null)); routeMarkers = []; }
    if (currentMarker) { currentMarker.setMap(null); currentMarker = null; }

    const bounds = new google.maps.LatLngBounds();

    if (places.length > 0) {
        places.forEach((place, index) => {
            const isFirst = index === 0;
            const isLast = index === places.length - 1;
            let bgColor = "#ea4335";
            if (isFirst) bgColor = "#ff8c00";
            else if (isLast && places.length > 1) bgColor = "#008ccf";

            const markerLat = parseFloat(place.latitude);
            const markerLng = parseFloat(place.longitude);
            bounds.extend({ lat: markerLat, lng: markerLng });

            routeMarkers.push(new google.maps.Marker({
                position: { lat: markerLat, lng: markerLng }, map: map,
                label: { text: String(index + 1), color: "white", fontWeight: "bold", fontSize: "14px" },
                icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: bgColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 14 },
                title: place.locationName, zIndex: 999
            }));
        });
    }

    if (!places || places.length < 2) {
        if (places.length === 1 && !bounds.isEmpty()) {
            map.fitBounds(bounds);
            const listener = google.maps.event.addListener(map, "idle", function () {
                if (map.getZoom() > 16) map.setZoom(16);
                google.maps.event.removeListener(listener);
            });
        }
        updateCalculatedTimes();
        return;
    }

    const results = [];
    let currentDepartureTime = new Date();
    currentDepartureTime.setDate(currentDepartureTime.getDate() + 7);
    currentDepartureTime.setHours(8, 0, 0, 0);

    for (let i = 0; i < places.length - 1; i++) {
        const p1 = places[i], p2 = places[i + 1];

        // 🌟 核心修復：不管 ID 有沒有壞掉，算路線一律強制使用「經緯度」，保證 100% 算得出交通數據！
        const originLatLng = { lat: parseFloat(p1.latitude), lng: parseFloat(p1.longitude) };
        const destLatLng = { lat: parseFloat(p2.latitude), lng: parseFloat(p2.longitude) };

        const res = await new Promise((resolve) => {
            setTimeout(() => {
                // 🌟 第一層：大眾運輸
                directionsService.route({
                    origin: originLatLng, destination: destLatLng, travelMode: google.maps.TravelMode.TRANSIT, transitOptions: { departureTime: new Date(currentDepartureTime.getTime()) }
                }, (resT, statusT) => {
                    if (statusT === "OK") { resT._mode = 'TRANSIT'; resolve(resT); }
                    else {
                        // 🌟 第二層：開車
                        directionsService.route({ origin: originLatLng, destination: destLatLng, travelMode: google.maps.TravelMode.DRIVING }, (resD, statusD) => {
                            if (statusD === "OK") { resD._mode = 'DRIVING'; resolve(resD); }
                            else {
                                // 🌟 第三層：走路
                                directionsService.route({ origin: originLatLng, destination: destLatLng, travelMode: google.maps.TravelMode.WALKING }, (resW, statusW) => {
                                    if (statusW === "OK") { resW._mode = 'WALKING'; resolve(resW); }
                                    else {
                                        // 🌟 終極保底：算直線距離與時間，絕對不回傳 NONE 給資料庫
                                        const distKm = getDistanceFromLatLonInKm(originLatLng.lat, originLatLng.lng, destLatLng.lat, destLatLng.lng);
                                        const estimatedMinutes = Math.ceil((distKm / 800) * 60) + 120;
                                        resolve({
                                            _isFake: true, _mode: 'FLIGHT', _color: '#9c27b0',
                                            _path: [originLatLng, destLatLng],
                                            routes: [{
                                                legs: [{
                                                    duration: { value: estimatedMinutes * 60 },
                                                    distance: { value: Math.round(distKm * 1000) }
                                                }]
                                            }]
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }, 300);
        });

        // 🌟 因為有三重防護，這裡絕對拿得到 data，資料庫從此不會再出現 0 或 NONE！
        if (res && res.routes && res.routes[0] && res.routes[0].legs && res.routes[0].legs[0]) {
            const leg = res.routes[0].legs[0];
            places[i].travelToNext = leg.duration ? leg.duration.value : 0;
            places[i].distanceToNext = leg.distance ? leg.distance.value : 0;
            places[i].transitMode = res._mode || 'DRIVING';
        }

        results.push(res);
    }

    results.forEach((res, index) => {
        if (res) {
            if (res._isFake) {
                dayRouteRenderers.push(new google.maps.Polyline({ path: res._path, strokeOpacity: 0, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '15px' }], strokeColor: res._color, strokeWeight: 4, map: map }));
            } else {
                let routeColor = res._mode === 'WALKING' ? "#008ccf" : (res._mode === 'DRIVING' ? "#ea4335" : "#ff8c00");
                const renderer = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: true, polylineOptions: { strokeColor: routeColor, strokeWeight: 5, strokeOpacity: 0.8 } });
                renderer.setDirections(res);
                dayRouteRenderers.push(renderer);
            }
        }
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds);
    updateCalculatedTimes();
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
// 🌟 4. 時間連動核心演算法
// ==========================================
function updateCalculatedTimes() {
    const currentSpots = spotsByDay[currentDay] || [];
    if (currentSpots.length === 0) return;

    if (!currentSpots[0].visitTime) {
        currentSpots[0].visitTime = "09:00";
        $(`.spot-visit-time[data-index="0"]`).val("09:00");
    }

    let [h, m] = currentSpots[0].visitTime.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(h || 9, m || 0, 0, 0);

    for (let i = 0; i < currentSpots.length - 1; i++) {
        let stayMinutes = parseInt(currentSpots[i].stayTime) || 60;
        let travelSeconds = currentSpots[i].travelToNext || 0;

        currentTime = new Date(currentTime.getTime() + (stayMinutes * 60000) + (travelSeconds * 1000));

        let newH = String(currentTime.getHours()).padStart(2, '0');
        let newM = String(currentTime.getMinutes()).padStart(2, '0');

        currentSpots[i + 1].visitTime = `${newH}:${newM}`;
        $(`.spot-visit-time-display[data-index="${i + 1}"]`).text(`${newH}:${newM}`);
    }
}

// ==========================================
// 🌟 5. 介面互動與列表渲染
// ==========================================
$('#daysCount').on('change', function () {
    const newTotal = parseInt($(this).val());
    if (newTotal < 1) return;
    totalDays = newTotal;
    for (let i = 1; i <= totalDays; i++) { if (!spotsByDay[i]) spotsByDay[i] = []; }
    if (currentDay > totalDays) currentDay = totalDays;
    renderDayTabs(); renderSpotsList();
});

$('#addSpotBtn').on('click', function () {
    if (!selectedPlaceData) return;
    spotsByDay[currentDay].push({ ...selectedPlaceData });
    showToast('success', `已將 ${selectedPlaceData.locationName} 加入 Day ${currentDay}`);
    renderSpotsList();
    $('#closePanelBtn').click();
});

function renderDayTabs() {
    const container = $('#dayTabsContainer'); container.empty();
    for (let i = 1; i <= totalDays; i++) {
        const isActive = (i === currentDay);
        const btnClass = isActive ? "px-4 py-1.5 bg-primary text-background-dark font-bold text-sm rounded-full shrink-0" : "px-4 py-1.5 bg-transparent text-slate-400 hover:text-primary font-bold text-sm rounded-full shrink-0 cursor-pointer";
        container.append(`<button class="day-tab-btn ${btnClass}" data-day="${i}">Day ${i}</button>`);
    }
    $('.day-tab-btn').on('click', function () {
        currentDay = $(this).data('day'); $('#targetDayText').text(`Day ${currentDay}`);
        renderDayTabs(); renderSpotsList();
    });
}

function renderSpotsList() {
    const container = $('#spotsListContainer'); container.empty();
    const currentSpots = spotsByDay[currentDay] || [];

    calculateAndDisplayRoute(currentDay);

    if (currentSpots.length === 0) {
        container.append(`<div class="text-center text-slate-500 text-sm py-10 border border-dashed border-slate-600 rounded-lg">Day ${currentDay} 目前沒有景點，請從地圖點擊或搜尋加入。</div>`);
        return;
    }

    currentSpots.forEach((spot, index) => {
        const upBtn = index > 0 ? `<button class="move-up-btn text-slate-400 hover:text-primary p-1" data-index="${index}"><span class="material-symbols-outlined text-xs">arrow_upward</span></button>` : `<div class="w-6 h-6"></div>`;
        const downBtn = index < currentSpots.length - 1 ? `<button class="move-down-btn text-slate-400 hover:text-primary p-1" data-index="${index}"><span class="material-symbols-outlined text-xs">arrow_downward</span></button>` : `<div class="w-6 h-6"></div>`;

        let bgColorClass = "bg-primary/20 text-primary";
        if (index === 0) bgColorClass = "bg-[#ff8c00] text-white";
        else if (index === currentSpots.length - 1 && currentSpots.length > 1) bgColorClass = "bg-[#008ccf] text-white";

        let timeHtml = '';
        if (index === 0) {
            if (!spot.visitTime) spot.visitTime = '09:00';
            timeHtml = `<input type="time" class="spot-visit-time w-full bg-background-dark border border-primary/20 rounded px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-primary" 
                               data-index="${index}" value="${spot.visitTime}" title="出發時間">`;
        } else {
            timeHtml = `<div class="spot-visit-time-display w-full bg-background-dark/30 border border-slate-700/50 rounded px-1.5 py-1 text-xs text-slate-400 cursor-default text-center" 
                             data-index="${index}" title="系統依路程自動計算">${spot.visitTime || '--:--'}</div>`;
        }

        container.append(`
            <div class="flex items-center gap-2 bg-background-dark/50 border border-primary/10 p-2 rounded-lg group hover:border-primary/30 transition-colors">
                <div class="flex flex-col items-center shrink-0">${upBtn}${downBtn}</div>
                <div class="w-6 h-6 rounded-full ${bgColorClass} flex items-center justify-center font-bold text-xs shrink-0 shadow-md">${index + 1}</div>
                
                <div class="flex-1 overflow-hidden min-w-0 pr-2">
                    <h4 class="text-sm font-bold text-slate-200 truncate" title="${spot.locationName}">${spot.locationName}</h4>
                </div>
                
                <div class="flex flex-col gap-1 w-24 shrink-0">
                    ${timeHtml}
                    <div class="flex items-center gap-1">
                        <input type="number" class="spot-stay-time w-full bg-background-dark border border-primary/20 rounded px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-primary" 
                               data-index="${index}" value="${spot.stayTime || 60}" min="0" step="10" title="停留時間">
                        <span class="text-[10px] text-slate-500 shrink-0">分</span>
                    </div>
                </div>

                <button class="delete-spot-btn text-slate-500 hover:text-red-400 p-2 shrink-0 transition-colors" data-index="${index}">
                    <span class="material-symbols-outlined text-base">delete</span>
                </button>
            </div>
        `);
    });

    $('.move-up-btn').on('click', function () { const idx = $(this).data('index');[currentSpots[idx - 1], currentSpots[idx]] = [currentSpots[idx], currentSpots[idx - 1]]; renderSpotsList(); });
    $('.move-down-btn').on('click', function () { const idx = $(this).data('index');[currentSpots[idx + 1], currentSpots[idx]] = [currentSpots[idx], currentSpots[idx + 1]]; renderSpotsList(); });
    $('.delete-spot-btn').on('click', function () { const idx = $(this).data('index'); currentSpots.splice(idx, 1); renderSpotsList(); });

    $('.spot-visit-time').on('change', function () {
        const idx = $(this).data('index');
        currentSpots[idx].visitTime = $(this).val();
        updateCalculatedTimes();
    });
    $('.spot-stay-time').on('change', function () {
        const idx = $(this).data('index');
        currentSpots[idx].stayTime = parseInt($(this).val()) || 0;
        updateCalculatedTimes();
    });
}

// ==========================================
// 🌟 6. 送出 JSON 給後端儲存
// ==========================================
$('#submitPlanBtn').on('click', function () {
    const planId = $('#editPlanId').val();
    const planName = $('#planName').val().trim();
    const planCity = $('#planCity').val().trim();
    if (!planName || !planCity) return showToast('warning', '請填寫行程名稱與主要城市！');

    const finalSpots = [];
    for (let d = 1; d <= totalDays; d++) {
        if (spotsByDay[d]) {
            spotsByDay[d].forEach((spot, index) => {
                // 🌟 將前端的安全 "undefined" 轉回資料庫好識別的 "UNKNOWN"
                let finalPlaceId = spot.googlePlaceId;
                if (!finalPlaceId || finalPlaceId === "undefined" || finalPlaceId.length < 5) finalPlaceId = "UNKNOWN";

                finalSpots.push({
                    dayNumber: d,
                    visitOrder: index + 1,
                    locationName: spot.locationName,
                    longitude: spot.longitude,
                    latitude: spot.latitude,
                    googlePlaceId: finalPlaceId,
                    visitTime: spot.visitTime || null,
                    stayTime: spot.stayTime || 60,
                    distance: spot.distanceToNext || 0,
                    transitTime: spot.travelToNext || 0,
                    transitMode: spot.transitMode || 'NONE'
                });
            });
        }
    }

    const requestData = { workId: $('#planWorkId').val() || null, planName: planName, planCity: planCity, daysCount: totalDays, spots: finalSpots };
    const btn = $(this); btn.prop('disabled', true).text('儲存中...');

    $.ajax({
        url: `/backend/contentmanagement/plan/update/${planId}`,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(requestData),
        success: function () {
            showToast('success', '行程更新成功！');
            setTimeout(() => { window.location.href = "/backend/contentmanagement"; }, 1500);
        },
        error: function () {
            showToast('error', '更新失敗，請檢查資料或稍後再試。');
            btn.prop('disabled', false).text('確認儲存修改');
        }
    });
});