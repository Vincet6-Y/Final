let map, directionsService, directionsRenderer, placesService;
let markers = [];
let currentDay = 1;
let tempSelectedPlace = null;
let isMapView = false;
let dayRouteRenderers = [];

const WALK_THRESHOLD_KM = 1.0;

let itineraryData = {};
let routeLegs = {};
let draggedItemInfo = null;

let routeMarkers = [];

window.currentSearchMarkers = [];