async function initMap() {

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 34.6937, lng: 135.5023 },
        zoom: 11,
        mapId: "2fd53a2f051832ea485534f4",
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM }
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map, suppressMarkers: false, polylineOptions: { strokeColor: "#ff8c00", strokeWeight: 5 }
    });
    placesService = new google.maps.places.PlacesService(map);

    setupAutocomplete("pac-input-desktop");
    setupAutocomplete("pac-input-mobile");

    map.addListener("click", (event) => {
        if (event.placeId) {
            event.stop();
            fetchAndShowDetails(event.placeId);
        }
    });
}

// ==========================================
// 🌟 終極版：專為獨旅設計的大眾運輸計算 (含動態景點數字標記)
// ==========================================
async function calculateAndDisplayRoute(dayToCalculate) {
    const places = itineraryData[dayToCalculate];
    
    // 1. 先清除地圖上舊的路線與標記
    dayRouteRenderers.forEach(renderer => renderer.setMap(null));
    dayRouteRenderers = [];

    // 🌟 清除前一次畫出的景點數字標記
    if (routeMarkers) {
        routeMarkers.forEach(m => m.setMap(null));
        routeMarkers = [];
    }

    // 🌟 新增：如果當天有景點，就畫上帶有順序數字的自訂標記
    if (places && places.length > 0) {
        places.forEach((place, index) => {
            const isFirst = index === 0;
            const isLast = index === places.length - 1;

            // 設定標記顏色：起點(橘)、終點(藍)、中間點(紅)
            let bgColor = "#ea4335"; 
            if (isFirst) bgColor = "#ff8c00"; 
            else if (isLast) bgColor = "#008ccf";

            // 建立地圖標記 (圓形 + 數字)
            const stopMarker = new google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: map,
                label: {
                    text: String(index + 1), // 顯示 1, 2, 3...
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "14px"
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: bgColor,
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                    scale: 14 // 圓圈的大小
                },
                title: place.name,
                zIndex: 999 // 確保標記會浮在路線的上面
            });

            // 🌟 點擊地圖上的數字標記，可以直接打開側邊欄的景點詳情！
            stopMarker.addListener("click", () => {
                if (typeof fetchAndShowDetails === 'function') {
                    fetchAndShowDetails(place.place_id);
                }
            });

            routeMarkers.push(stopMarker);
        });
    }

    // 若景點不足 2 個，就不需計算路線，直接更新畫面
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
                    console.warn(`[${places[i].name}] 大眾運輸無解，改以開車(DRIVING)估算。`);
                    directionsService.route({
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING 
                    }, (fallbackRes, fallbackStatus) => {
                        if (fallbackStatus === "OK") resolve(fallbackRes);
                        else resolve(null);
                    });
                }
            });
        }));
    }

    // 等待所有分段的路線都計算完畢
    const results = await Promise.all(promises);

    // 儲存結果供側邊欄使用
    routeLegs[dayToCalculate] = results.map(res => res ? res.routes[0].legs[0] : null);

    // 畫出漂亮的多段路線
    results.forEach((res, index) => {
        if (res) {
            const renderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true, // 🌟 保持 true，隱藏預設的 ABC，因為我們已經畫了自己漂亮的數字標記
                polylineOptions: { 
                    strokeColor: index % 2 === 0 ? "#008ccf" : "#ff8c00", 
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                }
            });
            renderer.setDirections(res);
            dayRouteRenderers.push(renderer);
        }
    });

    // 重新推算抵達時間並更新畫面
    recalculateTimes(dayToCalculate);
    renderItineraryPanel(dayToCalculate);
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