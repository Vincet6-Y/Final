let map, directionsService, directionsRenderer, placesService;
let markers = [];
let currentDay = 1;
let tempSelectedPlace = null;
let isMapView = false;
let dayRouteRenderers = []; // 用來存放地圖上多段大眾運輸路線的畫筆

const WALK_THRESHOLD_KM = 1.0; // 距離大於 1km 選擇大眾運輸，小於等於 1km 走路

// 初始化行程數據結構
let itineraryData = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: []
};

let routeLegs = {};
let draggedItemInfo = null; // 用於追蹤正在拖曳的項目

function initMap() {
    const darkMapStyle = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
    ];

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 34.6937, lng: 135.5023 },
        zoom: 11,
        mapId: "cc3bebf698c5799e3aa4aca9",
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM },
        styles: document.documentElement.classList.contains('dark') ? darkMapStyle : []
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map, suppressMarkers: false, polylineOptions: { strokeColor: "#ff8c00", strokeWeight: 5 }
    });
    placesService = new google.maps.places.PlacesService(map);

    setupAutocomplete("pac-input-desktop");
    setupAutocomplete("pac-input-mobile");
    calculateAndDisplayRoute(1);

    map.addListener("click", (event) => {
        if (event.placeId) {
            event.stop();
            fetchAndShowDetails(event.placeId);
        }
    });
}

function selectDay(day) {
    currentDay = day;
    document.querySelectorAll('[id^="btn-day-"]').forEach(btn => {
        btn.className = "px-5 py-2 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-500 dark:text-slate-400 hover:text-primary font-bold text-sm whitespace-nowrap transition";
    });
    const activeBtn = document.getElementById(`btn-day-${day}`);
    activeBtn.className = "px-5 py-2 rounded-full bg-primary text-white font-bold text-sm whitespace-nowrap transition shadow-md";

    document.querySelectorAll('.day-list').forEach(list => list.classList.add('hidden'));
    document.getElementById(`list-day-${day}`).classList.remove('hidden');

    document.getElementById('modal-btn-text').innerText = `加入 Day ${day} 行程`;
    calculateAndDisplayRoute(day);
}

function searchNearby(type) {
    if (!placesService) return;
    
    // 改用地圖中心點與半徑 3 公里來搜尋
    const request = {
        location: map.getCenter(),
        radius: 3000, 
        type: type // 關鍵修改：這裡直接接收從 HTML 按鈕傳進來的 type 變數
    };

    placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            clearMarkers();
            results.forEach(createMarker);
        } else {
            alert('附近找不到相關結果，請移動地圖或縮放後再試一次！');
        }
    });
}

function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.place_id) return;

        if (place.geometry && place.geometry.viewport) map.fitBounds(place.geometry.viewport);
        else if (place.geometry) { map.setCenter(place.geometry.location); map.setZoom(17); }

        clearMarkers();
        fetchAndShowDetails(place.place_id);

        if (window.innerWidth <= 768 && isMapView === false) {
            toggleMobileView();
        }
        input.value = '';
    });
}

function createMarker(basicPlace) {
    const marker = new google.maps.Marker({
        map, 
        position: basicPlace.geometry.location, 
        title: basicPlace.name, 
        animation: google.maps.Animation.DROP
    });
    markers.push(marker);
    // 點擊時，必須確保傳入的是當前這個 marker 的 place_id
    marker.addListener("click", () => {
        fetchAndShowDetails(basicPlace.place_id); 
    });
}

function clearMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }

// ==========================================
// 🌟 修正版：確保向 Google 取得 place_id
// ==========================================
function fetchAndShowDetails(placeId) {
    placesService.getDetails({
        placeId: placeId,
        // 🌟 關鍵修正：在 fields 陣列的最前面，補上 'place_id'
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'photos', 'formatted_phone_number', 'opening_hours', 'editorial_summary', 'user_ratings_total', 'website', 'types']
    }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            
            // 🌟 終極防呆：如果 Google 還是沒把 ID 傳回來，我們手動幫它塞進去！
            if (!place.place_id) {
                place.place_id = placeId; 
            }
            
            showRichModal(place);
        } else {
            alert('無法取得該地點的詳細資訊');
        }
    });
}

function showRichModal(place) {
    tempSelectedPlace = place;

    // --- 核心修復：先將所有欄位「歸零」，防止資料殘留 ---
    const resetFields = () => {
        document.getElementById('modal-place-name').innerText = '載入中...';
        document.getElementById('modal-place-address').innerText = '載入中...';
        document.getElementById('modal-place-rating').innerText = '0.0';
        document.getElementById('modal-place-reviews').innerText = '(0 則評論)';
        document.getElementById('modal-place-phone').innerText = '無電話資訊';
        document.getElementById('modal-place-hours').innerHTML = '營業時間載入中...';
        document.getElementById('modal-place-desc').innerText = '載入中...';
        
        // 歸零新增的欄位 (類型與網站)
        const typeEl = document.getElementById('modal-place-type');
        if (typeEl) typeEl.innerText = '載入中...';
        
        const websiteEl = document.getElementById('modal-place-website');
        if (websiteEl) {
            websiteEl.innerText = '載入中...';
            websiteEl.href = '#';
        }

        // 重置圖片為預設 Loading 圖
        const loadingImg = 'https://images.unsplash.com/photo-1542931287-023b922fa89b?auto=format&fit=crop&q=80';
        document.getElementById('modal-img-main').src = loadingImg;
        document.getElementById('modal-img-sub1').src = loadingImg;
        document.getElementById('modal-img-sub2').src = loadingImg;
    };
    resetFields();

    // --- 開始填入新資料 ---
    document.getElementById('modal-place-name').innerText = place.name || '未命名地點';
    document.getElementById('modal-place-address').innerText = place.formatted_address || '無詳細地址資訊';
    document.getElementById('modal-place-rating').innerText = place.rating || '無評分';
    document.getElementById('modal-place-reviews').innerText = `(${place.user_ratings_total || 0} 則評論)`;
    document.getElementById('modal-place-phone').innerText = place.formatted_phone_number || '無電話資訊';

    // 🌟 新增：處理景點類型 (取第一個分類，並將底線換成空格以利閱讀)
    const typeEl = document.getElementById('modal-place-type');
    if (typeEl) {
        typeEl.innerText = (place.types && place.types.length > 0) ? place.types[0].replace(/_/g, ' ') : '景點';
    }

    // 🌟 新增：處理官方網站連結
    const websiteEl = document.getElementById('modal-place-website');
    if (websiteEl) {
        if (place.website) {
            websiteEl.href = place.website;
            websiteEl.innerText = '前往官方網站';
            websiteEl.classList.remove('pointer-events-none', 'text-slate-500');
        } else {
            websiteEl.href = '#';
            websiteEl.innerText = '無官方網站資訊';
            websiteEl.classList.add('pointer-events-none', 'text-slate-500');
        }
    }

    // 處理簡介
    if (place.editorial_summary && place.editorial_summary.overview) {
        document.getElementById('modal-place-desc').innerText = place.editorial_summary.overview;
    } else {
        document.getElementById('modal-place-desc').innerText = '此地點暫無詳細的官方簡介。這是一處值得您親自探索的地方！';
    }

    // 處理圖片 (如果沒有足夠圖片，原本設定的 loading 圖會繼續顯示)
    if (place.photos && place.photos.length >= 1) {
        document.getElementById('modal-img-main').src = place.photos[0].getUrl({ maxWidth: 800 });
        if (place.photos[1]) document.getElementById('modal-img-sub1').src = place.photos[1].getUrl({ maxWidth: 400 });
        if (place.photos[2]) document.getElementById('modal-img-sub2').src = place.photos[2].getUrl({ maxWidth: 400 });
    }

    // 🌟 修改：處理營業時間 (改為條列式展開，捨棄原本單純的「營業中/休息中」)
    const hoursEl = document.getElementById('modal-place-hours');
    if (hoursEl) {
        if (place.opening_hours && place.opening_hours.weekday_text) {
            hoursEl.innerHTML = place.opening_hours.weekday_text.map(text => 
                `<p class="flex justify-between border-b border-white/5 pb-1"><span>${text}</span></p>`
            ).join('');
        } else {
            hoursEl.innerHTML = '<p>無營業時間資訊</p>';
        }
    }

    // 顯示視窗
    document.getElementById('rich-place-modal').classList.remove('hidden');
}

// ==========================================
// 🌟 側邊欄點擊呼叫景點詳細資訊
// ==========================================
function openPlaceDetails(placeId) {
    if (!placeId || placeId === 'undefined') {
        // 如果是沒有 place_id 的自訂地點 (例如手動輸入的起點)，就跳過
        return; 
    }
    // 借用我們原本寫好的 fetch 函式來抓資料並顯示彈窗
    fetchAndShowDetails(placeId); 
}

function closeRichModal() {
    document.getElementById('rich-place-modal').classList.add('hidden');
}

function confirmAddToItinerary() {
    if (!tempSelectedPlace) return;

    itineraryData[currentDay].push({
        place_id: tempSelectedPlace.place_id, // 🌟 關鍵新增：沒有 place_id，就無法去跟 Google 重新要這個景點的照片和詳細資料
        lat: tempSelectedPlace.geometry.location.lat(),
        lng: tempSelectedPlace.geometry.location.lng(),
        name: tempSelectedPlace.name,
        arrivals: "8:00",
        duration: "1", // 預設停留 1 小時
        hasTicketOffer: Math.random() > 0.5
    });

    calculateAndDisplayRoute(currentDay);

    const scrollArea = document.getElementById('itinerary-scroll-area');
    scrollArea.scrollTop = scrollArea.scrollHeight;

    closeRichModal();

    if (window.innerWidth <= 768 && isMapView) {
        toggleMobileView();
    }
}

// ==========================================
// 🌟 終極版：專為獨旅設計的大眾運輸計算 (加入時間參數)
// ==========================================
async function calculateAndDisplayRoute(dayToCalculate) {
    const places = itineraryData[dayToCalculate];
    
    // 1. 先清除地圖上舊的路線
    dayRouteRenderers.forEach(renderer => renderer.setMap(null));
    dayRouteRenderers = [];

    if (!places || places.length < 2) {
        routeLegs[dayToCalculate] = [];
        recalculateTimes(dayToCalculate);
        renderItineraryPanel(dayToCalculate);
        return;
    }

    const promises = [];

    for (let i = 0; i < places.length - 1; i++) {
        const origin = { lat: places[i].lat, lng: places[i].lng };
        const destination = { lat: places[i + 1].lat, lng: places[i + 1].lng };

        // 🌟 關鍵魔法：設定明確的「白天出發時間」
        // 強制給它一個明天早上 8 點的基準時間來查時刻表，避免半夜測試抓不到車
        const transitTime = new Date();
        transitTime.setDate(transitTime.getDate() + 1); // 確保是明天
        transitTime.setHours(8, 0, 0, 0); // 早上 8 點

        promises.push(new Promise((resolve) => {
            directionsService.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.TRANSIT, 
                transitOptions: {
                    departureTime: transitTime 
                }
            }, (response, status) => {
                if (status === "OK") {
                    resolve(response);
                } else {
                    // 🌟 關鍵修改：從 WALKING 改為 DRIVING
                    // 因為日本大眾運輸常不回傳資料，我們改用「開車」來估算，時間最接近真實火車車程！
                    console.warn(`[${places[i].name}] 大眾運輸無解，改以開車(DRIVING)估算。`);
                    directionsService.route({
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING // 🚗 改用開車來拿時間
                    }, (fallbackRes, fallbackStatus) => {
                        if (fallbackStatus === "OK") resolve(fallbackRes);
                        else resolve(null);
                    });
                }
            });
        }));
    }

    // 3. 等待所有分段的路線都計算完畢
    const results = await Promise.all(promises);

    // 4. 儲存結果供側邊欄使用
    routeLegs[dayToCalculate] = results.map(res => res ? res.routes[0].legs[0] : null);

    // 5. 畫出漂亮的多段路線
    results.forEach((res, index) => {
        if (res) {
            const renderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: { 
                    strokeColor: index % 2 === 0 ? "#008ccf" : "#ff8c00", // 藍橘交錯，方便辨識轉乘點
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                }
            });
            renderer.setDirections(res);
            dayRouteRenderers.push(renderer);
        }
    });

    // 6. 重新推算抵達時間並更新畫面
    recalculateTimes(dayToCalculate);
    renderItineraryPanel(dayToCalculate);
}

// ==========================================
// 🌟 漏掉的：時間自動推算引擎
// ==========================================
function recalculateTimes(day) {
    const places = itineraryData[day];
    const legs = routeLegs[day] || [];
    if (!places || places.length === 0) return;

    // 確保起點有預設時間
    if (!places[0].arrivals) places[0].arrivals = "08:00";
    if (!places[0].duration) places[0].duration = 1;

    // 從第二個景點開始，依序加上 (前一站抵達時間 + 停留時間 + 交通時間)
    for (let i = 1; i < places.length; i++) {
        const prevPlace = places[i - 1];
        const currentPlace = places[i];

        if (!currentPlace.duration) currentPlace.duration = 1;

        let [hours, mins] = prevPlace.arrivals.split(':').map(Number);
        let prevTimeInMinutes = hours * 60 + mins;
        let prevDurationMinutes = parseFloat(prevPlace.duration) * 60;

        let travelTimeMinutes = 0;
        if (legs[i - 1]) {
            travelTimeMinutes = Math.round(legs[i - 1].duration.value / 60);
        }

        let newTimeInMinutes = prevTimeInMinutes + prevDurationMinutes + travelTimeMinutes;

        let newHours = Math.floor(newTimeInMinutes / 60) % 24;
        let newMins = Math.round(newTimeInMinutes % 60);
        currentPlace.arrivals = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
    }
}

// 🌟 新增：使用者編輯時間的觸發事件
function updateDuration(day, index, newDuration) {
    itineraryData[day][index].duration = parseFloat(newDuration) || 1;
    recalculateTimes(day); // 重新推算下方所有行程
    renderItineraryPanel(day); // 重新渲染畫面
}

function updateArrivalTime(day, index, newTime) {
    itineraryData[day][index].arrivals = newTime;
    recalculateTimes(day); // 重新推算下方所有行程
    renderItineraryPanel(day); // 重新渲染畫面
}

// ==========================================
// 🌟 拖曳事件處理函數 (Drag and Drop Logic)
// ==========================================
function handleDragStart(e, day, index) {
    draggedItemInfo = { day, index };
    e.dataTransfer.effectAllowed = 'move';
    // 加上半透明與縮小效果，提升視覺回饋
    setTimeout(() => e.target.classList.add('opacity-50', 'scale-95', 'z-50'), 0);
}

function handleDragOver(e) {
    e.preventDefault(); // 必須阻止預設行為才能允許放置 (Drop)
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    // 拖曳經過時，目標卡片顯示橘色虛線邊框提示
    const target = e.currentTarget;
    target.classList.remove('border-slate-200', 'dark:border-white/10');
    target.classList.add('border-primary', 'border-2', 'border-dashed');
}

function handleDragLeave(e) {
    const target = e.currentTarget;
    // 離開時恢復原狀
    target.classList.add('border-slate-200', 'dark:border-white/10');
    target.classList.remove('border-primary', 'border-2', 'border-dashed');
}

function handleDrop(e, day, dropIndex) {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget;
    target.classList.add('border-slate-200', 'dark:border-white/10');
    target.classList.remove('border-primary', 'border-2', 'border-dashed');

    // 確保在同一天內拖曳，且不是拖回原位
    if (!draggedItemInfo || draggedItemInfo.day !== day || draggedItemInfo.index === dropIndex) {
        return false;
    }

    const dragIndex = draggedItemInfo.index;

    // 核心：在資料陣列中交換元素位置
    const list = itineraryData[day];
    const draggedItem = list.splice(dragIndex, 1)[0];
    list.splice(dropIndex, 0, draggedItem);

    // 重新計算路線與渲染列表
    calculateAndDisplayRoute(day);
    draggedItemInfo = null;
    return false;
}

function handleDragEnd(e) {
    e.target.classList.remove('opacity-50', 'scale-95', 'z-50');
}

// ==========================================
// 🌟 渲染整個行程面板 (加入 Input 編輯時間功能)
// ==========================================
function renderItineraryPanel(day) {
    const listContainer = document.getElementById(`list-day-${day}`);
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const places = itineraryData[day];
    const legs = routeLegs[day] || [];

    if (!places || places.length === 0) {
        listContainer.innerHTML = `
            <div class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm">
                <div class="w-1.5 h-full bg-slate-300 dark:bg-slate-600 absolute left-0 top-0"></div>
                <div class="ml-2">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-base">Day ${day} 行程尚未安排</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">請從地圖點擊景點加入</p>
                </div>
            </div>`;
        return;
    }

    const dayStartPlace = places[0];
    const isDay1 = day === 1;
    const markerColor = isDay1 ? 'bg-slate-400 dark:bg-slate-600' : 'bg-blue-400 dark:bg-blue-600';

    // 🌟 修改：起點加入 <input type="time"> 讓使用者改出發時間
    // 🌟 修改：起點加入 onclick 事件
    const dayStartHTML = `
          <div draggable="true" ondragstart="handleDragStart(event, ${day}, 0)" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${day}, 0)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondragend="handleDragEnd(event)" class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm cursor-move transition-all duration-200 hover:shadow-md">
              <div class="w-1.5 h-full ${markerColor} absolute left-0 top-0"></div>
              <div class="ml-2 flex justify-between items-center w-full">
                  <div class="flex-1">
                      <h3 onclick="openPlaceDetails('${dayStartPlace.place_id}')" class="font-bold text-slate-800 dark:text-slate-100 text-base pr-4 cursor-pointer hover:text-primary dark:hover:text-primary transition-colors underline-offset-4 hover:underline">${dayStartPlace.name}</h3>
                      <div class="flex items-center gap-2 mt-2">
                          <span class="text-xs text-slate-500 dark:text-slate-400">${isDay1 ? '出發時間' : '出發時間'}：</span>
                          <input type="time" value="${dayStartPlace.arrivals}" onchange="updateArrivalTime(${day}, 0, this.value)" class="text-xs font-bold text-primary bg-transparent border-b border-dashed border-primary/50 outline-none cursor-pointer p-0 focus:ring-0">
                      </div>
                  </div>
                  <span class="material-symbols-outlined text-slate-300 dark:text-slate-600 shrink-0">drag_indicator</span>
              </div>
          </div>
        `;
    listContainer.insertAdjacentHTML('beforeend', dayStartHTML);

    for (let i = 1; i < places.length; i++) {
        const destinationPlace = places[i];
        const leg = legs[i - 1];

        let travelMode = '無法計算路線';
        let travelIcon = 'warning';
        let durationText = '--';

        if (leg) {
            const distanceKm = leg.distance.value / 1000;
            // 如果距離大於 1 公里，統一顯示「車程估算」並給予車子圖示
            if (distanceKm > WALK_THRESHOLD_KM) {
                travelMode = '車程估算'; 
                travelIcon = 'directions_car'; 
            } else {
                travelMode = '走路'; 
                travelIcon = 'directions_walk';
            }
            durationText = `約 ${leg.duration.text}`;
        }

        const transportHTML = `
              <div class="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm ml-6 my-1 border-l-2 border-dashed border-slate-300 dark:border-slate-600 pl-4 py-3 animate-fade-in-up">
                  <span class="material-symbols-outlined text-base bg-white dark:bg-background-dark p-1 rounded-full border border-slate-200 dark:border-slate-700">${travelIcon}</span>
                  <span>${travelMode} ${durationText}</span>
              </div>
            `;

        let ticketHTML = destinationPlace.hasTicketOffer ? `
                <div onclick="window.location.href='/payment'" class="mt-4 bg-[#ff8c00]/10 border border-[#ff8c00]/30 rounded-lg p-2.5 flex items-center justify-between hover:bg-[#ff8c00]/20 transition cursor-pointer group">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-sm">local_activity</span>
                        <span class="text-primary text-sm font-bold">Klook 專屬門票優惠</span>
                    </div>
                    <span class="text-primary text-xs font-bold group-hover:translate-x-1 transition-transform">前往加購 ></span>
                </div>
            ` : '';

        // 🌟 修改：目的地加入停留時間的 <input type="number">
        const destinationHTML = `
              <div draggable="true" ondragstart="handleDragStart(event, ${day}, ${i})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${day}, ${i})" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondragend="handleDragEnd(event)" class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm animate-fade-in-up cursor-move transition-all duration-200 hover:shadow-md">
                <div class="w-1.5 h-full bg-primary absolute left-0 top-0"></div>
                <div class="flex justify-between items-start ml-2">
                  <div class="flex-1">
                    <h3 onclick="openPlaceDetails('${destinationPlace.place_id}')" 
                        class="font-bold text-slate-800 dark:text-slate-100 text-base pr-2 cursor-pointer 
                        hover:text-primary dark:hover:text-primary transition-colors underline-offset-4 hover:underline">${destinationPlace.name}
                    </h3>
                    
                    <div class="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">schedule</span>抵達 
                        <span class="font-medium text-slate-700 dark:text-slate-200">${destinationPlace.arrivals}</span>
                      </span>
                      
                      <span class="flex items-center gap-1 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded border border-slate-200 dark:border-white/5">
                        <span class="material-symbols-outlined text-[14px]">hourglass_empty</span>停留 
                        <input type="number" min="0.5" step="0.5" value="${destinationPlace.duration}" onchange="updateDuration(${day}, ${i}, this.value)" class="w-10 bg-transparent text-center font-bold text-primary outline-none border-b border-dashed border-primary/50 focus:border-primary appearance-none p-0 focus:ring-0">
                        小時
                      </span>
                    </div>

                  </div>
                  <div class="flex flex-col items-end gap-2 shrink-0">
                    <span class="material-symbols-outlined text-slate-300 dark:text-slate-600">drag_indicator</span>
                    <button onclick="removeItineraryItem(${day}, ${i})" class="text-slate-400 hover:text-red-500 transition p-1 cursor-pointer">
                      <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
                ${ticketHTML}
              </div>
            `;

        listContainer.insertAdjacentHTML('beforeend', transportHTML + destinationHTML);
    }
}

function removeItineraryItem(day, index) {
    itineraryData[day].splice(index, 1);
    calculateAndDisplayRoute(day);
}

function toggleMobileView() {
    const panel = document.getElementById('itinerary-panel');
    const icon = document.getElementById('toggle-icon');
    const text = document.getElementById('toggle-text');

    isMapView = !isMapView;

    if (isMapView) {
        panel.classList.add('translate-y-full');
        icon.innerText = "view_list";
        text.innerText = "查看行程";
    } else {
        panel.classList.remove('translate-y-full');
        icon.innerText = "map";
        text.innerText = "展開地圖";
    }
}

// ==========================================
// 🌟 新增功能：動態加入「出發日期選擇器」+ Day 按鈕左右滑動箭頭
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const titleContainer = document.querySelector('.text-lg.font-bold.text-primary').parentElement;

    const totalDays = 5;
    const daysToAdd = totalDays - 1;

    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() + 3);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultStart.getDate() + daysToAdd);

    const formatYMD = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const formatMD = (d) => String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');

    // 1. 日期選擇器 UI 建立
    const datePickerWrapper = document.createElement('div');
    datePickerWrapper.className = "flex items-center gap-1.5 ml-3 bg-slate-100 dark:bg-surface-dark px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10 cursor-pointer relative group hover:border-primary/50 transition-colors shrink-0";

    const calendarIcon = document.createElement('span');
    calendarIcon.className = "material-symbols-outlined text-[14px] text-slate-400 group-hover:text-primary transition-colors";
    calendarIcon.innerText = "calendar_today";

    const dateDisplay = document.createElement('span');
    dateDisplay.className = "text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors tracking-wider";
    dateDisplay.innerText = `${formatMD(defaultStart)} - ${formatMD(defaultEnd)}`;

    const dateInput = document.createElement('input');
    dateInput.type = "date";
    dateInput.value = formatYMD(defaultStart);
    dateInput.className = "absolute top-full left-0 w-0 h-0 opacity-0 pointer-events-none";

    datePickerWrapper.addEventListener('click', () => {
        try { dateInput.showPicker(); } catch (error) { dateInput.focus(); }
    });

    datePickerWrapper.appendChild(calendarIcon);
    datePickerWrapper.appendChild(dateDisplay);
    datePickerWrapper.appendChild(dateInput);
    titleContainer.appendChild(datePickerWrapper);

    // ==========================================
    // ✨ 左右滑動箭頭 UI 注入 (DOM 包裝魔法)
    // ==========================================
    const buttonContainer = document.getElementById('btn-day-1').parentElement;

    // 建立外層 Wrapper (讓箭頭可以浮動對齊)
    const tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'relative flex items-center w-full shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-background-dark overflow-hidden sticky top-0 z-20 shadow-sm';

    // 把原本的按鈕區塊塞進 Wrapper 裡
    buttonContainer.parentNode.insertBefore(tabsWrapper, buttonContainer);
    tabsWrapper.appendChild(buttonContainer);

    // 移除原本的底線，避免雙重邊框，並加上平滑滾動
    buttonContainer.classList.remove('border-b', 'border-slate-200', 'dark:border-white/10', 'shrink-0');
    buttonContainer.classList.add('w-full', 'scroll-smooth');

    // 建立左邊箭頭 (有漂亮陰影的圓形按鈕)
    const leftBtn = document.createElement('button');
    leftBtn.className = "absolute left-1 z-10 w-7 h-7 flex items-center justify-center bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm shadow-md rounded-full text-slate-500 hover:text-primary transition-colors hidden";
    leftBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">chevron_left</span>';

    // 建立右邊箭頭
    const rightBtn = document.createElement('button');
    rightBtn.className = "absolute right-1 z-10 w-7 h-7 flex items-center justify-center bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm shadow-md rounded-full text-slate-500 hover:text-primary transition-colors hidden";
    rightBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">chevron_right</span>';

    tabsWrapper.appendChild(leftBtn);
    tabsWrapper.appendChild(rightBtn);

    // 點擊箭頭滑動事件 (每次滑動約 200px)
    leftBtn.addEventListener('click', () => buttonContainer.scrollBy({ left: -200, behavior: 'smooth' }));
    rightBtn.addEventListener('click', () => buttonContainer.scrollBy({ left: 200, behavior: 'smooth' }));

    // 判斷箭頭是否該顯示 (如果滑到最左邊就隱藏左箭頭，最右邊就隱藏右箭頭)
    const checkArrows = () => {
        if (buttonContainer.scrollWidth > buttonContainer.clientWidth) {
            leftBtn.classList.toggle('hidden', buttonContainer.scrollLeft <= 0);
            rightBtn.classList.toggle('hidden', buttonContainer.scrollLeft + buttonContainer.clientWidth >= buttonContainer.scrollWidth - 2);
        } else {
            leftBtn.classList.add('hidden');
            rightBtn.classList.add('hidden');
        }
    };

    buttonContainer.addEventListener('scroll', checkArrows);
    window.addEventListener('resize', checkArrows);

    // ==========================================
    // ✨ 動態生成 Day 按鈕與列表
    // ==========================================
    function updateDayButtonsAndLists(startDate) {
        const scrollArea = document.getElementById('itinerary-scroll-area');
        buttonContainer.innerHTML = '';

        for (let i = 1; i <= totalDays; i++) {
            const currentDayDate = new Date(startDate);
            currentDayDate.setDate(startDate.getDate() + (i - 1));

            const btn = document.createElement('button');
            btn.id = `btn-day-${i}`;
            btn.setAttribute('onclick', `selectDay(${i})`);
            btn.className = (i === currentDay)
                ? "px-5 py-2 rounded-full bg-primary text-white font-bold text-sm whitespace-nowrap transition shadow-md shrink-0"
                : "px-5 py-2 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-500 dark:text-slate-400 hover:text-primary font-bold text-sm whitespace-nowrap transition shrink-0";

            btn.innerText = `Day ${i} (${formatMD(currentDayDate)})`;
            buttonContainer.appendChild(btn);

            let listContainer = document.getElementById(`list-day-${i}`);
            if (!listContainer) {
                listContainer = document.createElement('div');
                listContainer.id = `list-day-${i}`;
                listContainer.className = "day-list p-4 flex flex-col pb-24 pt-0 hidden";
                listContainer.innerHTML = `
                        <div class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm">
                            <div class="w-1.5 h-full bg-slate-300 dark:bg-slate-600 absolute left-0 top-0"></div>
                            <div class="ml-2">
                                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-base">Day ${i} 行程尚未安排</h3>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">請從地圖點擊景點加入</p>
                            </div>
                        </div>`;
                scrollArea.appendChild(listContainer);
            }
            if (!itineraryData[i]) itineraryData[i] = [];
        }
        // 每次重新產生按鈕後，等畫面算好寬度，重新檢查要不要出現箭頭
        setTimeout(checkArrows, 100);
    }

    updateDayButtonsAndLists(defaultStart);
    // 🌟 新增這行：網頁載入後，主動觸發 Day 1 的點擊事件，解開隱藏狀態！
    selectDay(1); 

    dateInput.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const newStart = new Date(e.target.value);
        const newEnd = new Date(newStart);
        newEnd.setDate(newStart.getDate() + daysToAdd);
        dateDisplay.innerText = `${formatMD(newStart)} - ${formatMD(newEnd)}`;
        updateDayButtonsAndLists(newStart);
    });
});

// ==========================================
// 💳 前往付款 (串接用的暫時函數)
// 負責行程的同學在儲存行程與訂單後，會取得一個 orderId。
// 這裡將那個 orderId 附加在 URL 上，傳遞給 /payment 進行結帳。
// ==========================================
function goToPayment() {
    // TODO: 這裡未來要替換成負責行程同學 API 回傳的真實 orderId
    // 假設行程儲存後會把 orderId 存在 window 變數或 sessionStorage
    const orderId = window.currentOrderId || sessionStorage.getItem('currentOrderId') || 1001;
    
    // 將 orderId 帶入網址跳轉
    window.location.href = '/payment?orderId=' + orderId;
    
    // return false 阻止 <a> 標籤的預設行為
    return false;
}
