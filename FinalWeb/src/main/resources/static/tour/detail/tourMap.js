function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 35.6895, lng: 139.6917 },
        zoom: 11,
        mapId: '2fd53a2f051832ea485534f4',
        disableDefaultUI: true,
        zoomControl: true
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: false });
    placesService = new google.maps.places.PlacesService(map);

    map.addListener("click", (e) => { if (e.placeId) { e.stop(); fetchAndShowDetails(e.placeId); } });

}

// ==========================================
// 🌟 搜尋附近景點 (升級為 Places API New)
// ==========================================
async function searchNearby(type) {
    const { Place } = await google.maps.importLibrary("places");
    
    // 新版搜尋參數結構
    const request = {
        fields: ['id', 'displayName', 'location'],
        locationRestriction: {
            center: map.getCenter(),
            radius: 3000,
        },
        includedTypes: [type], // 陣列格式
        maxResultCount: 20,
    };

    try {
        const { places } = await Place.searchNearby(request);
        if (places && places.length > 0) {
            clearMarkers();
            places.forEach(createMarker);
        } else {
            alert('附近找不到相關結果，請移動地圖或縮放後再試一次！');
        }
    } catch (e) {
        console.error("搜尋附近景點失敗:", e);
        alert('搜尋失敗，請稍微移動地圖後再試一次。');
    }
}

function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.place_id) return;

        if (place.geometry && place.geometry.viewport) map.fitBounds(place.geometry.viewport);
        else if (place.geometry) { map.setCenter(place.geometry.location); map.setZoom(17); }

        clearMarkers();
        fetchAndShowDetails(place.place_id);

        if (window.innerWidth <= 768 && isMapView === false) {
            toggleMobileView();
        }
        input.value = '';
    });
}

function createMarker(place) {
    const marker = new google.maps.Marker({
        map, 
        position: place.location, // 🌟 新版直接取 location
        title: place.displayName, // 🌟 新版取 displayName
        animation: google.maps.Animation.DROP
    });
    markers.push(marker);
    marker.addListener("click", () => {
        fetchAndShowDetails(place.id); // 🌟 新版傳入 .id
    });
}

function clearMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }

// ==========================================
// 🌟 終極版：專為獨旅設計的大眾運輸計算 (加入時間參數)
// ==========================================
async function calculateAndDisplayRoute(dayToCalculate) {
    const places = itineraryData[dayToCalculate];

    // 1. 先清除地圖上舊的路線
    dayRouteRenderers.forEach(renderer => renderer.setMap(null));
    dayRouteRenderers = [];

    if (!places || places.length < 2) {
        routeLegs[dayToCalculate] = [];
        recalculateTimes(dayToCalculate);
        renderItineraryPanel(dayToCalculate);
        return;
    }

    const promises = [];

    for (let i = 0; i < places.length - 1; i++) {
        const origin = { lat: places[i].lat, lng: places[i].lng };
        const destination = { lat: places[i + 1].lat, lng: places[i + 1].lng };

        // 🌟 關鍵魔法：設定明確的「白天出發時間」
        // 強制給它一個明天早上 8 點的基準時間來查時刻表，避免半夜測試抓不到車
        const transitTime = new Date();
        transitTime.setDate(transitTime.getDate() + 1); // 確保是明天
        transitTime.setHours(8, 0, 0, 0); // 早上 8 點

        promises.push(new Promise((resolve) => {
            directionsService.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.TRANSIT,
                transitOptions: {
                    departureTime: transitTime
                }
            }, (response, status) => {
                if (status === "OK") {
                    resolve(response);
                } else {
                    // 🌟 關鍵修改：從 WALKING 改為 DRIVING
                    // 因為日本大眾運輸常不回傳資料，我們改用「開車」來估算，時間最接近真實火車車程！
                    console.warn(`[${places[i].name}] 大眾運輸無解，改以開車(DRIVING)估算。`);
                    directionsService.route({
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING // 🚗 改用開車來拿時間
                    }, (fallbackRes, fallbackStatus) => {
                        if (fallbackStatus === "OK") resolve(fallbackRes);
                        else resolve(null);
                    });
                }
            });
        }));
    }

    // 3. 等待所有分段的路線都計算完畢
    const results = await Promise.all(promises);

    // 4. 儲存結果供側邊欄使用
    routeLegs[dayToCalculate] = results.map(res => res ? res.routes[0].legs[0] : null);

    // 5. 畫出漂亮的多段路線
    results.forEach((res, index) => {
        if (res) {
            const renderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: index % 2 === 0 ? "#008ccf" : "#ff8c00", // 藍橘交錯，方便辨識轉乘點
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                }
            });
            renderer.setDirections(res);
            dayRouteRenderers.push(renderer);
        }
    });

    // 6. 重新推算抵達時間並更新畫面
    recalculateTimes(dayToCalculate);
    renderItineraryPanel(dayToCalculate);
}