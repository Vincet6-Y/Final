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
// 🌟 載入「會員個人」行程資料 (移植官方行程修復邏輯)
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
            // 🌟 修復邏輯 A：清理 Place ID 字串 (相容不同 Entity 欄位名稱並清除引號)
            let safePlaceId = (node.googlePlaceId || node.googlePlaceID || "").replace(/["']/g, "").trim();

            // 🌟 修復邏輯 B：如果 ID 是空的，學官方行程用「座標」去跟 Google 要一個新的
            if (!safePlaceId || safePlaceId.length < 5) {
                console.warn(`[${node.locationName}] 缺失 Place ID，啟動緊急修復...`);
                // 此函式在下方輔助函式區
                const freshId = await findPlaceIdByCoords(node.latitude, node.longitude);
                if (freshId) {
                    safePlaceId = freshId;
                    // 自動回報給後端補齊資料庫，下次載入就快了
                    updateDatabasePlaceId(node.spotId, freshId);
                }
            }

            const day = node.dayNumber || 1;
            itineraryData[day].push({
                spotId: node.spotId,
                place_id: safePlaceId,
                lat: parseFloat(node.latitude),
                lng: parseFloat(node.longitude),
                name: node.locationName,
                arrivals: "08:00", // 預設時間
                duration: "1"      // 預設停留
            });
        }

        console.log("🌟 修復後的 itineraryData:", itineraryData);

        // 重設地圖中心點
        if (itineraryData[1].length > 0) {
            map.setCenter({ lat: itineraryData[1][0].lat, lng: itineraryData[1][0].lng });
        }

        // 🌟 關鍵：資料補齊後，立即觸發計算與渲染
        calculateAndDisplayRoute(1);
        selectDay(1); 

    } catch (error) {
        console.error("🔥 載入個人行程錯誤：", error);
    }
}

// ==========================================
// 🌟 移植過來的輔助函式
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
        // 🌟 請確保 PlanRestController 中有這支 PUT API (如下方說明)
        await fetch(`/api/plan/updateNodePlaceId/${spotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId: newPlaceId })
        });
    } catch (err) {
        console.error("同步至資料庫失敗:", err);
    }
}