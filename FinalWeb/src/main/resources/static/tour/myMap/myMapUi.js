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
// 切換天數 (Day 1, Day 2...)
// ==========================================
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
    const dayList = document.getElementById(`list-day-${day}`);
    if (dayList) dayList.classList.remove('hidden');

    const modalBtnText = document.getElementById('modal-btn-text');
    if (modalBtnText) modalBtnText.innerText = `加入 Day ${day} 行程`;

    calculateAndDisplayRoute(day);
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

function closeRichModal() {
    document.getElementById('rich-place-modal').classList.add('hidden');
}

// ==========================================
// 🌟 修正：加入景點時，先存資料庫再更新畫面
// ==========================================
async function confirmAddToItinerary() {
    if (!tempSelectedPlace) return;

    const planId = window.currentMyPlanId;
    const day = currentDay;

    if (!planId) {
        showToast('error', '找不到行程 ID，無法加入景點');
        return;
    }

    // 將按鈕文字改成載入中，避免使用者連點
    const btnText = document.getElementById('modal-btn-text');
    const originalText = btnText.innerText;
    btnText.innerText = "加入中...";

    try {
        // 1. 呼叫後端 API，將景點存入資料庫
        const response = await fetch('/api/plan/addNode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                myPlanId: planId,
                dayNumber: day,
                placeId: tempSelectedPlace.id,
                name: tempSelectedPlace.displayName,
                lat: tempSelectedPlace.location.lat(),
                lng: tempSelectedPlace.location.lng()
            })
        });

        const data = await response.json();

        if (data.success) {
            // 2. 資料庫儲存成功後，才把帶有真實 spotId 的資料塞進畫面陣列中
            itineraryData[day].push({
                spotId: data.spotId,
                place_id: tempSelectedPlace.id,
                lat: tempSelectedPlace.location.lat(),
                lng: tempSelectedPlace.location.lng(),
                name: tempSelectedPlace.displayName,
                arrivals: "08:00",
                duration: "1",
                hasTicketOffer: Math.random() > 0.5
            });

            calculateAndDisplayRoute(day);

            const scrollArea = document.getElementById('itinerary-scroll-area');
            if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
            closeRichModal();

            if (window.innerWidth <= 768 && isMapView) {
                toggleMobileView();
            }
        } else {
            showToast('error', '加入失敗：' + data.message);
        }
    } catch (error) {
        console.error("加入景點發生錯誤:", error);
        showToast('error', '伺服器發生錯誤，請稍後再試');
    } finally {
        // 恢復按鈕文字
        btnText.innerText = originalText;
    }
}

// ==========================================
// 🌟 拖曳事件處理函數 (Drag and Drop Logic) - 全域綁定升級版
// ==========================================
window.handleDragStart = function (e, day, index) {
    draggedItemInfo = { day, index };
    e.dataTransfer.effectAllowed = 'move';
    // 加上半透明與縮小效果，提升視覺回饋
    setTimeout(() => e.target.classList.add('opacity-50', 'scale-95', 'z-50'), 0);
};

window.handleDragOver = function (e) {
    e.preventDefault(); // 必須阻止預設行為才能允許放置 (Drop)
    e.dataTransfer.dropEffect = 'move';
    return false;
};

window.handleDragEnter = function (e) {
    e.preventDefault();
    // 拖曳經過時，目標卡片顯示橘色虛線邊框提示
    const target = e.currentTarget;
    target.classList.remove('border-slate-200', 'dark:border-white/10');
    target.classList.add('border-primary', 'border-2', 'border-dashed');
};

window.handleDragLeave = function (e) {
    const target = e.currentTarget;
    // 離開時恢復原狀
    target.classList.add('border-slate-200', 'dark:border-white/10');
    target.classList.remove('border-primary', 'border-2', 'border-dashed');
};

window.handleDrop = function (e, day, dropIndex) {
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

    // 重新計算路線、渲染列表並自動同步至資料庫
    calculateAndDisplayRoute(day);
    draggedItemInfo = null;
    return false;
};

window.handleDragEnd = function (e) {
    e.target.classList.remove('opacity-50', 'scale-95', 'z-50');
};

// ==========================================
// 時間自動推算引擎與輸入框事件
// ==========================================
function recalculateTimes(day) {
    const places = itineraryData[day];
    const legs = routeLegs[day] || [];
    if (!places || places.length === 0) return;

    if (!places[0].arrivals) places[0].arrivals = "08:00";
    if (!places[0].duration) places[0].duration = 1;

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

function updateDuration(day, index, newDuration) {
    itineraryData[day][index].duration = parseFloat(newDuration) || 1;
    recalculateTimes(day);
    renderItineraryPanel(day);
    syncTimeToDatabase(day, index); // 🌟 呼叫同步
}

function updateArrivalTime(day, index, newTime) {
    itineraryData[day][index].arrivals = newTime;
    recalculateTimes(day);
    renderItineraryPanel(day);
    syncTimeToDatabase(day, index); // 🌟 呼叫同步
}

// 🌟 輔助函式：將出發日期與天數組合為 LocalDateTime 格式
function getFullDateTimeStr(day, timeStr) {
    // 🌟 防呆：如果 timeStr 是空的，強制給 08:00
    if (!timeStr || timeStr === "undefined" || timeStr === "null") timeStr = "08:00";

    const startDateInput = document.getElementById('db-startDate');
    let dateObj = (startDateInput && startDateInput.value) ? new Date(startDateInput.value) : new Date();
    dateObj.setDate(dateObj.getDate() + (day - 1));

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${timeStr}:00`;
}

// 🌟 同步「單一景點時間」至資料庫
async function syncTimeToDatabase(day, index) {
    const item = itineraryData[day][index];
    if (!item.spotId) return;

    // 將小時轉換為分鐘存入資料庫
    const stayMins = Math.round(parseFloat(item.duration) * 60);
    const fullDateTime = getFullDateTimeStr(day, item.arrivals);

    try {
        await fetch('/api/plan/updateNodeTime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spotId: item.spotId,
                visitTime: fullDateTime,
                stayTime: stayMins
            })
        });
    } catch (err) { console.error("時間同步失敗:", err); }
}

// 🌟 升級版：將順序、時間、車程、距離一起批次同步
async function syncOrderToDatabase(day) {
    const list = itineraryData[day];
    const legs = routeLegs[day] || [];

    const payload = list.map((item, index) => {
        let tTime = null, dist = null, tMode = 'WALKING';

        // 抓取上一站到這一站的 Google 車程與距離
        if (index > 0 && legs[index - 1]) {
            const leg = legs[index - 1];
            // 🌟 加上安全判斷，如果有值就取 value，沒有就給 0
            tTime = leg.duration ? leg.duration.value : 0;
            dist = leg.distance ? leg.distance.value : 0;

            tMode = leg._mode || ((dist > 1000) ? 'DRIVING' : 'WALKING');
        }

        return {
            spotId: item.spotId,
            visitOrder: index + 1,
            visitTime: getFullDateTimeStr(day, item.arrivals),
            transitTime: tTime,
            distance: dist,
            transitMode: tMode
        };
    }).filter(i => i.spotId);

    if (payload.length === 0) return;

    try {
        console.log(`正在同步 Day ${day} 的新順序與交通時間...`);
        const response = await fetch('/api/plan/updateOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!data.success) {
            console.error("順序與時間儲存失敗:", data.message);
        }
    } catch (error) {
        console.error("同步順序時發生連線錯誤:", error);
    }
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

    // 🌟 恢復編輯版：加入 draggable, ondragstart 拖曳事件，以及 <input type="time"> 編輯時間功能
    const dayStartHTML = `
          <div draggable="true" ondragstart="handleDragStart(event, ${day}, 0)" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${day}, 0)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondragend="handleDragEnd(event)" class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm cursor-move transition-all duration-200 hover:shadow-md">
              <div class="w-1.5 h-full ${markerColor} absolute left-0 top-0"></div>
              <div class="ml-2 flex justify-between items-center w-full">
                  <div class="flex-1">
                      <h3 onclick="openPlaceDetails(${day}, 0)" class="font-bold text-slate-800 dark:text-slate-100 text-base pr-4 cursor-pointer hover:text-primary dark:hover:text-primary transition-colors underline-offset-4 hover:underline">${dayStartPlace.name}</h3>
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

        // 🌟 恢復編輯版：加入 draggable, 垃圾桶按鈕, 以及 <input type="number"> 停留時間編輯
        const destinationHTML = `
              <div draggable="true" ondragstart="handleDragStart(event, ${day}, ${i})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${day}, ${i})" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondragend="handleDragEnd(event)" class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm animate-fade-in-up cursor-move transition-all duration-200 hover:shadow-md">
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
              </div>
            `;

        listContainer.insertAdjacentHTML('beforeend', transportHTML + destinationHTML);
    }
}

// 🌟 修正版：刪除景點並同步資料庫
async function removeItineraryItem(day, index) {
    const item = itineraryData[day][index];

    if (!item.spotId) {
        itineraryData[day].splice(index, 1);
        calculateAndDisplayRoute(day);
        return;
    }

    try {
        const response = await fetch(`/api/plan/deleteNode/${item.spotId}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            itineraryData[day].splice(index, 1);
            calculateAndDisplayRoute(day);
            showToast('success', `已移除「${item.name}」`);
        } else {
            showToast('error', '刪除失敗：' + data.message);
        }
    } catch (error) {
        console.error("刪除錯誤:", error);
        showToast('error', '刪除失敗，請稍後再試');
    }
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

    // 🌟 安全讀取 HTML 中的資料庫隱藏欄位
    const dbStartDateInput = document.getElementById('db-startDate');
    const dbTotalDaysInput = document.getElementById('db-totalDays');

    // 🌟 1. 改為全域變數 window.myMapTotalDays，讓 API 也能修改它
    const today = new Date();
    let defaultStart = (dbStartDateInput && dbStartDateInput.value) ? new Date(dbStartDateInput.value) : today;
    window.myMapTotalDays = (dbTotalDaysInput && dbTotalDaysInput.value) ? parseInt(dbTotalDaysInput.value) : 5;

    // 預設加上按鈕日期的函式 (後續會在 window.updateDayButtonsAndLists 覆蓋)
    let daysToAdd = window.myMapTotalDays - 1;
    let defaultEnd = new Date(defaultStart);
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
    // ✨ 動態生成 Day 按鈕與列表 (🌟 2. 改寫為全域函數 window.updateDayButtonsAndLists)
    // ==========================================
    window.updateDayButtonsAndLists = function (param) {

        // 🌟 3. 智慧判斷：如果傳進來的是「數字」(代表 API 發現了更多天數)
        if (typeof param === 'number') {
            if (param > window.myMapTotalDays) {
                window.myMapTotalDays = param; // 擴充總天數
            }
        }
        // 🌟 4. 如果傳進來的是「日期」(代表使用者從日曆重新選擇了出發日)
        else if (param instanceof Date) {
            defaultStart = param;
        }

        const daysToAdd = window.myMapTotalDays - 1;
        const currentEnd = new Date(defaultStart);
        currentEnd.setDate(defaultStart.getDate() + daysToAdd);

        // 更新日期顯示文字
        if (dateDisplay) {
            dateDisplay.innerText = `${formatMD(defaultStart)} - ${formatMD(currentEnd)}`;
        }

        const scrollArea = document.getElementById('itinerary-scroll-area');
        if (!scrollArea) return;
        buttonContainer.innerHTML = '';

        for (let i = 1; i <= window.myMapTotalDays; i++) {
            const currentDayDate = new Date(defaultStart);
            currentDayDate.setDate(defaultStart.getDate() + (i - 1));

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
    };

    // 初始化第一次呼叫
    window.updateDayButtonsAndLists(defaultStart);
    selectDay(1);

    // 監聽使用者更改日期
    dateInput.addEventListener('change', (e) => {
        if (!e.target.value) return;
        window.updateDayButtonsAndLists(new Date(e.target.value));
    });
});

// ==========================================
// 🌟 UI 控制：鎖定/解鎖前往付款按鈕
// ==========================================
window.updatePaymentButtonState = function (isSyncing) {
    const btn = document.getElementById('goToPaymentBtn');
    if (!btn) return;

    if (isSyncing) {
        // 鎖定狀態
        btn.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">sync</span>計算路線中`;
        btn.classList.add('opacity-70', 'cursor-not-allowed', 'bg-slate-400');
        btn.classList.remove('bg-primary', 'hover:bg-orange-600');
        btn.style.pointerEvents = 'none';
    } else {
        // 解鎖狀態
        btn.innerHTML = `<span class="material-symbols-outlined text-base">shopping_cart_checkout</span>前往付款`;
        btn.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-slate-400');
        btn.classList.add('bg-primary', 'hover:bg-orange-600');
        btn.style.pointerEvents = 'auto';
    }
};

// ==========================================
// 💳 前往付款
// ==========================================
function goToPayment() {
    // 🌟 防呆攔截：如果還在算路線，不准跳轉！
    if (window.isRouteSyncing) {
        showToast('warning', '正在為您計算最佳路線中，請稍候幾秒鐘！');
        return false;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const myPlanId = urlParams.get('myPlanId');

    if (!myPlanId) {
        showToast('error', '找不到行程 ID，請先儲存行程或確認網址！');
        return false;
    }

    const dateInput = document.querySelector('input[type="date"]');
    let startDateParam = "";
    if (dateInput && dateInput.value) {
        startDateParam = `&startDate=${dateInput.value}`;
    }

    fetch(`/payment/createOrderFromPlan?myPlanId=${myPlanId}${startDateParam}`, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.orderId) {
                window.location.href = '/payment?orderId=' + data.orderId;
            } else {
                showToast('error', "建立訂單失敗：" + (data.message || "未知錯誤"));
            }
        })
        .catch(error => {
            console.error("結帳建立失敗:", error);
            showToast('error', '系統發生錯誤，無法建立訂單');
        });

    return false;
}

// 🌟 網頁載入時啟動個人行程
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const myPlanId = urlParams.get('myPlanId');

    if (myPlanId) {
        // 每 0.1 秒檢查地圖是否準備好，準備好就載入資料
        const checkReady = setInterval(() => {
            if (typeof directionsService !== 'undefined' && directionsService !== null) {
                clearInterval(checkReady);
                loadMyPlanData(myPlanId);
            }
        }, 100);
    }
});