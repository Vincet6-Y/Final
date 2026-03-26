// ==========================================
// 🌟 1. 載入官方行程資料
// ==========================================
async function loadPlanData(planId) {
    try {
        const res = await fetch(`/api/plan/officialPlanNodes/${planId}`);
        if (!res.ok) throw new Error(`API 請求失敗：${res.status}`);
        const data = await res.json();

        let nodes = Array.isArray(data) ? data : (data.data || []);
        if (nodes.length === 0) return;

        const maxDay = nodes.reduce((max, node) => Math.max(max, node.dayNumber || 1), 1);

        itineraryData = {};
        for (let d = 1; d <= maxDay; d++) {
            itineraryData[d] = [];
        }

        for (const node of nodes) {
            // 🌟 全方位攔截各種大小寫，若無效則設為 undefined 交給後續處理
            let safePlaceId = (node.GooglePlaceId || node.googlePlaceId || node.googlePlaceID || node.GooglePlaceID || "").toString().trim();
            if (!safePlaceId || safePlaceId === "null" || safePlaceId.includes("UNKNOWN")) {
                safePlaceId = "undefined";
            }

            const day = node.dayNumber || 1;
            if (!itineraryData[day]) itineraryData[day] = [];

            let timeString = "08:00";
            if (node.visitTime) {
                timeString = node.visitTime.length > 11 ? node.visitTime.substring(11, 16) : "08:00";
            }

            let stayHours = 1;
            if (node.stayTime) {
                stayHours = Math.round((node.stayTime / 60) * 10) / 10;
            }

            itineraryData[day].push({
                spotId: node.spotId,
                place_id: safePlaceId,
                lat: parseFloat(node.latitude),
                lng: parseFloat(node.longitude),
                name: node.locationName,
                arrivals: timeString,
                duration: stayHours,
                locationImage: node.locationImage || ''
            });
        }

        if (typeof updateDayButtonsAndLists === 'function') {
            updateDayButtonsAndLists(maxDay);
        }

        if (itineraryData[1] && itineraryData[1].length > 0) {
            const firstLat = itineraryData[1][0].lat;
            const firstLng = itineraryData[1][0].lng;
            if (!isNaN(firstLat) && !isNaN(firstLng)) {
                map.setCenter({ lat: firstLat, lng: firstLng });
            }
        }

        calculateAndDisplayRoute(1);
        selectDay(1);

    } catch (error) {
        console.error("🔥 載入行程錯誤：", error);
    }
}

// ==========================================
// 🌟 2. 完善規劃 (複製到我的行程)
// ==========================================
function copyToMyPlan(event, officialPlanId) {
    if (!officialPlanId) return;

    let btn = null;
    let originalText = '';

    if (event && event.currentTarget) {
        btn = event.currentTarget;
        originalText = btn.innerHTML;
        btn.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">refresh</span> 處理中...`;
        btn.disabled = true;
    }

    fetch(`/api/plan/copy/${officialPlanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => {
            if (response.status === 401) {
                const currentPath = window.location.pathname + window.location.search;
                const redirectTarget = encodeURIComponent(`${currentPath}&autoCopy=true`);

                showToast('error', '請先登入會員，即可規劃您的專屬行程！');

                setTimeout(() => {
                    window.location.href = `/auth?redirect=${redirectTarget}`;
                }, 1500);

                throw new Error('Unauthorized');
            }
            if (!response.ok) throw new Error('伺服器錯誤');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showToast('success', '複製成功！正在前往編輯頁面...');
                setTimeout(() => {
                    window.location.href = `/myMap?myPlanId=${data.newMyPlanId}`;
                }, 1000);
            } else {
                showToast('error', data.message || '複製失敗');
                if (btn) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            }
        })
        .catch(error => {
            if (error.message !== 'Unauthorized') {
                console.error('Error:', error);
                showToast('error', '系統發生錯誤');
                if (btn) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            }
        });
}

// ==========================================
// 🌟 3. 輔助函式：使用 Geocoder 進行座標反查
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
    if (!newPlaceId || newPlaceId === "UNKNOWN" || newPlaceId === "undefined") return;
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