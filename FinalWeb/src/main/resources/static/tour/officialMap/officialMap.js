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
    const request = {
        fields: ['id', 'displayName', 'location'],
        locationRestriction: { center: map.getCenter(), radius: 3000 },
        includedTypes: [type],
        maxResultCount: 20
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
        if (window.innerWidth <= 768 && isMapView === false) toggleMobileView();
        input.value = '';
    });
}

function createMarker(place) {
    const marker = new google.maps.Marker({
        map, position: place.location, title: place.displayName, animation: google.maps.Animation.DROP
    });
    markers.push(marker);
    marker.addListener("click", () => fetchAndShowDetails(place.id));
}

function clearMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }

// ==========================================
// 🌟 支援"大眾運輸 + 飛機 + 走路"自動判斷、精準起終點防飄移版 + 自動對焦
// ==========================================
async function calculateAndDisplayRoute(dayToCalculate) {
    // 抓取該天景點
    const places = itineraryData[dayToCalculate];

    // 移除舊路線、移除舊編號圖釘
    dayRouteRenderers.forEach(renderer => renderer.setMap(null)); 
    dayRouteRenderers = [];
    if (routeMarkers) { routeMarkers.forEach(m => m.setMap(null));
        routeMarkers = []; 
    }

    // 🌟 1. 在最外層宣告 bounds，準備裝載所有座標
    const bounds = new google.maps.LatLngBounds(); // 初始化自動對焦容器

    if (places && places.length > 0) {
        places.forEach((place, index) => {
            // 判斷顏色：起點藍、終點紅、中間橘
            const isFirst = index === 0;
            const isLast = index === places.length - 1;
            let bgColor = "#ff8c00";
            if (isFirst) bgColor = "#008ccf";
            else if (isLast) bgColor = "#ea4335";

            const markerLat = parseFloat(place.latitude || place.lat);
            const markerLng = parseFloat(place.longitude || place.lng);

            // 🌟 2. 將景點標記座標加入 bounds
            bounds.extend({ lat: markerLat, lng: markerLng });
            // 建立 Marker 並加上數字標籤 label
            const stopMarker = new google.maps.Marker({
                position: { lat: markerLat, lng: markerLng },
                map: map,
                label: { text: String(index + 1), color: "white", fontWeight: "bold", fontSize: "14px" },
                icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: bgColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 14 },
                title: place.name, zIndex: 999
            });

            // 🌟 確保能抓取到任何命名格式的 GooglePlaceID
            stopMarker.addListener("click", () => {
                const targetPlaceId = place.GooglePlaceID || place.googlePlaceId || place.googlePlaceID || place.place_id;
                if (targetPlaceId && typeof fetchAndShowDetails === 'function') {
                    fetchAndShowDetails(targetPlaceId);
                }
            });
            routeMarkers.push(stopMarker);
        });
    }

    if (!places || places.length < 2) {
        // 🌟 防呆：如果當天只有一個景點，也要對焦
        if (places && places.length === 1 && !bounds.isEmpty()) {
            map.fitBounds(bounds);
            // 避免只有一個點時地圖縮放得太近
            const listener = google.maps.event.addListener(map, "idle", function () {
                if (map.getZoom() > 16) map.setZoom(16);
                google.maps.event.removeListener(listener);
            });
        }
        routeLegs[dayToCalculate] = [];
        if (typeof recalculateTimes === 'function') recalculateTimes(dayToCalculate);
        if (typeof renderItineraryPanel === 'function') renderItineraryPanel(dayToCalculate);
        return;
    }

    const results = [];
    let currentDepartureTime = new Date();
    currentDepartureTime.setDate(currentDepartureTime.getDate() + 7);
    currentDepartureTime.setHours(8, 0, 0, 0);

    for (let i = 0; i < places.length - 1; i++) {
        const markerLatOrigin = parseFloat(places[i].latitude || places[i].lat);
        const markerLngOrigin = parseFloat(places[i].longitude || places[i].lng);
        const markerLatDest = parseFloat(places[i + 1].latitude || places[i + 1].lat);
        const markerLngDest = parseFloat(places[i + 1].longitude || places[i + 1].lng);

        const getPlaceId = (place) => place.GooglePlaceID || place.googlePlaceId || place.googlePlaceID || place.place_id;
        
        const originId = getPlaceId(places[i]);
        const originTransit = originId ? { placeId: originId } : { lat: markerLatOrigin, lng: markerLngOrigin };
        const destId = getPlaceId(places[i + 1]);
        const destinationTransit = destId ? { placeId: destId } : { lat: markerLatDest, lng: markerLngDest };

        const originPrecise = { lat: markerLatOrigin, lng: markerLngOrigin };
        const destPrecise = { lat: markerLatDest, lng: markerLngDest };

        const transitTime = new Date(currentDepartureTime.getTime());

        const res = await new Promise((resolve) => {
            setTimeout(() => {
                directionsService.route({
                    origin: originTransit, destination: destinationTransit, travelMode: google.maps.TravelMode.TRANSIT, transitOptions: { departureTime: transitTime }
                }, (resT, statusT) => {
                    if (statusT === "OK") {
                        resT._mode = 'TRANSIT';
                        resolve(resT);
                    } else {
                        directionsService.route({
                            origin: originPrecise, destination: destPrecise, travelMode: google.maps.TravelMode.WALKING
                        }, (resW, statusW) => {
                            if (statusW === "OK" && resW.routes[0].legs[0].distance.value <= 1000) {
                                resW._mode = 'WALKING'; resolve(resW);
                                //「補救機制」的起點
                            } else {
                                const distKm = getDistanceFromLatLonInKm(markerLatOrigin, markerLngOrigin, markerLatDest, markerLngDest);
                                let estimatedMinutes = 0, finalMode = 'TRANSIT', lineColor = '#ff8c00';
                                if (distKm > 500) {
                                    // ✈️ 飛行航程模式：時速 800 + 2 小時緩衝
                                    finalMode = 'FLIGHT'; lineColor = '#9c27b0';
                                    estimatedMinutes = Math.ceil((distKm / 800) * 60) + 120;
                                } else if (distKm > 80) {
                                    // 🚄 長途交通模式：時速 150 + 30 分鐘緩衝    
                                    estimatedMinutes = Math.ceil((distKm / 150) * 60) + 30;
                                } else {
                                    // 🚗 一般市區交通模擬 + 12 分鐘緩衝
                                    estimatedMinutes = Math.ceil(distKm * 2.4) + 12;
                                }

                                let timeText = "";
                                if (estimatedMinutes < 60) {
                                    timeText = `${estimatedMinutes} 分鐘`;
                                } else {
                                    const h = Math.floor(estimatedMinutes / 60);
                                    const m = estimatedMinutes % 60;
                                    timeText = m > 0 ? `${h} 小時 ${m} 分鐘` : `${h} 小時`;
                                }
                                // 🌟 將算出的結果封裝成「假路線」回傳，讓地圖可以畫出虛線
                                resolve({
                                    _mode: finalMode, _isFake: true, _color: lineColor,
                                    _path: [{ lat: markerLatOrigin, lng: markerLngOrigin }, { lat: markerLatDest, lng: markerLngDest }],
                                    routes: [{ legs: [{ distance: { value: Math.round(distKm * 1000), text: distKm.toFixed(1) + ' 公里' }, duration: { value: estimatedMinutes * 60, text: timeText } }] }]
                                });
                            }
                        });
                    }
                });
            }, 300);
        });

        if (res && res.routes[0] && res.routes[0].legs[0]) {
            const travelDurationSeconds = res.routes[0].legs[0].duration.value;
            const stayDurationMinutes = places[i + 1].stayTime || 60;
            currentDepartureTime = new Date(transitTime.getTime() + (travelDurationSeconds * 1000) + (stayDurationMinutes * 60 * 1000));
        }
        results.push(res);
    }

    routeLegs[dayToCalculate] = results.map(res => {
        if (res && res.routes[0] && res.routes[0].legs[0]) {
            const leg = res.routes[0].legs[0];
            leg._mode = res._mode;
            return leg;
        }
        return null;
    });

    results.forEach((res, index) => {
        if (res) {
            if (res._isFake) {
                const polyline = new google.maps.Polyline({
                    path: res._path, 
                    strokeOpacity: 0, // 實體線透明
                    icons: [{ 
                        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, 
                        offset: '0', 
                        repeat: '15px' // 🌟 這裡設定虛線的重複點
                    }],
                    strokeColor: res._color, 
                    strokeWeight: 4, 
                    map: map
                });
                dayRouteRenderers.push(polyline);
                
                // 🌟 3. 將虛線 (Fake Route) 的路徑點也加入 bounds！
                if (res._path) {
                    res._path.forEach(point => bounds.extend(point));
                }

            } else {
                let routeColor = res._mode === 'WALKING' ? "#008ccf" : (res._mode === 'DRIVING' ? "#ea4335" : "#ff8c00");
                const renderer = new google.maps.DirectionsRenderer({
                    map: map, 
                    suppressMarkers: true, 
                    polylineOptions: { strokeColor: routeColor, 
                                        strokeWeight: 5, strokeOpacity: 0.8 
                                    }
                });
                renderer.setDirections(res);
                dayRouteRenderers.push(renderer);

                const path = res.routes[0].overview_path;
                if (path && path.length > 0) {
                    // 🌟 4. 將真實路線 (Google Directions) 的路徑點加入 bounds！
                    path.forEach(point => bounds.extend(point));

                    const markerStart = { lat: parseFloat(places[index].latitude || places[index].lat), lng: parseFloat(places[index].longitude || places[index].lng) };
                    const markerEnd = { lat: parseFloat(places[index + 1].latitude || places[index + 1].lat), lng: parseFloat(places[index + 1].longitude || places[index + 1].lng) };

                    const dashedLineOptions = {
                        strokeColor: routeColor, 
                        strokeOpacity: 0,
                        strokeWeight: 4,
                        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' }],
                        map: map, zIndex: 1
                    };

                    dayRouteRenderers.push(new google.maps.Polyline({ path: [markerStart, path[0]], ...dashedLineOptions }));
                    dayRouteRenderers.push(new google.maps.Polyline({ path: [path[path.length - 1], markerEnd], ...dashedLineOptions }));
                }
            }
        }
    });

    // 🌟 5. 等所有路線跟標記都畫完後，執行最終對焦
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
    }

    if (typeof recalculateTimes === 'function') recalculateTimes(dayToCalculate);
    if (typeof renderItineraryPanel === 'function') renderItineraryPanel(dayToCalculate);
    if (typeof syncOrderToDatabase === 'function') syncOrderToDatabase(dayToCalculate);
}

// ==========================================
// 🌟 輔助函式：幾何距離計算 (哈維斯公式)
// ==========================================
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    // 🌍 地球平均半徑 (公里)
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    // 這裡進行複雜的球面三角函數運算
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // 最後得出弧長公里數
    return R * c; 
}