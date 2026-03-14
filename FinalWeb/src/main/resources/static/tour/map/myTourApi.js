// ==========================================
// 🌟 取得景點詳細資訊並顯示彈窗 (核心功能)
// ==========================================
function fetchAndShowDetails(placeId) {
    if (!placeId || placeId === 'undefined' || placeId === 'null') {
        console.warn("⚠️ 無效的 Place ID，無法查詢詳細資訊。");
        return;
    }

    console.log("正在查詢 Google 景點詳細資料:", placeId);

    // 呼叫 Google Places Service
    placesService.getDetails({
        placeId: placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'photos', 'formatted_phone_number', 'opening_hours', 'editorial_summary', 'user_ratings_total', 'website', 'types']
    }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // 如果 Google 沒回傳 ID，手動補上
            if (!place.place_id) place.place_id = placeId;

            // 呼叫 myTourUi.js 中的顯示函式
            showRichModal(place);
        } else {
            console.error("❌ Google API 查詢失敗，狀態碼:", status);
            alert('無法從 Google 取得該地點的詳細資訊');
        }
    });
}

// ==========================================
// 🌟 載入「會員個人」行程資料 (修正版)
// ==========================================
async function loadMyPlanData(myPlanId) {
    try {
        console.log("正在發起請求，讀取個人行程 ID:", myPlanId);
        const res = await fetch(`/api/plan/myPlanNodes/${myPlanId}`);
        if (!res.ok) throw new Error(`API 請求失敗：${res.status}`);

        const data = await res.json();
        let nodes = Array.isArray(data) ? data : (data.data || []);

        if (nodes.length === 0) return;

        itineraryData = { 1: [], 2: [], 3: [], 4: [], 5: [] };

        for (const node of nodes) {
            // 🌟 核心修正：請確保你的後端回傳的 JSON 裡面，Google Place ID 的名稱是什麼？
            // 官方行程可能是 GooglePlaceID，個人行程可能是 googlePlaceId
            // 這裡涵蓋各種可能的大小寫，並確保它存在
            let safePlaceId = (node.GooglePlaceId || node.googlePlaceId || node.googlePlaceID || node.GooglePlaceID || "").toString().trim();

            if (!safePlaceId || safePlaceId === "null" || safePlaceId.length < 5) {
                console.error(`[${node.locationName}] 嚴重警告：後端沒有傳回有效的 Place ID！`, node);
                safePlaceId = "undefined";
            }

            const day = node.dayNumber || 1;
            itineraryData[day].push({
                spotId: node.spotId,
                place_id: safePlaceId, // 如果是 undefined，點擊時就不會彈窗報錯
                lat: parseFloat(node.latitude),
                lng: parseFloat(node.longitude),
                name: node.locationName,
                arrivals: "08:00", // 預設時間
                duration: "1"      // 預設停留
            });
        }

        console.log("🌟 解析後的 itineraryData:", itineraryData);

        if (itineraryData[1].length > 0) {
            map.setCenter({ lat: itineraryData[1][0].lat, lng: itineraryData[1][0].lng });
        }

        calculateAndDisplayRoute(1);
        selectDay(1);

    } catch (error) {
        console.error("🔥 載入個人行程錯誤：", error);
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
}