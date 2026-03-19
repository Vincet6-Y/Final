// 1. 全域變數定義 (確保在最上方)
window.currentSearchMarkers = [];

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

            let bgColor = "#ea4335";
            if (isFirst) bgColor = "#ff8c00";
            else if (isLast) bgColor = "#008ccf";

            const stopMarker = new google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: map,
                label: {
                    text: String(index + 1),
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
                    scale: 14
                },
                title: place.name,
                zIndex: 999
            });

            stopMarker.addListener("click", () => {
                if (typeof fetchAndShowDetails === 'function') {
                    fetchAndShowDetails(place.place_id);
                }
            });

            routeMarkers.push(stopMarker);
        });
    }

    if (!places || places.length < 2) {
        routeLegs[dayToCalculate] = [];
        recalculateTimes(dayToCalculate);
        renderItineraryPanel(dayToCalculate);
        return;
    }

    const results = [];
    for (let i = 0; i < places.length - 1; i++) {
        const origin = { lat: places[i].lat, lng: places[i].lng };
        const destination = { lat: places[i + 1].lat, lng: places[i + 1].lng };

        // 🌟 修正 1：保證大眾運輸時間絕對是「未來時間」 (一律用 7 天後來推算車程)
        const transitTime = new Date();
        transitTime.setDate(transitTime.getDate() + 7);
        transitTime.setHours(8, 0, 0, 0);

        // 🌟 修正 2：改為「排隊等待(await)」，取代 Promise.all 轟炸
        const res = await new Promise((resolve) => {
            setTimeout(() => { // 🌟 加上 300 毫秒延遲，讓 Google 覺得我們是真人
                directionsService.route({
                    origin: origin,
                    destination: destination,
                    travelMode: google.maps.TravelMode.TRANSIT,
                    transitOptions: { departureTime: transitTime }
                }, (res, status) => {
                    if (status === "OK") {
                        res._mode = 'TRANSIT'; resolve(res);
                    } else {
                        directionsService.route({
                            origin: origin, destination: destination, travelMode: google.maps.TravelMode.DRIVING
                        }, (resD, statusD) => {
                            if (statusD === "OK") {
                                resD._mode = 'DRIVING'; resolve(resD);
                            } else {
                                directionsService.route({
                                    origin: origin, destination: destination, travelMode: google.maps.TravelMode.WALKING
                                }, (resW, statusW) => {
                                    if (statusW === "OK") {
                                        resW._mode = 'WALKING'; resolve(resW);
                                    } else {
                                        // 🌟 終極保底：連走路都算不出來（地點太近或海跨島），強制給予 0 秒與 0 公尺
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
            }, 300); // 延遲 0.3 秒
        });

        results.push(res);
    }

    // 🌟 把成功的交通方式 (_mode) 傳遞進去 routeLegs
    routeLegs[dayToCalculate] = results.map(res => {
        if (res) {
            const leg = res.routes[0].legs[0];
            leg._mode = res._mode;
            return leg;
        }
        return null;
    });

    results.forEach((res, index) => {
        if (res) {
            const renderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
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

    // 6. 重新推算抵達時間並更新畫面
    recalculateTimes(dayToCalculate);
    renderItineraryPanel(dayToCalculate);

    // 🌟 7. 新增：等地圖路線計算、時間推算都完成後，才將所有包含車程的數據一次同步進資料庫
    if (typeof syncOrderToDatabase === 'function') {
        syncOrderToDatabase(dayToCalculate);
    }
}

// ==========================================
// 🌟 搜尋與自動完成邏輯
// ==========================================
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

        clearMarkers(); // 搜尋新地點時清空舊標記
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
        position: place.location,
        title: place.displayName,
        animation: google.maps.Animation.DROP
    });

    // 🌟 將標記存入「總叉叉」的紀錄盒
    window.currentSearchMarkers.push(marker);
    markers.push(marker);

    marker.addListener("click", () => {
        fetchAndShowDetails(place.id);
    });
}

async function searchNearby(type) {
    const { Place } = await google.maps.importLibrary("places");

    const request = {
        fields: ['id', 'displayName', 'location'],
        locationRestriction: {
            center: map.getCenter(),
            radius: 1000,
        },
        includedTypes: [type],
        maxResultCount: 20,
    };

    try {
        const { places } = await Place.searchNearby(request);
        if (places && places.length > 0) {
            clearMarkers();
            places.forEach(createMarker);
        } else {
            showToast('error', '附近找不到相關結果，請移動地圖或縮放後再試一次！');
        }
    } catch (e) {
        console.error("搜尋附近景點失敗:", e);
    }
}

// ==========================================
// 🌟 清除邏輯 (修正後：兩個 function 獨立不嵌套)
// ==========================================

// 1. 內部清理函式：搜尋新分類時自動執行
function clearMarkers() {
    if (markers) {
        markers.forEach(m => m.setMap(null));
    }
    markers = [];
    // 同步清空全域紀錄盒，避免新舊標記混亂
    window.currentSearchMarkers = [];
}

// 2. 外部清除函式：點擊「總叉叉」按鈕時執行
function clearAllSearchMarkers() {
    console.log("執行總清除，目前數量：", window.currentSearchMarkers.length);
    if (window.currentSearchMarkers && window.currentSearchMarkers.length > 0) {
        window.currentSearchMarkers.forEach(marker => {
            marker.setMap(null);
        });
        window.currentSearchMarkers = []; // 清空盒子
        console.log("地圖搜尋標記已清除");
    } else {
        console.log("目前地圖上沒有搜尋地標");
    }
}