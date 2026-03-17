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
            alert('無法從 Google 取得該地點的詳細資訊');
        }
    }
}

// ==========================================
// 🌟 修正：支援指定天數，不再永遠跳回 Day 1
// ==========================================
async function loadMyPlanData(myPlanId, targetDay = null) { // 🌟 新增 targetDay 參數
    try {
        console.log("正在發起請求，讀取個人行程 ID:", myPlanId);
        const res = await fetch(`/api/plan/myPlanNodes/${myPlanId}`);
        if (!res.ok) throw new Error(`API 請求失敗：${res.status}`);

        const data = await res.json();
        let nodes = Array.isArray(data) ? data : (data.data || []);

        if (nodes.length === 0) return;

        itineraryData = { 1: [], 2: [], 3: [], 4: [], 5: [] };

        for (const node of nodes) {
            let safePlaceId = (node.GooglePlaceId || node.googlePlaceId || node.googlePlaceID || node.GooglePlaceID || "").toString().trim();
            if (!safePlaceId || safePlaceId === "null" || safePlaceId.length < 5) safePlaceId = "undefined";

            const day = node.dayNumber || 1;
            itineraryData[day].push({
                spotId: node.spotId,
                place_id: safePlaceId, 
                lat: parseFloat(node.latitude),
                lng: parseFloat(node.longitude),
                name: node.locationName,
                arrivals: "08:00", 
                duration: "1"      
            });
        }

        // 🌟 決定畫面要停在哪一天 (優先用傳入的目標天數，其次是當下天數，最後才預設 1)
        const dayToSelect = targetDay || currentDay || 1;

        if (itineraryData[dayToSelect].length > 0) {
            map.setCenter({ lat: itineraryData[dayToSelect][0].lat, lng: itineraryData[dayToSelect][0].lng });
        }

        // 🌟 改用動態變數，不再寫死 1
        calculateAndDisplayRoute(dayToSelect);
        selectDay(dayToSelect);

    } catch (error) {
        console.error("🔥 載入個人行程錯誤：", error);
    }
}

// ==========================================
// 🌟 輔助函式 (必須放在最外層)
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
// 🌟 修正：排序後停留在原本的 Day
// ==========================================
async function aiSortItinerary() {
    const planId = window.currentMyPlanId;
    const day = currentDay; // 🌟 記住使用者現在正在看哪一天

    if (!planId) return alert("找不到行程 ID");

    const btn = document.getElementById("ai-sort-btn");
    if(btn) btn.disabled = true;

    try {
        const response = await fetch(`/api/plan/aiSort?myPlanId=${planId}&dayNumber=${day}`);
        const data = await response.json();

        if (data.success) {
            // 🌟 傳入 day，告訴讀取函式：「資料更新完了，請把我留在 Day X，不要踢我回 Day 1」
            await loadMyPlanData(planId, day);
            alert(`Day ${day} 路線已為您最佳化完成！`);
        } else {
            alert("優化失敗：" + data.message);
        }
    } catch (error) {
        console.error("AI 排序錯誤:", error);
    } finally {
        if(btn) btn.disabled = false;
    }
}