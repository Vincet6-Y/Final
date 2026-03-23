// ==========================================
// 🌟 取得景點詳細資訊並顯示彈窗 (升級為 Places API New)
// ==========================================
async function fetchAndShowDetails(placeId) {
    if (!placeId || placeId === 'undefined' || placeId === 'null' || String(placeId).length < 10) {
        console.warn("⚠️ 無效的 Place ID，無法查詢詳細資訊。");
        return;
    }

    try {
        console.log("正在使用 Places API (New) 查詢:", placeId);
        const { Place } = await google.maps.importLibrary("places");
        const place = new Place({ id: placeId, requestedLanguage: "zh-TW" });

        await place.fetchFields({
            fields: [
                'id', 'displayName', 'formattedAddress', 'location',
                'rating', 'userRatingCount', 'photos', 'nationalPhoneNumber',
                'regularOpeningHours', 'editorialSummary', 'websiteURI', 'types'
            ]
        });

        showRichModal(place);

    } catch (error) {
        console.warn("❌ Google API 查詢失敗或 ID 失效，嘗試救援...", error);

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

// ==========================================
// 🌟 載入資料與觸發方案 A 的核心
// ==========================================
async function loadMyPlanData(myPlanId, targetDay = null) {
    try {
        const res = await fetch(`/api/plan/myPlanNodes/${myPlanId}`);
        if (!res.ok) throw new Error(`API 請求失敗：${res.status}`);
        const data = await res.json();

        let nodes = Array.isArray(data) ? data : (data.data || []);
        if (nodes.length === 0) {
            console.log("此行程尚無景點資料");
            return;
        }

        // 🌟 1. 自動計算這筆資料中「實際的最大天數」(解決只有 5 天的問題)
        const maxDay = nodes.reduce((max, node) => Math.max(max, node.dayNumber || 1), 1);

        // 初始化 itineraryData，確保 1 到 maxDay 都有空陣列可以裝資料
        itineraryData = {};
        for (let d = 1; d <= maxDay; d++) {
            itineraryData[d] = [];
        }

        // 將資料塞入對應的天數陣列中
        for (const node of nodes) {
            let safePlaceId = (node.GooglePlaceId || node.googlePlaceId || node.googlePlaceID || node.GooglePlaceID || "").toString().trim();
            if (!safePlaceId || safePlaceId === "null" || safePlaceId.length < 5) safePlaceId = "undefined"

            const day = node.dayNumber || 1;
            if (!itineraryData[day]) itineraryData[day] = [];

            itineraryData[day].push({
                spotId: node.spotId,
                place_id: safePlaceId,
                lat: parseFloat(node.latitude),
                lng: parseFloat(node.longitude),
                name: node.locationName,
                arrivals: node.visitTime ? node.visitTime.substring(11, 16) : "08:00",
                duration: "1",
                // 🌟 新增：讀取資料庫的交通數據狀態，用來判斷是否需要自動補全
                transitTime: node.transitTime || null
            });
        }

        // 🌟 2. 核心修復：通知 UI 根據「實際天數」重新產生日數按鈕與列表容器
        if (typeof updateDayButtonsAndLists === 'function') {
            updateDayButtonsAndLists(maxDay);
        }

        // 🌟 3. 核心修復：自動選取 Day 1 並畫出路線 (解決需要手動點擊的問題)
        const dayToSelect = targetDay ? targetDay : 1;
        selectDay(dayToSelect);

        // 如果 Day 1 有景點，自動將地圖中心移動到第一個景點
        if (itineraryData[dayToSelect] && itineraryData[dayToSelect].length > 0) {
            const firstNode = itineraryData[dayToSelect][0];
            if (firstNode.lat && firstNode.lng) {
                map.setCenter({ lat: firstNode.lat, lng: firstNode.lng });
            }
        }

    } catch (error) {
        console.error("🔥 載入個人行程錯誤：", error);
        showToast('error', '載入行程失敗');
    }
}

// ==========================================
// 🌟 方案 A：背景默默計算與同步 (不影響地圖與畫面)
// ==========================================
async function backgroundSyncMissingTransit(currentActiveDay) {
    for (let d in itineraryData) {
        d = parseInt(d);
        if (d === parseInt(currentActiveDay)) continue;

        const places = itineraryData[d];
        if (!places || places.length < 2) continue;

        const needsSync = places.some((p, index) => index > 0 && p.transitTime === null);
        if (!needsSync) continue;

        console.log(`🔍 偵測到 Day ${d} 缺少交通數據，啟動背景自動補全 (方案 A)...`);

        const results = [];
        for (let i = 0; i < places.length - 1; i++) {
            const origin = { lat: places[i].lat, lng: places[i].lng };
            const destination = { lat: places[i + 1].lat, lng: places[i + 1].lng };

            // 保證時間是未來
            const transitTime = new Date();
            transitTime.setDate(transitTime.getDate() + 7);
            transitTime.setHours(8, 0, 0, 0);

            // 背景同步更需要慢慢來，間隔 500 毫秒
            const res = await new Promise((resolve) => {
                setTimeout(() => {
                    directionsService.route({
                        origin: origin, destination: destination,
                        travelMode: google.maps.TravelMode.TRANSIT, transitOptions: { departureTime: transitTime }
                    }, (res, status) => {
                        if (status === "OK") { res._mode = 'TRANSIT'; resolve(res); }
                        else {
                            directionsService.route({ origin, destination, travelMode: google.maps.TravelMode.DRIVING }, (resD, statusD) => {
                                if (statusD === "OK") { resD._mode = 'DRIVING'; resolve(resD); }
                                else {
                                    directionsService.route({ origin, destination, travelMode: google.maps.TravelMode.WALKING }, (resW, statusW) => {
                                        if (statusW === "OK") {
                                            resW._mode = 'WALKING'; resolve(resW);
                                        } else {
                                            // 🌟 終極保底：強制給 0
                                            resolve({
                                                routes: [{ legs: [{ duration: { value: 0, text: '0 分鐘' }, distance: { value: 0, text: '0 公尺' } }] }],
                                                _mode: 'WALKING'
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }, 500); // 延遲 0.5 秒
            });
            results.push(res);
        }

        routeLegs[d] = results.map(res => {
            if (res) {
                const leg = res.routes[0].legs[0];
                leg._mode = res._mode;
                return leg;
            }
            return null;
        });

        if (typeof recalculateTimes === 'function') recalculateTimes(d);
        if (typeof syncOrderToDatabase === 'function') {
            await syncOrderToDatabase(d);
        }
    }
}

// ==========================================
// 🌟 輔助函式
// ==========================================
function findPlaceIdByCoords(lat, lng) {
    return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lng) } }, (results, status) => {
            if (status === "OK" && results[0]) resolve(results[0].place_id);
            else resolve(null);
        });
    });
}

async function updateDatabasePlaceId(spotId, newPlaceId) {
    try {
        await fetch(`/api/plan/updateNodePlaceId/${spotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId: newPlaceId })
        });
    } catch (err) {
        console.error("資料庫更新失敗:", err);
    }
}

// ==========================================
// 🌟 AI 排序
// ==========================================
async function aiSortItinerary() {
    const planId = window.currentMyPlanId;
    const day = currentDay;

    if (!planId) { showToast('error', '找不到行程 ID'); return; }

    const btn = document.getElementById("ai-sort-btn");
    if (btn) btn.disabled = true;

    try {
        const response = await fetch(`/api/plan/aiSort?myPlanId=${planId}&dayNumber=${day}`);
        const data = await response.json();

        if (data.success) {
            await loadMyPlanData(planId, day);
            showToast('success', `Day ${day} 路線已為您最佳化完成！`);
        } else {
            showToast('error', "優化失敗：" + data.message);
        }
    } catch (error) {
        console.error("AI 排序錯誤:", error);
    } finally {
        if (btn) btn.disabled = false;
    }
}