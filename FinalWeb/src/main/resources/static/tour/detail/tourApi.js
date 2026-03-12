// 🌟 獨立出資料載入函式，並嚴格匹配 GooglePlaceID

// tourApi.js [修正版]

async function loadPlanData(planId) {
    try {
        const res = await fetch(`/api/plan/officialPlanNodes/${planId}`);
        if (!res.ok) throw new Error(`API 請求失敗：${res.status}`);
        const data = await res.json();
        
        console.log("🚀 [Debug] 後端原始資料：", data);
        let nodes = Array.isArray(data) ? data : (data.data || []);
        if (nodes.length === 0) return;

        itineraryData = { 1: [], 2: [], 3: [], 4: [], 5: [] };

        // 🌟 關鍵修正：改用 for...of 迴圈，這樣 await 才會生效
        for (const node of nodes) {
            console.log("🔍 [Debug] 處理節點：", node.locationName);

            let safePlaceId = (node.GooglePlaceID || node.googlePlaceID || "").replace(/["']/g, "").trim();
            
            // 🚩 判斷 ID 是否失效：長度太短或後端沒給 ID
            if (!safePlaceId || safePlaceId.length < 5) {
                console.warn(`⚠️ [Debug] ${node.locationName} ID 遺失或失效，嘗試座標反查...`);
                
                // 等待 Google 回傳新 ID
                const freshId = await findPlaceIdByCoords(node.latitude, node.longitude);
                
                if (freshId) {
                    safePlaceId = freshId;
                    console.log(`✨ [Debug] 成功取得新 ID: ${freshId}，準備寫入資料庫...`);
                    // 同步更新資料庫，確保下次載入就是正確的
                    await updateDatabasePlaceId(node.spotId, freshId); 
                }
            }

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

        // 🌟 確定所有節點（包含更新後的 ID）都處理完了，才執行渲染
        console.log("✅ [Debug] 資料預處理完成，開始渲染地圖與列表");
        
        if (itineraryData[1].length > 0) {
            map.setCenter({ lat: itineraryData[1][0].lat, lng: itineraryData[1][0].lng });
        }
        
        calculateAndDisplayRoute(1);
        selectDay(1);

    } catch (error) {
        console.error("🔥 [Debug] 載入行程發生嚴重錯誤：", error);
    }
}

// 🌟 輔助：利用 Geocoder 座標換 ID
function findPlaceIdByCoords(lat, lng) {
    return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lng) } }, (results, status) => {
            if (status === "OK" && results[0]) {
                resolve(results[0].place_id);
            } else {
                console.error("❌ Geocode 失敗:", status);
                resolve(null);
            }
        });
    });
}

// 🌟 輔助：呼叫後端 API
async function updateDatabasePlaceId(spotId, newPlaceId) {
    try {
        await fetch(`/api/plan/updateNodePlaceId/${spotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId: newPlaceId })
        });
        console.log(`💾 資料庫已自動修復 SpotID: ${spotId}`);
    } catch (err) {
        console.error("💾 資料庫更新失敗:", err);
    }
}

// 🌟 輔助：用座標換 ID
function findPlaceIdByCoords(lat, lng) {
    return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lng) } }, (results, status) => {
            if (status === "OK" && results[0]) resolve(results[0].place_id);
            else resolve(null);
        });
    });
}

// 🌟 輔助：更新資料庫
function updateDatabasePlaceId(spotId, newPlaceId) {
    fetch(`/api/plan/updateNodePlaceId/${spotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: newPlaceId })
    }).then(() => console.log(`✅ Spot ${spotId} ID 已自動更新`));
}

// 🌟 新增：呼叫後端更新資料庫的函式
function updateDatabasePlaceId(spotId, newPlaceId) {
    fetch(`/api/plan/updateNodePlaceId/${spotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: newPlaceId })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) console.log(`✅ Spot ${spotId} 資料庫更新成功！`);
    })
    .catch(err => console.error("❌ 資料庫更新失敗:", err));
}


// 🌟 輔助函式：用座標換取最新的 Place ID
function findPlaceIdByCoords(lat, lng) {
    return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lng) } }, (results, status) => {
            if (status === "OK" && results[0]) {
                resolve(results[0].place_id);
            } else {
                resolve(null);
            }
        });
    });
}

function copyToMyPlan(officialPlanId) {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">refresh</span> 處理中...`;
    btn.disabled = true;

    fetch(`/api/plan/copy/${officialPlanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => {
            // 🌟 攔截未登入狀態 (401)
            if (response.status === 401) {
                alert('系統提示：請先登入會員，才能將官方行程加入您的專屬規劃中！');
                // 將當前網址存起來，導向登入頁，並加上 autoCopy=true 參數
                // 這樣登入成功跳回來時，系統才知道要自動幫他點擊複製
                window.location.href = `/login?redirect=/packageTourDetail?planId=${officialPlanId}&autoCopy=true`;
                throw new Error('Unauthorized');
            }
            if (!response.ok) throw new Error('系統錯誤');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 成功拷貝！跳轉到專屬編輯頁面，並帶上新的 myPlanId
                window.location.href = `/packageTourMap?myPlanId=${data.newMyPlanId}`;
            } else {
                alert(data.message || '複製失敗');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        })
        .catch(error => {
            if (error.message !== 'Unauthorized') {
                console.error('Error:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
}