let map, directionsService, directionsRenderer, placesService;
let isMapView = false;
let tempSelectedPlace = null;
let markers = [];
let currentDay = 1;
let itineraryData = { 1: [], 2: [], 3: [], 4: [], 5: [] };
let routeLegs = {};
let dayRouteRenderers = [];
const WALK_THRESHOLD_KM = 1.0;
let draggedItemInfo = null;

// 🌟 用來存放官方行程地圖上的數字標記
let routeMarkers = [];