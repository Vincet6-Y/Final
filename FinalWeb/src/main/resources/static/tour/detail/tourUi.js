// TODO: 行程無法對應到 DayX 上面
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
            alert('無法從 Google 取得該地點的詳細資訊');
        }
    }
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
                alert(`很抱歉，無法在 Google 地圖上尋找到「${placeNode.name}」的詳細資訊。`);
            }
        } catch (error) {
            console.error("❌ 即時搜尋救援失敗:", error);
        }
    }
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
// 🌟時間自動推算引擎
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
// 🌟 新增功能：動態加入「// ...existing code...
    // 取得 packagetourdetail.html 上設定的天數（優先用 data-total-days / id=total-days / URL 參數 totalDays）
    const totalDays = (() => {
        const fromDom =
            document.querySelector('[data-total-days]') ||
            document.getElementById('total-days');

        if (fromDom) {
            const val = fromDom.dataset.totalDays || fromDom.value || fromDom.innerText;
            const parsed = parseInt(val, 10);
            if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const urlDays = parseInt(urlParams.get('totalDays'), 10);
        if (!Number.isNaN(urlDays) && urlDays > 0) return urlDays;

        return 10; // 預設 10 天
    })();
    const daysToAdd = totalDays - 1;
    // ...existing code...箭頭
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const titleContainer = document.querySelector('.text-lg.font-bold.text-primary').parentElement;

  //  const totalDays = 10;
   // const daysToAdd = totalDays - 1;


    // ✅ 新增這段魔法：用計時器每 0.1 秒確認一次地圖醒了沒
    const checkReady = setInterval(() => {
        // 確認 directionsService 已經被 initMap 給初始化了
        if (typeof directionsService !== 'undefined' && directionsService !== null) {
            clearInterval(checkReady); // 確認雙方都準備好，停止計時器

            const urlParams = new URLSearchParams(window.location.search);
            const planId = urlParams.get('planId');

            if (planId) {
                console.log("🟢 畫面與地圖皆已就緒，開始載入資料 ID:", planId);
                loadPlanData(planId);
            } else {
                selectDay(1); // 如果沒有 planId，安全地顯示 Day 1 空畫面
            }
        }
    }, 100);

    // ==========================================
    // ✨ 左右滑動箭頭 UI 注入 (DOM 包裝魔法)
    // ==========================================
    const buttonContainer = document.getElementById('day-buttons-container');

    // 建立外層 Wrapper (讓箭頭可以浮動對齊)
    const tabsWrapper = document.createElement('div');
    // 🌟 核心修正：移除會干擾的 relative，單純保留 sticky，並將 z-index 拉高到 z-40 確保不會被蓋住
    tabsWrapper.className = 'sticky top-0 z-40 flex items-center w-full shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-background-dark overflow-hidden shadow-md';

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
 // ✅ 1. 讓函式獨立在最外面，並接收 actualDays 參數
// ...existing code...

// 🌟 取得行程天數（優先用 data-total-days / id=total-days / 再用 URL 參數 totalDays）
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

// ...existing code...

document.addEventListener("DOMContentLoaded", () => {
    const titleContainer = document.querySelector('.text-lg.font-bold.text-primary').parentElement;

    // ✅ 改用動態天數，不再固定 10 天
    const totalDays = getTotalDaysFromPage();
    updateDayButtonsAndLists(totalDays);

    // ✅ 新增這段魔法：用計時器每 0.1 秒確認一次地圖醒了沒
    const checkReady = setInterval(() => {
        // 確認 directionsService 已經被 initMap 給初始化了
        if (typeof directionsService !== 'undefined' && directionsService !== null) {
            clearInterval(checkReady); // 確認雙方都準備好，停止計時器

            const urlParams = new URLSearchParams(window.location.search);
            const planId = urlParams.get('planId');

            if (planId) {
                console.log("🟢 畫面與地圖皆已就緒，開始載入資料 ID:", planId);
                loadPlanData(planId);
            } else {
                selectDay(1); // 如果沒有 planId，安全地顯示 Day 1 空畫面
            }
        }
    }, 100);

    // ...existing code...
});

// ✅ 2. 修改後的 DOMContentLoaded (刪除寫死的 10 天邏輯)
document.addEventListener("DOMContentLoaded", () => {
    // 這裡原本寫死 totalDays = 10 的地方全部刪掉！
    // 這裡原本呼叫 updateDayButtonsAndLists() 的地方也刪掉！

    const checkReady = setInterval(() => {
        if (typeof directionsService !== 'undefined' && directionsService !== null) {
            clearInterval(checkReady);
            const urlParams = new URLSearchParams(window.location.search);
            const planId = urlParams.get('planId');
            if (planId) {
                loadPlanData(planId); // 讓 API 抓完資料後去決定天數
            }
        }
    }, 100);
                      
    // 🔴 關鍵修正：呼叫時不要再傳入任何參數 (把原本括號裡的 defaultStart 拿掉)
   // updateDayButtonsAndLists();
}); // 這裡是 DOMContentLoaded 的結尾

// 完善規劃按鈕點擊事件
async function copyToMyPlan(officialPlanId) {
    if (!officialPlanId) return;

    try {
        const response = await fetch(`/api/plan/copy/${officialPlanId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        // 🌟 處理 Session 不存在 (未登入 401)
        if (response.status === 401) {
            // 取得當前網址 (例如 /packageTourDetail?planId=1)
            const currentPath = window.location.pathname + window.location.search;
            const separator = currentPath.includes('?') ? '&' : '?';
            // 加上 autoCopy=true 標記
            const targetUrl = encodeURIComponent(currentPath + separator + "autoCopy=true");

            alert('請先登入會員，系統將於登入後自動為您複製行程！');
            // 🌟 導向組員負責的登入頁面 (/auth) 並帶上目標網址
            window.location.href = `/auth?redirect=${targetUrl}`;
            return;
        }

        const data = await response.json();
        if (data.success) {
            // 成功後跳轉至地圖編輯頁面
            window.location.href = `/packageTourMap?myPlanId=${data.newMyPlanId}`;
        } else {
            alert('複製失敗：' + data.message);
        }
    } catch (error) {
        console.error("複製行程時出錯:", error);
    }
}

// 🌟 偵測是否是登入後跳轉回來
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('planId');
    const autoCopy = urlParams.get('autoCopy');

    // 如果網址帶有 autoCopy，代表是登入後自動回來
    if (autoCopy === 'true' && planId) {
        console.log("偵測到登入後回傳，正在自動執行完善規劃...");

        // 🌟 小優化：把網址上的 autoCopy=true 擦掉，避免使用者按 F5 重新整理時又觸發一次複製
        const cleanUrl = window.location.pathname + `?planId=${planId}`;
        window.history.replaceState({}, document.title, cleanUrl);

        // 延遲 1 秒確保地圖等資源載入完成，然後自動幫他按按鈕
        setTimeout(() => copyToMyPlan(planId), 1000);
    }
});