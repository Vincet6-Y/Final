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
        // 🌟 1. 一開始載入就先「鎖定付款按鈕」
        window.isRouteSyncing = true;
        if (typeof updatePaymentButtonState === 'function') updatePaymentButtonState(true);

        const res = await fetch(`/api/plan/myPlanNodes/${myPlanId}`);
        if (!res.ok) throw new Error(`API 請求失敗：${res.status}`);
        const data = await res.json();

        let nodes = Array.isArray(data) ? data : (data.data || []);
        if (nodes.length === 0) {
            console.log("此行程尚無景點資料");
            // 沒資料就直接解鎖
            window.isRouteSyncing = false;
            if (typeof updatePaymentButtonState === 'function') updatePaymentButtonState(false);
            return;
        }

        const maxDay = nodes.reduce((max, node) => Math.max(max, node.dayNumber || 1), 1);

        itineraryData = {};
        for (let d = 1; d <= maxDay; d++) {
            itineraryData[d] = [];
        }

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
                transitTime: node.transitTime || null
            });
        }

        if (typeof updateDayButtonsAndLists === 'function') {
            updateDayButtonsAndLists(maxDay);
        }

        const dayToSelect = targetDay ? targetDay : 1;
        selectDay(dayToSelect);

        if (itineraryData[dayToSelect] && itineraryData[dayToSelect].length > 0) {
            const firstNode = itineraryData[dayToSelect][0];
            if (firstNode.lat && firstNode.lng) {
                map.setCenter({ lat: firstNode.lat, lng: firstNode.lng });
            }
        }

        // 🌟 2. 延遲 1 秒後，開始背景飆速同步
        setTimeout(() => {
            if (typeof backgroundSyncMissingTransit === 'function') {
                backgroundSyncMissingTransit(dayToSelect);
            }
        }, 1000);

    } catch (error) {
        console.error("🔥 載入個人行程錯誤：", error);
        showToast('error', '載入行程失敗');
        // 發生錯誤也要解鎖，避免卡死
        window.isRouteSyncing = false;
        if (typeof updatePaymentButtonState === 'function') updatePaymentButtonState(false);
    }
}

// ==========================================
// 🌟 方案 A：背景默默計算與同步 (5 倍速升級版)
// ==========================================
async function backgroundSyncMissingTransit(currentActiveDay) {
    for (let d in itineraryData) {
        d = parseInt(d);
        if (d === parseInt(currentActiveDay)) continue;

        const places = itineraryData[d];
        if (!places || places.length < 2) continue;

        const needsSync = places.some((p, index) => index > 0 && p.transitTime === null);
        if (!needsSync) continue;

        console.log(`🔍 偵測到 Day ${d} 缺少交通數據，啟動飆速背景同步...`);

        const results = [];
        for (let i = 0; i < places.length - 1; i++) {
            const origin = { lat: places[i].lat, lng: places[i].lng };
            const destination = { lat: places[i + 1].lat, lng: places[i + 1].lng };

            const transitTime = new Date();
            transitTime.setDate(transitTime.getDate() + 7);
            transitTime.setHours(8, 0, 0, 0);

            // 🌟 提速關鍵：從 500ms 降為 100ms
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
                }, 100); 
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

    // 🌟 3. 全部天數同步完畢，正式解鎖付款按鈕！
    window.isRouteSyncing = false;
    if (typeof updatePaymentButtonState === 'function') updatePaymentButtonState(false);
    console.log("✅ 所有天數交通資料背景同步完成，付款按鈕已解鎖！");
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