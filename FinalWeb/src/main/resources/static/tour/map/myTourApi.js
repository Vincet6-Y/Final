// ==========================================
// 🌟 取得景點詳細資訊並顯示彈窗 (升級為 Places API New)
// ==========================================
async function fetchAndShowDetails(placeId) {
    // 🌟 加入 String(placeId).length < 10 攔截假 ID，避免 Google 噴 INVALID_REQUEST
    if (!placeId || placeId === 'undefined' || placeId === 'null' || String(placeId).length < 10) {
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

    // ==========================================
    // 🌟 前端呼叫 AI 一鍵優化 API
    // ==========================================
    async function aiSortItinerary() {
        // 從全域變數取得當前行程 ID 與正在查看的天數
        const planId = window.currentMyPlanId;
        const day = currentDay; // currentDay 在 myTourGlobals.js 裡

        if (!planId) {
            alert("找不到行程 ID，無法優化。");
            return;
        }

        // 加上 Loading 效果 (可選)
        const btn = document.getElementById("ai-sort-btn");
        if (btn) {
            btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">sync</span> 運算中...`;
            btn.disabled = true;
        }

        try {
            console.log(`正在請求 AI 優化... 行程:${planId}, 天數:${day}`);
            // 打 API 給剛剛在 Controller 寫的 @PostMapping
            const response = await fetch(`/api/plan/aiSort?myPlanId=${planId}&dayNumber=${day}`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                console.log("AI 排序成功！正在重新載入地圖...");
                // 重新載入行程資料，畫面跟地圖路線就會自動更新
                await loadMyPlanData(planId);

                // 強制切換回剛剛優化的那一天
                if (typeof selectDay === 'function') {
                    selectDay(day);
                }
            } else {
                alert(data.message || "優化失敗，請稍後再試。");
            }
        } catch (error) {
            console.error("AI 排序發生錯誤:", error);
            alert("伺服器發生錯誤");
        } finally {
            // 恢復按鈕原狀
            if (btn) {
                btn.innerHTML = `<span class="material-symbols-outlined text-sm">auto_fix_high</span> AI 一鍵順路`;
                btn.disabled = false;
            }
        }
    }
}