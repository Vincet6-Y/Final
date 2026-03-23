// Google 地圖核心物件
let map, directionsService, directionsRenderer, placesService;

// 狀態管理變數
let currentDay = 1;
let isMapView = false;
let tempSelectedPlace = null;

// 行程數據中心
let itineraryData = {};
let routeMarkers = [];

// 標記與渲染器
let markers = [];
let routeLegs = {};
let dayRouteRenderers = [];

// 其他參數
const WALK_THRESHOLD_KM = 1.0;
let draggedItemInfo = null;
window.currentSearchMarkers = [];