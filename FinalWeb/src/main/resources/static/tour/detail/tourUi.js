function updateDayButtonsAndLists(totalDays) {
    const buttonContainer = document.getElementById('day-buttons-container');
    const listContainer = document.getElementById('itinerary-lists-container');

    if (!buttonContainer || !listContainer) return;

    buttonContainer.innerHTML = '';
    listContainer.innerHTML = '';

    for (let day = 1; day <= totalDays; day++) {
        buttonContainer.insertAdjacentHTML(
            'beforeend',
            `
            <button
                id="btn-day-${day}"
                onclick="selectDay(${day})"
                class="px-5 py-2 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-500 dark:text-slate-400 hover:text-primary font-bold text-sm whitespace-nowrap transition shrink-0">
                Day ${day}
            </button>
            `
        );

        listContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div id="list-day-${day}" class="day-list hidden p-4 space-y-3"></div>
            `
        );
    }
}

// 切換目前顯示的行程 Day
// 1. 更新按鈕樣式
// 2. 顯示對應 Day 的行程列表
// 3. 呼叫路線計算與列表渲染
function selectDay(day) {
    currentDay = day;
    document.querySelectorAll('[id^="btn-day-"]').forEach(btn => {
        btn.className = "px-5 py-2 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-500 dark:text-slate-400 hover:text-primary font-bold text-sm whitespace-nowrap transition shrink-0";
    });
    const activeBtn = document.getElementById(`btn-day-${day}`);
    if (activeBtn) {
        activeBtn.className = "px-5 py-2 rounded-full bg-primary text-white font-bold text-sm whitespace-nowrap transition shadow-md shrink-0";
    }

    document.querySelectorAll('.day-list').forEach(list => list.classList.add('hidden'));

    const targetList = document.getElementById(`list-day-${day}`);
    if (targetList) targetList.classList.remove('hidden');

    const modalBtn = document.getElementById('modal-btn-text');
    if (modalBtn) modalBtn.innerText = `加入 Day ${day} 行程`;

    // 🌟 關鍵修復：先強制畫出目前的景點列表，讓使用者不用等 Google 算路線！
    renderItineraryPanel(day);

    // 背景去算路線
    calculateAndDisplayRoute(day);
}

// ==========================================
// 🌟 取得景點詳細資訊並顯示彈窗 (升級為 Places API New)
// 從 Google Places API 取得景點詳細資訊，並開啟資訊 Modal
// ==========================================
async function fetchAndShowDetails(placeId) {
    if (!placeId || placeId === 'undefined' || placeId === 'null') {
        console.warn("⚠️ 無效的 Place ID，無法查詢詳細資訊。");
        return;
    }

    try {
        console.log("正在使用 Places API (New) 查詢:", placeId);
        // 1. 動態載入新版 Places 函式庫
        const { Place } = await google.maps.importLibrary("places");

        // 2. 建立 Place 物件並指定語系
        const place = new Place({ id: placeId, requestedLanguage: "zh-TW" });

        // 3. 使用 fetchFields 請求特定欄位 (新版屬性名稱)
        await place.fetchFields({
            fields: [
                'id', 'displayName', 'formattedAddress', 'location',
                'rating', 'userRatingCount', 'photos', 'nationalPhoneNumber',
                'regularOpeningHours', 'editorialSummary', 'websiteURI', 'types'
            ]
        });

        // 4. 呼叫 UI 顯示
        showRichModal(place);

    } catch (error) {
        console.warn("❌ Google API 查詢失敗或 ID 失效，嘗試救援...", error);

        // 保持原有的救援機制 (針對 tourUi.js 的失效 ID 修復)
        let targetNode = null;
        Object.values(itineraryData).flat().forEach(node => {
            if (node.place_id === placeId) targetNode = node;
        });

        if (targetNode && targetNode.lat && targetNode.lng) {
            if (typeof findPlaceIdByCoords === 'function') {
                const freshId = await findPlaceIdByCoords(targetNode.lat, targetNode.lng);
                if (freshId) {
                    console.log("✨ 修復成功！取得新 ID:", freshId);
                    fetchAndShowDetails(freshId);
                    if (typeof updateDatabasePlaceId === 'function') {
                        updateDatabasePlaceId(targetNode.spotId, freshId);
                    }
                }
            }
        } else {
            showToast('error', '無法從 Google 取得該地點的詳細資訊');
        }
    }
}

// 顯示景點詳細資訊的 Modal 視窗
// 將 Google Places API 回傳資料填入 UI
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

    // --- 🌟 配合新版 API (New) 開始填入新資料 ---
    document.getElementById('modal-place-name').innerText = place.displayName || '未命名地點';
    document.getElementById('modal-place-address').innerText = place.formattedAddress || '無詳細地址資訊';
    document.getElementById('modal-place-rating').innerText = place.rating || '0.0';
    document.getElementById('modal-place-reviews').innerText = `(${place.userRatingCount || 0} 則評論)`;
    document.getElementById('modal-place-phone').innerText = place.nationalPhoneNumber || '無電話資訊';

    // 🌟 新增：處理景點類型 (取第一個分類，並將底線換成空格以利閱讀)
    const typeEl = document.getElementById('modal-place-type');
    if (typeEl) {
        typeEl.innerText = (place.types && place.types.length > 0) ? place.types[0].replace(/_/g, ' ') : '景點';
    }

    // 🌟 新增：處理官方網站連結
    const websiteEl = document.getElementById('modal-place-website');
    if (websiteEl) {
        if (place.websiteURI) { // 新版為 websiteURI
            websiteEl.href = place.websiteURI;
            websiteEl.innerText = '前往官方網站';
            websiteEl.classList.remove('pointer-events-none', 'text-slate-500');
        } else {
            websiteEl.href = '#';
            websiteEl.innerText = '無官方網站資訊';
            websiteEl.classList.add('pointer-events-none', 'text-slate-500');
        }
    }

    if (place.editorialSummary) { // 新版直接是一串文字，不是物件
        document.getElementById('modal-place-desc').innerText = place.editorialSummary;
    } else {
        document.getElementById('modal-place-desc').innerText = '此地點暫無詳細的官方簡介。這是一處值得您親自探索的地方！';
    }

    // 處理圖片 (如果沒有足夠圖片，原本設定的 loading 圖會繼續顯示)
    if (place.photos && place.photos.length >= 1) {
        document.getElementById('modal-img-main').src = place.photos[0].getURI({ maxWidth: 800 });
        if (place.photos[1]) document.getElementById('modal-img-sub1').src = place.photos[1].getURI({ maxWidth: 400 });
        if (place.photos[2]) document.getElementById('modal-img-sub2').src = place.photos[2].getURI({ maxWidth: 400 });
    }

    // 🌟 修改：處理營業時間 (改為條列式展開，捨棄原本單純的「營業中/休息中」)
    const hoursEl = document.getElementById('modal-place-hours');
    if (hoursEl) {
        if (place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions) {
            hoursEl.innerHTML = place.regularOpeningHours.weekdayDescriptions.map(text =>
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
// 🌟 彈窗開關與即時搜尋救援 (升級為 Places API New 邏輯)
// ==========================================
async function openPlaceDetails(day, index) {
    // 防呆機制
    if (!day || !itineraryData[day]) return;

    const placeNode = itineraryData[day][index];
    if (!placeNode) return;

    // 地圖自動移動並放大
    if (map && placeNode.lat && placeNode.lng) {
        map.panTo({ lat: parseFloat(placeNode.lat), lng: parseFloat(placeNode.lng) });
        map.setZoom(16);
    }

    const placeId = placeNode.place_id;

    // 🌟 嚴格防呆：真正的 Google ID 超過 20 字元。如果太短 (例如不小心存到資料庫 ID "510123")，直接判定無效並啟動救援！
    if (placeId && placeId !== 'undefined' && placeId !== 'null' && String(placeId).length > 10) {
        fetchAndShowDetails(placeId);
    } else {
        console.log(`[${placeNode.name}] 缺少或無效 ID (${placeId})，啟動新版 API 即時搜尋...`);

        try {
            const { Place } = await google.maps.importLibrary("places");

            // 🌟 使用新版 API 的 searchByText
            const request = {
                textQuery: placeNode.name,
                locationBias: {
                    center: { lat: parseFloat(placeNode.lat), lng: parseFloat(placeNode.lng) },
                    radius: 50 // 在周圍 50 公尺內精準搜尋
                },
                language: 'zh-TW'
            };

            const { places } = await Place.searchByText(request);

            if (places && places.length > 0) {
                const foundPlaceId = places[0].id;
                console.log(`✨ 即時搜尋成功！找到 [${placeNode.name}] 的真實 ID:`, foundPlaceId);

                // 偷偷補回記憶體裡，這樣下次點擊就不用重查了
                placeNode.place_id = foundPlaceId;

                // 呼叫 API 顯示彈窗
                fetchAndShowDetails(foundPlaceId);
            } else {
                showToast('error', `很抱歉，無法在 Google 地圖上尋找到「${placeNode.name}」的詳細資訊。`);
            }
        } catch (error) {
            console.error("❌ 即時搜尋救援失敗:", error);
        }
    }
}

// 關閉景點詳細資訊視窗
function closeRichModal() {
    document.getElementById('rich-place-modal').classList.add('hidden');
}

// 將使用者在地圖選取的景點加入行程
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
// 🌟時間自動推算引擎
// 根據交通時間與停留時間
// 自動推算每個景點的抵達時間
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

// 🌟使用者編輯時間的觸發事件
// 使用者修改停留時間
function updateDuration(day, index, newDuration) {
    itineraryData[day][index].duration = parseFloat(newDuration) || 1;
    recalculateTimes(day); // 重新推算下方所有行程
    renderItineraryPanel(day); // 重新渲染畫面
}

// 使用者手動修改抵達時間
function updateArrivalTime(day, index, newTime) {
    itineraryData[day][index].arrivals = newTime;
    recalculateTimes(day); // 重新推算下方所有行程
    renderItineraryPanel(day); // 重新渲染畫面
}

// ==========================================
// 🌟 拖曳事件處理函數 (Drag and Drop Logic)
// 拖曳開始
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
    // 🌟 唯讀版：拔除 draggable, ondragstart, 以及 <input type="time">
    const dayStartHTML = `
          <div class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md">
              <div class="w-1.5 h-full ${markerColor} absolute left-0 top-0"></div>
              <div class="ml-2 flex justify-between items-center w-full">
                  <div class="flex-1">
                      <h3 onclick="openPlaceDetails(${day}, 0)" class="font-bold text-slate-800 dark:text-slate-100 text-base pr-4 cursor-pointer hover:text-primary dark:hover:text-primary transition-colors underline-offset-4 hover:underline">${dayStartPlace.name}</h3>
                      <div class="flex items-center gap-2 mt-2">
                          <span class="text-xs text-slate-500 dark:text-slate-400">出發時間：</span>
                          <span class="text-xs font-bold text-primary">${dayStartPlace.arrivals}</span>
                      </div>
                  </div>
              </div>
          </div>
        `;
    listContainer.insertAdjacentHTML('beforeend', dayStartHTML);

    for (let i = 1; i < places.length; i++) {
        const destinationPlace = places[i];
        const originPlace = places[i - 1]; // 🌟 新增：取得前一站，用於導航座標
        const leg = legs[i - 1];

        let travelMode = '無法計算路線';
        let travelIcon = 'warning';
        let durationText = '--';
        let mapMode = 'driving'; // 🌟 新增：傳給 Google Maps 網址的參數預設值

        if (leg) {
            let travelMinutes = Math.ceil(leg.duration.value / 60);
            let timeString = "";
            if (travelMinutes < 60) {
                timeString = `${travelMinutes} 分鐘`;
            } else {
                const hours = Math.floor(travelMinutes / 60);
                const mins = travelMinutes % 60;
                timeString = mins > 0 ? `${hours} 小時 ${mins} 分鐘` : `${hours} 小時`;
            }

            if (leg._mode) {
                switch (leg._mode) {
                    case 'TRANSIT':
                        travelMode = '大眾運輸';
                        travelIcon = 'directions_subway'; 
                        mapMode = 'transit'; // 對應 Google 網址的導航方式
                        break;
                    case 'FLIGHT':
                        travelMode = '飛機航程';
                        travelIcon = 'flight';            
                        mapMode = 'transit'; 
                        break;
                    case 'WALKING':
                        travelMode = '步行大約';
                        travelIcon = 'directions_walk';   
                        mapMode = 'walking';
                        break;
                    case 'DRIVING':
                    default:
                        travelMode = '車程估算';
                        travelIcon = 'directions_car';    
                        mapMode = 'driving';
                        break;
                }
            } else {
                const distanceKm = leg.distance.value / 1000;
                if (distanceKm > 1) { // 🌟 UI 這裡也同步改為 1 公里
                    travelMode = '車程估算';
                    travelIcon = 'directions_car';
                    mapMode = 'driving';
                } else {
                    travelMode = '走路';
                    travelIcon = 'directions_walk';
                    mapMode = 'walking';
                }
            }
            
            durationText = `約 ${timeString}`;
        }

        // 🌟 產生 Google Maps 原生導航連結
        const oLat = parseFloat(originPlace.latitude || originPlace.lat);
        const oLng = parseFloat(originPlace.longitude || originPlace.lng);
        const dLat = parseFloat(destinationPlace.latitude || destinationPlace.lat);
        const dLng = parseFloat(destinationPlace.longitude || destinationPlace.lng);
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=${mapMode}`;

        // 🌟 將原本的 div 改為 a 標籤，並加上 hover 特效與跳轉小圖示
        const transportHTML = `
              <a href="${mapsUrl}" target="_blank" title="在 Google Maps 開啟導航" class="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm ml-6 my-1 border-l-2 border-dashed border-slate-300 dark:border-slate-600 pl-4 py-3 animate-fade-in-up hover:text-primary transition-colors cursor-pointer group">
                  <span class="material-symbols-outlined text-base bg-white dark:bg-background-dark p-1 rounded-full border border-slate-200 dark:border-slate-700 group-hover:border-primary group-hover:text-primary transition-colors">${travelIcon}</span>
                  <span class="group-hover:underline underline-offset-2">${travelMode} ${durationText}</span>
                  <span class="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity ml-1">open_in_new</span>
              </a>
            `;

        // 🌟 唯讀版：拔除 draggable, 垃圾桶按鈕, 以及 <input type="number">
        const destinationHTML = `
          <div class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm animate-fade-in-up transition-all duration-200 hover:shadow-md">
            <div class="w-1.5 h-full bg-primary absolute left-0 top-0"></div>
            <div class="flex justify-between items-start ml-2">
              <div class="flex-1">
                <h3 onclick="openPlaceDetails(${day}, ${i})" 
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
                    <span class="font-bold text-primary">${destinationPlace.duration}</span> 小時
                  </span>
                </div>
              </div>
            </div>
          </div>
        `;

        listContainer.insertAdjacentHTML('beforeend', transportHTML + destinationHTML);
    }
}

function removeItineraryItem(day, index) {
    itineraryData[day].splice(index, 1);
    calculateAndDisplayRoute(day);
}

// 手機版切換地圖 / 行程
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

// 取得行程天數
function getTotalDaysFromPage(defaultDays = 10) {
    const fromDom = document.querySelector('[data-total-days]') || document.getElementById('total-days');

    if (fromDom) {
        const val = fromDom.dataset.totalDays || fromDom.value || fromDom.innerText;
        const parsed = parseInt(val, 10);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlDays = parseInt(urlParams.get('totalDays'), 10);
    if (!Number.isNaN(urlDays) && urlDays > 0) return urlDays;

    return defaultDays;
}

// 建立 Day 按鈕與對應的行程列表容器
// 用於初始化行程頁面 UI
// totalDays 來自行程總天數
function updateDayButtonsAndLists(totalDays) {
    const buttonContainer = document.getElementById('day-buttons-container');
    const listContainer = document.getElementById('itinerary-lists-container');

    if (!buttonContainer || !listContainer) return;

    buttonContainer.innerHTML = '';
    listContainer.innerHTML = '';

    for (let day = 1; day <= totalDays; day++) {
        buttonContainer.insertAdjacentHTML(
            'beforeend',
            `
            <button
                id="btn-day-${day}"
                onclick="selectDay(${day})"
                class="px-5 py-2 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-500 dark:text-slate-400 hover:text-primary font-bold text-sm whitespace-nowrap transition shrink-0">
                Day ${day}
            </button>
            `
        );

        listContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div id="list-day-${day}" class="day-list hidden p-4 space-y-3"></div>
            `
        );
    }
}

// 初始化 Day Tab 滑動
function initDayTabsScroll() {
    const buttonContainer = document.getElementById('day-buttons-container');
    if (!buttonContainer || !buttonContainer.parentNode) return;

    if (buttonContainer.dataset.scrollInitialized === 'true') return;
    buttonContainer.dataset.scrollInitialized = 'true';

    const tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'sticky top-0 z-40 flex items-center w-full shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-background-dark overflow-hidden shadow-md';

    buttonContainer.parentNode.insertBefore(tabsWrapper, buttonContainer);
    tabsWrapper.appendChild(buttonContainer);

    buttonContainer.classList.remove('border-b', 'border-slate-200', 'dark:border-white/10', 'shrink-0');
    buttonContainer.classList.add('w-full', 'scroll-smooth');

    const leftBtn = document.createElement('button');
    leftBtn.className = "absolute left-1 z-10 w-7 h-7 flex items-center justify-center bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm shadow-md rounded-full text-slate-500 hover:text-primary transition-colors hidden";
    leftBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">chevron_left</span>';

    const rightBtn = document.createElement('button');
    rightBtn.className = "absolute right-1 z-10 w-7 h-7 flex items-center justify-center bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm shadow-md rounded-full text-slate-500 hover:text-primary transition-colors hidden";
    rightBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">chevron_right</span>';

    tabsWrapper.appendChild(leftBtn);
    tabsWrapper.appendChild(rightBtn);

    leftBtn.addEventListener('click', () => {
        buttonContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });

    rightBtn.addEventListener('click', () => {
        buttonContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });

    const checkArrows = () => {
        if (buttonContainer.scrollWidth > buttonContainer.clientWidth) {
            leftBtn.classList.toggle('hidden', buttonContainer.scrollLeft <= 0);
            rightBtn.classList.toggle(
                'hidden',
                buttonContainer.scrollLeft + buttonContainer.clientWidth >= buttonContainer.scrollWidth - 2
            );
        } else {
            leftBtn.classList.add('hidden');
            rightBtn.classList.add('hidden');
        }
    };

    buttonContainer.addEventListener('scroll', checkArrows);
    window.addEventListener('resize', checkArrows);
    setTimeout(checkArrows, 100);
}

document.addEventListener("DOMContentLoaded", () => {
    const totalDays = getTotalDaysFromPage();
    updateDayButtonsAndLists(totalDays);
    initDayTabsScroll();

    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('planId');
    const autoCopy = urlParams.get('autoCopy');

    if (autoCopy === 'true' && planId) {
        const cleanUrl = window.location.pathname + `?planId=${planId}`;
        window.history.replaceState({}, document.title, cleanUrl);

        setTimeout(() => copyToMyPlan(planId), 1000);
    }

    const checkReady = setInterval(() => {
        if (typeof directionsService !== 'undefined' && directionsService !== null) {
            clearInterval(checkReady);

            if (planId) {
                console.log("🟢 畫面與地圖皆已就緒，開始載入資料 ID:", planId);
                loadPlanData(planId);
            } else {
                selectDay(1);
            }
        }
    }, 100);
});

async function copyToMyPlan(officialPlanId) {
    if (!officialPlanId) return;

    try {
        const response = await fetch(`/api/plan/copy/${officialPlanId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 401) {
            const currentPath = window.location.pathname + window.location.search;
            const separator = currentPath.includes('?') ? '&' : '?';
            const targetUrl = encodeURIComponent(currentPath + separator + "autoCopy=true");

            showToast('error', '請先登入會員，登入後即可安排您的專屬行程！');
            setTimeout(() => { 
                window.location.href = `/auth?redirect=${targetUrl}`; 
            }, 1000);
            return;
        }

        const data = await response.json();
        if (data.success) {
            window.location.href = `/packageTourMap?myPlanId=${data.newMyPlanId}`;
        } else {
            showToast('error', '複製失敗：' + data.message);
        }
    } catch (error) {
        console.error("複製行程時出錯:", error);
    }
}