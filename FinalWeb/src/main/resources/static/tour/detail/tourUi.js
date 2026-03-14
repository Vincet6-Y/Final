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

async function fetchAndShowDetails(placeId) {
    // 1. 先嘗試用現有的 placeId 抓資料
    placesService.getDetails({
        placeId: placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'photos', 'formatted_phone_number', 'opening_hours', 'editorial_summary', 'user_ratings_total', 'website', 'types']
    }, async (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            showRichModal(place);
        } else if (status === "NOT_FOUND") {
            // 🚩 核心修復：如果 ID 沒效了，嘗試在當前行程中尋找對應的座標來修復
            console.warn("⚠️ Place ID 已失效，嘗試啟動緊急修復程序...");

            // 從全域變數尋找當前點擊的景點座標
            let targetNode = null;
            Object.values(itineraryData).flat().forEach(node => {
                if (node.place_id === placeId) targetNode = node;
            });

            if (targetNode && targetNode.lat && targetNode.lng) {
                const freshId = await findPlaceIdByCoords(targetNode.lat, targetNode.lng);
                if (freshId) {
                    console.log("✨ 修復成功！取得新 ID:", freshId);
                    // 重新用新 ID 抓一次資料
                    fetchAndShowDetails(freshId);
                    // 同步回報給後端更新資料庫 (此函式在 tourApi.js)
                    if (typeof updateDatabasePlaceId === 'function') {
                        updateDatabasePlaceId(targetNode.spotId, freshId);
                    }
                }
            } else {
                alert('找不到該地點的有效資訊，請嘗試重新搜尋加入。');
            }
        } else {
            console.error("Google API Error:", status);
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
                      <h3 onclick="openPlaceDetails('${dayStartPlace.place_id}')" class="font-bold text-slate-800 dark:text-slate-100 text-base pr-4 cursor-pointer hover:text-primary dark:hover:text-primary transition-colors underline-offset-4 hover:underline">${dayStartPlace.name}</h3>
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
// 🌟 新增功能：動態加入「出發日期選擇器」+ Day 按鈕左右滑動箭頭
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const titleContainer = document.querySelector('.text-lg.font-bold.text-primary').parentElement;

    const totalDays = 5;
    const daysToAdd = totalDays - 1;


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
    function updateDayButtonsAndLists() {
        // 抓取 HTML 中專門用來放行程列表的容器
        const listContainerWrapper = document.getElementById('itinerary-lists-container');
        buttonContainer.innerHTML = '';

        for (let i = 1; i <= totalDays; i++) {
            // 1. 建立 Day 按鈕
            const btn = document.createElement('button');
            btn.id = `btn-day-${i}`;
            btn.setAttribute('onclick', `selectDay(${i})`);
            btn.className = (i === currentDay)
                ? "px-5 py-2 rounded-full bg-primary text-white font-bold text-sm whitespace-nowrap transition shadow-md shrink-0"
                : "px-5 py-2 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-500 dark:text-slate-400 hover:text-primary font-bold text-sm whitespace-nowrap transition shrink-0";

            btn.innerText = `Day ${i}`; // 乾淨俐落，只顯示 Day X
            buttonContainer.appendChild(btn);

            // 2. 建立對應的行程列表區塊
            let listContainer = document.getElementById(`list-day-${i}`);
            if (!listContainer) {
                listContainer = document.createElement('div');
                listContainer.id = `list-day-${i}`;
                listContainer.className = "day-list p-4 flex flex-col pb-24 pt-0 hidden";
                listContainer.innerHTML = `
                        <div class="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden shadow-sm">
                            <div class="w-1.5 h-full bg-slate-300 dark:bg-slate-600 absolute left-0 top-0"></div>
                            <div class="ml-2">
                                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-base">Day ${i} 行程載入中...</h3>
                            </div>
                        </div>`;
                listContainerWrapper.appendChild(listContainer);
            }
            if (!itineraryData[i]) itineraryData[i] = [];
        }
        // 重新檢查左右箭頭是否需要顯示
        setTimeout(checkArrows, 100);
    }

    // 🔴 關鍵修正：呼叫時不要再傳入任何參數 (把原本括號裡的 defaultStart 拿掉)
    updateDayButtonsAndLists();
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