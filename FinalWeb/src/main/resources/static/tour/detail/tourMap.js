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
// 🌟 終極版：專為獨旅設計的大眾運輸計算 (加入時間參數與防呆機制)
// ==========================================
async function calculateAndDisplayRoute(dayToCalculate) {
    const places = itineraryData[dayToCalculate];

    // 1. 先清除地圖上舊的路線與舊的圖釘
    dayRouteRenderers.forEach(renderer => renderer.setMap(null));
    dayRouteRenderers = [];
    clearMarkers(); // 🌟 新增：確保切換行程時，畫面上的舊圖釘會被清空

    // 防呆：如果這天連一個景點都沒有，就直接結束
    if (!places || places.length === 0) { 
        return; 
    }

    // ==========================================
    // 🌟 保底機制：不管有沒有路線，先把所有景點的圖釘插上去！
    // ==========================================
    const bounds = new google.maps.LatLngBounds(); // 準備一個隱形的「框框」來包裝所有景點

    places.forEach((place) => {
        const position = { lat: place.lat, lng: place.lng };
        
        // 手動把每個景點畫上地圖
        const marker = new google.maps.Marker({
            map: map,
            position: position,
            title: place.name,
            animation: google.maps.Animation.DROP
        });
        markers.push(marker); // 存進陣列，下次切換行程時才能呼叫 clearMarkers() 清掉
        
        // 把這個景點的座標加進「框框」裡
        bounds.extend(position); 
    });

    // 🌟 自動調整地圖視角，讓所有圖釘都能剛好塞進畫面中
    if (places.length === 1) {
        // 如果這天只有一個景點，就直接飛過去並放大
        map.setCenter({ lat: places[0].lat, lng: places[0].lng });
        map.setZoom(15);
    } else {
        // 如果有多個景點，讓地圖自動縮放到能看見所有景點的完美比例
        map.fitBounds(bounds);
    }
    // ==========================================


    // 如果景點少於兩個（算不出路線），就更新側邊欄後提早結束
    if (places.length < 2) {
        routeLegs[dayToCalculate] = [];
        recalculateTimes(dayToCalculate);
        renderItineraryPanel(dayToCalculate);
        return;
    }

    const promises = [];

    for (let i = 0; i < places.length - 1; i++) {
        const origin = { lat: places[i].lat, lng: places[i].lng };
        const destination = { lat: places[i + 1].lat, lng: places[i + 1].lng };

        // 🌟 設定明確的「白天出發時間」
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
                    // 🌟 降級機制：改用「開車(DRIVING)」估算
                    console.warn(`[${places[i].name}] 大眾運輸無解，改以開車(DRIVING)估算。`);
                    directionsService.route({
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING 
                    }, (fallbackRes, fallbackStatus) => {
                        // 🌟 防呆重點：只有真的拿到 OK 結果，才回傳資料，否則回傳 null
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
        if (res) { // 🌟 只有 res 不是 null 的時候，才會畫線
            const renderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true, // 因為我們前面已經手動插好圖釘了，所以這裡隱藏預設圖釘
                polylineOptions: {
                    strokeColor: index % 2 === 0 ? "#008ccf" : "#ff8c00", // 藍橘交錯
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