const appConfig = window.APP_CONFIG || {};

function configuredText(value) {
  const text = String(value ?? "").trim();
  if (!text || /^(YOUR_|REPLACE_|TODO(?:_|$)|<.+>$)/i.test(text)) {
    return "";
  }
  return text;
}

function googleMapsApiKey() {
  return configuredText(appConfig.googleMapsApiKey);
}

let googleMapsAuthFailureReason = "";
const googleMapsRenderedErrorPatterns = [
  /This page (?:didn'?t|can't|cannot) load Google Maps correctly/i,
  /糟糕[！!]?.*出了点问题/,
  /此页面未能正确加载\s*Google\s*地图/
];

function googleMapRenderedErrorVisible(container = document.getElementById("map")) {
  if (!container) {
    return false;
  }
  if (container.querySelector(".gm-err-container, .gm-err-content, .gm-err-title")) {
    return true;
  }
  const text = container.textContent || "";
  return googleMapsRenderedErrorPatterns.some((pattern) => pattern.test(text));
}

const aircraftIconConfig = window.AIRCRAFT_ICON_CONFIG || {};
const timeUtils = window.BIZJET_TIME || {};
const AIRCRAFT_ICON_RUNTIME_STORAGE_KEY = "aircraft-icon-runtime-config:v1.12";
const AIRCRAFT_ICON_TYPE_CODE_CACHE_STORAGE_KEY = "aircraft-icon-type-code-cache:v1.12";
const AIRCRAFT_ICON_TYPE_CODE_CACHE_MAX_ENTRIES = 1600;
const SPEED_ALTITUDE_CHART_MAX_POINTS = 320;
const aircraftIconRuntimeConfig = readAircraftIconRuntimeConfig();
const aircraftIconTypeCodeCache = readAircraftIconTypeCodeCache();
const groundProjectionCore = window.AIRCRAFT_GROUND_PROJECTION;
const NA_TEXT = "—";
const missingValueTexts = new Set([
  "",
  "-",
  "—",
  "N/A",
  "NA",
  "NULL",
  "UNDEFINED",
  "NONE",
  "NIL",
  "TBD",
  "TBA",
  "IATA",
  "ICAO",
  "UNKNOWN",
  "UNKNOWN AIRPORT",
  "UNKNOWN DESTINATION",
  "DESTINATION UNKNOWN",
  "AIRPORT UNKNOWN",
  "TO BE CONFIRMED"
]);
const AIRPORT_MARKER_BASE_Z_INDEX = 360;
const AIRCRAFT_MARKER_BASE_Z_INDEX = 680;
const AIRPORT_MARKER_HOVER_Z_INDEX = 760;
const AIRPORT_ROUTE_ENDPOINT_Z_INDEX = 920;
const AIRPORT_MARKER_SELECTED_Z_INDEX = 940;
const AIRPORT_MARKER_SELECTED_POPUP_Z_INDEX = 940;
const AIRPORT_MARKER_CURRENT_HOVER_POPUP_Z_INDEX = 1040;
const AIRCRAFT_MARKER_SELECTED_Z_INDEX = 1120;
const AIRPORT_HOVER_CLEAR_DELAY_MS = 120;
const AIRPORT_POPUP_GAP_PX = 14;
const AIRPORT_VIEWPORT_CACHE_TTL_MS = 15 * 60 * 1000;
const AIRPORT_VIEWPORT_CACHE_MAX_RECORDS = 12000;
const airportsById = new Map();
const airportsByCode = new Map();
const aircraftById = new Map();
const aircraftByUniqueKey = new Map();
const aircraftByEncryptedTail = new Map();
const aircraftByRegistration = new Map();
const defaultCenter = [22, 18];
const API_DEBUG_STORAGE_KEY = "bizjet-api-debug-console:v1";
const API_DEBUG_REQUESTS_STORAGE_KEY = "bizjet-api-debug-requests:v1";
const API_DEBUG_SELECTION_STORAGE_KEY = "bizjet-api-debug-selection:v1";
const API_DEBUG_EVENT_NAME = "bizjet:api-debug";
const API_DEBUG_WINDOW_NAME_PREFIX = "BIZJET_API_DEBUG:";
const API_DEBUG_CALLSIGN_PRIMARY_KEYS = new Set(["callsign", "call_sign"]);
const API_DEBUG_CALLSIGN_FALLBACK_KEYS = new Set(["flightno", "flightnumber", "tripno", "taskno"]);
const initialMapUseUserLocation = appConfig.initialMapUseUserLocation !== false;
const initialMapLocationTimeoutMs = appConfig.initialMapLocationTimeoutMs ?? 6000;
const googleMarkerMapId = configuredText(appConfig.googleMapId) || "DEMO_MAP_ID";
const googleMapsLoadTimeoutMs = appConfig.googleMapsLoadTimeoutMs || 12000;
const mapZoomRange = {
  min: appConfig.mapZoomRange?.min ?? 2,
  max: appConfig.mapZoomRange?.max ?? 12
};
const mapVerticalBounds = {
  north: appConfig.mapVerticalBounds?.north ?? 85,
  south: appConfig.mapVerticalBounds?.south ?? -85
};
const mapWorldBounds = {
  north: mapVerticalBounds.north,
  south: mapVerticalBounds.south,
  west: -180,
  east: 180
};
const mapLoadingConfig = {
  viewportDebounceMs: appConfig.performance?.viewportDebounceMs ?? 360,
  viewportPaddingRatio: appConfig.performance?.viewportPaddingRatio ?? 0.25,
  showAllAircraftIconsAtAllZooms: appConfig.performance?.showAllAircraftIconsAtAllZooms ?? true,
  allAircraftIconRequestLimit: appConfig.performance?.allAircraftIconRequestLimit ?? 50000,
  aircraftLimitByZoom: appConfig.performance?.aircraftLimitByZoom || [
    { zoom: 3.5, limit: 800 },
    { zoom: 4.5, limit: 1200 },
    { zoom: 5.5, limit: 1600 },
    { zoom: 6.5, limit: 2200 },
    { zoom: 7.5, limit: 3000 },
    { zoom: 8.5, limit: 3500 },
    { zoom: 9.5, limit: 4000 },
    { zoom: 12, limit: 5000 }
  ],
  aircraftLabelLimitByZoom: appConfig.performance?.aircraftLabelLimitByZoom || [
    { zoom: 5.5, limit: 0 },
    { zoom: 7.5, limit: 20 },
    { zoom: 8.5, limit: 60 },
    { zoom: 9.5, limit: 160 },
    { zoom: 12, limit: 320 }
  ],
  // effectiveScaleKm is the map distance represented by 100 CSS pixels.
  // FR24 measurements converted to the 100 CSS pixel scale used here:
  // 200 km / 44 px ~= 455 km / 100 px stays hidden; 100 km / 46 px
  // ~= 217 km / 100 px is the first airport-pin tier. The midpoint keeps
  // both observed scale boundaries stable across map providers.
  airportFarScaleKm: appConfig.performance?.airportFarScaleKm ?? 300,
  airportNearScaleKm: appConfig.performance?.airportNearScaleKm ?? 110,
  airportCodeLabelScaleKm: appConfig.performance?.airportCodeLabelScaleKm ?? 65,
  airportNearFallbackZoom: appConfig.performance?.airportNearFallbackZoom ?? 8,
  airportDetailLabelScaleKm: appConfig.performance?.airportDetailLabelScaleKm ?? 20,
  airportViewportRequestLimit: appConfig.performance?.airportViewportRequestLimit ?? 50000,
  regularTrackMinZoom: appConfig.performance?.regularTrackMinZoom ?? 7,
  regularTrackMaxAircraft: appConfig.performance?.regularTrackMaxAircraft ?? 120,
  selectedTrackMaxPoints: appConfig.performance?.selectedTrackMaxPoints ?? 1000,
  regularTrackMaxPoints: appConfig.performance?.regularTrackMaxPoints ?? 80,
  selectedTrackLimitByZoom: appConfig.performance?.selectedTrackLimitByZoom || [
    { zoom: 3.5, limit: 160 },
    { zoom: 5.5, limit: 260 },
    { zoom: 7, limit: 420 },
    { zoom: 8.5, limit: 650 },
    { zoom: 9.5, limit: 850 },
    { zoom: 12, limit: 1000 }
  ],
  routeFocusPadding: appConfig.performance?.routeFocusPadding || { left: 410, right: 48, top: 74, bottom: 78 },
  routeFocusMinZoom: appConfig.performance?.routeFocusMinZoom ?? 2.2,
  routeFocusMaxZoom: appConfig.performance?.routeFocusMaxZoom ?? 9.5,
  aircraftRefresh: {
    selectedMs: appConfig.performance?.aircraftRefresh?.selectedMs ?? 2500,
    normalMs: appConfig.performance?.aircraftRefresh?.normalMs ?? 4200,
    globalMs: appConfig.performance?.aircraftRefresh?.globalMs ?? 6500,
    airportMs: appConfig.performance?.aircraftRefresh?.airportMs ?? 3000,
    hiddenMs: appConfig.performance?.aircraftRefresh?.hiddenMs ?? 22000,
    failureMinMs: appConfig.performance?.aircraftRefresh?.failureMinMs ?? 10000,
    failureMaxMs: appConfig.performance?.aircraftRefresh?.failureMaxMs ?? 30000,
    staleAfterMs: appConfig.performance?.aircraftRefresh?.staleAfterMs ?? 15000,
    expireAfterMs: appConfig.performance?.aircraftRefresh?.expireAfterMs ?? 60000,
    selectedRetentionMs: appConfig.performance?.aircraftRefresh?.selectedRetentionMs ?? 180000,
    interpolationMs: appConfig.performance?.aircraftRefresh?.interpolationMs ?? 3000,
    maxExtrapolationMs: appConfig.performance?.aircraftRefresh?.maxExtrapolationMs ?? 30000
  },
  trackContinuity: {
    coverageGapMs: appConfig.performance?.trackContinuity?.coverageGapMs ?? 120000,
    hardBreakGapMs: appConfig.performance?.trackContinuity?.hardBreakGapMs ?? 600000,
    duplicateDistanceNm: appConfig.performance?.trackContinuity?.duplicateDistanceNm ?? 0.05,
    duplicateTimeToleranceMs: appConfig.performance?.trackContinuity?.duplicateTimeToleranceMs ?? 5000,
    liveTailMaxPoints: appConfig.performance?.trackContinuity?.liveTailMaxPoints ?? 120
  }
};
const responsivePerformanceConfig = {
  tabletLandscapePanelWidthPx: appConfig.responsivePerformance?.tabletLandscapePanelWidthPx ?? 360,
  tabletLandscapePanelMaxVw: appConfig.responsivePerformance?.tabletLandscapePanelMaxVw ?? 42,
  tabletPortraitDrawerMidDvh: appConfig.responsivePerformance?.tabletPortraitDrawerMidDvh ?? 56,
  tabletInteractionRenderFps: appConfig.responsivePerformance?.tabletInteractionRenderFps ?? 8,
  tabletHideAirportLabelsDuringInteraction: appConfig.responsivePerformance?.tabletHideAirportLabelsDuringInteraction ?? true
};
const aircraftGroundProjectionConfig = {
  preferenceKey: "global-bizjet-aircraft-ground-projection",
  maxAglM: appConfig.performance?.groundProjection?.maxAglM ?? 500,
  minSunElevationDeg: appConfig.performance?.groundProjection?.minSunElevationDeg ?? 5,
  maxDistanceM: appConfig.performance?.groundProjection?.maxDistanceM ?? 1500,
  terminalRadiusM: appConfig.performance?.groundProjection?.terminalRadiusM ?? 45000,
  maxVisible: appConfig.performance?.groundProjection?.maxVisible ?? 250,
  highDensityThreshold: appConfig.performance?.groundProjection?.highDensityThreshold ?? 120,
  minAllZoom: appConfig.performance?.groundProjection?.minAllZoom ?? 2,
  minPriorityZoom: appConfig.performance?.groundProjection?.minPriorityZoom ?? 2,
  minSelectedZoom: appConfig.performance?.groundProjection?.minSelectedZoom ?? 2,
  physicalProjectionMinZoom: appConfig.performance?.groundProjection?.physicalProjectionMinZoom ?? 6.5,
  physicalMaxOffsetPx: appConfig.performance?.groundProjection?.physicalMaxOffsetPx ?? 10,
  visualMinOffsetPx: appConfig.performance?.groundProjection?.visualMinOffsetPx ?? 4,
  visualMaxOffsetPx: appConfig.performance?.groundProjection?.visualMaxOffsetPx ?? 8,
  visualShadowBearingDeg: appConfig.performance?.groundProjection?.visualShadowBearingDeg ?? 135
};
const liveDataOnly = appConfig.dataMode === "live"
  || appConfig.api?.requireLiveData === true
  || appConfig.api?.useMockOnError === false;
const airportSnapshotRefreshMs = appConfig.api?.airportRefreshMs ?? 300000;
const historyTimelineConfig = {
  version: "1.24",
  defaultRangeDays: 365,
  mountLimit: 40,
  pageSize: 120,
  maxPages: 5,
  sampleRegistration: "B-8202"
};
const HISTORY_USER_SCROLL_SETTLE_MS = 6500;
const aircraftSizeClasses = aircraftIconConfig.sizeClasses || ["light", "midsize", "super-midsize", "long-range", "ultra-long"];
const aircraftZoomSizeMatrix = [
  { zoom: 2, sizes: { light: 22, midsize: 24, "super-midsize": 26, "long-range": 28, "ultra-long": 30 } },
  { zoom: 3, sizes: { light: 24, midsize: 27, "super-midsize": 30, "long-range": 32, "ultra-long": 34 } },
  { zoom: 4, sizes: { light: 27, midsize: 31, "super-midsize": 34, "long-range": 37, "ultra-long": 39 } },
  { zoom: 5, sizes: { light: 31, midsize: 35, "super-midsize": 39, "long-range": 42, "ultra-long": 45 } },
  { zoom: 6, sizes: { light: 34, midsize: 39, "super-midsize": 43, "long-range": 47, "ultra-long": 51 } },
  { zoom: 7, sizes: { light: 36, midsize: 41, "super-midsize": 46, "long-range": 50, "ultra-long": 54 } },
  { zoom: 9, sizes: { light: 38, midsize: 43, "super-midsize": 48, "long-range": 53, "ultra-long": 58 } },
  { zoom: 12, sizes: { light: 39, midsize: 45, "super-midsize": 50, "long-range": 55, "ultra-long": 60 } }
];
const defaultBusinessJetIconKey = aircraftIconConfig.defaultIconKey || "lj45";
const fallbackAircraftIconKeyByTypeCode = {
  GLF6: "lj45",
  GL7T: "GL7T",
  GL8T: "GL8T",
  GA7C: "GA7C",
  FA8X: "lj45",
  C700: "lj45",
  GLF5: "lj45",
  GLEX: "lj45",
  E550: "lj45",
  PC24: "lj45",
  CL35: "lj45",
  FA7X: "lj45",
  GA5C: "lj45",
  A388: "a388",
  B744: "b744",
  B77W: "b77w",
  B738: "b738",
  A20N: "a320",
  A320: "a320",
  E190: "e190",
  AT76: "at76",
  C172: "c172",
  H135: "h135"
};
const configuredAircraftIconKeyByIcaoCode = {
  ...normalizeAircraftIconMap(Object.fromEntries(
    (aircraftIconConfig.typeMappings || []).map((item) => [item.icaoCode || item.aircraftTypeCode, item.fr24IconKey || item.iconKey])
  )),
  ...normalizeAircraftIconMap(aircraftIconConfig.typeCodeIconMap),
  ...normalizeAircraftIconMap(aircraftIconConfig.icaoCodeIconMap),
  ...normalizeAircraftIconMap(aircraftIconRuntimeConfig.typeCodeIconMap),
  ...normalizeAircraftIconMap(aircraftIconRuntimeConfig.icaoCodeIconMap)
};
const aircraftIconKeyByIcaoCode = Object.keys(configuredAircraftIconKeyByIcaoCode).length
  ? configuredAircraftIconKeyByIcaoCode
  : fallbackAircraftIconKeyByTypeCode;
const aircraftIconKeyByTypeCode = aircraftIconKeyByIcaoCode;
const aircraftIconMappingVersion = aircraftIconRuntimeConfig.mappingVersion
  || aircraftIconRuntimeConfig.publishedVersion
  || aircraftIconConfig.publishedVersion
  || aircraftIconConfig.sourceVersion
  || "static";
const aircraftIconPaths = {
  ...(aircraftIconConfig.iconPaths || {}),
  lj45: "M32 4.5c2.8 0 4.6 13.4 5.3 19.7l17.8 7.2c1.1.4 1.8 1.4 1.8 2.6v3.3L38 33.6l-1 8.7 7.4 4.4V50l-10.1-2L32 59.5 29.7 48l-10.1 2v-3.3l7.4-4.4-1-8.7-18.9 3.7V34c0-1.2.7-2.2 1.8-2.6l17.8-7.2c.7-6.3 2.5-19.7 5.3-19.7Z",
  a388: "M32 2.5c3.8 0 5.9 15.9 6.9 22.6l22.2 8.6c1.3.5 2.1 1.7 2.1 3.1v4.1l-24-5.6-1.4 11.7 9.8 6.1v4.2l-12.8-2.9L32 62l-2.8-7.6-12.8 2.9v-4.2l9.8-6.1-1.4-11.7-24 5.6v-4.1c0-1.4.8-2.6 2.1-3.1l22.2-8.6c1-6.7 3.1-22.6 6.9-22.6ZM13.9 35.8h5.4v3.2h-5.4Zm30.8 0h5.4v3.2h-5.4Z",
  b744: "M32 3.5c3.5 0 5.5 15 6.5 21.5l20.8 8.3c1.2.5 1.9 1.6 1.9 2.9v3.9l-22.3-5.2-1.2 11.1 9.1 5.7v4l-12.1-2.7L32 61l-2.7-8-12.1 2.7v-4l9.1-5.7-1.2-11.1-22.3 5.2v-3.9c0-1.3.7-2.4 1.9-2.9L25.5 25C26.5 18.5 28.5 3.5 32 3.5ZM14.7 35.6h4.5v3.1h-4.5Zm44.3.2h-4.5v3.1H59Zm-39.4-2.2h4.3v2.9h-4.3Zm24.5 0h4.3v2.9h-4.3Z",
  b77w: "M32 3.5c3.3 0 5.4 15.1 6.3 21.6l20 8.6c1.1.5 1.8 1.6 1.8 2.8v3.8l-21.4-5.1-1.3 11.2 9 5.8V56l-11.7-2.6L32 61l-2.7-7.6L17.6 56v-3.8l9-5.8-1.3-11.2-21.4 5.1v-3.8c0-1.2.7-2.3 1.8-2.8l20-8.6C26.6 18.6 28.7 3.5 32 3.5ZM18.3 36h5.4v3.6h-5.4Zm22 0h5.4v3.6h-5.4Z",
  b738: "M32 6c2.9 0 4.8 13.4 5.6 19.1L56 32.9c1.1.5 1.7 1.5 1.7 2.7v3.2l-19.6-4.4-1.1 9.4 7.5 4.8v3.5l-10.2-2.2L32 59l-2.3-9.1-10.2 2.2v-3.5l7.5-4.8-1.1-9.4-19.6 4.4v-3.2c0-1.2.6-2.2 1.7-2.7l18.4-7.8C27.2 19.4 29.1 6 32 6ZM20 36.2h4.6v3.2H20Zm19.4 0H44v3.2h-4.6Z",
  a320: "M32 6.5c2.8 0 4.7 13 5.4 18.7l17.8 7.5c1.1.5 1.7 1.5 1.7 2.6v3.1l-19-4.2-1 9.2 7.2 4.6v3.4l-9.8-2.1L32 58.5l-2.3-9.2-9.8 2.1V48l7.2-4.6-1-9.2-19 4.2v-3.1c0-1.1.6-2.1 1.7-2.6l17.8-7.5c.7-5.7 2.6-18.7 5.4-18.7ZM21 36.2h4.1v3H21Zm17.9 0H43v3h-4.1Z",
  e190: "M32 8c2.4 0 4.1 11.7 4.8 16.8l16.8 7c1 .4 1.6 1.4 1.6 2.5v2.9L37.4 33l-.9 8.8 6.5 4.1v3.1l-9-2L32 55.5 30 47l-9 2v-3.1l6.5-4.1-.9-8.8-17.8 4.2v-2.9c0-1.1.6-2.1 1.6-2.5l16.8-7C27.9 19.7 29.6 8 32 8Z",
  at76: "M32 8c2.2 0 3.8 11 4.5 16.2l18.3 5.4c1.1.3 1.8 1.3 1.8 2.5v3.2L37.3 33l-.9 8.7 6.7 4.2v3.2l-9.2-2L32 56l-1.9-8.9-9.2 2v-3.2l6.7-4.2-.9-8.7-19.3 2.3v-3.2c0-1.2.7-2.2 1.8-2.5l18.3-5.4C28.2 19 29.8 8 32 8ZM14.5 30.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm35 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  c172: "M32 11c1.8 0 3.2 8.8 3.9 13.5l17.5 3.2c1 .2 1.7 1.1 1.7 2.2v3L36.8 31l-.7 7.6 5.6 3.5v2.9l-7.8-1.7L32 53l-1.9-9.7-7.8 1.7v-2.9l5.6-3.5-.7-7.6L8.9 32.9v-3c0-1.1.7-2 1.7-2.2l17.5-3.2C28.8 19.8 30.2 11 32 11Z",
  h135: "M30.5 14h3v13.2l21.5-1.4c1.1-.1 2 .8 2 1.9v2.1L38 32l6.5 5.9h8.7c1.1 0 2 .9 2 2v2.3H43.1l-6.7-4.5-1.1 9.1 5.9 3.7v3l-8.1-1.8L32 59l-1.1-7.3-8.1 1.8v-3l5.9-3.7-1.1-9.1-6.7 4.5H8.8v-2.3c0-1.1.9-2 2-2h8.7L26 32 7 29.8v-2.1c0-1.1.9-2 2-1.9l21.5 1.4V14Zm-20-3.2h43v2.8h-43Z",
  light: "M32 9c2.2 0 3.7 11.5 4.2 16l15.5 6.4c.9.4 1.4 1.2 1.4 2.1v2.6L37 32.9l-.9 7.7 6.2 3.9v3l-8.6-1.9L32 54l-1.7-8.4-8.6 1.9v-3l6.2-3.9-.9-7.7-16.1 3.2v-2.6c0-.9.5-1.7 1.4-2.1L27.8 25c.5-4.5 2-16 4.2-16Z",
  midsize: "M32 7c2.5 0 4.2 12.6 4.9 17.5l17.2 7.1c1 .4 1.6 1.3 1.6 2.4v2.9l-18.1-3.8-1 8.8 6.8 4.3v3.2l-9.3-2.1L32 56l-2.1-8.7-9.3 2.1v-3.2l6.8-4.3-1-8.8-18.1 3.8V34c0-1.1.6-2 1.6-2.4l17.2-7.1C27.8 19.6 29.5 7 32 7Z",
  "super-midsize": "M32 5.5c2.8 0 4.8 13.7 5.5 19.1l18.7 7.7c1.1.4 1.7 1.4 1.7 2.5V38l-19.8-4.4-1.1 9.7 7.6 4.8v3.5l-10.3-2.2L32 58.5l-2.4-9.1-10.3 2.2v-3.5l7.6-4.8-1.1-9.7L6 38v-3.2c0-1.1.6-2.1 1.7-2.5l18.7-7.7c.8-5.4 2.8-19.1 5.6-19.1Z",
  "long-range": "M32 4c3.1 0 5.3 14.9 6.1 20.8l20.4 8.5c1.2.5 1.9 1.5 1.9 2.8v3.5l-21.6-5-1.2 10.7 8.5 5.4v3.8l-11.4-2.6L32 61l-2.7-9.1-11.4 2.6v-3.8l8.5-5.4-1.2-10.7-21.6 5v-3.5c0-1.3.7-2.3 1.9-2.8l20.4-8.5C26.7 18.9 28.9 4 32 4Z",
  "ultra-long": "M32 2.5c3.5 0 5.9 16.4 6.8 22.5l21.9 9.1c1.2.5 2 1.6 2 2.9v3.8l-23.1-5.4-1.4 11.3 9.3 5.9v4L35 53.8l-3 8.7-3-8.7-12.5 2.8v-4l9.3-5.9-1.4-11.3-23.1 5.4V37c0-1.3.8-2.4 2-2.9L25.2 25c.9-6.1 3.3-22.5 6.8-22.5Z"
};
const aircraftIconImagePaths = aircraftIconConfig.iconImagePaths || {};
const fr24AircraftIconStyle = {
  fill: "#FDB813",
  stroke: "rgb(18, 25, 32)"
};
const routeStyle = {
  haloEnabled: false,
  altitudeStops: [
    { value: 0, color: "#ffffff" },
    { value: 300, color: "#ffffff" },
    { value: 1000, color: "#fff200" },
    { value: 7000, color: "#b9e63a" },
    { value: 13100, color: "#67d965" },
    { value: 19700, color: "#25c9c7" },
    { value: 24000, color: "#21b7ef" },
    { value: 36100, color: "#2d46d0" },
    { value: 38500, color: "#3f31bf" },
    { value: 41000, color: "#8b2ab0" },
    { value: 41800, color: "#b62b82" },
    { value: 42600, color: "#e53644" },
    { value: 45000, color: "#ff3a2f" }
  ],
  speedStops: [
    { value: 0, color: "#ffffff" },
    { value: 40, color: "#ffe45c" },
    { value: 120, color: "#60d66a" },
    { value: 250, color: "#20c8c8" },
    { value: 360, color: "#2d8cf0" },
    { value: 460, color: "#7a35c7" },
    { value: 520, color: "#ff4b32" }
  ],
  missingColor: "#9aa0a6",
  estimatedColor: "#151515",
  regularOpacity: 0.68,
  selectedOpacity: 0.96,
  selectedHaloOpacity: 0.4,
  focusSelectedOpacity: 1,
  focusHaloOpacity: 0.42,
  estimatedOpacity: 0.68,
  estimatedDash: "2 8",
  estimatedDashRepeat: "12px",
  plannedColor: "#f6d365",
  plannedOpacity: 0.78,
  plannedDash: "10 10",
  plannedDashRepeat: "18px",
  staleOpacityFactor: 0.72,
  widthStops: {
    regular: [
      { zoom: 7, width: 1.8 },
      { zoom: 8.5, width: 2 },
      { zoom: 9.5, width: 2.2 },
      { zoom: 12, width: 2.4 }
    ],
    selected: [
      { zoom: 2, width: 2.4 },
      { zoom: 3.5, width: 2.6 },
      { zoom: 5.5, width: 2.8 },
      { zoom: 7, width: 3 },
      { zoom: 8.5, width: 3.2 },
      { zoom: 9.5, width: 3.4 },
      { zoom: 12, width: 3.6 }
    ],
    selectedHalo: [
      { zoom: 2, width: 4.8 },
      { zoom: 3.5, width: 5 },
      { zoom: 5.5, width: 5.3 },
      { zoom: 7, width: 5.6 },
      { zoom: 8.5, width: 6 },
      { zoom: 9.5, width: 6.4 },
      { zoom: 12, width: 7 }
    ],
    focus: [
      { zoom: 2, width: 2.7 },
      { zoom: 3.5, width: 2.9 },
      { zoom: 5.5, width: 3.1 },
      { zoom: 7, width: 3.3 },
      { zoom: 8.5, width: 3.5 },
      { zoom: 9.5, width: 3.7 },
      { zoom: 12, width: 3.9 }
    ],
    focusHalo: [
      { zoom: 2, width: 5.4 },
      { zoom: 3.5, width: 5.7 },
      { zoom: 5.5, width: 6 },
      { zoom: 7, width: 6.3 },
      { zoom: 8.5, width: 6.7 },
      { zoom: 9.5, width: 7.1 },
      { zoom: 12, width: 7.8 }
    ],
    estimated: [
      { zoom: 2, width: 1.8 },
      { zoom: 3.5, width: 1.8 },
      { zoom: 5.5, width: 2 },
      { zoom: 7, width: 2 },
      { zoom: 8.5, width: 2.2 },
      { zoom: 9.5, width: 2.2 },
      { zoom: 12, width: 2.4 }
    ]
  },
  maxGapMs: mapLoadingConfig.trackContinuity.coverageGapMs,
  hardBreakGapMs: mapLoadingConfig.trackContinuity.hardBreakGapMs,
  maxMissingCarryPoints: 3,
  maxImpliedSpeedKt: 850
};

function interpolateZoomWidth(stops, zoom) {
  const first = stops[0];
  const last = stops[stops.length - 1];
  const value = Math.max(first.zoom, Math.min(last.zoom, Number(zoom)));
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];
    if (value >= start.zoom && value <= end.zoom) {
      const ratio = (value - start.zoom) / Math.max(0.0001, end.zoom - start.zoom);
      return start.width + (end.width - start.width) * ratio;
    }
  }
  return last.width;
}

function trackStyleForZoom({ zoom, selected, routeFocused, stale }) {
  const opacityFactor = stale ? routeStyle.staleOpacityFactor : 1;
  const coreStops = routeFocused
    ? routeStyle.widthStops.focus
    : selected
      ? routeStyle.widthStops.selected
      : routeStyle.widthStops.regular;
  const haloStops = routeFocused
    ? routeStyle.widthStops.focusHalo
    : routeStyle.widthStops.selectedHalo;
  return {
    coreWidth: interpolateZoomWidth(coreStops, zoom),
    haloWidth: routeStyle.haloEnabled && selected ? interpolateZoomWidth(haloStops, zoom) : 0,
    estimatedWidth: interpolateZoomWidth(routeStyle.widthStops.estimated, zoom),
    coreOpacity: (routeFocused ? routeStyle.focusSelectedOpacity : selected ? routeStyle.selectedOpacity : routeStyle.regularOpacity) * opacityFactor,
    haloOpacity: routeStyle.haloEnabled
      ? (routeFocused ? routeStyle.focusHaloOpacity : routeStyle.selectedHaloOpacity) * opacityFactor
      : 0,
    estimatedOpacity: routeStyle.estimatedOpacity * opacityFactor
  };
}
const aircraftIconStyles = {
  ...(aircraftIconConfig.iconStyles || {}),
  ...Object.fromEntries(
    ["lj45", "a388", "b744", "b77w", "b738", "a320", "e190", "at76", "c172", "h135"].map((iconKey) => [iconKey, { ...fr24AircraftIconStyle }])
  )
};
Object.keys(aircraftIconStyles).forEach((iconKey) => {
  aircraftIconStyles[iconKey] = {
    ...aircraftIconStyles[iconKey],
    ...fr24AircraftIconStyle
  };
});

function defaultZoom() {
  return clampZoom(appConfig.initialMapZoom ?? 4);
}

function defaultMapCenter() {
  return Array.isArray(state?.initialMapCenter) && state.initialMapCenter.length === 2
    ? state.initialMapCenter
    : defaultCenter;
}

function browserSupportsGeolocation() {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

function normalizeLocationPosition(position) {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return [clampLatitude(latitude), normalizeLongitude(longitude)];
}

function getUserLocationCenter(timeoutMs = initialMapLocationTimeoutMs) {
  if (!browserSupportsGeolocation()) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(normalizeLocationPosition(position)),
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 300000
      }
    );
  });
}

async function resolveInitialMapCenter() {
  if (!initialMapUseUserLocation) {
    return defaultCenter;
  }
  const center = await getUserLocationCenter();
  if (center) {
    state.userLocationCenter = center;
  }
  return center || defaultCenter;
}

function fallbackUserLocationCenter() {
  return Array.isArray(state?.userLocationCenter) && state.userLocationCenter.length === 2
    ? state.userLocationCenter
    : defaultMapCenter();
}

function setLocateButtonState(button, status) {
  if (!button) {
    return;
  }
  window.clearTimeout(button.locateStateTimer);
  button.classList.toggle("is-locating", status === "locating");
  button.classList.toggle("location-success", status === "success");
  button.classList.toggle("location-fallback", status === "fallback");
  button.disabled = status === "locating";
  button.dataset.locationState = status || "";
  const labels = {
    locating: "正在定位当前位置",
    success: "已定位到当前位置",
    fallback: "无法获取浏览器定位，已回到默认位置",
    failed: "当前地图暂不可定位"
  };
  button.title = labels[status] || "";
  if (status === "success" || status === "fallback" || status === "failed") {
    button.locateStateTimer = window.setTimeout(() => {
      button.classList.remove("location-success", "location-fallback");
      button.dataset.locationState = "";
      button.title = "";
    }, 1800);
  }
}

async function setMapToUserLocation(trigger = document.getElementById("locateButton")) {
  const button = trigger?.currentTarget || trigger;
  setLocateButtonState(button, "locating");
  const center = await getUserLocationCenter(10000);
  const targetCenter = center || fallbackUserLocationCenter();
  if (!state.map?.setView || !Array.isArray(targetCenter) || targetCenter.length !== 2) {
    setLocateButtonState(button, "failed");
    return false;
  }
  if (center) {
    state.userLocationCenter = center;
  }
  state.initialMapCenter = targetCenter;
  state.map.setView(targetCenter, defaultZoom());
  setLocateButtonState(button, center ? "success" : "fallback");
  return Boolean(center);
}

function clampLatitude(lat) {
  return Math.max(mapVerticalBounds.south, Math.min(mapVerticalBounds.north, lat));
}

function clampedLatLng(latLng) {
  return {
    lat: clampLatitude(latLng[0]),
    lng: latLng[1]
  };
}

function clampZoom(zoom) {
  return Math.max(mapZoomRange.min, Math.min(mapZoomRange.max, zoom));
}

function rafThrottle(callback) {
  let frame = null;
  return () => {
    if (frame !== null) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = null;
      callback();
    });
  };
}

function debounce(callback, wait) {
  let timer = null;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(callback, wait);
  };
}

function readJsonPreference(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function readAircraftIconRuntimeConfig() {
  const inlineConfig = window.AIRCRAFT_ICON_RUNTIME_CONFIG && typeof window.AIRCRAFT_ICON_RUNTIME_CONFIG === "object"
    ? window.AIRCRAFT_ICON_RUNTIME_CONFIG
    : {};
  const storedConfig = readJsonPreference(AIRCRAFT_ICON_RUNTIME_STORAGE_KEY) || {};
  const inlineMap = inlineConfig.icaoCodeIconMap || inlineConfig.typeCodeIconMap || {};
  const storedMap = storedConfig.icaoCodeIconMap || storedConfig.typeCodeIconMap || {};
  return {
    ...inlineConfig,
    ...storedConfig,
    icaoCodeIconMap: {
      ...inlineMap,
      ...storedMap
    }
  };
}

function readAircraftIconTypeCodeCache() {
  const payload = readJsonPreference(AIRCRAFT_ICON_TYPE_CODE_CACHE_STORAGE_KEY) || {};
  const sourceEntries = payload.entries && typeof payload.entries === "object"
    ? payload.entries
    : payload;
  const entries = new Map();
  Object.entries(sourceEntries || {}).forEach(([rawKey, value]) => {
    const key = normalizedAircraftProfileCacheValue(rawKey);
    const rawCode = typeof value === "object" && value !== null ? value.icaoCode || value.aircraftTypeCode : value;
    const icaoCode = cleanExplicitAircraftTypeCode(rawCode);
    if (!key || !icaoCode) {
      return;
    }
    entries.set(key, {
      icaoCode,
      iconKey: typeof value === "object" && value !== null ? String(value.iconKey || "").trim() : "",
      updatedAt: typeof value === "object" && value !== null ? value.updatedAt || "" : ""
    });
  });
  return entries;
}

function writeAircraftIconTypeCodeCache() {
  try {
    const entries = Object.fromEntries([...aircraftIconTypeCodeCache.entries()].map(([key, value]) => [key, {
      icaoCode: value.icaoCode,
      iconKey: value.iconKey || aircraftIconKeyByIcaoCode[value.icaoCode] || "",
      updatedAt: value.updatedAt || new Date().toISOString()
    }]));
    window.localStorage.setItem(AIRCRAFT_ICON_TYPE_CODE_CACHE_STORAGE_KEY, JSON.stringify({
      schemaVersion: "1.12.0",
      mappingVersion: aircraftIconMappingVersion,
      updatedAt: new Date().toISOString(),
      entries
    }));
  } catch (error) {
    // Browser storage can be unavailable; live API details still drive the current session.
  }
}

function pruneAircraftIconTypeCodeCache() {
  while (aircraftIconTypeCodeCache.size > AIRCRAFT_ICON_TYPE_CODE_CACHE_MAX_ENTRIES) {
    const oldestKey = aircraftIconTypeCodeCache.keys().next().value;
    if (!oldestKey) {
      return;
    }
    aircraftIconTypeCodeCache.delete(oldestKey);
  }
}

function readBooleanPreference(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch (error) {
    return fallback;
  }
}

function writeBooleanPreference(key, value) {
  try {
    window.localStorage.setItem(key, String(Boolean(value)));
  } catch (error) {
    // Storage may be unavailable in privacy or embedded contexts; runtime state still applies.
  }
}

function normalizeAircraftIconMap(map = {}) {
  return Object.fromEntries(
    Object.entries(map || {})
      .map(([code, iconKey]) => [normalizeAircraftTypeCode(code), String(iconKey || "").trim()])
      .filter(([code, iconKey]) => code && !aircraftTypeCodeIsGeneric(code) && iconKey)
  );
}

function steppedValue(rules, zoom, key) {
  const clamped = clampZoom(zoom);
  const rule = rules.find((item) => clamped < item.zoom) || rules[rules.length - 1];
  return rule[key];
}

function normalizeLongitude(lng) {
  let value = Number(lng);
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
}

function currentZoom() {
  return state.map?.getZoom ? state.map.getZoom() : defaultZoom();
}

function currentMapCenter() {
  const view = state.map?.getView?.();
  if (Array.isArray(view?.center) && view.center.length === 2) {
    return view.center;
  }
  return defaultMapCenter();
}

function metersPerPixelAtLatitude(latitude, zoom = currentZoom()) {
  if (groundProjectionCore?.metersPerPixelAtLatitude) {
    return groundProjectionCore.metersPerPixelAtLatitude(latitude, zoom);
  }
  const latitudeRad = Number(latitude) * Math.PI / 180;
  const latitudeFactor = Math.max(0.01, Math.abs(Math.cos(latitudeRad)));
  return 156543.03392 * latitudeFactor / (2 ** Number(zoom));
}

function effectiveScaleKm(zoom = currentZoom()) {
  const center = currentMapCenter();
  const lat = Number(Array.isArray(center) ? center[0] : defaultCenter[0]);
  const metersPerPixel = metersPerPixelAtLatitude(Number.isFinite(lat) ? lat : defaultCenter[0], zoom);
  const value = metersPerPixel * 100 / 1000;
  return Number.isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null;
}

function airportScaleBand(scaleKm = effectiveScaleKm(), zoom = currentZoom()) {
  const scale = Number(scaleKm);
  if (Number.isFinite(scale)) {
    if (scale > mapLoadingConfig.airportFarScaleKm) return "far";
    if (scale > mapLoadingConfig.airportNearScaleKm) return "mid";
    return "near";
  }
  return Number(zoom) < mapLoadingConfig.airportNearFallbackZoom ? "mid" : "near";
}

function airportLevelForRecord(airport) {
  const raw = airport?.displayLevel ?? airport?.level ?? airport?.airportLevel ?? airport?.airportTier;
  const tierMatch = String(raw ?? "").trim().toUpperCase().match(/^L([1-4])$/);
  const explicit = tierMatch ? Number(tierMatch[1]) : Number(raw);
  if (Number.isFinite(explicit)) {
    return Math.max(1, Math.min(4, Math.round(explicit)));
  }
  const ground = Number(airport?.ground);
  if (Number.isFinite(ground)) {
    if (ground >= 30) return 1;
    if (ground >= 12) return 2;
    if (ground >= 3) return 3;
  }
  return 4;
}

function effectiveRouteFocusPadding() {
  if (state.layoutProfile === "tablet-portrait") {
    const detailPanel = document.getElementById("leftDetailPanel");
    const detailRect = detailPanel && !detailPanel.hidden ? detailPanel.getBoundingClientRect() : null;
    const panelPadding = detailRect
      ? Math.min(window.innerHeight - 180, Math.max(280, window.innerHeight - detailRect.top + 28))
      : Math.round(window.innerHeight * 0.52);
    return { left: 24, right: 24, top: 112, bottom: panelPadding };
  }
  if (state.layoutProfile === "tablet-landscape") {
    return {
      left: Math.min(
        responsivePerformanceConfig.tabletLandscapePanelWidthPx + 46,
        Math.round(window.innerWidth * 0.46)
      ),
      right: 74,
      top: 74,
      bottom: 74
    };
  }
  if (window.matchMedia("(max-width: 640px)").matches) {
    const detailPanel = document.getElementById("leftDetailPanel");
    const detailRect = detailPanel && !detailPanel.hidden ? detailPanel.getBoundingClientRect() : null;
    const panelPadding = detailRect
      ? Math.min(window.innerHeight - 220, Math.max(360, window.innerHeight - detailRect.top + 36))
      : 120;
    return { left: 18, right: 78, top: 126, bottom: panelPadding };
  }
  if (window.matchMedia("(max-width: 980px)").matches) {
    return { left: 404, right: 86, top: 74, bottom: 78 };
  }
  const railOpen = !document.querySelector(".right-rail")?.hidden;
  const base = mapLoadingConfig.routeFocusPadding;
  return {
    ...base,
    right: railOpen ? Math.max(base.right, 360) : Math.max(base.right, 112)
  };
}

function currentViewportBounds(paddingRatio = 0) {
  const bounds = state.map?.getBounds?.();
  if (!bounds) {
    return mapWorldBounds;
  }
  const latSpan = Math.max(0.1, bounds.north - bounds.south);
  let lngSpan = bounds.east - bounds.west;
  if (lngSpan < 0) {
    lngSpan += 360;
  }
  const latPadding = latSpan * paddingRatio;
  const lngPadding = Math.max(0.1, lngSpan) * paddingRatio;
  return {
    north: clampLatitude(bounds.north + latPadding),
    south: clampLatitude(bounds.south - latPadding),
    west: normalizeLongitude(bounds.west - lngPadding),
    east: normalizeLongitude(bounds.east + lngPadding)
  };
}

function longitudeInBounds(lng, bounds) {
  const value = normalizeLongitude(lng);
  if (bounds.west <= bounds.east) {
    return value >= bounds.west && value <= bounds.east;
  }
  return value >= bounds.west || value <= bounds.east;
}

function positionInBounds(position, bounds) {
  if (!Array.isArray(position) || position.length !== 2) {
    return false;
  }
  const lat = Number(position[0]);
  const lng = Number(position[1]);
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat <= bounds.north
    && lat >= bounds.south
    && longitudeInBounds(lng, bounds);
}

function aircraftRenderLimit() {
  if (mapLoadingConfig.showAllAircraftIconsAtAllZooms) {
    return Number.POSITIVE_INFINITY;
  }
  return steppedValue(mapLoadingConfig.aircraftLimitByZoom, currentZoom(), "limit");
}

function aircraftRequestLimit() {
  return mapLoadingConfig.showAllAircraftIconsAtAllZooms
    ? mapLoadingConfig.allAircraftIconRequestLimit
    : aircraftRenderLimit();
}

function aircraftRenderIsLimited() {
  return Number.isFinite(aircraftRenderLimit());
}

function aircraftIconVisibilityUsesGlobalScope() {
  return mapLoadingConfig.showAllAircraftIconsAtAllZooms;
}

function aircraftRequestBounds() {
  return aircraftIconVisibilityUsesGlobalScope()
    ? mapWorldBounds
    : currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
}

function aircraftLabelLimit() {
  return steppedValue(mapLoadingConfig.aircraftLabelLimitByZoom, currentZoom(), "limit");
}

function airportRenderLimit() {
  return Number.POSITIVE_INFINITY;
}

function airportLevelLimit() {
  const band = airportScaleBand();
  if (airportLayerMode() === "on") return band === "far" ? 1 : band === "mid" ? 3 : 4;
  return band === "far" ? 0 : band === "mid" ? 1 : 4;
}

function airportShowsAllInCurrentViewport(zoom = currentZoom()) {
  const scale = effectiveScaleKm(zoom);
  return airportScaleBand(scale, zoom) === "near";
}

function airportRequestLimit() {
  return mapLoadingConfig.airportViewportRequestLimit;
}

function airportRequestLevelLimit() {
  return airportLevelLimit();
}

function airportPriorityLevel(airport) {
  return airportLevelForRecord(airport);
}

function airportTrafficScore(airport) {
  const explicitScore = Number(airport.trafficScore);
  if (Number.isFinite(explicitScore)) {
    return explicitScore;
  }
  const ground = Number(airport.ground || 0);
  const departures = Number(airport.departures || 0);
  const arrivals = Number(airport.arrivals || 0);
  const runwayBoost = String(airport.runways || "").split(",").filter((item) => item.trim()).length * 6;
  return Math.round(ground * 1.8 + departures * 1.15 + arrivals * 1.15 + runwayBoost);
}

function airportBusinessJetScore(airport) {
  const explicitScore = Number(airport.businessJetScore);
  if (Number.isFinite(explicitScore)) {
    return explicitScore;
  }
  const ground = Number(airport.ground || 0);
  const movements = Number(airport.departures || 0) + Number(airport.arrivals || 0);
  return Math.min(100, Math.round(ground * 1.8 + movements * 0.8));
}

function normalizeAirportRecord(airport) {
  if (!airport) {
    return airport;
  }
  const level = airportLevelForRecord(airport);
  airport.displayLevel = level;
  airport.level = level;
  airport.trafficScore = airportTrafficScore(airport);
  airport.businessJetScore = airportBusinessJetScore(airport);
  airport.markerSize = airport.markerSize || airportMarkerSizeClass(airport);
  airport.labelMode = airport.labelMode || "auto";
  syncAirportGroundCountFields(airport);
  return airport;
}

function airportMarkerSizeClass(airport) {
  const explicit = String(airport.markerSize || "").toLowerCase();
  if (["major", "medium", "small"].includes(explicit)) {
    return explicit;
  }
  const level = airportPriorityLevel(airport);
  if (level <= 2) return "major";
  if (level <= 3) return "medium";
  return "small";
}

function airportSizeForZoom(sizeClass, zoom = currentZoom()) {
  const clamped = clampZoom(zoom);
  const sizes = {
    major: { width: 28, height: 36, hitWidth: 40, hitHeight: 44 },
    medium: { width: 22, height: 28, hitWidth: 36, hitHeight: 40 },
    small: { width: 16, height: 21, hitWidth: 32, hitHeight: 34 }
  };
  const visibleClass = sizeClass || "medium";
  const result = { ...sizes[visibleClass] };
  if (clamped < 5.5) {
    if (visibleClass !== "major") {
      return { width: 0, height: 0, hitWidth: 0, hitHeight: 0 };
    }
    return { width: 22, height: 28, hitWidth: 36, hitHeight: 40 };
  }
  if (clamped < 7) {
    if (visibleClass === "small") {
      return { width: 0, height: 0, hitWidth: 0, hitHeight: 0 };
    }
    return visibleClass === "major"
      ? { width: 24, height: 31, hitWidth: 38, hitHeight: 42 }
      : { width: 18, height: 23, hitWidth: 34, hitHeight: 38 };
  }
  if (clamped < 7.5) {
    if (visibleClass === "major") return { width: 24, height: 31, hitWidth: 38, hitHeight: 42 };
    if (visibleClass === "medium") return { width: 18, height: 23, hitWidth: 34, hitHeight: 38 };
    return { width: 14, height: 18, hitWidth: 30, hitHeight: 32 };
  }
  if (clamped < 9.5) {
    if (visibleClass === "major") return { width: 26, height: 34, hitWidth: 40, hitHeight: 44 };
    if (visibleClass === "medium") return { width: 20, height: 26, hitWidth: 36, hitHeight: 40 };
    return { width: 15, height: 20, hitWidth: 32, hitHeight: 36 };
  }
  return result;
}

function airportIsSelected(airport) {
  return state.selectedKind === "airport" && airport.id === state.selectedId;
}

function airportIsRouteEndpointSelected(airport) {
  return state.selectedKind === "aircraft" && airportIsSelectedAircraftRouteEndpoint(airport);
}

function airportHasSelectedVisualState(airport) {
  return airportIsSelected(airport) || airportIsRouteEndpointSelected(airport);
}

function airportHasPinnedVisualState(airport) {
  return airportHasSelectedVisualState(airport)
    || airportHoverId(state.hoveredAirportId) === airportHoverId(airport?.id);
}

function selectedAircraftRouteEndpointMap(jet = selectedAircraft()) {
  const map = new Map();
  selectedRouteEndpoints(jet).forEach((endpoint) => {
    const airport = airportByCode(endpoint.code) || airportByCode(endpoint.id);
    if (!airport) {
      return;
    }
    map.set(airport.id, endpoint.role);
  });
  return map;
}

function refreshSelectedRouteEndpointCache(jet = selectedAircraft()) {
  state.selectedRouteEndpointMap = state.selectedKind === "aircraft" && jet
    ? selectedAircraftRouteEndpointMap(jet)
    : new Map();
  return state.selectedRouteEndpointMap;
}

function getSelectedAircraftRouteEndpointMap() {
  return state.selectedRouteEndpointMap || selectedAircraftRouteEndpointMap();
}

function selectedAircraftRouteEndpointRole(airport, endpointMap = getSelectedAircraftRouteEndpointMap()) {
  if (!airport || state.selectedKind !== "aircraft") {
    return "";
  }
  return endpointMap.get(airport.id) || "";
}

function airportIsSelectedAircraftRouteEndpoint(airport, endpointMap = getSelectedAircraftRouteEndpointMap()) {
  return Boolean(selectedAircraftRouteEndpointRole(airport, endpointMap));
}

function selectedAircraftRouteEndpointAirports(endpointMap = getSelectedAircraftRouteEndpointMap()) {
  return [...endpointMap.keys()]
    .map((id) => airportById(id))
    .filter(Boolean)
    .map((airport) => normalizeAirportRecord(airport));
}

function protectedAirportIds() {
  const ids = new Set();
  const selected = selectedAirport();
  if (selected?.id) {
    ids.add(selected.id);
  }
  getSelectedAircraftRouteEndpointMap().forEach((role, id) => {
    if (role && id) {
      ids.add(id);
    }
  });
  if (state.hoveredAirportId) {
    const airportId = airportHoverId(state.hoveredAirportId);
    if (airportId) {
      ids.add(airportId);
    }
  }
  return ids;
}

function airportIsProtected(airport, ids = protectedAirportIds()) {
  return Boolean(airport?.id && ids.has(airport.id));
}

function protectedAirportRecords(ids = protectedAirportIds()) {
  return [...ids]
    .map((id) => airportById(id))
    .filter(Boolean)
    .map((airport) => normalizeAirportRecord(airport));
}

function addProtectedAirports(records, ids = protectedAirportIds()) {
  const existing = new Set(records.map((airport) => airport.id));
  protectedAirportRecords(ids).forEach((airport) => {
    if (!existing.has(airport.id)) {
      records.unshift(airport);
      existing.add(airport.id);
    }
  });
  return records;
}

function selectedRouteEndpointCodes(jet = selectedAircraft()) {
  return selectedRouteEndpoints(jet)
    .flatMap((endpoint) => [endpoint.code, endpoint.id])
    .map((code) => normalizedLookupKey(code))
    .filter(Boolean);
}

function airportLayerMode() {
  return state.airportLayerMode || "auto";
}

function airportLayerIsOff() {
  return !state.airports || airportLayerMode() === "off";
}

function airportMarkerZIndex(airport, options = {}) {
  if (options.currentHover === true) {
    return AIRPORT_MARKER_CURRENT_HOVER_POPUP_Z_INDEX;
  }
  if (options.hovered === true) {
    return airportIsSelected(airport)
      ? AIRPORT_MARKER_SELECTED_POPUP_Z_INDEX
      : AIRPORT_MARKER_HOVER_Z_INDEX;
  }
  if (airportIsSelectedAircraftRouteEndpoint(airport)) {
    return AIRPORT_ROUTE_ENDPOINT_Z_INDEX;
  }
  return airportIsSelected(airport)
    ? AIRPORT_MARKER_SELECTED_Z_INDEX
    : AIRPORT_MARKER_BASE_Z_INDEX - airportPriorityLevel(airport);
}

function googleAirportCollisionBehavior(airport, options = {}) {
  const collisionBehavior = window.google?.maps?.CollisionBehavior;
  if (!collisionBehavior) {
    return undefined;
  }
  return collisionBehavior.REQUIRED;
}

function applyGoogleAirportMarkerStacking(marker, airport, options = {}) {
  if (!marker || !airport) {
    return;
  }
  marker.zIndex = airportMarkerZIndex(airport, options);
  if ("collisionBehavior" in marker) {
    const collisionBehavior = googleAirportCollisionBehavior(airport, options);
    if (collisionBehavior) {
      marker.collisionBehavior = collisionBehavior;
    }
  }
}

function airportHoverId(id) {
  return String(id || "").trim();
}

function selectedAirportPopupId() {
  return state.selectedKind === "airport" ? airportHoverId(state.selectedId) : "";
}

function activeAirportPopupIds(fallbackId = state.hoveredAirportId) {
  return new Set([
    selectedAirportPopupId(),
    airportHoverId(fallbackId)
  ].filter(Boolean));
}

function airportPopupSize(airport) {
  const parts = airportHoverLabelParts(airport);
  const lines = [parts.nameCn, parts.nameEn, airportHoverCodeLine(airport)].filter((value) => value && value !== "N/A");
  const longest = lines.reduce((max, value) => Math.max(max, String(value).length), 0);
  const width = Math.min(360, Math.max(220, longest * 6.6 + 28));
  const height = Math.max(52, lines.length * 18 + 22);
  return { width, height };
}

function airportPopupBoxForPlacement(airport, placement = "bottom") {
  if (!airport || !state.map) {
    return null;
  }
  const point = state.map.project([airport.lat, airport.lng]);
  const metrics = airportMarkerMetrics(airport);
  const size = airportPopupSize(airport);
  const gap = AIRPORT_POPUP_GAP_PX;
  const anchor = {
    x: Number(point.x),
    y: Number(point.y),
    hitWidth: Number(metrics.hitWidth || 36),
    hitHeight: Number(metrics.hitHeight || 40)
  };
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
    return null;
  }
  const boxes = {
    bottom: {
      left: anchor.x - size.width / 2,
      right: anchor.x + size.width / 2,
      top: anchor.y + gap,
      bottom: anchor.y + gap + size.height
    },
    top: {
      left: anchor.x - size.width / 2,
      right: anchor.x + size.width / 2,
      top: anchor.y - anchor.hitHeight - gap - size.height,
      bottom: anchor.y - anchor.hitHeight - gap
    },
    right: {
      left: anchor.x + anchor.hitWidth / 2 + gap,
      right: anchor.x + anchor.hitWidth / 2 + gap + size.width,
      top: anchor.y - anchor.hitHeight / 2 - size.height / 2,
      bottom: anchor.y - anchor.hitHeight / 2 + size.height / 2
    },
    left: {
      left: anchor.x - anchor.hitWidth / 2 - gap - size.width,
      right: anchor.x - anchor.hitWidth / 2 - gap,
      top: anchor.y - anchor.hitHeight / 2 - size.height / 2,
      bottom: anchor.y - anchor.hitHeight / 2 + size.height / 2
    }
  };
  return boxes[placement] || boxes.bottom;
}

function airportPopupViewportPenalty(box) {
  if (!box || typeof window === "undefined") {
    return 0;
  }
  const margin = 10;
  const overflowX = Math.max(0, margin - box.left)
    + Math.max(0, box.right - (window.innerWidth - margin));
  const overflowY = Math.max(0, margin - box.top)
    + Math.max(0, box.bottom - (window.innerHeight - margin));
  return overflowX * 4 + overflowY * 4;
}

function airportPopupOverlapPenalty(box, blockedBoxes = []) {
  return blockedBoxes.reduce((penalty, blocked) => {
    if (!boxesOverlap(box, blocked, 10)) {
      return penalty;
    }
    const overlapX = Math.max(0, Math.min(box.right, blocked.right) - Math.max(box.left, blocked.left));
    const overlapY = Math.max(0, Math.min(box.bottom, blocked.bottom) - Math.max(box.top, blocked.top));
    return penalty + 10000 + overlapX * overlapY;
  }, 0);
}

function airportPopupElementBox(id) {
  const active = airportHoverId(id);
  if (!active || typeof document === "undefined") {
    return null;
  }
  const element = airportMarkerElementsForId(active)
    .map((marker) => marker.querySelector(".airport-hover-label"))
    .find((label) => label && getComputedStyle(label).visibility !== "hidden");
  const rect = element?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom
  };
}

function preferredAirportPopupPlacements(airport, activeIds = activeAirportPopupIds()) {
  const selectedId = selectedAirportPopupId();
  const currentId = airportHoverId(airport?.id);
  if (selectedId && currentId && currentId !== selectedId && activeIds.has(selectedId)) {
    const selected = airportById(selectedId);
    if (selected && state.map) {
      const currentPoint = state.map.project([airport.lat, airport.lng]);
      const selectedPoint = state.map.project([selected.lat, selected.lng]);
      const dx = Number(currentPoint.x) - Number(selectedPoint.x);
      const dy = Number(currentPoint.y) - Number(selectedPoint.y);
      if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0 ? ["right", "top", "bottom", "left"] : ["left", "top", "bottom", "right"];
      }
      return dy >= 0 ? ["bottom", "right", "left", "top"] : ["top", "right", "left", "bottom"];
    }
  }
  return ["bottom", "top", "right", "left"];
}

function airportPopupPlacement(airport, activeIds = activeAirportPopupIds()) {
  if (!airport || !state.map) {
    return "bottom";
  }
  const selectedId = selectedAirportPopupId();
  const currentId = airportHoverId(airport.id);
  const blockedBoxes = [];
  if (selectedId && selectedId !== currentId && activeIds.has(selectedId)) {
    const selected = airportById(selectedId);
    const selectedBox = airportPopupElementBox(selectedId) || airportPopupBoxForPlacement(selected, "bottom");
    if (selectedBox) {
      blockedBoxes.push(selectedBox);
    }
  }
  const preferred = preferredAirportPopupPlacements(airport, activeIds);
  const candidates = [...new Set([...preferred, "bottom", "top", "right", "left"])];
  return candidates
    .map((placement, index) => {
      const box = airportPopupBoxForPlacement(airport, placement);
      return {
        placement,
        score: airportPopupViewportPenalty(box) + airportPopupOverlapPenalty(box, blockedBoxes) + index
      };
    })
    .sort((first, second) => first.score - second.score)[0]?.placement || "bottom";
}

function airportPopupPlacementVars(airport, activeIds = activeAirportPopupIds()) {
  const placement = airportPopupPlacement(airport, activeIds);
  const gap = `${AIRPORT_POPUP_GAP_PX}px`;
  const values = {
    bottom: {
      left: "50%",
      top: `calc(var(--airport-hit-height, 40px) + ${gap})`,
      transform: "translateX(-50%)"
    },
    top: {
      left: "50%",
      top: `calc(-1 * ${gap})`,
      transform: "translate(-50%, -100%)"
    },
    right: {
      left: `calc(50% + var(--airport-hit-width, 36px) / 2 + ${gap})`,
      top: "calc(var(--airport-hit-height, 40px) / 2)",
      transform: "translateY(-50%)"
    },
    left: {
      left: `calc(50% - var(--airport-hit-width, 36px) / 2 - ${gap})`,
      top: "calc(var(--airport-hit-height, 40px) / 2)",
      transform: "translate(-100%, -50%)"
    }
  };
  return { placement, ...(values[placement] || values.bottom) };
}

function applyAirportPopupPlacementVars(element, airport, activeIds = activeAirportPopupIds()) {
  if (!element || !airport) {
    return "";
  }
  const vars = airportPopupPlacementVars(airport, activeIds);
  element.dataset.popupPlacement = vars.placement;
  element.style.setProperty("--airport-popup-left", vars.left);
  element.style.setProperty("--airport-popup-top", vars.top);
  element.style.setProperty("--airport-popup-transform", vars.transform);
  return `--airport-popup-left:${vars.left}; --airport-popup-top:${vars.top}; --airport-popup-transform:${vars.transform};`;
}

function airportHoverIsActive(id, activeIds = activeAirportPopupIds()) {
  return activeIds.has(airportHoverId(id));
}

function airportPopupCanShow(airport) {
  if (!airportHoverInteractionsEnabled()) {
    return false;
  }
  if (!airport) {
    return false;
  }
  if (airportIsSelectedAircraftRouteEndpoint(airport)) {
    return false;
  }
  const parts = airportHoverLabelParts(airport);
  const hasName = [parts.nameCn, parts.nameEn].some((value) => value && value !== "N/A");
  const hasCodes = parts.iata !== "N/A" && parts.icao !== "N/A";
  return hasName && hasCodes;
}

function airportPopupIsReady(id, activeIds = activeAirportPopupIds()) {
  const airportId = airportHoverId(id);
  return activeIds.has(airportId) && airportPopupCanShow(airportById(airportId));
}

function setAirportMarkerHoverClass(element, hovered, popupReady = false, currentHover = false) {
  if (!element) {
    return;
  }
  element.classList.toggle("is-hovered", hovered);
  element.classList.toggle("is-popup-ready", popupReady);
  element.classList.toggle("is-current-hover", currentHover);
  if (hovered) {
    element.dataset.hovered = "true";
  } else {
    delete element.dataset.hovered;
  }
  if (popupReady) {
    element.dataset.popupReady = "true";
  } else {
    delete element.dataset.popupReady;
  }
  if (currentHover) {
    element.dataset.currentHover = "true";
  } else {
    delete element.dataset.currentHover;
  }
}

function clearAirportHoverCloseTimer() {
  if (!state.airportHoverClearTimer) {
    return;
  }
  clearTimeout(state.airportHoverClearTimer);
  state.airportHoverClearTimer = null;
}

function airportPointerFromEvent(event) {
  const x = Number(event?.clientX);
  const y = Number(event?.clientY);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function updateAirportHoverPointer(event) {
  const point = airportPointerFromEvent(event);
  if (point) {
    state.airportHoverPointer = point;
  }
}

function airportMarkerElementsForId(id) {
  const active = airportHoverId(id);
  if (!active || typeof document === "undefined") {
    return [];
  }
  const elements = Array.from(document.querySelectorAll(".airport-pin"))
    .filter((element) => airportHoverId(element.dataset.id) === active);
  const record = state.map?.airportMarkers instanceof Map ? state.map.airportMarkers.get(active) : null;
  if (record?.content && !elements.includes(record.content)) {
    elements.push(record.content);
  }
  return elements;
}

function pointInsideElementRect(element, point, padding = 4) {
  if (!element || !point) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  return point.x >= rect.left - padding
    && point.x <= rect.right + padding
    && point.y >= rect.top - padding
    && point.y <= rect.bottom + padding;
}

function pointInsideAirportPopup(id, point) {
  const active = airportHoverId(id);
  if (!active || !point) {
    return false;
  }
  return airportMarkerElementsForId(active)
    .map((element) => element.querySelector(".airport-hover-label"))
    .some((label) => pointInsideElementRect(label, point, 8));
}

function elementBelongsToAirportMarker(element, id) {
  const active = airportHoverId(id);
  if (!element || !active) {
    return false;
  }
  const marker = element.closest?.(".airport-pin");
  if (!marker) {
    return false;
  }
  return airportHoverId(marker.dataset.id) === active;
}

function airportMarkerIdFromElement(element) {
  const marker = element?.closest?.(".airport-pin");
  return airportHoverId(marker?.dataset?.id);
}

function airportElementAtPointer(point) {
  if (!point || typeof document === "undefined" || typeof document.elementFromPoint !== "function") {
    return null;
  }
  return document.elementFromPoint(point.x, point.y);
}

function airportMarkerElementsAtPoint(point) {
  if (!point || typeof document === "undefined") {
    return [];
  }
  return Array.from(document.querySelectorAll(".airport-pin"))
    .filter((element) => !element.classList.contains("is-removing"))
    .filter((element) => pointInsideElementRect(element, point, 2))
    .sort((first, second) => {
      const firstAirport = airportById(first.dataset.id);
      const secondAirport = airportById(second.dataset.id);
      return airportMarkerZIndex(secondAirport, {
        hovered: second.classList.contains("is-hovered"),
        currentHover: second.classList.contains("is-current-hover")
      }) - airportMarkerZIndex(firstAirport, {
        hovered: first.classList.contains("is-hovered"),
        currentHover: first.classList.contains("is-current-hover")
      });
    });
}

function airportMarkerIdAtPointer(point = state.airportHoverPointer) {
  if (!point) {
    return "";
  }
  const directId = airportMarkerIdFromElement(airportElementAtPointer(point));
  if (directId) {
    return directId;
  }
  return airportHoverId(airportMarkerElementsAtPoint(point)[0]?.dataset?.id);
}

function pointerStillInsideAirportMarker(id, event) {
  const point = state.airportHoverPointer || airportPointerFromEvent(event);
  if (!point) {
    return false;
  }
  const elementAtPointer = airportElementAtPointer(point);
  return elementBelongsToAirportMarker(elementAtPointer, id)
    || airportMarkerElementsForId(id).some((element) => pointInsideElementRect(element, point, 8))
    || pointInsideAirportPopup(id, point);
}

function restoreAirportHoverFromPointer(options = {}) {
  if (!airportHoverInteractionsEnabled()) {
    clearTouchHoverState();
    return false;
  }
  if (state.isInteractingWithMap && options.duringInteraction !== true) {
    return false;
  }
  const active = airportMarkerIdAtPointer(state.airportHoverPointer);
  if (!active) {
    return false;
  }
  const airport = airportById(active);
  if (!airport || airportIsSelectedAircraftRouteEndpoint(airport)) {
    return false;
  }
  clearAirportHoverCloseTimer();
  const selectedPopup = selectedAirportPopupId();
  if (active !== selectedPopup) {
    state.hoveredAirportId = active;
  }
  syncAirportHoverMarkers();
  handleAirportMarkerHover(active);
  return true;
}

function scheduleAirportHoverEnd(id, event) {
  const active = airportHoverId(id);
  if (!active || state.hoveredAirportId !== active) {
    return;
  }
  clearAirportHoverCloseTimer();
  state.airportHoverClearTimer = setTimeout(() => {
    state.airportHoverClearTimer = null;
    if (state.hoveredAirportId !== active) {
      return;
    }
    if (pointerStillInsideAirportMarker(active, event)) {
      syncAirportHoverMarkers();
      return;
    }
    state.hoveredAirportId = null;
    syncAirportHoverMarkers("");
  }, AIRPORT_HOVER_CLEAR_DELAY_MS);
}

function syncAirportHoverMarkers(activeId = state.hoveredAirportId) {
  const activeIds = activeAirportPopupIds(activeId);
  const currentHoverId = airportHoverId(state.hoveredAirportId);
  document.querySelectorAll(".airport-pin").forEach((element) => {
    const markerAirportId = airportHoverId(element.dataset.id);
    const hovered = activeIds.has(markerAirportId);
    const currentHover = currentHoverId === markerAirportId;
    const airport = airportById(markerAirportId);
    applyAirportPopupPlacementVars(element, airport, activeIds);
    setAirportMarkerHoverClass(element, hovered, hovered && airportPopupCanShow(airport), currentHover);
  });
  if (state.map?.airportMarkers instanceof Map) {
    state.map.airportMarkers.forEach((record, markerId) => {
      const markerAirportId = airportHoverId(record.content?.dataset?.id || markerId);
      const hovered = activeIds.has(markerAirportId);
      const currentHover = currentHoverId === markerAirportId;
      const airport = airportById(markerAirportId);
      applyAirportPopupPlacementVars(record.content, airport, activeIds);
      setAirportMarkerHoverClass(record.content, hovered, hovered && airportPopupCanShow(airport), currentHover);
      if (airport) {
        applyGoogleAirportMarkerStacking(record.marker, airport, { hovered, currentHover });
      }
    });
  }
}

function beginAirportMarkerHover(id, event) {
  if (!airportHoverInteractionsEnabled()) {
    clearTouchHoverState();
    return;
  }
  updateAirportHoverPointer(event);
  clearAirportHoverCloseTimer();
  const active = airportHoverId(id);
  if (!active) {
    return;
  }
  const selectedPopup = selectedAirportPopupId();
  if (selectedPopup) {
    if (active !== selectedPopup) {
      state.hoveredAirportId = active;
    }
    syncAirportHoverMarkers();
    handleAirportMarkerHover(active);
    return;
  }
  state.hoveredAirportId = active;
  syncAirportHoverMarkers(active);
  handleAirportMarkerHover(active);
}

function endAirportMarkerHover(id, event) {
  if (!airportHoverInteractionsEnabled()) {
    clearTouchHoverState();
    return;
  }
  const active = airportHoverId(id);
  if (!active || state.hoveredAirportId !== active) {
    return;
  }
  scheduleAirportHoverEnd(active, event);
}

function normalizeAirportCodeText(value) {
  const text = String(value ?? "").trim().toUpperCase();
  return !text || text === "-" || text === "N/A" ? "" : text;
}

function airportCodeByLength(length, ...values) {
  return values
    .map(normalizeAirportCodeText)
    .find((value) => value.length === length) || "";
}

function meaningfulAirportName(value, codeSet, options = {}) {
  const text = String(displayOrDash(value)).trim();
  if (!text || text === NA_TEXT || text.toUpperCase() === "N/A") {
    return "";
  }
  const normalized = normalizeAirportCodeText(text);
  if (normalized && (codeSet.has(normalized) || /^[A-Z0-9]{3,4}$/.test(normalized))) {
    return "";
  }
  if (options.requiresChinese && !/[\u4e00-\u9fff]/.test(text)) {
    return "";
  }
  return text;
}

function firstMeaningfulAirportName(codeSet, options, ...values) {
  return values
    .map((value) => meaningfulAirportName(value, codeSet, options))
    .find(Boolean) || "N/A";
}

function airportHoverLabelParts(airport) {
  const detailInfo = airport.apiDetail?.airportInfo || {};
  const raw = airport.raw || {};
  const iata = airportCodeByLength(3, detailInfo.airportCode, raw.airportCode, airport.airportCode, airport.iata);
  const icao = airportCodeByLength(4, detailInfo.icaoCode, raw.icaoCode, airport.icaoCode, airport.icao, airport.id);
  const codeSet = new Set([iata, icao, normalizeAirportCodeText(airport.id), normalizeAirportCodeText(airport.airportCode)].filter(Boolean));
  const nameCn = firstMeaningfulAirportName(
    codeSet,
    { requiresChinese: true },
    detailInfo.airportName,
    raw.airportName,
    detailInfo.airportFourName,
    raw.airportFourName,
    airport.nameCn,
    airport.nameZh
  );
  const nameEn = firstMeaningfulAirportName(
    codeSet,
    {},
    detailInfo.airportNameEn,
    raw.airportNameEn,
    airport.nameEn,
    airport.name
  );
  return {
    nameCn,
    nameEn,
    iata: iata || "N/A",
    icao: icao || "N/A"
  };
}

function airportDisplayCode(airport) {
  const { iata, icao } = airportHoverLabelParts(airport);
  if (iata !== "N/A" && icao !== "N/A") {
    return `${iata} / ${icao}`;
  }
  return icao !== "N/A" ? icao : iata !== "N/A" ? iata : airport.id || "-";
}

function airportHoverCodeLine(airport) {
  const { iata, icao } = airportHoverLabelParts(airport);
  if (iata !== "N/A" && icao !== "N/A") {
    return `${iata} / ${icao}`;
  }
  if (iata !== "N/A") {
    return iata;
  }
  if (icao !== "N/A") {
    return icao;
  }
  return "N/A";
}

function airportFullLabel(airport) {
  const { nameCn, nameEn } = airportHoverLabelParts(airport);
  return [
    nameCn,
    nameEn,
    airportHoverCodeLine(airport)
  ].filter((value) => value && value !== "N/A").join(" · ") || airport.id || "-";
}

function airportHoverLabelHtml(airport) {
  const { nameCn, nameEn } = airportHoverLabelParts(airport);
  return [
    nameCn !== "N/A" ? `<span class="airport-hover-name-cn">${escapeHtml(nameCn)}</span>` : "",
    nameEn !== "N/A" ? `<span class="airport-hover-name-en">${escapeHtml(nameEn)}</span>` : "",
    `<span class="airport-hover-code-line">${escapeHtml(airportHoverCodeLine(airport))}</span>`
  ].filter(Boolean).join("");
}

function desiredAirportLabelMode(airport) {
  return "none";
}

function estimateAirportLabelBox(airport, labelMode) {
  if (labelMode === "none" || !state.map?.project) {
    return null;
  }
  const point = state.map.project([airport.lat, airport.lng]);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }
  const text = labelMode === "full" ? airportFullLabel(airport) : airportDisplayCode(airport);
  const width = Math.min(labelMode === "full" ? 188 : 86, Math.max(42, text.length * 6.4 + 14));
  const height = 24;
  const top = point.y + 2;
  return {
    left: point.x - width / 2,
    right: point.x + width / 2,
    top,
    bottom: top + height
  };
}

function boxesOverlap(a, b, gap = 4) {
  return a.left < b.right + gap
    && a.right + gap > b.left
    && a.top < b.bottom + gap
    && a.bottom + gap > b.top;
}

function applyAirportLabelCollision(airportList) {
  const accepted = [];
  return airportList.map((airport) => {
    const labelMode = desiredAirportLabelMode(airport);
    if (airportHasSelectedVisualState(airport)) {
      const selectedBox = estimateAirportLabelBox(airport, labelMode);
      if (selectedBox) accepted.push(selectedBox);
      return { ...airport, renderLabelMode: labelMode };
    }
    const box = estimateAirportLabelBox(airport, labelMode);
    if (!box || accepted.some((item) => boxesOverlap(item, box))) {
      return { ...airport, renderLabelMode: "none" };
    }
    accepted.push(box);
    return { ...airport, renderLabelMode: labelMode };
  });
}

function airportMarkerMetrics(airport) {
  const selected = airportHasSelectedVisualState(airport);
  const routeEndpoint = airportIsSelectedAircraftRouteEndpoint(airport);
  const pinned = airportHasPinnedVisualState(airport);
  const rawSizeClass = airportMarkerSizeClass(airport);
  const sizeClass = (selected || routeEndpoint) && rawSizeClass === "small" ? "major" : rawSizeClass;
  let base = airportSizeForZoom(sizeClass);
  if (pinned && (!base.width || !base.height)) {
    base = { width: 24, height: 31, hitWidth: 40, hitHeight: 44 };
  }
  const selectedScale = selected ? 1.1 : routeEndpoint ? 1.06 : 1;
  const mobileScale = window.matchMedia("(max-width: 640px)").matches && !selected && !routeEndpoint ? 0.9 : 1;
  const scale = selectedScale * mobileScale;
  return {
    sizeClass,
    visualWidth: Math.round(base.width * scale * 10) / 10,
    visualHeight: Math.round(base.height * scale * 10) / 10,
    hitWidth: Math.max(36, Math.round(base.hitWidth * mobileScale)),
    hitHeight: Math.max(36, Math.round(base.hitHeight * mobileScale)),
    anchorX: Math.round((base.width * scale) / 2),
    anchorY: Math.round(base.height * scale)
  };
}

function airportMarkerIsVisible(airport) {
  const metrics = airportMarkerMetrics(airport);
  return metrics.visualWidth > 0 && metrics.visualHeight > 0;
}

function airportMarkerCssVars(airport) {
  const metrics = airportMarkerMetrics(airport);
  return {
    metrics,
    cssText: `--airport-icon-width:${metrics.visualWidth}px; --airport-icon-height:${metrics.visualHeight}px; --airport-hit-width:${metrics.hitWidth}px; --airport-hit-height:${metrics.hitHeight}px;`
  };
}

function airportMarkerClass(airport, metrics = airportMarkerMetrics(airport)) {
  const labelMode = airport.renderLabelMode || desiredAirportLabelMode(airport);
  const routeEndpointRole = selectedAircraftRouteEndpointRole(airport);
  return [
    "airport-pin",
    `airport-size-${metrics.sizeClass}`,
    airportIsSelected(airport) ? "is-selected" : "",
    routeEndpointRole ? "is-route-endpoint" : "",
    routeEndpointRole ? "is-route-selected" : "",
    routeEndpointRole === "departure" ? "is-route-origin" : "",
    routeEndpointRole === "arrival" ? "is-route-destination" : "",
    `label-${labelMode}`
  ].filter(Boolean).join(" ");
}

function normalizeAirportGroundCount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

function airportGroundCountSource(airport) {
  return String(airport?.groundCountSource || airport?.groundCountMeta?.source || airport?.source || "").trim();
}

function airportGroundCountUpdatedAt(airport) {
  const value = airport?.groundCountUpdatedAt ?? airport?.groundCountMeta?.updatedAt;
  return value === null || value === undefined || value === "" ? null : value;
}

function syncAirportGroundCountFields(airport) {
  if (!airport) {
    return airport;
  }
  const explicitCount = normalizeAirportGroundCount(airport.groundCount);
  if (explicitCount !== null) {
    airport.groundCount = explicitCount;
    airport.groundCountAvailable = true;
    airport.groundCountSource = airportGroundCountSource(airport) || "airport-model";
    airport.groundCountUpdatedAt = airportGroundCountUpdatedAt(airport);
    return airport;
  }
  if (airport.groundCountAvailable === false) {
    return airport;
  }
  const rawCount = normalizeAirportGroundCount(airport.raw?.groundNum ?? airport.groundNum);
  if (rawCount !== null) {
    airport.groundCount = rawCount;
    airport.groundCountAvailable = true;
    airport.groundCountSource = airportGroundCountSource(airport) || "513008";
    airport.groundCountUpdatedAt = airportGroundCountUpdatedAt(airport);
    return airport;
  }
  const fallbackCount = normalizeAirportGroundCount(airport.ground);
  if (fallbackCount !== null) {
    airport.groundCount = fallbackCount;
    airport.groundCountAvailable = true;
    airport.groundCountSource = airportGroundCountSource(airport) || "local";
    airport.groundCountUpdatedAt = airportGroundCountUpdatedAt(airport);
  }
  return airport;
}

function airportParkingBadgeCount(airport) {
  syncAirportGroundCountFields(airport);
  return airport?.groundCountAvailable === true ? normalizeAirportGroundCount(airport.groundCount) : null;
}

function airportParkingBadgeTierFromCount(count) {
  if (count === 0) return "zero";
  if (count < 10) return "single";
  if (count < 100) return "double";
  if (count < 1000) return "triple";
  return "compact";
}

function airportParkingBadgeTextFromCount(count) {
  if (count < 1000) {
    return String(count);
  }
  if (count >= 1000000) {
    return "1m+";
  }
  const thousands = Math.floor(count / 1000);
  return `${Math.min(thousands, 99)}k+`;
}

function airportParkingBadgeModel(airport) {
  const count = airportParkingBadgeCount(airport);
  if (count === null) {
    return null;
  }
  const text = airportParkingBadgeTextFromCount(count);
  const tier = airportParkingBadgeTierFromCount(count);
  return {
    count,
    text,
    tier,
    source: airportGroundCountSource(airport),
    updatedAt: airportGroundCountUpdatedAt(airport)
  };
}

function airportParkingBadgeHtml(airport) {
  const badge = airportParkingBadgeModel(airport);
  if (!badge) {
    return "";
  }
  return `<span class="airport-parking-badge" data-count-tier="${escapeHtml(badge.tier)}" aria-label="${escapeHtml(`当前停场公务机 ${badge.count} 架`)}"><span class="airport-parking-badge-value">${escapeHtml(badge.text)}</span></span>`;
}

function airportParkingBadgeDataAttributes(airport) {
  const badge = airportParkingBadgeModel(airport);
  if (!badge) {
    return "";
  }
  return ` data-ground-count="${badge.count}" data-ground-count-tier="${escapeHtml(badge.tier)}"${badge.source ? ` data-ground-count-source="${escapeHtml(badge.source)}"` : ""}${badge.updatedAt ? ` data-ground-count-updated-at="${escapeHtml(badge.updatedAt)}"` : ""}`;
}

function syncAirportParkingBadgeDataset(element, airport) {
  if (!element) {
    return;
  }
  const badge = airportParkingBadgeModel(airport);
  if (!badge) {
    delete element.dataset.groundCount;
    delete element.dataset.groundCountTier;
    delete element.dataset.groundCountSource;
    delete element.dataset.groundCountUpdatedAt;
    return;
  }
  element.dataset.groundCount = String(badge.count);
  element.dataset.groundCountTier = badge.tier;
  if (badge.source) {
    element.dataset.groundCountSource = badge.source;
  } else {
    delete element.dataset.groundCountSource;
  }
  if (badge.updatedAt) {
    element.dataset.groundCountUpdatedAt = String(badge.updatedAt);
  } else {
    delete element.dataset.groundCountUpdatedAt;
  }
}

function syncAirportParkingBadgeElement(container, airport) {
  if (!container) {
    return;
  }
  const hit = container.querySelector(".airport-marker-hit");
  if (!hit) {
    return;
  }
  const symbol = hit.querySelector(".airport-pin-symbol") || hit;
  const badge = airportParkingBadgeModel(airport);
  const existing = symbol.querySelector(".airport-parking-badge");
  if (!badge) {
    existing?.remove();
    return;
  }
  const element = existing || document.createElement("span");
  element.className = "airport-parking-badge";
  element.dataset.countTier = badge.tier;
  element.setAttribute("aria-label", `当前停场公务机 ${badge.count} 架`);
  let value = element.querySelector(".airport-parking-badge-value");
  if (!value) {
    value = document.createElement("span");
    value.className = "airport-parking-badge-value";
    element.textContent = "";
    element.append(value);
  }
  value.textContent = badge.text;
  if (!existing) {
    symbol.append(element);
  }
}

function airportGroundCountCacheKey(airport) {
  return normalizedLookupKey(airport?.icaoCode || airport?.airportCode || airport?.iata || airport?.id);
}

function cacheAirportGroundCount(airport) {
  if (!state?.airportGroundCountCache || !airport) {
    return;
  }
  const badge = airportParkingBadgeModel(airport);
  const key = airportGroundCountCacheKey(airport);
  if (!key || !badge) {
    return;
  }
  state.airportGroundCountCache.set(key, {
    value: badge.count,
    source: badge.source || "airport-model",
    updatedAt: badge.updatedAt || Date.now()
  });
}

function applyCachedAirportGroundCount(airport) {
  if (!state?.airportGroundCountCache || !airport || airport.groundCountAvailable === true) {
    return;
  }
  const key = airportGroundCountCacheKey(airport);
  const cached = key ? state.airportGroundCountCache.get(key) : null;
  const value = normalizeAirportGroundCount(cached?.value);
  if (value === null) {
    return;
  }
  airport.groundCount = value;
  airport.groundCountAvailable = true;
  airport.groundCountSource = cached.source || "airport-ground-count-cache";
  airport.groundCountUpdatedAt = cached.updatedAt || null;
}

function syncAirportParkingBadgeForAirport(airport) {
  if (!airport) {
    return;
  }
  const active = airportHoverId(airport.id);
  document.querySelectorAll(".airport-pin").forEach((element) => {
    if (airportHoverId(element.dataset.id) === active) {
      syncAirportParkingBadgeDataset(element, airport);
      syncAirportParkingBadgeElement(element, airport);
    }
  });
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex) {
  const value = String(hex || "").replace("#", "");
  if (value.length !== 6) {
    return { r: 154, g: 160, b: 166 };
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function interpolateColor(startColor, endColor, ratio) {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);
  const amount = clampRatio(ratio);
  return rgbToHex({
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount
  });
}

function colorFromStops(value, stops) {
  if (value === null || value === undefined || value === "") {
    return routeStyle.missingColor;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return routeStyle.missingColor;
  }
  if (numeric <= stops[0].value) {
    return stops[0].color;
  }
  const last = stops[stops.length - 1];
  if (numeric >= last.value) {
    return last.color;
  }
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];
    if (numeric >= start.value && numeric <= end.value) {
      return interpolateColor(start.color, end.color, (numeric - start.value) / (end.value - start.value));
    }
  }
  return last.color;
}

function altitudeTrailColor(altitudeFt) {
  return colorFromStops(altitudeFt, routeStyle.altitudeStops);
}

function speedTrailColor(speedKt) {
  return colorFromStops(speedKt, routeStyle.speedStops);
}

const localBasemapShapes = [
  {
    name: "North America",
    points: [[72, -168], [70, -141], [59, -128], [50, -126], [33, -117], [22, -98], [25, -82], [45, -61], [58, -53], [71, -72], [75, -108], [72, -168]]
  },
  {
    name: "South America",
    points: [[12, -81], [8, -64], [4, -45], [-16, -36], [-35, -52], [-56, -71], [-42, -74], [-13, -77], [12, -81]]
  },
  {
    name: "Europe",
    points: [[36, -10], [44, -6], [52, 4], [60, 10], [70, 25], [63, 42], [50, 39], [42, 28], [35, 18], [36, -10]]
  },
  {
    name: "Africa",
    points: [[36, -17], [32, 9], [30, 31], [12, 51], [-8, 43], [-35, 20], [-31, 5], [-18, -8], [8, -16], [36, -17]]
  },
  {
    name: "Asia",
    points: [[35, 32], [50, 48], [62, 70], [72, 105], [62, 166], [42, 145], [20, 120], [7, 96], [18, 70], [28, 48], [35, 32]]
  },
  {
    name: "Australia",
    points: [[-11, 113], [-17, 144], [-28, 154], [-43, 145], [-37, 116], [-21, 112], [-11, 113]]
  },
  {
    name: "Greenland",
    points: [[60, -52], [68, -48], [77, -34], [83, -42], [79, -65], [68, -74], [60, -52]]
  },
  {
    name: "Japan",
    points: [[45, 141], [39, 143], [34, 139], [31, 131], [34, 129], [40, 136], [45, 141]]
  },
  {
    name: "New Zealand",
    points: [[-34, 173], [-41, 176], [-47, 169], [-43, 166], [-34, 173]]
  }
];

const localBasemapLabels = [
  { name: "United States", lat: 39, lng: -97 },
  { name: "Canada", lat: 56, lng: -106 },
  { name: "Brazil", lat: -10, lng: -54 },
  { name: "United Kingdom", lat: 54, lng: -2 },
  { name: "France", lat: 46, lng: 2 },
  { name: "Turkey", lat: 39, lng: 35 },
  { name: "United Arab Emirates", lat: 24, lng: 54 },
  { name: "India", lat: 22, lng: 78 },
  { name: "China", lat: 35, lng: 104 },
  { name: "Japan", lat: 37, lng: 138 },
  { name: "Australia", lat: -25, lng: 134 },
  { name: "South Africa", lat: -29, lng: 24 }
];

const airports = [
  { id: "KTEB", iata: "TEB", name: "Teterboro", city: "New York", country: "United States", lat: 40.8501, lng: -74.0608, elevation: 9, runways: "01/19, 06/24", departures: 34, arrivals: 31, ground: 42, delay: "Low", weather: "VFR" },
  { id: "KVNY", iata: "VNY", name: "Van Nuys", city: "Los Angeles", country: "United States", lat: 34.2098, lng: -118.489, elevation: 802, runways: "16R/34L, 16L/34R", departures: 22, arrivals: 27, ground: 31, delay: "Low", weather: "VFR" },
  { id: "EGGW", iata: "LTN", name: "London Luton", city: "London", country: "United Kingdom", lat: 51.8747, lng: -0.3683, elevation: 526, runways: "07/25", departures: 25, arrivals: 21, ground: 24, delay: "Moderate", weather: "MVFR" },
  { id: "LFPB", iata: "LBG", name: "Paris Le Bourget", city: "Paris", country: "France", lat: 48.9694, lng: 2.4414, elevation: 218, runways: "03/21, 07/25, 09/27", departures: 18, arrivals: 23, ground: 28, delay: "Low", weather: "VFR" },
  { id: "LSGG", iata: "GVA", name: "Geneva", city: "Geneva", country: "Switzerland", lat: 46.2381, lng: 6.109, elevation: 1411, runways: "04/22", departures: 14, arrivals: 16, ground: 22, delay: "Low", weather: "VFR" },
  { id: "OMDB", iata: "DXB", name: "Dubai Intl", city: "Dubai", country: "United Arab Emirates", lat: 25.2532, lng: 55.3657, elevation: 62, runways: "12L/30R, 12R/30L", departures: 29, arrivals: 25, ground: 19, delay: "Moderate", weather: "VFR" },
  { id: "VHHH", iata: "HKG", name: "Hong Kong Intl", city: "Hong Kong", country: "Hong Kong", lat: 22.308, lng: 113.9185, elevation: 28, runways: "07L/25R, 07R/25L", departures: 19, arrivals: 18, ground: 16, delay: "Low", weather: "VFR" },
  { id: "WSSS", iata: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", lat: 1.3644, lng: 103.9915, elevation: 22, runways: "02L/20R, 02C/20C, 02R/20L", departures: 15, arrivals: 17, ground: 15, delay: "Low", weather: "VFR" },
  { id: "RJTT", iata: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", lat: 35.5494, lng: 139.7798, elevation: 35, runways: "04/22, 05/23, 16L/34R, 16R/34L", departures: 11, arrivals: 12, ground: 10, delay: "Low", weather: "VFR" },
  { id: "SBGR", iata: "GRU", name: "Sao Paulo Guarulhos", city: "Sao Paulo", country: "Brazil", lat: -23.4356, lng: -46.4731, elevation: 2459, runways: "10L/28R, 10R/28L", departures: 13, arrivals: 15, ground: 13, delay: "Moderate", weather: "VFR" },
  { id: "YSSY", iata: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", lat: -33.9399, lng: 151.1753, elevation: 21, runways: "07/25, 16L/34R, 16R/34L", departures: 10, arrivals: 8, ground: 9, delay: "Low", weather: "VFR" },
  { id: "FACT", iata: "CPT", name: "Cape Town", city: "Cape Town", country: "South Africa", lat: -33.9715, lng: 18.6021, elevation: 151, runways: "01/19, 16/34", departures: 7, arrivals: 9, ground: 6, delay: "Low", weather: "VFR" }
];

airports.push(
  { id: "EGLL", iata: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", lat: 51.47, lng: -0.4543, elevation: 83, runways: "09L/27R, 09R/27L", departures: 42, arrivals: 44, ground: 38, delay: "Moderate", weather: "MVFR", markerSize: "major" },
  { id: "EGLF", iata: "FAB", name: "Farnborough", city: "Farnborough", country: "United Kingdom", lat: 51.2758, lng: -0.7763, elevation: 238, runways: "06/24", departures: 18, arrivals: 17, ground: 23, delay: "Low", weather: "VFR", markerSize: "major" },
  { id: "EGKB", iata: "BQH", name: "London Biggin Hill", city: "London", country: "United Kingdom", lat: 51.3308, lng: 0.0325, elevation: 598, runways: "03/21", departures: 15, arrivals: 14, ground: 18, delay: "Low", weather: "VFR" },
  { id: "EGLC", iata: "LCY", name: "London City", city: "London", country: "United Kingdom", lat: 51.5053, lng: 0.0553, elevation: 19, runways: "09/27", departures: 16, arrivals: 15, ground: 12, delay: "Moderate", weather: "MVFR" },
  { id: "EGSS", iata: "STN", name: "London Stansted", city: "London", country: "United Kingdom", lat: 51.885, lng: 0.235, elevation: 348, runways: "04/22", departures: 18, arrivals: 18, ground: 16, delay: "Low", weather: "VFR" },
  { id: "EGWU", iata: "NHT", name: "Northolt", city: "London", country: "United Kingdom", lat: 51.553, lng: -0.4182, elevation: 124, runways: "07/25", departures: 8, arrivals: 7, ground: 9, delay: "Low", weather: "VFR" },
  { id: "EGTK", iata: "OXF", name: "Oxford Kidlington", city: "Oxford", country: "United Kingdom", lat: 51.8369, lng: -1.32, elevation: 270, runways: "01/19", departures: 7, arrivals: 8, ground: 8, delay: "Low", weather: "VFR" },
  { id: "EGSC", iata: "CBG", name: "Cambridge City", city: "Cambridge", country: "United Kingdom", lat: 52.205, lng: 0.175, elevation: 47, runways: "05/23", departures: 6, arrivals: 6, ground: 7, delay: "Low", weather: "VFR" },
  { id: "EGHH", iata: "BOH", name: "Bournemouth", city: "Bournemouth", country: "United Kingdom", lat: 50.78, lng: -1.8425, elevation: 38, runways: "08/26", departures: 7, arrivals: 7, ground: 6, delay: "Low", weather: "VFR" },
  { id: "EGHI", iata: "SOU", name: "Southampton", city: "Southampton", country: "United Kingdom", lat: 50.9503, lng: -1.3568, elevation: 44, runways: "02/20", departures: 7, arrivals: 8, ground: 7, delay: "Low", weather: "VFR" },
  { id: "EGKA", iata: "ESH", name: "Shoreham", city: "Brighton", country: "United Kingdom", lat: 50.8356, lng: -0.2972, elevation: 7, runways: "02/20, 06/24, 13/31", departures: 3, arrivals: 4, ground: 3, delay: "Low", weather: "VFR", markerSize: "small" },
  { id: "EGMD", iata: "LYX", name: "Lydd", city: "Kent", country: "United Kingdom", lat: 50.9561, lng: 0.9392, elevation: 13, runways: "03/21", departures: 3, arrivals: 3, ground: 3, delay: "Low", weather: "VFR", markerSize: "small" },
  { id: "LFPG", iata: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lng: 2.5479, elevation: 392, runways: "08L/26R, 08R/26L, 09L/27R, 09R/27L", departures: 38, arrivals: 39, ground: 30, delay: "Moderate", weather: "MVFR", markerSize: "major" },
  { id: "LFPO", iata: "ORY", name: "Paris Orly", city: "Paris", country: "France", lat: 48.7233, lng: 2.3794, elevation: 291, runways: "02/20, 06/24, 07/25", departures: 26, arrivals: 24, ground: 22, delay: "Low", weather: "VFR" },
  { id: "EBBR", iata: "BRU", name: "Brussels", city: "Brussels", country: "Belgium", lat: 50.9014, lng: 4.4844, elevation: 184, runways: "01/19, 07L/25R, 07R/25L", departures: 22, arrivals: 23, ground: 18, delay: "Low", weather: "VFR" },
  { id: "EHAM", iata: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3086, lng: 4.7639, elevation: -11, runways: "04/22, 06/24, 09/27, 18L/36R", departures: 35, arrivals: 36, ground: 28, delay: "Moderate", weather: "MVFR", markerSize: "major" },
  { id: "EDDL", iata: "DUS", name: "Dusseldorf", city: "Dusseldorf", country: "Germany", lat: 51.2895, lng: 6.7668, elevation: 147, runways: "05L/23R, 05R/23L", departures: 18, arrivals: 17, ground: 16, delay: "Low", weather: "VFR" },
  { id: "EDDF", iata: "FRA", name: "Frankfurt Main", city: "Frankfurt", country: "Germany", lat: 50.0379, lng: 8.5622, elevation: 364, runways: "07C/25C, 07L/25R, 07R/25L, 18", departures: 39, arrivals: 40, ground: 32, delay: "Moderate", weather: "MVFR", markerSize: "major" }
);

airports.forEach(normalizeAirportRecord);

const businessJets = [];

function normalizedLookupKey(value) {
  return String(value || "").trim().toUpperCase();
}

function addLookupEntry(index, value, item) {
  const key = normalizedLookupKey(value);
  if (key && !index.has(key)) {
    index.set(key, item);
  }
}

function rebuildAirportIndexes() {
  airportsById.clear();
  airportsByCode.clear();
  airports.forEach((airport) => {
    addLookupEntry(airportsById, airport.id, airport);
    [
      airport.id,
      airport.iata,
      airport.icao,
      airport.icaoCode,
      airport.airportCode
    ].forEach((code) => addLookupEntry(airportsByCode, code, airport));
  });
}

function rebuildAircraftIndexes() {
  aircraftById.clear();
  aircraftByUniqueKey.clear();
  aircraftByEncryptedTail.clear();
  aircraftByRegistration.clear();
  businessJets.forEach((jet) => {
    addLookupEntry(aircraftById, jet.id, jet);
    addLookupEntry(aircraftByUniqueKey, jet.uniqueKey, jet);
    addLookupEntry(aircraftByEncryptedTail, jet.tailNoEncrypted, jet);
    addLookupEntry(aircraftByRegistration, jet.registration, jet);
    addLookupEntry(aircraftByRegistration, jet.tailNoClear, jet);
    addLookupEntry(aircraftByRegistration, jet.callsign, jet);
  });
}

const fallbackAircraftTypeCatalog = {
  "Gulfstream G650ER": { manufacturer: "Gulfstream", aircraftTypeCode: "GLF6", sizeClass: "ultra-long", fr24IconKey: "lj45" },
  "Bombardier Global 7500": { manufacturer: "Bombardier", aircraftTypeCode: "GL7T", sizeClass: "ultra-long", fr24IconKey: "GL7T" },
  "Bombardier Global 8000": { manufacturer: "Bombardier", aircraftTypeCode: "GL8T", sizeClass: "ultra-long", fr24IconKey: "GL8T" },
  "Gulfstream G700": { manufacturer: "Gulfstream", aircraftTypeCode: "GA7C", sizeClass: "ultra-long", fr24IconKey: "GA7C" },
  "Dassault Falcon 8X": { manufacturer: "Dassault", aircraftTypeCode: "FA8X", sizeClass: "long-range", fr24IconKey: "lj45" },
  "Cessna Citation Longitude": { manufacturer: "Cessna", aircraftTypeCode: "C700", sizeClass: "midsize", fr24IconKey: "lj45" },
  "Gulfstream G550": { manufacturer: "Gulfstream", aircraftTypeCode: "GLF5", sizeClass: "long-range", fr24IconKey: "lj45" },
  "Bombardier Global 6000": { manufacturer: "Bombardier", aircraftTypeCode: "GLEX", sizeClass: "long-range", fr24IconKey: "lj45" },
  "Embraer Praetor 600": { manufacturer: "Embraer", aircraftTypeCode: "E550", sizeClass: "super-midsize", fr24IconKey: "lj45" },
  "Pilatus PC-24": { manufacturer: "Pilatus", aircraftTypeCode: "PC24", sizeClass: "light", fr24IconKey: "lj45" },
  "Bombardier Challenger 350": { manufacturer: "Bombardier", aircraftTypeCode: "CL35", sizeClass: "super-midsize", fr24IconKey: "lj45" },
  "Dassault Falcon 7X": { manufacturer: "Dassault", aircraftTypeCode: "FA7X", sizeClass: "long-range", fr24IconKey: "lj45" },
  "Gulfstream G500": { manufacturer: "Gulfstream", aircraftTypeCode: "GA5C", sizeClass: "long-range", fr24IconKey: "lj45" },
  "Airbus A380-800": { manufacturer: "Airbus", aircraftTypeCode: "A388", sizeClass: "ultra-long", fr24IconKey: "a388" },
  "Boeing 747-400": { manufacturer: "Boeing", aircraftTypeCode: "B744", sizeClass: "ultra-long", fr24IconKey: "b744" },
  "Boeing 777-300ER": { manufacturer: "Boeing", aircraftTypeCode: "B77W", sizeClass: "ultra-long", fr24IconKey: "b77w" },
  "Boeing 737-800": { manufacturer: "Boeing", aircraftTypeCode: "B738", sizeClass: "long-range", fr24IconKey: "b738" },
  "Airbus A320neo": { manufacturer: "Airbus", aircraftTypeCode: "A20N", sizeClass: "long-range", fr24IconKey: "a320" },
  "Embraer E190": { manufacturer: "Embraer", aircraftTypeCode: "E190", sizeClass: "midsize", fr24IconKey: "e190" },
  "ATR 72-600": { manufacturer: "ATR", aircraftTypeCode: "AT76", sizeClass: "midsize", fr24IconKey: "at76" },
  "Cessna 172": { manufacturer: "Cessna", aircraftTypeCode: "C172", sizeClass: "light", fr24IconKey: "c172" },
  "Airbus H135": { manufacturer: "Airbus Helicopters", aircraftTypeCode: "H135", sizeClass: "light", fr24IconKey: "h135" }
};
const aircraftTypeCatalog = {
  ...fallbackAircraftTypeCatalog,
  ...(aircraftIconConfig.sampleTypeCatalog || {})
};

const aircraftTypeCodeFields = [
  "icaoCode",
  "icao_code"
];

const aircraftTypeNestedFields = [
  "planeInfo",
  "aircraftInfo",
  "aircraft",
  "plane",
  "modelInfo"
];

function normalizeAircraftTypeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function aircraftTypeCodeIsGeneric(value) {
  return ["", "BIZ", "J", "BUSINESS", "BUSINESS_JET", "BUSINESS-JET"].includes(normalizeAircraftTypeCode(value));
}

function validAircraftIconKey(iconKey) {
  return Boolean(iconKey && (aircraftIconPaths[iconKey] || aircraftIconImagePaths[iconKey]));
}

function cleanExplicitAircraftTypeCode(value) {
  const code = normalizeAircraftTypeCode(value);
  return aircraftTypeCodeIsGeneric(code) ? "" : code;
}

function firstAircraftTypeCodeFromSources(...sources) {
  const queue = sources.filter(Boolean);
  const seen = new Set();
  for (let index = 0; index < queue.length; index += 1) {
    const source = queue[index];
    if (!source) {
      continue;
    }
    if (typeof source !== "object") {
      const code = cleanExplicitAircraftTypeCode(source);
      if (code) {
        return code;
      }
      continue;
    }
    if (seen.has(source)) {
      continue;
    }
    seen.add(source);
    for (const field of aircraftTypeCodeFields) {
      const code = cleanExplicitAircraftTypeCode(source[field]);
      if (code) {
        return code;
      }
    }
    for (const field of aircraftTypeNestedFields) {
      if (source[field]) {
        queue.push(source[field]);
      }
    }
  }
  return "";
}

function firstAircraftTypeCodeCandidateFromSources(...sources) {
  for (const source of sources.filter(Boolean)) {
    const code = firstAircraftTypeCodeFromSources(source.value);
    if (code) {
      return { code, source: source.label };
    }
  }
  return { code: "", source: "" };
}

function explicitAircraftTypeCodeCandidate(jet) {
  return firstAircraftTypeCodeCandidateFromSources(
    { label: "513011.planeInfo.icaoCode", value: jet.planeDetail?.planeInfo },
    { label: "513011.raw.planeInfo.icaoCode", value: jet.planeDetail?.raw?.planeInfo },
    { label: "513011.raw.icaoCode", value: jet.planeDetail?.raw },
    { label: "513009.planeInfo.icaoCode", value: jet.flightDetail?.planeInfo },
    { label: "513009.raw.planeInfo.icaoCode", value: jet.flightDetail?.raw?.planeInfo },
    { label: "513009.raw.icaoCode", value: jet.flightDetail?.raw },
    { label: "513008.icaoCode", value: jet },
    { label: "513008.raw.icaoCode", value: jet.raw }
  );
}

function explicitAircraftTypeCode(jet) {
  return explicitAircraftTypeCodeCandidate(jet).code;
}

function cachedAircraftIconTypeCodeCandidate(jet) {
  for (const key of aircraftProfileCacheKeys(jet)) {
    const entry = aircraftIconTypeCodeCache.get(key);
    const code = cleanExplicitAircraftTypeCode(entry?.icaoCode || entry?.aircraftTypeCode);
    if (code) {
      return { code, source: `local.iconTypeCodeCache.${key}` };
    }
  }
  return { code: "", source: "" };
}

function aircraftTypeMetadataForJet(jet) {
  return aircraftTypeCatalog[jet.model] || {};
}

function aircraftIcaoCodeForIcon(jet) {
  const explicitCode = explicitAircraftTypeCodeCandidate(jet).code;
  const cachedCode = explicitCode ? "" : cachedAircraftIconTypeCodeCandidate(jet).code;
  const currentCode = normalizeAircraftTypeCode(jet.aircraftTypeCode);
  return explicitCode || cachedCode || (aircraftTypeCodeIsGeneric(currentCode) ? "" : currentCode);
}

function aircraftTypeCodeForIcon(jet) {
  return aircraftIcaoCodeForIcon(jet);
}

function mappedAircraftIconKeyForJet(jet) {
  const icaoCode = aircraftIcaoCodeForIcon(jet);
  return aircraftIconKeyByIcaoCode[icaoCode] || "";
}

function resolveAircraftIcon(jet) {
  const explicitCandidate = explicitAircraftTypeCodeCandidate(jet);
  const cachedCandidate = explicitCandidate.code ? { code: "", source: "" } : cachedAircraftIconTypeCodeCandidate(jet);
  const currentCode = normalizeAircraftTypeCode(jet.aircraftTypeCode);
  const icaoCode = explicitCandidate.code || cachedCandidate.code || (aircraftTypeCodeIsGeneric(currentCode) ? "" : currentCode);
  const mappedIconKey = icaoCode ? aircraftIconKeyByIcaoCode[icaoCode] : "";
  const iconKey = validAircraftIconKey(mappedIconKey) ? mappedIconKey : defaultBusinessJetIconKey;
  const fallbackReason = !icaoCode
    ? "missing-icao-code"
    : !mappedIconKey
      ? "unmapped-icao-code"
      : validAircraftIconKey(mappedIconKey)
        ? ""
        : "invalid-icon-key";
  return {
    icaoCode,
    aircraftTypeCode: icaoCode,
    icaoCodeSource: explicitCandidate.source || cachedCandidate.source || (icaoCode ? "aircraft.aircraftTypeCode" : ""),
    iconKey,
    fr24IconKey: iconKey,
    assetPath: aircraftIconImagePaths[iconKey] || aircraftIconImagePaths[defaultBusinessJetIconKey] || "",
    sizeClass: aircraftSizeClass(jet),
    fallbackReason,
    mappingVersion: aircraftIconMappingVersion
  };
}

function resolvedAircraftIconKey(jet) {
  return resolveAircraftIcon(jet).iconKey;
}

function applyAircraftTypeMetadata(jet) {
  const type = aircraftTypeMetadataForJet(jet);
  const iconResolution = resolveAircraftIcon(jet);
  const typeCode = iconResolution.icaoCode;
  jet.manufacturer = type.manufacturer || jet.family || "Unknown";
  jet.icaoCode = typeCode || jet.icaoCode || "";
  jet.aircraftTypeCode = typeCode;
  jet.fr24IconKey = iconResolution.iconKey;
  jet.iconResolution = iconResolution;
  jet.sizeClass = aircraftSizeClasses.includes(type.sizeClass) ? type.sizeClass : aircraftSizeClass(jet);
  jet.category = jet.sizeClass;
  if (!Array.isArray(jet.route) || jet.route.length === 0) {
    jet.route = Array.isArray(jet.livePosition) ? [jet.livePosition] : [defaultCenter];
  }
  return jet;
}

const initialLoadedAtEpochMs = Date.now();
if (liveDataOnly) {
  airports.splice(0, airports.length);
  businessJets.splice(0, businessJets.length);
}
businessJets.forEach((jet, index) => {
  jet.isLocalSample = true;
  jet.dataCategory = jet.dataCategory || "business_jet";
  jet.updatedAtEpochMs = initialLoadedAtEpochMs;
  jet.viewportSeenAtEpochMs = initialLoadedAtEpochMs;
  jet.viewportTtlMs = mapLoadingConfig.aircraftRefresh.interpolationMs;
  jet.quality = jet.quality || "good";
  jet.displayPriority = Number.isFinite(Number(jet.displayPriority))
    ? Number(jet.displayPriority)
    : Math.max(0, 100 - index);
  applyAircraftTypeMetadata(jet);
});
rebuildAirportIndexes();
rebuildAircraftIndexes();

const dataService = window.BIZJET_DATA_SERVICE?.create(appConfig, {
  aircraftIconKeyByTypeCode,
  defaultBusinessJetIconKey
});

const state = {
  labels: true,
  trails: true,
  groundProjections: false,
  airports: true,
  airportLayerMode: appConfig.airportLayerMode || "auto",
  weather: false,
  initialMapCenter: defaultCenter,
  userLocationCenter: null,
  selectedKind: null,
  selectedId: null,
  aircraftSegment: "overview",
  aircraftSegmentById: new Map(),
  airportSegment: "ground",
  airportTab: "all",
  airportDynamicFilter: "all",
  airportGroundFilter: "all",
  airportGroundSearch: "",
  airportGroundSort: "duration-asc",
  airportGroundView: "list",
  airportOpsRange: "today",
  lastTargetSelectAt: 0,
  followSelectedAircraft: false,
  hideOtherAircraft: false,
  mapProvider: "loading",
  mapFallbackInProgress: false,
  mapFallbackReason: "",
  map: null,
  tracks: new Map(),
  weatherLayer: null,
  tick: 0,
  realtimeLoading: false,
  realtimeLoadedAt: null,
  dataStatus: liveDataOnly ? "loading" : "local",
  dataError: null,
  airportLoading: false,
  airportLoadedAt: null,
  airportDataStatus: liveDataOnly ? "loading" : "local",
  airportDataError: null,
  apiDebug: {
    authorized: false,
    open: false,
    activeTab: "selection",
    requests: [],
    selectedRequestId: "",
    lastEventAt: null,
    lastSelectionSnapshot: null
  },
  hoveredAirportId: null,
  airportHoverClearTimer: null,
  airportHoverPointer: null,
  detailLoads: new Set(),
  aircraftProfileDetails: new Map(),
  aircraftPanelRecords: new Map(),
  aircraftHistoryDetails: new Map(),
  airportDynamicDetails: new Map(),
  airportGroundDetails: new Map(),
  airportGroundCountCache: new Map(),
  airportMovementDiscovery: new Map(),
  airportMovementHistory: new Map(),
  iconTypeCodeProfiles: {
    queue: [],
    queuedKeys: new Set(),
    loadingKeys: new Set(),
    loadedKeys: new Set(),
    failedAt: new Map(),
    maxConcurrent: 3,
    maxQueue: 160,
    maxPerRender: 36,
    retryAfterMs: 30000
  },
  routeColorMode: "altitude",
  speedAltitudeUnit: "imperial",
  historyTimeline: {
    rangeDays: historyTimelineConfig.defaultRangeDays,
    status: "all",
    airportQuery: "",
    anchorMonth: "",
    expandedKey: "",
    highlightMonth: "",
    summaryCollapsed: false,
    overviewExpanded: false,
    scrollResetToken: 0,
    scrollResetTopLocked: false,
    scrollResetHardUntil: 0,
    scrollRestoreSeq: 0,
    pendingScrollRestoreSeq: 0,
    applyingScrollRestore: false,
    programmaticScrollSeq: 0,
    lastUserScrollAt: 0,
    recentFlightsHtml: "",
    pendingRecentFlightsHtml: null,
    pendingRecentFlightsOptions: null,
    pendingRecentFlightsTimer: 0,
    visibleCount: historyTimelineConfig.mountLimit
  },
  renderedAircraft: [],
  renderedAirports: [],
  groundProjectionSyncTimer: null,
  lastRenderCostMs: 0,
  routeFocusAircraftId: null,
  routeFocusPreviousView: null,
  selectedRouteEndpointMap: new Map(),
  recentlySelectedAircraftIds: [],
  recentlySelectedAircraftAt: new Map(),
  selectedTrackStore: null,
  aircraftViewportVersion: "",
  aircraftTotalMatched: liveDataOnly ? 0 : businessJets.length,
  aircraftTruncated: false,
  aircraftViewportLoaded: 0,
  refreshTimer: null,
  airportRefreshTimer: null,
  refreshBackoffMs: 0,
  viewportRequestSeq: 0,
  pendingViewportReason: "",
  isInteractingWithMap: false,
  layoutProfile: "desktop",
  mapInteractionPhase: "idle",
  tabletInteractionRenderScheduled: false,
  lastTabletInteractionRenderAt: 0,
  liveAircraftActivated: liveDataOnly,
  search: {
    query: "",
    mode: "results",
    activeIndex: -1,
    expandedKey: "",
    itemMap: new Map(),
    showAllGroups: new Set(),
    routeFrom: "",
    routeTo: "",
    operatorQuery: "",
    countryQuery: "",
    selectedCountry: ""
  }
};

const layoutProfileClassNames = [
  "layout-desktop",
  "layout-desktop-compact",
  "layout-tablet-landscape",
  "layout-tablet-portrait",
  "layout-mobile"
];

function mediaQueryMatches(query) {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(query).matches;
}

function viewportSize() {
  const root = document.documentElement;
  return {
    width: Math.max(root?.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(root?.clientHeight || 0, window.innerHeight || 0)
  };
}

function resolveLayoutProfile() {
  const { width, height } = viewportSize();
  const coarsePointer = mediaQueryMatches("(pointer: coarse)") || mediaQueryMatches("(hover: none)");
  const portrait = height >= width || mediaQueryMatches("(orientation: portrait)");
  if (width <= 767) {
    return "mobile";
  }
  if (coarsePointer && portrait && width >= 768 && width <= 1024) {
    return "tablet-portrait";
  }
  if (coarsePointer && !portrait && width >= 900 && width <= 1366) {
    return "tablet-landscape";
  }
  if (!coarsePointer && width >= 981 && width <= 1199) {
    return "desktop-compact";
  }
  return "desktop";
}

function tabletLayoutProfile(profile = state.layoutProfile) {
  return profile === "tablet-landscape" || profile === "tablet-portrait";
}

function touchFirstLayoutProfile(profile = state.layoutProfile) {
  return tabletLayoutProfile(profile) || profile === "mobile";
}

function airportHoverInteractionsEnabled() {
  return !touchFirstLayoutProfile();
}

function detailPanelIsOpen() {
  return Boolean(state.selectedKind && state.selectedId);
}

function journeyHistoryPanelIsOpen() {
  if (state.selectedKind !== "aircraft" || !state.selectedId || state.aircraftSegment !== "journey") {
    return false;
  }
  const panel = document.getElementById("leftDetailPanel");
  const aircraftView = document.getElementById("aircraftDetailView");
  return Boolean(panel && !panel.hidden && aircraftView && !aircraftView.hidden);
}

function pausePageDataRefreshForJourneyHistory() {
  window.clearTimeout(state.refreshTimer);
  window.clearTimeout(state.airportRefreshTimer);
  state.refreshTimer = null;
  state.airportRefreshTimer = null;
  state.pendingViewportReason = "";
}

function selectedTargetViewportAnchor() {
  if (state.layoutProfile === "tablet-portrait") {
    return { x: 0.5, y: 0.34 };
  }
  if (state.layoutProfile === "tablet-landscape") {
    return { x: 0.64, y: 0.5 };
  }
  return { x: 0.62, y: 0.5 };
}

function syncLayoutProfileClass(profile = state.layoutProfile) {
  const shell = document.querySelector(".fr-shell");
  const targets = [document.body, shell].filter(Boolean);
  targets.forEach((element) => {
    element.classList.remove(...layoutProfileClassNames);
    element.classList.add(`layout-${profile}`);
    element.dataset.layoutProfile = profile;
  });
  if (shell) {
    shell.style.setProperty("--tablet-panel-width", `${responsivePerformanceConfig.tabletLandscapePanelWidthPx}px`);
    shell.style.setProperty("--tablet-panel-max-vw", `${responsivePerformanceConfig.tabletLandscapePanelMaxVw}vw`);
    shell.style.setProperty("--tablet-drawer-mid-height", `${responsivePerformanceConfig.tabletPortraitDrawerMidDvh}dvh`);
    shell.classList.toggle("detail-open", detailPanelIsOpen());
    shell.classList.toggle("map-interaction-active", state.mapInteractionPhase === "active");
  }
}

function clearTouchHoverState() {
  if (airportHoverInteractionsEnabled()) {
    return;
  }
  clearAirportHoverCloseTimer();
  state.hoveredAirportId = null;
  syncAirportHoverMarkers("");
}

function updateLayoutProfile() {
  const nextProfile = resolveLayoutProfile();
  const previousProfile = state.layoutProfile;
  state.layoutProfile = nextProfile;
  syncLayoutProfileClass(nextProfile);
  if (previousProfile !== nextProfile) {
    clearTouchHoverState();
  }
  return nextProfile;
}

function setMapInteractionPhase(phase) {
  const nextPhase = phase === "active" ? "active" : "idle";
  state.mapInteractionPhase = nextPhase;
  const shell = document.querySelector(".fr-shell");
  if (shell) {
    shell.dataset.mapInteractionPhase = nextPhase;
    shell.classList.toggle("map-interaction-active", nextPhase === "active");
  }
  if (nextPhase === "active") {
    clearTouchHoverState();
  }
}

function tabletInteractionFrameIntervalMs() {
  const fps = Math.max(1, Number(responsivePerformanceConfig.tabletInteractionRenderFps) || 8);
  return 1000 / fps;
}

function renderViewportLightDuringInteraction() {
  updateAircraftViewportStatsFromCache();
  renderAircraft();
  syncSelectedRouteVisuals();
  updateRouteLegend();
}

function scheduleTabletInteractionRender() {
  if (state.tabletInteractionRenderScheduled) {
    return;
  }
  const now = performance.now();
  const delayMs = Math.max(0, tabletInteractionFrameIntervalMs() - (now - state.lastTabletInteractionRenderAt));
  state.tabletInteractionRenderScheduled = true;
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      state.tabletInteractionRenderScheduled = false;
      if (state.mapInteractionPhase !== "active") {
        return;
      }
      state.lastTabletInteractionRenderAt = performance.now();
      renderViewportLightDuringInteraction();
    });
  }, delayMs);
}

function renderViewportForMapVisualChange() {
  if (!tabletLayoutProfile()) {
    renderViewport();
    return;
  }
  setMapInteractionPhase("active");
  scheduleTabletInteractionRender();
}

class LeafletMapEngine {
  constructor() {
    this.type = "leaflet";
    this.routeEndpointMarkers = new Map();
    this.map = L.map("map", {
      zoomControl: true,
      attributionControl: false,
      minZoom: mapZoomRange.min,
      maxZoom: mapZoomRange.max,
      zoomSnap: 0,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 90,
      maxBounds: [[mapVerticalBounds.south, -360], [mapVerticalBounds.north, 360]],
      maxBoundsViscosity: 1,
      worldCopyJump: true,
      preferCanvas: true
    }).setView(defaultMapCenter(), defaultZoom());
    this.addLocalBasemap();
    L.control.scale({ position: "bottomright", metric: true, imperial: false }).addTo(this.map);
  }

  addLocalBasemap() {
    this.map.createPane("localLabels");
    this.map.getPane("localLabels").style.zIndex = 410;
    localBasemapShapes.forEach((shape) => {
      const land = L.polygon(shape.points, {
        interactive: false,
        className: "fallback-land",
        color: "rgba(63, 82, 72, 0.48)",
        weight: 1,
        fillColor: "#e7e0d5",
        fillOpacity: 0.92
      }).addTo(this.map);
      land.bringToBack();
    });
    localBasemapLabels.forEach((label) => {
      L.marker([label.lat, label.lng], {
        pane: "localLabels",
        interactive: false,
        icon: L.divIcon({
          className: "fallback-label",
          html: label.name,
          iconSize: [140, 18],
          iconAnchor: [70, 9]
        })
      }).addTo(this.map);
    });
  }

  ready() {
    return Promise.resolve();
  }

  project(latLng) {
    return this.map.latLngToContainerPoint(latLng);
  }

  contains(latLng) {
    return this.map.getBounds().contains(latLng);
  }

  getBounds() {
    const bounds = this.map.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      west: bounds.getWest(),
      east: bounds.getEast()
    };
  }

  setView(latLng, zoom = this.map.getZoom()) {
    this.map.setView([clampLatitude(latLng[0]), latLng[1]], clampZoom(zoom), { animate: true });
  }

  panTo(latLng) {
    this.map.panTo([clampLatitude(latLng[0]), latLng[1]], { animate: true });
  }

  getZoom() {
    return this.map.getZoom();
  }

  getView() {
    const center = this.map.getCenter();
    return {
      center: [center.lat, center.lng],
      zoom: this.map.getZoom()
    };
  }

  fitRouteBounds(points, padding = effectiveRouteFocusPadding()) {
    const validPoints = points.filter((point) => Array.isArray(point) && point.length === 2);
    if (!validPoints.length) {
      return;
    }
    this.map.fitBounds(validPoints, {
      animate: true,
      paddingTopLeft: [padding.left, padding.top],
      paddingBottomRight: [padding.right, padding.bottom],
      maxZoom: mapLoadingConfig.routeFocusMaxZoom
    });
    window.setTimeout(() => {
      const zoom = this.map.getZoom();
      if (zoom < mapLoadingConfig.routeFocusMinZoom) {
        this.map.setZoom(mapLoadingConfig.routeFocusMinZoom);
      }
    }, 240);
  }

  onViewportChange(callback) {
    if (typeof callback === "function") {
      this.map.on("move zoom resize", callback);
      return;
    }
    this.map.on("dragstart zoomstart", callback.onInteractionStart);
    this.map.on("move zoom resize", callback.onVisualChange);
    this.map.on("moveend zoomend resize", callback.onIdle);
  }

  onMapClick(callback) {
    if (typeof callback === "function") {
      this.map.on("click", callback);
    }
  }

  panTargetToDetailViewport(latLng) {
    const target = [clampLatitude(latLng[0]), latLng[1]];
    if (window.matchMedia("(max-width: 767px)").matches) {
      this.panTo(target);
      return;
    }
    const anchor = selectedTargetViewportAnchor();
    const size = this.map.getSize();
    const targetPoint = this.map.latLngToContainerPoint(target);
    const desiredPoint = L.point(size.x * anchor.x, size.y * anchor.y);
    const centerPoint = L.point(size.x * 0.5, size.y * 0.5);
    const newCenterPoint = L.point(
      targetPoint.x - (desiredPoint.x - centerPoint.x),
      targetPoint.y - (desiredPoint.y - centerPoint.y)
    );
    const center = this.map.containerPointToLatLng(newCenterPoint);
    this.panTo([center.lat, center.lng]);
  }

  setRouteEndpoints(endpoints) {
    const activeIds = new Set();
    endpoints.forEach((endpoint) => {
      activeIds.add(endpoint.id);
      if (!this.routeEndpointMarkers.has(endpoint.id)) {
        const marker = L.marker([endpoint.lat, endpoint.lng], {
          interactive: false,
          zIndexOffset: 760,
          icon: L.divIcon({
            className: "",
            html: routeEndpointHtml(endpoint),
            iconSize: [36, 44],
            iconAnchor: [18, 44]
          })
        }).addTo(this.map);
        this.routeEndpointMarkers.set(endpoint.id, marker);
      }
      const marker = this.routeEndpointMarkers.get(endpoint.id);
      marker.setLatLng([endpoint.lat, endpoint.lng]);
      marker.setIcon(L.divIcon({
        className: "",
        html: routeEndpointHtml(endpoint),
        iconSize: [36, 44],
        iconAnchor: [18, 44]
      }));
    });
    this.routeEndpointMarkers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        this.map.removeLayer(marker);
        this.routeEndpointMarkers.delete(id);
      }
    });
  }

  clearRouteEndpoints() {
    this.routeEndpointMarkers.forEach((marker) => this.map.removeLayer(marker));
    this.routeEndpointMarkers.clear();
  }

  clearTrackRecord(record) {
    if (!record) {
      return;
    }
    const layers = record.cores instanceof Map
      ? [...record.cores.values(), ...(record.halos || []), ...(record.hits?.values?.() || []), record.planned, record.plannedHit]
      : Array.isArray(record.layers)
        ? record.layers
        : [record];
    layers.forEach((layer) => {
      if (layer && this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
      }
    });
  }

  setTrack(id, points, selected, options = {}) {
    const plannedPath = selected ? options.plannedPath : null;
    const hasTrackPoints = Array.isArray(points) && points.length >= 2;
    if (!state.trails || (!hasTrackPoints && !plannedPath)) {
      this.clearTrackRecord(state.tracks.get(id));
      state.tracks.delete(id);
      return;
    }

    const zoom = this.getZoom();
    if (!selected && zoom < mapLoadingConfig.regularTrackMinZoom) {
      this.clearTrackRecord(state.tracks.get(id));
      state.tracks.delete(id);
      return;
    }

    const focused = routeFocusIsActiveFor(id);
    const trackStyle = trackStyleForZoom({
      zoom,
      selected,
      routeFocused: focused,
      stale: options.stale === true
    });
    const segments = hasTrackPoints ? trackSegments(points, selected) : [];
    const record = state.tracks.get(id) || { cores: new Map(), halos: [], hits: new Map(), planned: null, plannedHit: null };
    if (!(record.cores instanceof Map)) {
      this.clearTrackRecord(record);
      record.cores = new Map();
      record.halos = [];
      record.hits = new Map();
      record.planned = null;
      record.plannedHit = null;
    }
    if (plannedPath) {
      const plannedStyle = {
        color: routeStyle.plannedColor,
        weight: trackStyle.estimatedWidth,
        opacity: routeStyle.plannedOpacity,
        dashArray: routeStyle.plannedDash,
        lineCap: "round",
        lineJoin: "round"
      };
      if (!record.planned) {
        record.planned = L.polyline(plannedPath, {
          interactive: false,
          ...plannedStyle
        }).addTo(this.map);
      } else {
        record.planned.setLatLngs(plannedPath);
        record.planned.setStyle(plannedStyle);
      }
      if (record.plannedHit) {
        this.map.removeLayer(record.plannedHit);
        record.plannedHit = null;
      }
    } else if (record.planned || record.plannedHit) {
      if (record.planned) {
        this.map.removeLayer(record.planned);
      }
      record.planned = null;
      if (record.plannedHit) {
        this.map.removeLayer(record.plannedHit);
        record.plannedHit = null;
      }
    }
    const haloPaths = routeStyle.haloEnabled && selected ? actualTrackPaths(segments) : [];
    haloPaths.forEach((path, index) => {
      let halo = record.halos[index];
      if (!halo) {
        halo = L.polyline(path, {
          interactive: false,
          color: "#101010",
          weight: trackStyle.haloWidth,
          opacity: trackStyle.haloOpacity,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(this.map);
        record.halos[index] = halo;
      } else {
        halo.setLatLngs(path);
        halo.setStyle({
          weight: trackStyle.haloWidth,
          opacity: trackStyle.haloOpacity,
          lineCap: "round",
          lineJoin: "round"
        });
      }
    });
    record.halos.slice(haloPaths.length).forEach((halo) => this.map.removeLayer(halo));
    record.halos.length = haloPaths.length;

    const activeSegmentIds = new Set();
    segments.forEach((segment) => {
      if (segment.invalid) {
        return;
      }
      activeSegmentIds.add(segment.id);
      let core = record.cores.get(segment.id);
      const style = {
        color: segment.color,
        weight: segment.estimated ? trackStyle.estimatedWidth : trackStyle.coreWidth,
        opacity: segment.estimated ? trackStyle.estimatedOpacity : trackStyle.coreOpacity,
        dashArray: segment.estimated ? routeStyle.estimatedDash : null,
        lineCap: "round",
        lineJoin: "round"
      };
      if (!core) {
        core = L.polyline(segment.path, {
          interactive: false,
          ...style
        }).addTo(this.map);
        record.cores.set(segment.id, core);
      } else {
        core.setLatLngs(segment.path);
        core.setStyle(style);
      }
    });
    if (record.hits?.size) {
      record.hits.forEach((hit) => this.map.removeLayer(hit));
      record.hits.clear();
    }
    record.cores.forEach((core, segmentId) => {
      if (!activeSegmentIds.has(segmentId)) {
        this.map.removeLayer(core);
        record.cores.delete(segmentId);
      }
    });
    record.hits?.forEach((hit, segmentId) => {
      if (!selected || !activeSegmentIds.has(segmentId)) {
        this.map.removeLayer(hit);
        record.hits.delete(segmentId);
      }
    });
    if (selected) {
      record.halos.forEach((halo) => halo.bringToFront?.());
      record.cores.forEach((core) => core.bringToFront?.());
    }
    state.tracks.set(id, record);
  }

  removeInactiveTracks(activeIds) {
    state.tracks.forEach((record, id) => {
      if (!activeIds.has(id)) {
        this.clearTrackRecord(record);
        state.tracks.delete(id);
      }
    });
  }

  setWeather(show) {
    if (state.weatherLayer) {
      this.map.removeLayer(state.weatherLayer);
      state.weatherLayer = null;
    }
    if (show) {
      state.weatherLayer = L.layerGroup([
        L.circle([48.5, 2.4], { radius: 220000, color: "transparent", fillColor: "#70da73", fillOpacity: 0.18 }),
        L.circle([25.2, 55.4], { radius: 280000, color: "transparent", fillColor: "#ffcf43", fillOpacity: 0.16 }),
        L.circle([35.2, -95.5], { radius: 420000, color: "transparent", fillColor: "#70da73", fillOpacity: 0.14 })
      ]).addTo(this.map);
    }
  }
}

function createGoogleMapContrastOverlay(map) {
  const overlay = new google.maps.OverlayView();
  overlay.onAdd = function onAdd() {
    this.element = document.createElement("div");
    this.element.className = "map-contrast-mask google-map-contrast-mask";
    this.getPanes().mapPane.appendChild(this.element);
  };
  overlay.draw = function draw() {};
  overlay.onRemove = function onRemove() {
    this.element?.remove();
    this.element = null;
  };
  overlay.setMap(map);
  return overlay;
}

function createGoogleGroundProjectionOverlay(map) {
  const overlay = new google.maps.OverlayView();
  overlay.projections = [];
  overlay.elements = new Map();
  overlay.onAdd = function onAdd() {
    this.element = document.createElement("div");
    this.element.className = "google-aircraft-ground-projection-layer";
    this.getPanes().overlayLayer.appendChild(this.element);
  };
  overlay.draw = function draw() {
    if (!this.element) {
      return;
    }
    const mapProjection = this.getProjection();
    const activeIds = new Set();
    this.projections.forEach((projection) => {
      activeIds.add(projection.id);
      let element = this.elements.get(projection.id);
      if (!element) {
        element = document.createElement("div");
        element.className = "aircraft-ground-projection google-aircraft-ground-projection";
        element.setAttribute("aria-hidden", "true");
        this.element.appendChild(element);
        this.elements.set(projection.id, element);
      }
      const graphicSignature = `${projection.iconKey}:${projection.imagePath || projection.iconPath}`;
      if (element.dataset.graphicSignature !== graphicSignature) {
        element.innerHTML = `<div class="aircraft-ground-projection-graphic">${groundProjectionGraphicHtml(projection)}</div>`;
        element.dataset.graphicSignature = graphicSignature;
      }
      element.dataset.projectionId = projection.id;
      applyGroundProjectionElementStyle(element, projection);
      const point = mapProjection.fromLatLngToDivPixel(
        new google.maps.LatLng(projection.projectionLat, projection.projectionLng)
      );
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
    });
    this.elements.forEach((element, id) => {
      if (!activeIds.has(id)) {
        element.remove();
        this.elements.delete(id);
      }
    });
  };
  overlay.setProjections = function setProjections(projections) {
    this.projections = Array.isArray(projections) ? projections : [];
    this.draw();
  };
  overlay.onRemove = function onRemove() {
    this.element?.remove();
    this.element = null;
    this.elements.clear();
  };
  overlay.setMap(map);
  return overlay;
}

class GoogleMapEngine {
  constructor() {
    this.type = "google";
    this.lines = new Map();
    this.circles = [];
    this.aircraftMarkers = new Map();
    this.airportMarkers = new Map();
    this.routeEndpointMarkers = new Map();
    this.markerLibraryPromise = google.maps.importLibrary
      ? google.maps.importLibrary("marker")
      : Promise.resolve(google.maps.marker);
    this.AdvancedMarkerElement = null;
    this.isClampingCenter = false;
    this.pendingWheelZoom = null;
    this.wheelFrame = null;
    this.authErrorObserver = null;
    this.authErrorWatchTimer = null;
    this.authErrorWatchAttempts = 0;
    const options = {
      center: { lat: defaultMapCenter()[0], lng: defaultMapCenter()[1] },
      zoom: defaultZoom(),
      minZoom: mapZoomRange.min,
      maxZoom: mapZoomRange.max,
      isFractionalZoomEnabled: true,
      restriction: {
        latLngBounds: mapWorldBounds,
        strictBounds: true
      },
      mapTypeId: "roadmap",
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
      mapId: googleMarkerMapId
    };
    this.map = new google.maps.Map(document.getElementById("map"), options);
    this.overlay = new google.maps.OverlayView();
    this.overlay.onAdd = () => {};
    this.overlay.draw = () => {};
    this.overlay.onRemove = () => {};
    this.overlay.setMap(this.map);
    this.contrastOverlay = createGoogleMapContrastOverlay(this.map);
    this.map.addListener("center_changed", () => this.clampVerticalCenter());
    this.bindSmoothWheelZoom();
    this.watchRenderedAuthErrors();
  }

  ready() {
    const idle = new Promise((resolve) => {
      google.maps.event.addListenerOnce(this.map, "idle", resolve);
    });
    return Promise.all([idle, this.markerLibraryPromise]).then(([, markerLibrary]) => {
      this.AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;
      if (!this.AdvancedMarkerElement) {
        throw new Error("Google Maps AdvancedMarkerElement is unavailable");
      }
    });
  }

  destroy() {
    this.authErrorObserver?.disconnect();
    this.authErrorObserver = null;
    if (this.authErrorWatchTimer) {
      window.clearInterval(this.authErrorWatchTimer);
      this.authErrorWatchTimer = null;
    }
    this.removeInactiveTracks(new Set());
    this.aircraftMarkers.forEach((record) => {
      record.marker.map = null;
    });
    this.aircraftMarkers.clear();
    this.airportMarkers.forEach((record) => {
      record.marker.map = null;
    });
    this.airportMarkers.clear();
    this.clearRouteEndpoints();
    this.setWeather(false);
    this.contrastOverlay?.setMap(null);
    this.overlay?.setMap(null);
    google.maps.event.clearInstanceListeners(this.map);
  }

  watchRenderedAuthErrors() {
    const mapDiv = this.map.getDiv();
    const detect = () => {
      if (googleMapRenderedErrorVisible(mapDiv)) {
        googleMapsAuthFailureReason = "Google Maps rendered an authorization error";
        scheduleGoogleMapsFallback("Google Maps rendered an authorization error");
        return true;
      }
      return false;
    };
    this.authErrorObserver = new MutationObserver(() => detect());
    this.authErrorObserver.observe(mapDiv, {
      childList: true,
      subtree: true,
      characterData: true
    });
    this.authErrorWatchTimer = window.setInterval(() => {
      this.authErrorWatchAttempts += 1;
      if (detect() || this.authErrorWatchAttempts > 30) {
        window.clearInterval(this.authErrorWatchTimer);
        this.authErrorWatchTimer = null;
      }
    }, 500);
  }

  project(latLng) {
    const projection = this.overlay.getProjection();
    if (!projection) {
      return { x: -9999, y: -9999 };
    }
    return projection.fromLatLngToContainerPixel(new google.maps.LatLng(latLng[0], latLng[1]));
  }

  contains(latLng) {
    const bounds = this.map.getBounds();
    return bounds ? bounds.contains(new google.maps.LatLng(latLng[0], latLng[1])) : true;
  }

  getBounds() {
    const bounds = this.map.getBounds();
    if (!bounds) {
      return mapWorldBounds;
    }
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();
    return {
      north: northEast.lat(),
      south: southWest.lat(),
      west: southWest.lng(),
      east: northEast.lng()
    };
  }

  setView(latLng, zoom = this.map.getZoom()) {
    const center = clampedLatLng(latLng);
    this.map.setZoom(clampZoom(zoom));
    this.map.panTo(center);
  }

  panTo(latLng) {
    this.map.panTo(clampedLatLng(latLng));
  }

  getZoom() {
    return this.map.getZoom() || 3;
  }

  getView() {
    const center = this.map.getCenter();
    return {
      center: center ? [center.lat(), center.lng()] : defaultCenter,
      zoom: this.getZoom()
    };
  }

  fitRouteBounds(points, padding = effectiveRouteFocusPadding()) {
    const validPoints = points.filter((point) => Array.isArray(point) && point.length === 2);
    if (!validPoints.length) {
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    validPoints.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    this.map.fitBounds(bounds, padding);
    google.maps.event.addListenerOnce(this.map, "idle", () => {
      const zoom = this.getZoom();
      if (zoom > mapLoadingConfig.routeFocusMaxZoom) {
        this.map.setZoom(mapLoadingConfig.routeFocusMaxZoom);
      } else if (zoom < mapLoadingConfig.routeFocusMinZoom) {
        this.map.setZoom(mapLoadingConfig.routeFocusMinZoom);
      }
    });
  }

  clampVerticalCenter() {
    if (this.isClampingCenter) {
      return;
    }
    const center = this.map.getCenter();
    if (!center) {
      return;
    }
    const lat = center.lat();
    const clamped = clampLatitude(lat);
    if (lat === clamped) {
      return;
    }
    this.isClampingCenter = true;
    this.map.setCenter({ lat: clamped, lng: center.lng() });
    this.isClampingCenter = false;
  }

  bindSmoothWheelZoom() {
    const mapDiv = this.map.getDiv();
    mapDiv.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const modeMultiplier = event.deltaMode === 1 ? 0.08 : 0.0028;
      const baseZoom = this.pendingWheelZoom ?? this.getZoom();
      this.pendingWheelZoom = clampZoom(baseZoom - event.deltaY * modeMultiplier);
      if (this.wheelFrame !== null) {
        return;
      }
      this.wheelFrame = requestAnimationFrame(() => {
        const nextZoom = this.pendingWheelZoom;
        this.pendingWheelZoom = null;
        this.wheelFrame = null;
        if (typeof this.map.moveCamera === "function") {
          this.map.moveCamera({ zoom: nextZoom });
        } else {
          this.map.setZoom(nextZoom);
        }
      });
    }, { passive: false, capture: true });
  }

  onViewportChange(callback) {
    if (typeof callback === "function") {
      this.map.addListener("idle", callback);
      this.map.addListener("zoom_changed", callback);
      return;
    }
    this.map.addListener("dragstart", callback.onInteractionStart);
    this.map.addListener("zoom_changed", callback.onVisualChange);
    this.map.addListener("idle", callback.onIdle);
  }

  onMapClick(callback) {
    if (typeof callback === "function") {
      this.map.addListener("click", callback);
    }
  }

  panTargetToDetailViewport(latLng) {
    const target = clampedLatLng(latLng);
    if (window.matchMedia("(max-width: 767px)").matches) {
      this.map.panTo(target);
      return;
    }
    const projection = this.overlay.getProjection();
    const mapDiv = this.map.getDiv();
    if (!projection || !mapDiv?.clientWidth || !mapDiv?.clientHeight) {
      this.map.panTo(target);
      return;
    }
    const anchor = selectedTargetViewportAnchor();
    const targetPoint = projection.fromLatLngToContainerPixel(new google.maps.LatLng(target.lat, target.lng));
    const desiredPoint = {
      x: mapDiv.clientWidth * anchor.x,
      y: mapDiv.clientHeight * anchor.y
    };
    const centerPoint = {
      x: mapDiv.clientWidth * 0.5,
      y: mapDiv.clientHeight * 0.5
    };
    const newCenterPoint = new google.maps.Point(
      targetPoint.x - (desiredPoint.x - centerPoint.x),
      targetPoint.y - (desiredPoint.y - centerPoint.y)
    );
    const center = projection.fromContainerPixelToLatLng(newCenterPoint);
    if (center) {
      this.map.panTo(clampedLatLng([center.lat(), center.lng()]));
    } else {
      this.map.panTo(target);
    }
  }

  createAircraftMarker(jet, position, heading) {
    const content = document.createElement("div");
    const metrics = this.updateAircraftContent(content, jet, heading);
    const marker = new this.AdvancedMarkerElement({
      map: this.map,
      position: { lat: position[0], lng: position[1] },
      content,
      title: aircraftMapMarkerTitle(jet),
      zIndex: aircraftMarkerZIndex(jet),
      anchorLeft: `-${metrics.hitSize / 2}px`,
      anchorTop: `-${metrics.hitSize / 2}px`,
      gmpClickable: true,
      collisionBehavior: google.maps.CollisionBehavior?.REQUIRED
    });
    marker.addEventListener("gmp-click", () => selectAircraft(jet.id));
    return {
      content,
      marker
    };
  }

  updateAircraftContent(content, jet, heading) {
    const metrics = applyAircraftMarkerStyle(content, jet);
    content.className = `native-map-marker ${aircraftMarkerClass(jet, metrics)}`;
    content.dataset.id = jet.id;
    content.dataset.sizeClass = metrics.sizeClass;
    content.dataset.iconKey = metrics.iconKey;
    content.setAttribute("aria-label", aircraftMapMarkerTitle(jet));
    if (!content.dataset.ready) {
      content.innerHTML = `
        ${aircraftSvg(jet, heading)}
        <span class="aircraft-label"><span class="aircraft-label-text"></span></span>
      `;
      content.dataset.ready = "true";
    }
    const icon = content.querySelector(".aircraft-icon");
    const label = content.querySelector(".aircraft-label");
    let labelText = content.querySelector(".aircraft-label-text");
    if (!labelText) {
      label.innerHTML = `<span class="aircraft-label-text"></span>`;
      labelText = content.querySelector(".aircraft-label-text");
    }
    icon.className = `aircraft-icon ${metrics.sizeClass} ${aircraftIconClassName(metrics.iconKey)}`;
    icon.dataset.iconKey = metrics.iconKey;
    icon.style.transform = `rotate(${heading}deg)`;
    const imagePath = aircraftIconImagePaths[metrics.iconKey];
    const currentImage = icon.querySelector("img");
    const currentPath = icon.querySelector("path");
    if (imagePath) {
      if (!currentImage || currentImage.getAttribute("src") !== imagePath) {
        icon.innerHTML = `<img class="aircraft-icon-image" src="${imagePath}" alt="">`;
      }
    } else if (!currentPath) {
      icon.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="${aircraftBodyPath(jet)}" /></svg>`;
    } else {
      currentPath.setAttribute("d", aircraftBodyPath(jet));
    }
    labelText.textContent = aircraftMapLabelText(jet);
    return metrics;
  }

  renderAircraftMarkers(jets) {
    document.getElementById("aircraftLayer").innerHTML = "";
    const activeIds = new Set();
    jets.forEach((jet) => {
      const position = currentPosition(jet);
      const heading = aircraftHeading(jet);
      activeIds.add(jet.id);
      if (!this.aircraftMarkers.has(jet.id)) {
        this.aircraftMarkers.set(jet.id, this.createAircraftMarker(jet, position, heading));
      }
      const record = this.aircraftMarkers.get(jet.id);
      record.removing = false;
      record.content.classList.remove("is-removing");
      const metrics = this.updateAircraftContent(record.content, jet, heading);
      record.marker.position = { lat: position[0], lng: position[1] };
      record.marker.title = aircraftMapMarkerTitle(jet);
      record.marker.map = this.map;
      record.marker.zIndex = aircraftMarkerZIndex(jet);
      if ("anchorLeft" in record.marker) {
        record.marker.anchorLeft = `-${metrics.hitSize / 2}px`;
      }
      if ("anchorTop" in record.marker) {
        record.marker.anchorTop = `-${metrics.hitSize / 2}px`;
      }
      if ("collisionBehavior" in record.marker && google.maps.CollisionBehavior) {
        record.marker.collisionBehavior = google.maps.CollisionBehavior.REQUIRED;
      }
    });

    this.aircraftMarkers.forEach((record, id) => {
      if (!activeIds.has(id)) {
        if (record.removing) {
          return;
        }
        record.removing = true;
        record.content.classList.add("is-removing");
        window.setTimeout(() => {
          if (!record.removing || this.aircraftMarkers.get(id) !== record) {
            return;
          }
          record.marker.map = null;
          this.aircraftMarkers.delete(id);
        }, 150);
      }
    });
  }

  createAirportMarker(airport) {
    const content = document.createElement("div");
    this.updateAirportContent(content, airport);
    const marker = new this.AdvancedMarkerElement({
      map: this.map,
      position: { lat: airport.lat, lng: airport.lng },
      content,
      zIndex: airportMarkerZIndex(airport),
      anchorLeft: "-50%",
      anchorTop: "-100%",
      gmpClickable: true,
      collisionBehavior: googleAirportCollisionBehavior(airport)
    });
    marker.addEventListener("gmp-click", () => selectAirport(airport.id));
    return {
      content,
      marker
    };
  }

  updateAirportContent(content, airport) {
    const { metrics } = airportMarkerCssVars(airport);
    const activeIds = activeAirportPopupIds();
    const hovered = airportHoverIsActive(airport.id, activeIds);
    const popupReady = airportPopupIsReady(airport.id, activeIds);
    const currentHover = airportHoverId(state.hoveredAirportId) === airportHoverId(airport.id);
    content.className = `native-map-marker ${airportMarkerClass(airport, metrics)}`;
    setAirportMarkerHoverClass(content, hovered, popupReady, currentHover);
    content.dataset.id = airport.id;
    content.dataset.level = String(airportPriorityLevel(airport));
    content.dataset.markerSize = metrics.sizeClass;
    content.dataset.markerVisible = String(metrics.visualWidth > 0 && metrics.visualHeight > 0);
    syncAirportParkingBadgeDataset(content, airport);
    const routeEndpointRole = selectedAircraftRouteEndpointRole(airport);
    if (routeEndpointRole) {
      content.dataset.routeEndpointRole = routeEndpointRole;
    } else {
      delete content.dataset.routeEndpointRole;
    }
    content.setAttribute("aria-label", airportFullLabel(airport));
    content.removeAttribute("title");
    content.style.setProperty("--airport-icon-width", `${metrics.visualWidth}px`);
    content.style.setProperty("--airport-icon-height", `${metrics.visualHeight}px`);
    content.style.setProperty("--airport-hit-width", `${metrics.hitWidth}px`);
    content.style.setProperty("--airport-hit-height", `${metrics.hitHeight}px`);
    applyAirportPopupPlacementVars(content, airport, activeIds);
    if (!content.dataset.ready) {
      content.innerHTML = `
        <span class="airport-marker-hit">
          <span class="marker-map-shadow airport-map-shadow" aria-hidden="true"></span>
          <span class="airport-pin-symbol">
            <svg class="airport-pin-icon" viewBox="0 0 28 36" aria-hidden="true">
              <path class="airport-pin-body" d="M14 1.8C7.1 1.8 2.3 6.8 2.3 13.2c0 7.8 9.2 19 11 21a.95.95 0 0 0 1.4 0c1.8-2 11-13.2 11-21C25.7 6.8 20.9 1.8 14 1.8Z"></path>
              <path class="airport-pin-tower" d="M12.4 8.5h3.2l.8 4.1h2.1v2.2h-1.7l.9 4.8h1.5v2.2H8.8v-2.2h1.5l.9-4.8H9.5v-2.2h2.1l.8-4.1Zm.5 11.1h2.2l-.8-4.8h-.6l-.8 4.8Zm.2-7h1.8l-.3-1.8h-1.2l-.3 1.8Z"></path>
            </svg>
            ${airportParkingBadgeHtml(airport)}
          </span>
          <span class="airport-code-label"></span>
          <span class="airport-hover-label"></span>
        </span>
      `;
      content.addEventListener("mouseenter", (event) => beginAirportMarkerHover(content.dataset.id, event));
      content.addEventListener("mousemove", updateAirportHoverPointer);
      content.addEventListener("mouseleave", (event) => endAirportMarkerHover(content.dataset.id, event));
      content.dataset.ready = "true";
    }
    content.querySelector(".airport-code-label").textContent = airport.renderLabelMode === "full"
      ? airportFullLabel(airport)
      : airportDisplayCode(airport);
    content.querySelector(".airport-hover-label").innerHTML = airportHoverLabelHtml(airport);
    syncAirportParkingBadgeElement(content, airport);
  }

  renderAirportMarkers(airportList) {
    document.getElementById("airportLayer").innerHTML = "";
    const activeIds = new Set();
    airportList.forEach((airport) => {
      activeIds.add(airport.id);
      if (!this.airportMarkers.has(airport.id)) {
        this.airportMarkers.set(airport.id, this.createAirportMarker(airport));
      }
      const record = this.airportMarkers.get(airport.id);
      record.removing = false;
      record.content.classList.remove("is-removing");
      this.updateAirportContent(record.content, airport);
      record.marker.position = { lat: airport.lat, lng: airport.lng };
      record.marker.map = this.map;
      applyGoogleAirportMarkerStacking(record.marker, airport, {
        hovered: airportHoverIsActive(airport.id),
        currentHover: airportHoverId(state.hoveredAirportId) === airportHoverId(airport.id)
      });
    });

    this.airportMarkers.forEach((record, id) => {
      if (!activeIds.has(id)) {
        if (record.removing) {
          return;
        }
        record.removing = true;
        record.content.classList.add("is-removing");
        window.setTimeout(() => {
          if (!record.removing || this.airportMarkers.get(id) !== record) {
            return;
          }
          record.marker.map = null;
          this.airportMarkers.delete(id);
        }, 150);
      }
    });
  }

  createRouteEndpointMarker(endpoint) {
    const content = document.createElement("div");
    content.className = "native-map-marker route-endpoint-marker";
    content.innerHTML = routeEndpointHtml(endpoint);
    const marker = new this.AdvancedMarkerElement({
      map: this.map,
      position: { lat: endpoint.lat, lng: endpoint.lng },
      content,
      title: endpoint.label,
      zIndex: 390,
      anchorLeft: "-18px",
      anchorTop: "-44px",
      gmpClickable: false,
      collisionBehavior: google.maps.CollisionBehavior?.REQUIRED
    });
    return { content, marker };
  }

  setRouteEndpoints(endpoints) {
    const activeIds = new Set();
    endpoints.forEach((endpoint) => {
      activeIds.add(endpoint.id);
      if (!this.routeEndpointMarkers.has(endpoint.id)) {
        this.routeEndpointMarkers.set(endpoint.id, this.createRouteEndpointMarker(endpoint));
      }
      const record = this.routeEndpointMarkers.get(endpoint.id);
      record.content.innerHTML = routeEndpointHtml(endpoint);
      record.marker.position = { lat: endpoint.lat, lng: endpoint.lng };
      record.marker.title = endpoint.label;
      record.marker.map = this.map;
    });
    this.routeEndpointMarkers.forEach((record, id) => {
      if (!activeIds.has(id)) {
        record.marker.map = null;
        this.routeEndpointMarkers.delete(id);
      }
    });
  }

  clearRouteEndpoints() {
    this.routeEndpointMarkers.forEach((record) => {
      record.marker.map = null;
    });
    this.routeEndpointMarkers.clear();
  }

  clearTrackRecord(record) {
    if (!record) {
      return;
    }
    const lines = record.cores instanceof Map
      ? [...record.cores.values(), ...(record.halos || []), ...(record.hits?.values?.() || []), record.planned, record.plannedHit]
      : Array.isArray(record.lines)
        ? record.lines
        : [record];
    lines.forEach((line) => line?.setMap(null));
  }

  setTrack(id, points, selected, options = {}) {
    const plannedPath = selected ? options.plannedPath : null;
    const hasTrackPoints = Array.isArray(points) && points.length >= 2;
    if (!state.trails || (!hasTrackPoints && !plannedPath)) {
      this.clearTrackRecord(this.lines.get(id));
      this.lines.delete(id);
      return;
    }

    const zoom = this.getZoom();
    if (!selected && zoom < mapLoadingConfig.regularTrackMinZoom) {
      this.clearTrackRecord(this.lines.get(id));
      this.lines.delete(id);
      return;
    }

    const focused = routeFocusIsActiveFor(id);
    const trackStyle = trackStyleForZoom({
      zoom,
      selected,
      routeFocused: focused,
      stale: options.stale === true
    });
    const segments = hasTrackPoints ? trackSegments(points, selected) : [];
    const record = this.lines.get(id) || { cores: new Map(), halos: [], hits: new Map(), planned: null, plannedHit: null };
    if (!(record.cores instanceof Map)) {
      this.clearTrackRecord(record);
      record.cores = new Map();
      record.halos = [];
      record.hits = new Map();
      record.planned = null;
      record.plannedHit = null;
    }
    if (plannedPath) {
      const path = plannedPath.map(([lat, lng]) => ({ lat, lng }));
      const plannedOptions = {
        map: this.map,
        clickable: false,
        path,
        geodesic: true,
        strokeOpacity: 0,
        strokeWeight: trackStyle.estimatedWidth,
        zIndex: focused ? 330 : 305,
        icons: [{
          icon: {
            path: "M 0,-1 0,1",
            strokeColor: routeStyle.plannedColor,
            strokeOpacity: routeStyle.plannedOpacity,
            strokeWeight: trackStyle.estimatedWidth,
            scale: 2
          },
          offset: "0",
          repeat: routeStyle.plannedDashRepeat
        }]
      };
      if (!record.planned) {
        record.planned = new google.maps.Polyline(plannedOptions);
      } else {
        record.planned.setPath(path);
        record.planned.setOptions(plannedOptions);
      }
      if (record.plannedHit) {
        record.plannedHit.setMap(null);
        record.plannedHit = null;
      }
    } else if (record.planned || record.plannedHit) {
      record.planned?.setMap(null);
      record.planned = null;
      record.plannedHit?.setMap(null);
      record.plannedHit = null;
    }
    const haloPaths = routeStyle.haloEnabled && selected ? actualTrackPaths(segments) : [];
    haloPaths.forEach((segmentPath, index) => {
      const path = segmentPath.map(([lat, lng]) => ({ lat, lng }));
      let halo = record.halos[index];
      if (!halo) {
        halo = new google.maps.Polyline({
          map: this.map,
          clickable: false,
          path,
          geodesic: true,
          strokeColor: "#101010",
          strokeOpacity: trackStyle.haloOpacity,
          strokeWeight: trackStyle.haloWidth,
          zIndex: focused ? 320 : 300
        });
        record.halos[index] = halo;
      } else {
        halo.setPath(path);
        halo.setOptions({
          map: this.map,
          geodesic: true,
          strokeOpacity: trackStyle.haloOpacity,
          strokeWeight: trackStyle.haloWidth,
          zIndex: focused ? 320 : 300
        });
      }
    });
    record.halos.slice(haloPaths.length).forEach((halo) => halo.setMap(null));
    record.halos.length = haloPaths.length;

    const activeSegmentIds = new Set();
    segments.forEach((segment) => {
      if (segment.invalid) {
        return;
      }
      activeSegmentIds.add(segment.id);
      const path = segment.path.map(([lat, lng]) => ({ lat, lng }));
      const options = {
        map: this.map,
        clickable: false,
        path,
        geodesic: true,
        strokeColor: segment.color,
        strokeOpacity: segment.estimated ? 0 : trackStyle.coreOpacity,
        strokeWeight: segment.estimated ? trackStyle.estimatedWidth : trackStyle.coreWidth,
        zIndex: selected ? (focused ? 340 : 310) : 180,
        icons: segment.estimated ? [{
          icon: {
            path: "M 0,-1 0,1",
            strokeColor: routeStyle.estimatedColor,
            strokeOpacity: trackStyle.estimatedOpacity,
            strokeWeight: trackStyle.estimatedWidth,
            scale: 2
          },
          offset: "0",
          repeat: routeStyle.estimatedDashRepeat
        }] : []
      };
      let core = record.cores.get(segment.id);
      if (!core) {
        core = new google.maps.Polyline(options);
        record.cores.set(segment.id, core);
      } else {
        core.setPath(path);
        core.setOptions(options);
      }
    });
    if (record.hits?.size) {
      record.hits.forEach((hit) => hit.setMap(null));
      record.hits.clear();
    }
    record.cores.forEach((core, segmentId) => {
      if (!activeSegmentIds.has(segmentId)) {
        core.setMap(null);
        record.cores.delete(segmentId);
      }
    });
    record.hits?.forEach((hit, segmentId) => {
      if (!selected || !activeSegmentIds.has(segmentId)) {
        hit.setMap(null);
        record.hits.delete(segmentId);
      }
    });
    this.lines.set(id, record);
  }

  removeInactiveTracks(activeIds) {
    this.lines.forEach((record, id) => {
      if (!activeIds.has(id)) {
        this.clearTrackRecord(record);
        this.lines.delete(id);
      }
    });
  }

  setWeather(show) {
    this.circles.forEach((circle) => circle.setMap(null));
    this.circles = [];
    if (!show) {
      return;
    }
    [
      { lat: 48.5, lng: 2.4, radius: 220000, color: "#70da73" },
      { lat: 25.2, lng: 55.4, radius: 280000, color: "#ffcf43" },
      { lat: 35.2, lng: -95.5, radius: 420000, color: "#70da73" }
    ].forEach((item) => {
      this.circles.push(new google.maps.Circle({
        map: this.map,
        center: { lat: item.lat, lng: item.lng },
        radius: item.radius,
        strokeOpacity: 0,
        fillColor: item.color,
        fillOpacity: 0.18,
        clickable: false
      }));
    });
  }
}

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    const apiKey = googleMapsApiKey();
    if (!apiKey) {
      reject(new Error("Missing Google Maps API key"));
      return;
    }
    let settled = false;
    const previousAuthFailure = window.gm_authFailure;
    const timeout = window.setTimeout(() => {
      finish(reject, new Error("Google Maps load timed out"));
    }, googleMapsLoadTimeoutMs);
    function finish(callback, value) {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      callback(value);
    }
    window.gm_authFailure = () => {
      googleMapsAuthFailureReason = "Google Maps API authorization failed";
      if (typeof previousAuthFailure === "function") {
        previousAuthFailure();
      }
      finish(reject, new Error("Google Maps API authorization failed"));
      if (state.map?.type === "google" || state.mapProvider === "google") {
        scheduleGoogleMapsFallback("Google Maps API authorization failed");
      }
    };
    window.__initBizJetGoogleMap = () => finish(resolve);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      callback: "__initBizJetGoogleMap",
      v: "weekly",
      loading: "async",
      libraries: "marker"
    });
    if (appConfig.googleLanguage) {
      params.set("language", appConfig.googleLanguage);
    }
    if (appConfig.googleRegion) {
      params.set("region", appConfig.googleRegion);
    }
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.bizjetGoogleMaps = "true";
    script.onerror = () => finish(reject, new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

async function createMapEngine() {
  if ((appConfig.defaultMapProvider || "google") === "google" && googleMapsApiKey()) {
    await loadGoogleMaps();
    return new GoogleMapEngine();
  }
  return new LeafletMapEngine();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function airportById(id) {
  return airportsById.get(normalizedLookupKey(id)) || null;
}

function airportByCode(code) {
  return airportsByCode.get(normalizedLookupKey(code)) || null;
}

function routeFocusActive() {
  return Boolean(
    state.routeFocusAircraftId
      && state.selectedKind === "aircraft"
      && state.selectedId === state.routeFocusAircraftId
  );
}

function routeFocusIsActiveFor(id) {
  return routeFocusActive() && state.routeFocusAircraftId === id;
}

function routeEndpointHtml(endpoint) {
  const code = escapeHtml(endpoint.code || endpoint.id || "");
  return `
    <span class="route-endpoint-pin" aria-hidden="true">
      <svg viewBox="0 0 28 36" aria-hidden="true">
        <path class="route-endpoint-pin-body" d="M14 1.8C7.1 1.8 2.3 6.8 2.3 13.2c0 7.8 9.2 19 11 21a.95.95 0 0 0 1.4 0c1.8-2 11-13.2 11-21C25.7 6.8 20.9 1.8 14 1.8Z"></path>
        <circle class="route-endpoint-pin-core" cx="14" cy="13" r="5.1"></circle>
      </svg>
    </span>
    <span class="route-endpoint-code">${code}</span>
  `;
}

function routeEndpointFromAirportLike(input, fallbackCode, role) {
  if (!input && !fallbackCode) {
    return null;
  }
  const airport = input || {};
  const lat = Number(airport.lat ?? airport.latitude);
  const lng = Number(airport.lng ?? airport.lon ?? airport.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const code = String(
    airport.id
      || airport.icao
      || airport.icaoCode
      || airport.airportCode
      || airport.iata
      || fallbackCode
      || role
  ).toUpperCase();
  return {
    id: `${role}:${code}`,
    role,
    code,
    label: `${role === "departure" ? "Departure" : "Arrival"} ${code}`,
    lat,
    lng
  };
}

function selectedRouteEndpoint(jet, role) {
  const airportInfo = jet.flightDetail?.airportInfo || {};
  const detailAirport = role === "departure"
    ? jet.flightDetail?.departureAirport || airportInfo.dep
    : jet.flightDetail?.arrivalAirport || airportInfo.arr;
  const fallbackCode = role === "departure" ? jet.from : jet.to;
  return routeEndpointFromAirportLike(detailAirport, fallbackCode, role)
    || routeEndpointFromAirportLike(airportByCode(fallbackCode), fallbackCode, role);
}

function selectedRouteEndpoints(jet) {
  if (!jet) {
    return [];
  }
  return [
    selectedRouteEndpoint(jet, "departure"),
    selectedRouteEndpoint(jet, "arrival")
  ].filter(Boolean);
}

function selectedPlannedRoutePath(jet) {
  if (!jet) {
    return null;
  }
  const destination = selectedRouteEndpoint(jet, "arrival");
  if (!destination) {
    return null;
  }
  const current = currentPosition(jet);
  if (!Array.isArray(current) || current.length !== 2) {
    return null;
  }
  const start = [Number(current[0]), Number(current[1])];
  const end = [Number(destination.lat), Number(destination.lng)];
  if (
    !Number.isFinite(start[0])
      || !Number.isFinite(start[1])
      || !Number.isFinite(end[0])
      || !Number.isFinite(end[1])
  ) {
    return null;
  }
  if (greatCircleDistanceNm({ lat: start[0], lng: start[1] }, { lat: end[0], lng: end[1] }) < 0.05) {
    return null;
  }
  return [start, end];
}

function selectedRouteBoundsPoints(jet) {
  if (!jet) {
    return [];
  }
  const endpoints = selectedRouteEndpoints(jet).map((endpoint) => [endpoint.lat, endpoint.lng]);
  const current = currentPosition(jet);
  const track = trackPointsForRender(jet, true).map((point) => [point.lat, point.lng]);
  return [...endpoints, current, ...track].filter((point) => (
    Array.isArray(point)
      && point.length === 2
      && Number.isFinite(Number(point[0]))
      && Number.isFinite(Number(point[1]))
  ));
}

function updateRouteFocusButton() {
  const button = document.getElementById("routeFocusButton");
  if (!button) {
    return;
  }
  const hasAircraft = Boolean(selectedAircraft());
  button.disabled = !hasAircraft || !state.trails;
  button.classList.toggle("active", routeFocusActive());
  button.setAttribute("aria-pressed", routeFocusActive() ? "true" : "false");
}

function syncSelectedRouteVisuals() {
  const shell = document.querySelector(".fr-shell");
  shell?.classList.toggle("route-focus-mode", routeFocusActive());
  updateRouteFocusButton();
  if (!state.map?.setRouteEndpoints || !state.map?.clearRouteEndpoints) {
    return;
  }
  const jet = selectedAircraft();
  state.map.clearRouteEndpoints();
  if (!state.trails || !jet) {
    return;
  }
}

function fitSelectedRouteBounds(jet = selectedAircraft()) {
  const points = selectedRouteBoundsPoints(jet);
  if (points.length) {
    state.map?.fitRouteBounds?.(points, effectiveRouteFocusPadding());
  }
}

function setRouteFocus(enabled, options = {}) {
  const jet = selectedAircraft();
  if (enabled && !jet) {
    return;
  }
  if (enabled) {
    if (!routeFocusActive()) {
      state.routeFocusPreviousView = state.map?.getView?.() || null;
    }
    state.routeFocusAircraftId = jet.id;
    state.followSelectedAircraft = false;
    updateFollowButton();
    updateRouteFocusButton();
    renderViewport();
    fitSelectedRouteBounds(jet);
    return;
  }

  const previousView = state.routeFocusPreviousView;
  state.routeFocusAircraftId = null;
  state.routeFocusPreviousView = null;
  updateFollowButton();
  updateRouteFocusButton();
  renderViewport();
  if (options.restore !== false && previousView?.center && state.map?.setView) {
    state.map.setView(previousView.center, previousView.zoom);
  }
}

function clearRouteFocus(options = {}) {
  if (state.routeFocusAircraftId) {
    setRouteFocus(false, options);
    return;
  }
  syncSelectedRouteVisuals();
}

function airportDisplayName(airport) {
  if (!airport) {
    return "-";
  }
  const name = airport.name || airport.id || "-";
  const city = airport.city || "";
  if (!city || name.toLowerCase().startsWith(city.toLowerCase())) {
    return name;
  }
  return `${city} ${name}`;
}

function interpolateRoute(route, progress) {
  if (!Array.isArray(route) || route.length === 0) {
    return defaultCenter;
  }
  if (route.length === 1) {
    return route[0];
  }
  const clamped = Math.max(0, Math.min(0.999, progress));
  const segmentProgress = clamped * (route.length - 1);
  const index = Math.floor(segmentProgress);
  const local = segmentProgress - index;
  const start = route[index];
  const end = route[index + 1];
  return [
    start[0] + (end[0] - start[0]) * local,
    start[1] + (end[1] - start[1]) * local
  ];
}

function liveProgress(jet) {
  if (jet.livePosition) {
    return Math.max(0, Math.min(1, Number(jet.progress) || 1));
  }
  return (jet.progress + state.tick * 0.002) % 1;
}

function interpolatePosition(start, end, ratio) {
  if (!Array.isArray(start) || !Array.isArray(end)) {
    return end || start || defaultCenter;
  }
  const amount = clampRatio(ratio);
  let lngDelta = end[1] - start[1];
  if (lngDelta > 180) lngDelta -= 360;
  if (lngDelta < -180) lngDelta += 360;
  return [
    start[0] + (end[0] - start[0]) * amount,
    normalizeLongitude(start[1] + lngDelta * amount)
  ];
}

function projectPositionByCourse(position, heading, speedKt, elapsedMs) {
  if (!Array.isArray(position) || !finiteNumber(heading) || !finiteNumber(speedKt) || elapsedMs <= 0) {
    return position;
  }
  const distanceNm = Number(speedKt) * elapsedMs / 3600000;
  const distanceDeg = distanceNm / 60;
  const bearing = Number(heading) * Math.PI / 180;
  const lat = Number(position[0]);
  const lng = Number(position[1]);
  const latOffset = Math.cos(bearing) * distanceDeg;
  const lngScale = Math.max(0.18, Math.cos(lat * Math.PI / 180));
  const lngOffset = Math.sin(bearing) * distanceDeg / lngScale;
  return [clampLatitude(lat + latOffset), normalizeLongitude(lng + lngOffset)];
}

function aircraftLastUpdatedAt(jet) {
  const numeric = Number(jet.updatedAtEpochMs || jet.updatedAt || jet.viewportSeenAtEpochMs);
  return Number.isFinite(numeric) ? numeric : Date.now();
}

function aircraftDataAgeMs(jet) {
  if (jet.isLocalSample) {
    return 0;
  }
  return Math.max(0, Date.now() - aircraftLastUpdatedAt(jet));
}

function aircraftIsExpired(jet) {
  if (jet.id === state.selectedId || jet.isLocalSample || aircraftWasRecentlySelected(jet)) {
    return false;
  }
  return aircraftDataAgeMs(jet) > mapLoadingConfig.aircraftRefresh.expireAfterMs;
}

function aircraftFreshnessState(jet) {
  if (jet.isLocalSample) {
    return "fresh";
  }
  const age = aircraftDataAgeMs(jet);
  if (age > mapLoadingConfig.aircraftRefresh.expireAfterMs) {
    return "expired";
  }
  if (age > mapLoadingConfig.aircraftRefresh.staleAfterMs || jet.quality === "stale") {
    return "stale";
  }
  if (age > 5000 || jet.quality === "estimated") {
    return "aging";
  }
  return "fresh";
}

function currentPosition(jet) {
  if (Array.isArray(jet.livePosition) && jet.livePosition.length === 2) {
    const age = aircraftDataAgeMs(jet);
    const duration = Number(jet.viewportTtlMs || mapLoadingConfig.aircraftRefresh.interpolationMs);
    if (
      Array.isArray(jet.previousLivePosition)
      && jet.previousLivePosition.length === 2
      && Number.isFinite(Number(jet.liveInterpolationStartedAtEpochMs))
      && age <= Math.max(duration, mapLoadingConfig.aircraftRefresh.maxExtrapolationMs)
    ) {
      const elapsed = Math.max(0, Date.now() - Number(jet.liveInterpolationStartedAtEpochMs));
      if (elapsed < duration) {
        return interpolatePosition(jet.previousLivePosition, jet.livePosition, elapsed / duration);
      }
    }
    if (age > duration && age <= mapLoadingConfig.aircraftRefresh.maxExtrapolationMs) {
      return projectPositionByCourse(
        jet.livePosition,
        aircraftHeading(jet),
        jet.speed,
        Math.min(age - duration, mapLoadingConfig.aircraftRefresh.maxExtrapolationMs)
      );
    }
    return jet.livePosition;
  }
  return interpolateRoute(jet.route, liveProgress(jet));
}

function headingBetween(route, progress) {
  if (!Array.isArray(route) || route.length < 2) {
    return 0;
  }
  const ahead = interpolateRoute(route, (progress + 0.01) % 1);
  const here = interpolateRoute(route, progress);
  const dx = ahead[1] - here[1];
  const dy = ahead[0] - here[0];
  return Math.round((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

function aircraftHeading(jet) {
  return Number.isFinite(jet.heading) ? jet.heading : headingBetween(jet.route, liveProgress(jet));
}

function numericOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function aircraftIsOnGround(jet) {
  if (jet.onGround === true) {
    return true;
  }
  if (jet.onGround === false) {
    return false;
  }
  const status = String(jet.status || "").toLowerCase();
  return status.includes("on ground") || status.includes("on-ground") || status.includes("landed");
}

function aircraftIsInTransit(jet) {
  return !aircraftIsOnGround(jet);
}

function aircraftMapRegistrationLabel(jet) {
  return firstMatchedValue(jet.registration, jet.tailNoClear, jet.tailNumber, jet.tailNoDisplay);
}

function aircraftMapLabelText(jet) {
  const registration = aircraftMapRegistrationLabel(jet);
  if (aircraftIsInTransit(jet)) {
    return registration;
  }
  return firstMatchedValue(jet.callsign, registration, jet.id);
}

function aircraftMapMarkerTitle(jet) {
  return [aircraftMapLabelText(jet), jet.model]
    .map(displayOrDash)
    .filter((value) => value !== NA_TEXT)
    .join(" ") || displayOrDash(jet.id);
}

function distanceMetersBetween(start, end) {
  return groundProjectionCore.distanceMetersBetween(start, end);
}

function terminalAirportForAircraft(jet, position) {
  const codes = [jet.from, jet.to]
    .map((code) => String(code || "").trim().toUpperCase())
    .filter((code, index, list) => code && code !== "-" && list.indexOf(code) === index);
  let best = null;
  codes.forEach((code) => {
    const airport = airportByCode(code);
    const elevationFt = numericOrNull(airport?.elevation);
    if (!airport || elevationFt === null) {
      return;
    }
    const distanceM = distanceMetersBetween(position, [airport.lat, airport.lng]);
    if (distanceM <= aircraftGroundProjectionConfig.terminalRadiusM && (!best || distanceM < best.distanceM)) {
      best = { airport, distanceM, elevationFt };
    }
  });
  return best;
}

function resolveAircraftAgl(jet, position) {
  if (aircraftIsOnGround(jet)) {
    return { valueM: null, source: null, terminalAirport: null, hiddenReason: "on-ground" };
  }
  const directAglFt = numericOrNull(jet.altitudeAglFt ?? jet.aglFt);
  if (directAglFt !== null) {
    return { valueM: Math.max(0, directAglFt * 0.3048), source: "agl", terminalAirport: null, hiddenReason: null };
  }
  const radioAltitudeFt = numericOrNull(jet.radioAltitudeFt);
  if (radioAltitudeFt !== null) {
    return { valueM: Math.max(0, radioAltitudeFt * 0.3048), source: "radio-altitude", terminalAirport: null, hiddenReason: null };
  }
  const altitudeMslFt = numericOrNull(jet.altitude);
  const terrainElevationFt = numericOrNull(jet.terrainElevationFt);
  if (altitudeMslFt !== null && terrainElevationFt !== null) {
    return {
      valueM: Math.max(0, (altitudeMslFt - terrainElevationFt) * 0.3048),
      source: "terrain-elevation",
      terminalAirport: null,
      hiddenReason: null
    };
  }
  if (altitudeMslFt !== null) {
    const terminal = terminalAirportForAircraft(jet, position);
    if (terminal) {
      return {
        valueM: Math.max(0, (altitudeMslFt - terminal.elevationFt) * 0.3048),
        source: "airport-elevation",
        terminalAirport: terminal.airport.id,
        hiddenReason: null
      };
    }
  }
  return { valueM: null, source: null, terminalAirport: null, hiddenReason: "altitude-unavailable" };
}

function hiddenGroundProjection(jet, reason, extra = {}) {
  return {
    id: jet.id,
    visible: false,
    hiddenReason: reason,
    ...extra
  };
}

function groundProjectionForAircraft(jet) {
  if (!state.groundProjections) {
    return hiddenGroundProjection(jet, "disabled");
  }
  const zoom = currentZoom();
  if (zoom < aircraftGroundProjectionConfig.minSelectedZoom) {
    return hiddenGroundProjection(jet, "low-zoom");
  }
  const freshness = aircraftFreshnessState(jet);
  if (freshness === "expired") {
    return hiddenGroundProjection(jet, "stale");
  }
  const position = currentPosition(jet);
  if (!Array.isArray(position) || !Number.isFinite(Number(position[0])) || !Number.isFinite(Number(position[1]))) {
    return hiddenGroundProjection(jet, "invalid-position");
  }
  const agl = resolveAircraftAgl(jet, position);
  if (agl.hiddenReason === "on-ground" || (agl.valueM !== null && agl.valueM <= 0)) {
    return hiddenGroundProjection(jet, "on-ground", { altitudeAglM: agl.valueM, altitudeSource: agl.source });
  }
  if (zoom < aircraftGroundProjectionConfig.minPriorityZoom && !aircraftIsSelected(jet) && !aircraftIsAlert(jet)) {
    return hiddenGroundProjection(jet, "low-zoom", { altitudeAglM: agl.valueM, altitudeSource: agl.source });
  }
  if (zoom < aircraftGroundProjectionConfig.minAllZoom && !agl.terminalAirport && !aircraftIsSelected(jet) && !aircraftIsAlert(jet)) {
    return hiddenGroundProjection(jet, "low-zoom", { altitudeAglM: agl.valueM, altitudeSource: agl.source });
  }
  const timestamp = numericOrNull(jet.positionTimestamp) || aircraftLastUpdatedAt(jet);
  const canUsePhysicalProjection = Number.isFinite(agl.valueM)
    && agl.valueM > 0
    && agl.valueM <= aircraftGroundProjectionConfig.maxAglM
    && zoom >= aircraftGroundProjectionConfig.physicalProjectionMinZoom;
  const rawPhysicalProjection = canUsePhysicalProjection
    ? groundProjectionCore.calculateGroundProjection({
      position,
      altitudeAglM: agl.valueM,
      timestamp,
      maxAglM: aircraftGroundProjectionConfig.maxAglM,
      minSunElevationDeg: aircraftGroundProjectionConfig.minSunElevationDeg,
      maxDistanceM: aircraftGroundProjectionConfig.maxDistanceM
    })
    : null;
  const physicalProjection = rawPhysicalProjection?.visible
    ? (() => {
      const screenDistanceLimitM = groundProjectionCore.metersPerPixelAtLatitude(position[0], zoom)
        * aircraftGroundProjectionConfig.physicalMaxOffsetPx;
      if (rawPhysicalProjection.shadowDistanceM <= screenDistanceLimitM) {
        return rawPhysicalProjection;
      }
      return {
        ...rawPhysicalProjection,
        projectionPosition: groundProjectionCore.destinationCoordinate(
          position,
          rawPhysicalProjection.shadowBearingDeg,
          screenDistanceLimitM
        ),
        shadowDistanceM: screenDistanceLimitM,
        clamped: true
      };
    })()
    : rawPhysicalProjection;
  const altitudeMslFt = numericOrNull(jet.altitude);
  const visualHeightRatio = altitudeMslFt === null
    ? 0.45
    : Math.sqrt(Math.max(0, Math.min(1, altitudeMslFt / 45000)));
  const visualOffsetPx = aircraftGroundProjectionConfig.visualMinOffsetPx
    + (aircraftGroundProjectionConfig.visualMaxOffsetPx - aircraftGroundProjectionConfig.visualMinOffsetPx) * visualHeightRatio;
  const visualProjection = groundProjectionCore.visualProjectionDestination({
    position,
    zoom,
    offsetPx: visualOffsetPx,
    bearingDeg: aircraftGroundProjectionConfig.visualShadowBearingDeg
  });
  const usesPhysicalProjection = Boolean(physicalProjection?.visible);
  const projectionPosition = usesPhysicalProjection
    ? physicalProjection.projectionPosition
    : visualProjection.projectionPosition;
  const heightRatio = usesPhysicalProjection
    ? Math.max(0, Math.min(1, agl.valueM / aircraftGroundProjectionConfig.maxAglM))
    : visualHeightRatio;
  const shadowDistanceM = usesPhysicalProjection
    ? physicalProjection.shadowDistanceM
    : visualProjection.distanceM;
  const shadowBearingDeg = usesPhysicalProjection
    ? physicalProjection.shadowBearingDeg
    : aircraftGroundProjectionConfig.visualShadowBearingDeg;
  const clamped = usesPhysicalProjection ? physicalProjection.clamped : false;
  const sun = usesPhysicalProjection ? physicalProjection.sun : null;
  const projectionMode = usesPhysicalProjection ? "physical" : "visual";
  const freshnessFactor = freshness === "stale" ? 0.55 : freshness === "aging" ? 0.8 : 1;
  const metrics = aircraftMarkerMetrics(jet);
  const visualStyle = projectionMode === "physical"
    ? {
      sizeRatio: 0.78,
      opacity: (0.34 + (0.16 - 0.34) * heightRatio) * (clamped ? 0.78 : 1),
      blurPx: 0.5 + (2 - 0.5) * heightRatio,
      scaleX: 0.88 + (0.76 - 0.88) * heightRatio,
      scaleY: 0.68 + (0.56 - 0.68) * heightRatio
    }
    : {
      sizeRatio: 0.72,
      opacity: 0.3 + (0.22 - 0.3) * heightRatio,
      blurPx: 0.6 + (1.4 - 0.6) * heightRatio,
      scaleX: 0.88 + (0.8 - 0.88) * heightRatio,
      scaleY: 0.66 + (0.58 - 0.66) * heightRatio
    };
  return {
    id: jet.id,
    visible: true,
    hiddenReason: null,
    projectionMode,
    physicalFallbackReason: physicalProjection && !physicalProjection.visible
      ? physicalProjection.hiddenReason
      : canUsePhysicalProjection ? null : agl.hiddenReason || "outside-physical-range",
    aircraftLat: position[0],
    aircraftLng: position[1],
    projectionLat: projectionPosition[0],
    projectionLng: projectionPosition[1],
    shadowBearingDeg,
    shadowDistanceM,
    heightRatio,
    visualOffsetPx: projectionMode === "visual" ? visualProjection.offsetPx : null,
    sunAzimuthDeg: sun?.azimuthDeg ?? null,
    sunElevationDeg: sun?.elevationDeg ?? null,
    altitudeAglM: agl.valueM,
    altitudeSource: agl.source || "visual-fallback",
    terminalAirport: agl.terminalAirport,
    heading: aircraftHeading(jet),
    iconKey: aircraftIconKey(jet),
    iconPath: aircraftBodyPath(jet),
    imagePath: aircraftIconImagePath(jet),
    sizePx: Math.max(12, metrics.visualSize * visualStyle.sizeRatio),
    opacity: visualStyle.opacity * freshnessFactor,
    blurPx: visualStyle.blurPx,
    scaleX: visualStyle.scaleX,
    scaleY: visualStyle.scaleY,
    clamped,
    freshness
  };
}

function groundProjectionsForAircraft(jets) {
  const hiddenReasons = {};
  const candidates = jets.map((jet) => {
    const projection = groundProjectionForAircraft(jet);
    jet.groundProjection = projection;
    if (!projection.visible) {
      hiddenReasons[projection.hiddenReason] = (hiddenReasons[projection.hiddenReason] || 0) + 1;
    }
    return { jet, projection };
  }).filter((item) => item.projection.visible);
  candidates.sort((a, b) => {
    if (aircraftIsSelected(a.jet) !== aircraftIsSelected(b.jet)) return aircraftIsSelected(a.jet) ? -1 : 1;
    if (aircraftIsAlert(a.jet) !== aircraftIsAlert(b.jet)) return aircraftIsAlert(a.jet) ? -1 : 1;
    return aircraftPriority(a.jet) - aircraftPriority(b.jet);
  });
  const rendered = candidates.slice(0, aircraftGroundProjectionConfig.maxVisible).map(({ projection }, index) => ({
    ...projection,
    densityTier: candidates.length > aircraftGroundProjectionConfig.highDensityThreshold
      ? (projection.heightRatio < 0.34 ? "near" : projection.heightRatio < 0.68 ? "mid" : "far")
      : "continuous",
    densityRank: index
  }));
  state.groundProjectionDiagnostics = {
    zoom: currentZoom(),
    enabled: state.groundProjections,
    aircraftCount: jets.length,
    candidateCount: candidates.length,
    renderedCount: rendered.length,
    hiddenReasons
  };
  document.body.dataset.groundProjectionDiagnostics = JSON.stringify(state.groundProjectionDiagnostics);
  return rendered;
}

function displayedAircraftForGroundProjection(jets) {
  const mapElement = document.getElementById("map");
  if (!mapElement) return [];
  const mapRect = mapElement.getBoundingClientRect();
  const markerById = new Map(
    [...document.querySelectorAll(".aircraft-marker[data-id]")]
      .filter((marker) => marker.isConnected && !marker.classList.contains("is-removing"))
      .map((marker) => [marker.dataset.id, marker])
  );
  return jets.filter((jet) => {
    const marker = markerById.get(String(jet.id));
    const icon = marker?.querySelector(".aircraft-icon");
    const graphic = icon?.querySelector(".aircraft-icon-image, svg");
    if (!marker || !icon || !graphic) return false;
    if (graphic instanceof HTMLImageElement && (!graphic.complete || graphic.naturalWidth <= 0)) return false;
    const markerStyle = getComputedStyle(marker);
    const iconStyle = getComputedStyle(icon);
    if (markerStyle.display === "none" || markerStyle.visibility === "hidden" || Number(markerStyle.opacity) <= 0) return false;
    if (iconStyle.display === "none" || iconStyle.visibility === "hidden" || Number(iconStyle.opacity) <= 0) return false;
    const rect = graphic.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0
      && rect.right > mapRect.left
      && rect.left < mapRect.right
      && rect.bottom > mapRect.top
      && rect.top < mapRect.bottom;
  });
}

function syncGroundProjectionsToDisplayedAircraft(jets = state.renderedAircraft) {
  if (!state.map?.renderGroundProjections) return;
  const displayedJets = displayedAircraftForGroundProjection(jets);
  state.map.renderGroundProjections(groundProjectionsForAircraft(displayedJets));
}

function scheduleGroundProjectionSync(jets = state.renderedAircraft) {
  if (state.groundProjectionSyncTimer !== null) {
    window.clearTimeout(state.groundProjectionSyncTimer);
  }
  window.requestAnimationFrame(() => syncGroundProjectionsToDisplayedAircraft(jets));
  state.groundProjectionSyncTimer = window.setTimeout(() => {
    state.groundProjectionSyncTimer = null;
    syncGroundProjectionsToDisplayedAircraft(jets);
  }, 140);
}

function groundProjectionGraphicHtml(projection) {
  if (projection.imagePath) {
    return `<img class="aircraft-ground-projection-image" src="${escapeHtml(projection.imagePath)}" alt="">`;
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="${escapeHtml(projection.iconPath)}" /></svg>`;
}

function groundProjectionElementHtml(projection) {
  return `
    <div class="aircraft-ground-projection" data-projection-id="${escapeHtml(projection.id)}" aria-hidden="true">
      <div class="aircraft-ground-projection-graphic">
        ${groundProjectionGraphicHtml(projection)}
      </div>
    </div>
  `;
}

function applyGroundProjectionElementStyle(element, projection) {
  const tierBlur = projection.densityTier === "near"
    ? 0.8
    : projection.densityTier === "mid"
      ? 1.5
      : projection.densityTier === "far"
        ? 2.4
        : projection.blurPx;
  element.style.setProperty("--projection-size", `${Math.round(projection.sizePx * 10) / 10}px`);
  element.style.setProperty("--projection-opacity", String(Math.round(projection.opacity * 1000) / 1000));
  element.style.setProperty("--projection-blur", `${Math.round(tierBlur * 10) / 10}px`);
  element.style.setProperty("--projection-scale-x", String(Math.round(projection.scaleX * 1000) / 1000));
  element.style.setProperty("--projection-scale-y", String(Math.round(projection.scaleY * 1000) / 1000));
  element.style.setProperty("--projection-heading", `${Math.round(projection.heading * 10) / 10}deg`);
  element.dataset.densityTier = projection.densityTier || "continuous";
  element.dataset.altitudeSource = projection.altitudeSource || "unknown";
}

function visibleJets() {
  const bounds = currentViewportBounds(0);
  return businessJets.filter((jet) => aircraftPassesLockedFilter(jet) && positionInBounds(currentPosition(jet), bounds));
}

function visibleAirports() {
  const bounds = currentViewportBounds(0);
  return airports.filter((airport) => positionInBounds([airport.lat, airport.lng], bounds));
}

function selectedAircraft() {
  if (state.selectedKind !== "aircraft") {
    return null;
  }
  const selectedKey = normalizedLookupKey(state.selectedId);
  return aircraftById.get(selectedKey)
    || state.aircraftPanelRecords.get(selectedKey)
    || null;
}

function selectedAirport() {
  return state.selectedKind === "airport"
    ? airportById(state.selectedId)
    : null;
}

function aircraftIsSelected(jet) {
  return state.selectedKind === "aircraft" && jet.id === state.selectedId;
}

function aircraftSelectionProtectionKeys(jetOrId) {
  if (!jetOrId || typeof jetOrId !== "object") {
    return [normalizedLookupKey(jetOrId)].filter(Boolean);
  }
  return [
    jetOrId.id,
    jetOrId.uniqueKey,
    jetOrId.tailNoEncrypted,
    jetOrId.registration,
    jetOrId.tailNoClear,
    jetOrId.callsign
  ].map(normalizedLookupKey).filter(Boolean);
}

function pruneRecentlySelectedAircraft(now = Date.now()) {
  const retentionMs = Math.max(0, Number(mapLoadingConfig.aircraftRefresh.selectedRetentionMs) || 0);
  state.recentlySelectedAircraftIds = state.recentlySelectedAircraftIds.filter((item) => {
    const key = normalizedLookupKey(item);
    const rememberedAt = Number(state.recentlySelectedAircraftAt.get(key) || 0);
    const keep = key && rememberedAt && now - rememberedAt <= retentionMs;
    if (!keep) {
      state.recentlySelectedAircraftAt.delete(key);
    }
    return keep;
  });
}

function rememberRecentlySelectedAircraft(id) {
  const key = normalizedLookupKey(id);
  if (!key) {
    return;
  }
  pruneRecentlySelectedAircraft();
  state.recentlySelectedAircraftAt.set(key, Date.now());
  state.recentlySelectedAircraftIds = [
    key,
    ...state.recentlySelectedAircraftIds.filter((item) => normalizedLookupKey(item) !== key)
  ].slice(0, 3);
}

function clearRecentlySelectedAircraft() {
  state.recentlySelectedAircraftIds = [];
  state.recentlySelectedAircraftAt.clear();
}

function aircraftWasRecentlySelected(jetOrId) {
  pruneRecentlySelectedAircraft();
  const recentKeys = new Set(state.recentlySelectedAircraftIds.map(normalizedLookupKey).filter(Boolean));
  return aircraftSelectionProtectionKeys(jetOrId).some((key) => recentKeys.has(key));
}

function aircraftIsProtectedFromRemoval(jet) {
  return aircraftIsSelected(jet) || aircraftWasRecentlySelected(jet);
}

function aircraftIsPanelOnly(jet) {
  return Boolean(jet?.panelOnly);
}

function aircraftBySelectionProtectionKey(key) {
  const normalized = normalizedLookupKey(key);
  if (!normalized) {
    return null;
  }
  return aircraftById.get(normalized)
    || aircraftByUniqueKey.get(normalized)
    || aircraftByEncryptedTail.get(normalized)
    || aircraftByRegistration.get(normalized)
    || null;
}

function protectedAircraftForRendering(selected = selectedAircraft()) {
  pruneRecentlySelectedAircraft();
  const ids = new Set(state.recentlySelectedAircraftIds.map(normalizedLookupKey).filter(Boolean));
  if (selected?.id && !aircraftIsPanelOnly(selected)) {
    ids.add(normalizedLookupKey(selected.id));
  }
  return [...ids]
    .map(aircraftBySelectionProtectionKey)
    .filter((jet) => jet && !aircraftIsPanelOnly(jet) && aircraftPassesLockedFilter(jet) && !aircraftIsExpired(jet));
}

function mergeProtectedAircraft(rendered, protectedAircraft) {
  const merged = [...rendered];
  protectedAircraft.forEach((jet) => {
    if (!merged.some((item) => item.id === jet.id)) {
      merged.unshift(jet);
    }
  });
  return merged;
}

function aircraftIsFavorite(jet) {
  return Boolean(jet.favorite || jet.watchlist || jet.isFavorite);
}

function aircraftIsAlert(jet) {
  const squawk = String(jet.squawk || "");
  const status = String(jet.status || "").toLowerCase();
  return ["7500", "7600", "7700"].includes(squawk)
    || status.includes("emergency")
    || status.includes("alert")
    || status.includes("lost");
}

function aircraftIsAirportPhase(jet) {
  const altitude = Number(jet.altitude);
  const status = String(jet.status || "").toLowerCase();
  return status.includes("approach")
    || status.includes("climb")
    || status.includes("descent")
    || status.includes("landed")
    || status.includes("ground")
    || (Number.isFinite(altitude) && altitude < 10000);
}

function aircraftPassesLockedFilter(jet) {
  const category = String(jet.dataCategory || jet.aircraftCategory || "").toLowerCase();
  return category === "business_jet" || category === "j" || category.includes("business");
}

function aircraftPriority(jet) {
  if (aircraftIsSelected(jet)) {
    return -100000000;
  }
  let score = 0;
  if (aircraftFreshnessState(jet) === "stale") score += 1800000;
  if (aircraftFreshnessState(jet) === "expired") score += 3000000;
  if (aircraftIsAlert(jet)) score -= 900000;
  if (aircraftIsFavorite(jet)) score -= 800000;
  if (aircraftIsAirportPhase(jet)) score -= 160000;
  const displayPriority = Number(jet.displayPriority);
  if (Number.isFinite(displayPriority)) {
    score -= displayPriority * 1000;
  }
  const altitude = Number(jet.altitude);
  if (Number.isFinite(altitude)) {
    score -= Math.min(45000, altitude) / 20;
  }
  const updatedAt = aircraftLastUpdatedAt(jet);
  score -= Math.max(0, updatedAt - 1700000000000) / 1000000000;
  return score;
}

function aircraftMarkerZIndex(jet) {
  if (aircraftIsSelected(jet)) {
    return AIRCRAFT_MARKER_SELECTED_Z_INDEX;
  }
  return AIRCRAFT_MARKER_BASE_Z_INDEX - Math.min(160, Math.max(0, Math.round(aircraftPriority(jet) / 10000)));
}

function desiredAircraftLabelMode(jet) {
  if (aircraftIsSelected(jet)) {
    return "callsign";
  }
  if (!state.labels) {
    return "none";
  }
  const zoom = currentZoom();
  if (zoom < 5.5) {
    return "none";
  }
  if (zoom < 7.5) {
    return aircraftIsFavorite(jet) || aircraftIsAlert(jet) ? "callsign" : "none";
  }
  if (zoom < 8.5) {
    return aircraftIsFavorite(jet) || aircraftIsAlert(jet) || aircraftIsAirportPhase(jet) ? "callsign" : "none";
  }
  if (zoom < 9.5) {
    return aircraftIsFavorite(jet) || aircraftIsAlert(jet) || aircraftIsAirportPhase(jet) || aircraftPriority(jet) < -60000
      ? "callsign"
      : "none";
  }
  return "callsign";
}

function estimateAircraftLabelBox(jet, labelMode) {
  if (labelMode === "none" || !state.map?.project) {
    return null;
  }
  const point = state.map.project(currentPosition(jet));
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }
  const metrics = aircraftMarkerMetrics(jet);
  const text = aircraftMapLabelText(jet);
  const width = Math.min(104, Math.max(46, String(text).length * 7.2 + 16));
  const height = 20;
  const left = point.x - width / 2;
  const bottom = point.y - metrics.visualSize / 2 - metrics.labelGap;
  const top = bottom - height;
  return {
    left,
    right: left + width,
    top,
    bottom
  };
}

function estimateAircraftIconBox(jet) {
  if (!state.map?.project) {
    return null;
  }
  const point = state.map.project(currentPosition(jet));
  const metrics = aircraftMarkerMetrics(jet);
  const half = Math.max(14, metrics.visualSize / 2);
  return {
    left: point.x - half,
    right: point.x + half,
    top: point.y - half,
    bottom: point.y + half
  };
}

function applyAircraftLabelCollision(aircraftList) {
  const accepted = [];
  const selected = selectedAircraft();
  const selectedIconBox = selected ? estimateAircraftIconBox(selected) : null;
  let labelsUsed = 0;
  const limit = aircraftLabelLimit();

  return aircraftList.map((jet) => {
    const labelMode = desiredAircraftLabelMode(jet);
    if (aircraftIsSelected(jet)) {
      const selectedLabelBox = estimateAircraftLabelBox(jet, labelMode);
      if (selectedLabelBox) {
        accepted.push(selectedLabelBox);
      }
      return { ...jet, renderLabelMode: labelMode };
    }
    if (labelMode === "none" || labelsUsed >= limit) {
      return { ...jet, renderLabelMode: "none" };
    }
    const box = estimateAircraftLabelBox(jet, labelMode);
    if (!box || accepted.some((item) => boxesOverlap(item, box)) || (selectedIconBox && boxesOverlap(selectedIconBox, box, 8))) {
      return { ...jet, renderLabelMode: "none" };
    }
    labelsUsed += 1;
    accepted.push(box);
    return { ...jet, renderLabelMode: labelMode };
  });
}

function aircraftForCurrentView() {
  if (routeFocusActive() || state.hideOtherAircraft) {
    const selected = selectedAircraft();
    return selected && !aircraftIsPanelOnly(selected) ? applyAircraftLabelCollision([selected]) : [];
  }
  const selected = selectedAircraft();
  const protectedAircraft = protectedAircraftForRendering(selected);
  const protectedIds = new Set(protectedAircraft.map((jet) => jet.id));
  if (!state.map) {
    const cachedAircraft = businessJets.filter((jet) => aircraftPassesLockedFilter(jet) && !aircraftIsExpired(jet));
    const rendered = aircraftRenderIsLimited()
      ? cachedAircraft.slice(0, aircraftRenderLimit())
      : cachedAircraft;
    return applyAircraftLabelCollision(mergeProtectedAircraft(rendered, protectedAircraft));
  }
  const bounds = aircraftIconVisibilityUsesGlobalScope()
    ? null
    : currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const limit = aircraftRenderLimit();
  const inView = [];

  businessJets.forEach((jet) => {
    if (!aircraftPassesLockedFilter(jet)) {
      return;
    }
    const position = currentPosition(jet);
    if (aircraftIsExpired(jet)) {
      return;
    }
    if (!bounds || positionInBounds(position, bounds) || protectedIds.has(jet.id)) {
      inView.push(jet);
    }
  });

  inView.sort((a, b) => aircraftPriority(a) - aircraftPriority(b));
  const rendered = aircraftRenderIsLimited() ? inView.slice(0, limit) : inView;
  return applyAircraftLabelCollision(mergeProtectedAircraft(rendered, protectedAircraft));
}

function aircraftSizeClass(jet) {
  const sizeClass = jet.sizeClass || jet.category || "midsize";
  return aircraftSizeClasses.includes(sizeClass) ? sizeClass : "midsize";
}

function aircraftIconKey(jet) {
  return resolvedAircraftIconKey(jet);
}

function aircraftIconClassName(iconKey) {
  return `icon-${iconKey.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}`;
}

function aircraftBodyPath(jet) {
  return aircraftIconPaths[aircraftIconKey(jet)] || aircraftIconPaths[defaultBusinessJetIconKey];
}

function aircraftIconImagePath(jet) {
  return aircraftIconImagePaths[aircraftIconKey(jet)] || aircraftIconImagePaths[defaultBusinessJetIconKey] || "";
}

function aircraftIconStyle(jet) {
  return aircraftIconStyles[aircraftIconKey(jet)] || aircraftIconStyles[defaultBusinessJetIconKey];
}

function interpolateAircraftSize(sizeClass, zoom) {
  const clamped = clampZoom(zoom);
  const first = aircraftZoomSizeMatrix[0];
  const last = aircraftZoomSizeMatrix[aircraftZoomSizeMatrix.length - 1];

  if (clamped <= first.zoom) {
    return first.sizes[sizeClass];
  }
  if (clamped >= last.zoom) {
    return last.sizes[sizeClass];
  }

  for (let index = 0; index < aircraftZoomSizeMatrix.length - 1; index += 1) {
    const current = aircraftZoomSizeMatrix[index];
    const next = aircraftZoomSizeMatrix[index + 1];
    if (clamped >= current.zoom && clamped <= next.zoom) {
      const ratio = (clamped - current.zoom) / (next.zoom - current.zoom);
      const size = current.sizes[sizeClass] + (next.sizes[sizeClass] - current.sizes[sizeClass]) * ratio;
      return Math.round(size * 10) / 10;
    }
  }

  return last.sizes[sizeClass];
}

function aircraftMarkerMetrics(jet) {
  const selected = aircraftIsSelected(jet);
  const sizeClass = aircraftSizeClass(jet);
  const iconKey = aircraftIconKey(jet);
  const zoom = state.map?.getZoom ? state.map.getZoom() : defaultZoom();
  const baseSize = interpolateAircraftSize(sizeClass, zoom);
  const visualSize = selected ? Math.min(baseSize + 3, 63) : baseSize;
  const hitPadding = selected ? 6 : 4;
  const hitSize = Math.round(Math.max(visualSize + hitPadding, 26) * 10) / 10;
  const labelGap = selected ? 5 : 4;
  return {
    iconKey,
    iconStyle: aircraftIconStyle(jet),
    sizeClass,
    visualSize,
    hitSize,
    labelGap,
    labelBottom: Math.round(((hitSize + visualSize) / 2 + labelGap) * 10) / 10,
    labelHidden: jet.renderLabelMode === "none" || (!jet.renderLabelMode && zoom < 5.5 && !selected)
  };
}

function aircraftMarkerCssVars(jet) {
  const metrics = aircraftMarkerMetrics(jet);
  const iconStyle = metrics.iconStyle;
  return {
    metrics,
    cssText: `--aircraft-icon-size:${metrics.visualSize}px; --aircraft-hit-size:${metrics.hitSize}px; --aircraft-label-bottom:${metrics.labelBottom}px; --aircraft-label-gap:${metrics.labelGap}px; --aircraft-fill:${iconStyle.fill}; --aircraft-stroke:${iconStyle.stroke};`
  };
}

function aircraftMarkerClass(jet, metrics) {
  return [
    "aircraft-marker",
    metrics.sizeClass,
    aircraftIconClassName(metrics.iconKey),
    aircraftIsSelected(jet) ? "is-selected" : "",
    `is-${aircraftFreshnessState(jet)}`,
    aircraftIsAlert(jet) ? "is-alert" : "",
    metrics.labelHidden ? "label-hidden" : ""
  ].filter(Boolean).join(" ");
}

function applyAircraftMarkerStyle(element, jet) {
  const { metrics } = aircraftMarkerCssVars(jet);
  element.style.setProperty("--aircraft-icon-size", `${metrics.visualSize}px`);
  element.style.setProperty("--aircraft-hit-size", `${metrics.hitSize}px`);
  element.style.setProperty("--aircraft-label-bottom", `${metrics.labelBottom}px`);
  element.style.setProperty("--aircraft-label-gap", `${metrics.labelGap}px`);
  element.style.setProperty("--aircraft-fill", metrics.iconStyle.fill);
  element.style.setProperty("--aircraft-stroke", metrics.iconStyle.stroke);
  return metrics;
}

function aircraftSvg(jet, heading) {
  const sizeClass = aircraftSizeClass(jet);
  const iconKey = aircraftIconKey(jet);
  const imagePath = aircraftIconImagePath(jet);
  const iconGraphic = imagePath
    ? `<img class="aircraft-icon-image" src="${imagePath}" alt="">`
    : `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="${aircraftBodyPath(jet)}" /></svg>`;
  return `
    <div class="aircraft-marker-shell">
      <div class="aircraft-icon ${sizeClass} ${aircraftIconClassName(iconKey)}" data-icon-key="${iconKey}" style="transform: rotate(${heading}deg)">
        ${iconGraphic}
      </div>
    </div>
  `;
}

function markerHtml(jet) {
  const position = currentPosition(jet);
  const point = state.map.project(position);
  const heading = aircraftHeading(jet);
  const { metrics, cssText } = aircraftMarkerCssVars(jet);
  const labelText = aircraftMapLabelText(jet);
  const markerTitle = aircraftMapMarkerTitle(jet);
  return `
    <button type="button" class="${aircraftMarkerClass(jet, metrics)}" data-id="${escapeHtml(jet.id)}" data-icon-key="${escapeHtml(metrics.iconKey)}" style="left:${point.x}px; top:${point.y}px; ${cssText}" aria-label="${escapeHtml(markerTitle)}">
      ${aircraftSvg(jet, heading)}
      <span class="aircraft-label"><span class="aircraft-label-text">${escapeHtml(labelText)}</span></span>
    </button>
  `;
}

function aircraftTrackPath(jet) {
  if (Array.isArray(jet.trackRoute) && jet.trackRoute.length >= 2) {
    return jet.trackRoute;
  }
  if (Array.isArray(jet.route) && jet.route.length >= 2 && !jet.livePosition) {
    return [...jet.route.slice(0, -1), currentPosition(jet)];
  }
  return [currentPosition(jet)];
}

function parseTrackTime(value) {
  return parsePanelEpoch(value, { timeZone: "UTC" });
}

function normalizeAltitudeFeet(value, fallback) {
  const numeric = trackNumericValue(value);
  if (numeric !== null) {
    return numeric > 0 && numeric <= 15000 ? numeric * 3.28084 : numeric;
  }
  return trackNumericValue(fallback);
}

function trackNumericValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeSpeedKnots(value, fallback) {
  const numeric = trackNumericValue(value);
  if (numeric !== null) {
    return numeric > 650 ? numeric * 0.539957 : numeric;
  }
  return trackNumericValue(fallback);
}

function syntheticTrackValue(jet, index, total, key) {
  const cruiseValue = Number(jet[key]);
  if (!Number.isFinite(cruiseValue)) {
    return null;
  }
  if (total <= 2) {
    return cruiseValue;
  }
  const ratio = total > 1 ? index / (total - 1) : 1;
  const climb = clampRatio(ratio / 0.28);
  const descent = clampRatio((1 - ratio) / 0.22);
  if (key === "altitude") {
    return Math.max(250, cruiseValue * Math.min(climb, descent));
  }
  if (key === "speed") {
    return Math.max(40, cruiseValue * Math.min(climb, descent));
  }
  return cruiseValue;
}

function arrayTrackLatLng(point) {
  const first = Number(point?.[0]);
  const second = Number(point?.[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }
  const firstLooksLat = Math.abs(first) <= 90 && Math.abs(second) <= 180;
  const secondLooksLat = Math.abs(second) <= 90 && Math.abs(first) <= 180;
  if (firstLooksLat || !secondLooksLat) {
    return { lat: first, lng: second };
  }
  return { lat: second, lng: first };
}

function valueLooksLikeTrackTime(value) {
  if (typeof value === "string" && /[-T:\s]/.test(value.trim())) {
    return parseTrackTime(value) !== null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric) > 100000000;
}

function arrayTrackPointMetrics(point, jet, index, total) {
  const third = point?.[2];
  const fourth = point?.[3];
  const fifth = point?.[4];
  const sixth = point?.[5];
  const thirdIsTime = valueLooksLikeTrackTime(third);
  const fourthIsTime = valueLooksLikeTrackTime(fourth);
  const fifthIsTime = valueLooksLikeTrackTime(fifth);
  const hasMetricSlots = point.length >= 5 || (!thirdIsTime && !fourthIsTime && point.length >= 4);
  const altitudeValue = thirdIsTime
    ? fourth
    : fourthIsTime
      ? null
      : hasMetricSlots
        ? third
        : null;
  const speedValue = thirdIsTime
    ? fifth
    : fourthIsTime
      ? null
      : hasMetricSlots
        ? fourth
        : null;
  const headingValue = thirdIsTime || point.length >= 5 ? sixth : fourthIsTime ? third : null;
  return {
    altitudeFt: normalizeAltitudeFeet(altitudeValue, syntheticTrackValue(jet, index, total, "altitude")),
    groundSpeedKt: normalizeSpeedKnots(speedValue, syntheticTrackValue(jet, index, total, "speed")),
    heading: Number(headingValue ?? jet.heading),
    timestamp: parseTrackTime(thirdIsTime ? third : fourthIsTime ? fourth : fifthIsTime ? fifth : null)
  };
}

function normalizeTrackPoint(point, jet, index, total) {
  const arrayPoint = Array.isArray(point);
  const arrayCoordinates = arrayPoint ? arrayTrackLatLng(point) : null;
  const lat = arrayPoint ? Number(arrayCoordinates?.lat) : Number(point?.lat ?? point?.latitude);
  const lng = arrayPoint ? Number(arrayCoordinates?.lng) : Number(point?.lng ?? point?.lon ?? point?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) {
    return null;
  }
  const arrayMetrics = arrayPoint ? arrayTrackPointMetrics(point, jet, index, total) : null;
  const pointAltitudeFt = trackNumericValue(point?.altitudeFt);
  const pointAltitudeM = trackNumericValue(point?.altitudeM ?? point?.heightM);
  const pointSpeedKt = trackNumericValue(point?.groundSpeedKt ?? point?.speedKt ?? point?.groundSpeed ?? point?.gs);
  const pointSpeedKmh = trackNumericValue(point?.speedKmh);
  const altitudeFt = arrayPoint
    ? arrayMetrics.altitudeFt
    : pointAltitudeFt !== null
      ? pointAltitudeFt
      : pointAltitudeM !== null
        ? pointAltitudeM * 3.28084
        : normalizeAltitudeFeet(point.altitude ?? point.alt ?? point.height ?? point.baroAltitude, null);
  const groundSpeedKt = arrayPoint
    ? arrayMetrics.groundSpeedKt
    : pointSpeedKt !== null
      ? pointSpeedKt
      : pointSpeedKmh !== null
        ? pointSpeedKmh * 0.539957
        : normalizeSpeedKnots(point.speed ?? point.velocity, null);
  const isEstimated = Boolean(point?.isEstimated || point?.estimated || point?.quality === "estimated");
  return {
    lat,
    lng: normalizeLongitude(lng),
    altitudeFt: trackNumericValue(altitudeFt),
    groundSpeedKt: trackNumericValue(groundSpeedKt),
    heading: Number(arrayPoint ? arrayMetrics.heading : point?.heading ?? point?.course ?? point?.track ?? point?.bearing ?? jet.heading),
    timestamp: arrayPoint ? arrayMetrics.timestamp : parseTrackTime(point?.timestamp ?? point?.createTime ?? point?.time ?? point?.sampleTime ?? point?.positionTime),
    source: point?.source || point?.userMark || "",
    isEstimated,
    estimatedToNext: Boolean(point?.estimatedToNext),
    estimatedReason: point?.estimatedReason || point?.reason || "",
    quality: point?.quality || (isEstimated ? "estimated" : "good"),
    provisional: Boolean(point?.provisional)
  };
}

function selectedTrackKey(jet) {
  return String(jet?.uniqueKey || jet?.id || "");
}

function selectedTrackStoreMatches(jet) {
  const key = selectedTrackKey(jet);
  return Boolean(key && state.selectedTrackStore?.uniqueKey === key);
}

function createSelectedTrackStore(jet) {
  return {
    uniqueKey: selectedTrackKey(jet),
    aircraftId: jet?.id || "",
    historyPoints: [],
    liveTailPoints: [],
    mergedPoints: [],
    lastConfirmedTimestamp: 0,
    lastRealtimeTimestamp: 0,
    routeVersion: "",
    updatedAtEpochMs: Date.now(),
    revision: 0,
    signature: ""
  };
}

function trackPointTimestamp(point) {
  const timestamp = Number(point?.timestamp);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function maxTrackTimestamp(points = []) {
  return points.reduce((max, point) => {
    const timestamp = trackPointTimestamp(point);
    return timestamp === null ? max : Math.max(max, timestamp);
  }, 0);
}

function selectedTrackPointIsValid(point) {
  return Boolean(
    point
      && Number.isFinite(Number(point.lat))
      && Number.isFinite(Number(point.lng))
      && Number(point.lat) >= -90
      && Number(point.lat) <= 90
  );
}

function normalizeStoredTrackPoint(point, jet, index, total, source, provisional) {
  const input = Array.isArray(point)
    ? Object.assign([...point], { source, provisional })
    : {
        ...point,
        source,
        provisional
      };
  const normalized = normalizeTrackPoint(
    input,
    jet,
    index,
    total
  );
  if (!selectedTrackPointIsValid(normalized)) {
    return null;
  }
  return {
    ...normalized,
    uniqueKey: selectedTrackKey(jet),
    source,
    provisional: Boolean(provisional),
    lng: normalizeLongitude(normalized.lng)
  };
}

function selectedHistoryPointsFromDetail(jet, detail) {
  const coordinates = Array.isArray(detail?.coordinates) ? detail.coordinates : [];
  return coordinates
    .map((point, index) => normalizeStoredTrackPoint(point, jet, index, coordinates.length, "513009", false))
    .filter(Boolean);
}

function selectedInitialTrackPointsFromJet(jet) {
  if (Array.isArray(jet?.flightDetail?.coordinates) && jet.flightDetail.coordinates.length) {
    return selectedHistoryPointsFromDetail(jet, jet.flightDetail);
  }
  const source = Array.isArray(jet?.trackRoute) && jet.trackRoute.length >= 2
    ? jet.trackRoute
    : Array.isArray(jet?.route) && jet.route.length >= 2 && !jet.livePosition
      ? jet.route
      : [];
  return source
    .map((point, index) => normalizeStoredTrackPoint(point, jet, index, source.length, "initial", true))
    .filter(Boolean);
}

function selectedRealtimeTrackPointFromJet(jet) {
  if (!jet || !Array.isArray(jet.livePosition) || jet.livePosition.length !== 2) {
    return null;
  }
  const quality = jet.quality || "good";
  if (quality === "invalid" || quality === "stale") {
    return null;
  }
  const point = normalizeStoredTrackPoint(
    {
      lat: jet.livePosition[0],
      lng: jet.livePosition[1],
      altitudeFt: jet.altitude,
      groundSpeedKt: jet.speed,
      heading: aircraftHeading(jet),
      timestamp: jet.positionTimestamp || jet.updatedAtEpochMs || jet.updatedAt || jet.viewportSeenAtEpochMs || aircraftLastUpdatedAt(jet),
      quality,
      isEstimated: quality === "estimated"
    },
    jet,
    0,
    1,
    "513008",
    true
  );
  return point;
}

function trackPointsAreNear(first, second, distanceNm = mapLoadingConfig.trackContinuity.duplicateDistanceNm) {
  if (!selectedTrackPointIsValid(first) || !selectedTrackPointIsValid(second)) {
    return false;
  }
  return greatCircleDistanceNm(first, second) <= distanceNm;
}

function trackPointsAreDuplicate(first, second) {
  const firstTime = trackPointTimestamp(first);
  const secondTime = trackPointTimestamp(second);
  const near = trackPointsAreNear(first, second);
  if (firstTime !== null && secondTime !== null) {
    const timeDelta = Math.abs(firstTime - secondTime);
    return near || timeDelta === 0;
  }
  return near;
}

function preferIncomingTrackPoint(existing, incoming) {
  const existingOfficial = existing.source === "513009" || existing.provisional === false;
  const incomingOfficial = incoming.source === "513009" || incoming.provisional === false;
  if (incomingOfficial !== existingOfficial) {
    return incomingOfficial;
  }
  if (existing.quality !== "good" && incoming.quality === "good") {
    return true;
  }
  return false;
}

function mergeStoredTrackPoint(existing, incoming) {
  const useIncoming = preferIncomingTrackPoint(existing, incoming);
  const primary = useIncoming ? incoming : existing;
  const fallback = useIncoming ? existing : incoming;
  return {
    ...fallback,
    ...primary,
    timestamp: primary.timestamp ?? fallback.timestamp,
    altitudeFt: primary.altitudeFt ?? fallback.altitudeFt,
    groundSpeedKt: primary.groundSpeedKt ?? fallback.groundSpeedKt,
    heading: Number.isFinite(Number(primary.heading)) ? primary.heading : fallback.heading,
    estimatedToNext: Boolean(primary.estimatedToNext || fallback.estimatedToNext),
    estimatedReason: primary.estimatedReason || fallback.estimatedReason || "",
    provisional: Boolean(primary.provisional && fallback.provisional)
  };
}

function selectedTrackPointSignature(point) {
  return [
    Math.round(Number(point.lat) * 100000),
    Math.round(Number(point.lng) * 100000),
    trackPointTimestamp(point) || "",
    point.source || "",
    point.provisional ? "p" : "c",
    Math.round(Number(point.altitudeFt || 0)),
    Math.round(Number(point.groundSpeedKt || 0)),
    point.quality || "",
    point.estimatedToNext ? "e" : ""
  ].join(":");
}

function reconcileSelectedTrackStore(store) {
  if (!store) {
    return false;
  }
  const candidates = [
    ...store.historyPoints.map((point, order) => ({ point, order, sourceRank: 0 })),
    ...store.liveTailPoints.map((point, order) => ({ point, order, sourceRank: 1 }))
  ].filter((item) => selectedTrackPointIsValid(item.point));
  candidates.sort((first, second) => {
    const firstTime = trackPointTimestamp(first.point);
    const secondTime = trackPointTimestamp(second.point);
    if (firstTime !== null && secondTime !== null && firstTime !== secondTime) {
      return firstTime - secondTime;
    }
    if (firstTime !== null && secondTime === null) {
      return -1;
    }
    if (firstTime === null && secondTime !== null) {
      return 1;
    }
    if (first.sourceRank !== second.sourceRank) {
      return first.sourceRank - second.sourceRank;
    }
    return first.order - second.order;
  });

  const mergedPoints = [];
  candidates.forEach(({ point }) => {
    const lastPoint = mergedPoints[mergedPoints.length - 1];
    if (lastPoint && trackPointsAreDuplicate(lastPoint, point)) {
      mergedPoints[mergedPoints.length - 1] = mergeStoredTrackPoint(lastPoint, point);
      return;
    }
    mergedPoints.push(point);
  });

  const signature = mergedPoints.map(selectedTrackPointSignature).join("|");
  const changed = signature !== store.signature;
  store.mergedPoints = mergedPoints;
  store.lastConfirmedTimestamp = maxTrackTimestamp(store.historyPoints);
  store.lastRealtimeTimestamp = maxTrackTimestamp(store.liveTailPoints);
  store.updatedAtEpochMs = Date.now();
  store.signature = signature;
  if (changed) {
    store.revision += 1;
  }
  return changed;
}

function updateSelectedTrackHistoryFromDetail(store, jet, detail) {
  if (!store || !jet || !detail) {
    return false;
  }
  store.historyPoints = selectedHistoryPointsFromDetail(jet, detail);
  store.routeVersion = detail.selectedRouteVersion || detail.routeVersion || store.routeVersion || "";
  const lastConfirmedTimestamp = maxTrackTimestamp(store.historyPoints);
  if (lastConfirmedTimestamp) {
    const tolerance = mapLoadingConfig.trackContinuity.duplicateTimeToleranceMs;
    store.liveTailPoints = store.liveTailPoints.filter((point) => {
      const timestamp = trackPointTimestamp(point);
      return timestamp === null || timestamp > lastConfirmedTimestamp - tolerance;
    });
  }
  return reconcileSelectedTrackStore(store);
}

function ensureSelectedTrackStore(jet, options = {}) {
  if (!jet) {
    return null;
  }
  if (options.reset || !selectedTrackStoreMatches(jet)) {
    state.selectedTrackStore = createSelectedTrackStore(jet);
    state.selectedTrackStore.historyPoints = selectedInitialTrackPointsFromJet(jet);
    reconcileSelectedTrackStore(state.selectedTrackStore);
  }
  return state.selectedTrackStore;
}

function syncSelectedTrackHistoryFromDetail(jet, detail) {
  if (!jet || !detail || state.selectedKind !== "aircraft" || state.selectedId !== jet.id) {
    return false;
  }
  const store = ensureSelectedTrackStore(jet);
  return updateSelectedTrackHistoryFromDetail(store, jet, detail);
}

function appendSelectedRealtimeTrackPoint(jet) {
  if (!jet || state.selectedKind !== "aircraft" || state.selectedId !== jet.id) {
    return false;
  }
  const store = ensureSelectedTrackStore(jet);
  const point = selectedRealtimeTrackPointFromJet(jet);
  if (!store || !point) {
    return false;
  }

  const duplicateIndex = store.liveTailPoints.findIndex((existing) => trackPointsAreDuplicate(existing, point));
  if (duplicateIndex >= 0) {
    store.liveTailPoints[duplicateIndex] = mergeStoredTrackPoint(store.liveTailPoints[duplicateIndex], point);
  } else {
    const pointTime = trackPointTimestamp(point);
    if (store.lastRealtimeTimestamp && pointTime && pointTime < store.lastRealtimeTimestamp - mapLoadingConfig.trackContinuity.duplicateTimeToleranceMs) {
      return false;
    }
    store.liveTailPoints.push(point);
  }

  if (store.liveTailPoints.length > mapLoadingConfig.trackContinuity.liveTailMaxPoints) {
    store.liveTailPoints.splice(0, store.liveTailPoints.length - mapLoadingConfig.trackContinuity.liveTailMaxPoints);
  }
  return reconcileSelectedTrackStore(store);
}

function selectedRenderCurrentTrackPoint(jet, previousPoint = null) {
  if (!jet) {
    return null;
  }
  const position = currentPosition(jet);
  if (!Array.isArray(position) || position.length !== 2) {
    return null;
  }
  const lat = Number(position[0]);
  const lng = Number(position[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) {
    return null;
  }

  const previousTimestamp = trackPointTimestamp(previousPoint);
  const rawTimestamp = parseTrackTime(
    jet.positionTimestamp
      || jet.updatedAtEpochMs
      || jet.updatedAt
      || jet.viewportSeenAtEpochMs
      || aircraftLastUpdatedAt(jet)
  ) || Date.now();
  let timestamp = rawTimestamp;
  if (previousTimestamp !== null && timestamp <= previousTimestamp) {
    const distanceNm = selectedTrackPointIsValid(previousPoint)
      ? greatCircleDistanceNm(previousPoint, { lat, lng: normalizeLongitude(lng) })
      : 0;
    const plausibleElapsedMs = Math.ceil(distanceNm * 3600000 / Math.max(1, routeStyle.maxImpliedSpeedKt)) + 1000;
    timestamp = previousTimestamp + Math.max(1, plausibleElapsedMs);
  }

  return normalizeStoredTrackPoint(
    {
      lat,
      lng,
      altitudeFt: jet.altitude,
      groundSpeedKt: jet.speed,
      heading: aircraftHeading(jet),
      timestamp,
      quality: jet.quality || "good",
      isEstimated: jet.quality === "estimated"
    },
    jet,
    0,
    1,
    "render-current",
    true
  );
}

function estimatedLatestEndpointPoint(point, previousPoint, reason) {
  const previousTimestamp = trackPointTimestamp(previousPoint);
  let timestamp = trackPointTimestamp(point) || Date.now();
  if (previousTimestamp !== null) {
    const distanceNm = selectedTrackPointIsValid(previousPoint)
      ? greatCircleDistanceNm(previousPoint, point)
      : 0;
    const plausibleElapsedMs = Math.ceil(distanceNm * 3600000 / Math.max(1, routeStyle.maxImpliedSpeedKt)) + 1000;
    timestamp = Math.max(timestamp, previousTimestamp + Math.max(routeStyle.maxGapMs + 1, plausibleElapsedMs));
  }
  return {
    ...point,
    timestamp,
    isEstimated: true,
    quality: "estimated",
    estimatedReason: reason || "latest_position_gap",
    provisional: true
  };
}

function selectedTrackPointsWithCurrentEndpoint(jet, sourcePoints) {
  const points = Array.isArray(sourcePoints)
    ? sourcePoints.filter(Boolean).map((point) => ({ ...point }))
    : [];
  const lastPoint = points[points.length - 1] || null;
  let currentPoint = selectedRenderCurrentTrackPoint(jet, lastPoint);
  if (!currentPoint) {
    return points;
  }
  if (!lastPoint) {
    return [currentPoint];
  }

  if (trackPointsAreNear(lastPoint, currentPoint)) {
    points[points.length - 1] = {
      ...lastPoint,
      ...currentPoint,
      altitudeFt: currentPoint.altitudeFt ?? lastPoint.altitudeFt,
      groundSpeedKt: currentPoint.groundSpeedKt ?? lastPoint.groundSpeedKt,
      heading: Number.isFinite(Number(currentPoint.heading)) ? currentPoint.heading : lastPoint.heading,
      source: "render-current",
      provisional: true
    };
    return points;
  }

  const breakReason = trackBreakReason(lastPoint, currentPoint);
  if (breakReason) {
    currentPoint = estimatedLatestEndpointPoint(currentPoint, lastPoint, breakReason);
  }
  return [...points, currentPoint];
}

function aircraftTrackPoints(jet) {
  if (aircraftIsSelected(jet) && selectedTrackStoreMatches(jet) && state.selectedTrackStore.mergedPoints.length) {
    return selectedTrackPointsWithCurrentEndpoint(jet, state.selectedTrackStore.mergedPoints);
  }
  const source = Array.isArray(jet.flightDetail?.coordinates) && jet.flightDetail.coordinates.length >= 2
    ? jet.flightDetail.coordinates
    : aircraftTrackPath(jet);
  const points = source
    .map((point, index) => normalizeTrackPoint(point, jet, index, source.length))
    .filter(Boolean);
  points.sort((a, b) => {
    if (!Number.isFinite(a.timestamp) || !Number.isFinite(b.timestamp)) {
      return 0;
    }
    return a.timestamp - b.timestamp;
  });

  if (!Array.isArray(jet.flightDetail?.coordinates) || !jet.flightDetail.coordinates.length) {
    return aircraftIsSelected(jet) ? selectedTrackPointsWithCurrentEndpoint(jet, points) : points;
  }
  const position = currentPosition(jet);
  const currentPoint = {
    lat: Number(position[0]),
    lng: normalizeLongitude(position[1]),
    altitudeFt: trackNumericValue(jet.altitude),
    groundSpeedKt: trackNumericValue(jet.speed),
    heading: Number(jet.heading),
    timestamp: aircraftLastUpdatedAt(jet) || Date.now(),
    source: jet.source || "realtime",
    isEstimated: false,
    estimatedToNext: false,
    estimatedReason: "",
    quality: jet.quality || "good"
  };
  if (!Number.isFinite(currentPoint.lat) || !Number.isFinite(currentPoint.lng) || currentPoint.lat < -90 || currentPoint.lat > 90) {
    return points;
  }
  const lastPoint = points[points.length - 1];
  if (!lastPoint) {
    return [currentPoint];
  }
  if (greatCircleDistanceNm(lastPoint, currentPoint) < 0.05) {
    points[points.length - 1] = {
      ...lastPoint,
      ...currentPoint,
      altitudeFt: currentPoint.altitudeFt ?? lastPoint.altitudeFt,
      groundSpeedKt: currentPoint.groundSpeedKt ?? lastPoint.groundSpeedKt
    };
    return points;
  }
  points.push(currentPoint);
  return aircraftIsSelected(jet) ? selectedTrackPointsWithCurrentEndpoint(jet, points) : points;
}

function trackPointHasSemanticBoundary(point, previous) {
  if (!point) {
    return false;
  }
  const estimated = Boolean(point.isEstimated || point.quality === "estimated");
  const previousEstimated = Boolean(previous?.isEstimated || previous?.quality === "estimated");
  return point.estimatedToNext
    || point.quality === "invalid"
    || previous?.quality === "invalid"
    || estimated !== previousEstimated
    || Boolean(previous && (trackEstimationReason(previous, point) || trackBreakReason(previous, point)));
}

function trackSpanHasSemanticBoundary(points, startIndex, endIndex) {
  for (let index = startIndex + 1; index <= endIndex; index += 1) {
    if (trackPointHasSemanticBoundary(points[index], points[index - 1])) {
      return true;
    }
  }
  return false;
}

function sampledTrackPointForRender(points, indexes, outputIndex) {
  const sourceIndex = indexes[outputIndex];
  const point = points[sourceIndex];
  const nextSourceIndex = indexes[outputIndex + 1];
  if (
    !Number.isFinite(nextSourceIndex)
      || nextSourceIndex <= sourceIndex + 1
      || trackSpanHasSemanticBoundary(points, sourceIndex, nextSourceIndex)
  ) {
    return point;
  }
  return {
    ...point,
    renderActualToNext: true
  };
}

function sampledTrackPoints(points, maxPoints) {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return points;
  }

  const requiredIndexes = new Set([0, points.length - 1]);
  points.forEach((point, index) => {
    if (!trackPointHasSemanticBoundary(point, points[index - 1])) {
      return;
    }
    for (let offset = -1; offset <= 1; offset += 1) {
      const boundaryIndex = index + offset;
      if (boundaryIndex >= 0 && boundaryIndex < points.length) {
        requiredIndexes.add(boundaryIndex);
      }
    }
  });

  const targetCount = Math.max(maxPoints, requiredIndexes.size);
  const step = (points.length - 1) / Math.max(1, targetCount - 1);
  for (let index = 0; index < targetCount && requiredIndexes.size < targetCount; index += 1) {
    requiredIndexes.add(Math.round(index * step));
  }
  for (let index = 0; index < points.length && requiredIndexes.size < targetCount; index += 1) {
    requiredIndexes.add(index);
  }
  const indexes = [...requiredIndexes].sort((a, b) => a - b);
  return indexes.map((_, outputIndex) => sampledTrackPointForRender(points, indexes, outputIndex));
}

function trackPointsForRender(jet, selected) {
  const points = aircraftTrackPoints(jet);
  const selectedLimit = Math.min(
    mapLoadingConfig.selectedTrackMaxPoints,
    steppedValue(mapLoadingConfig.selectedTrackLimitByZoom, currentZoom(), "limit")
  );
  const maxPoints = selected ? selectedLimit : mapLoadingConfig.regularTrackMaxPoints;
  return sampledTrackPoints(points, maxPoints);
}

function averageMetric(startValue, endValue) {
  const values = [startValue, endValue].map(trackNumericValue).filter((value) => value !== null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function segmentColor(start, end, colorMode = state.routeColorMode, metricValues = {}) {
  if (colorMode === "speed") {
    if (metricValues.startSpeed === null || metricValues.endSpeed === null) {
      return routeStyle.missingColor;
    }
    return speedTrailColor(averageMetric(metricValues.startSpeed, metricValues.endSpeed));
  }
  if (metricValues.startAltitude === null || metricValues.endAltitude === null) {
    return routeStyle.missingColor;
  }
  return altitudeTrailColor(averageMetric(metricValues.startAltitude, metricValues.endAltitude));
}

function greatCircleDistanceNm(start, end) {
  const lat1 = Number(start.lat) * Math.PI / 180;
  const lat2 = Number(end.lat) * Math.PI / 180;
  const deltaLat = lat2 - lat1;
  const deltaLng = (Number(end.lng) - Number(start.lng)) * Math.PI / 180;
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
}

function trackSegmentElapsedMs(start, end) {
  if (!start.timestamp || !end.timestamp) {
    return null;
  }
  const elapsedMs = end.timestamp - start.timestamp;
  return Number.isFinite(elapsedMs) ? elapsedMs : null;
}

function trackSegmentImpliedSpeedKt(start, end, elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return Infinity;
  }
  return greatCircleDistanceNm(start, end) * 3600000 / elapsedMs;
}

function trackEstimationReason(start, end) {
  if (start.estimatedToNext) {
    return start.estimatedReason || "coverage_gap";
  }
  if (start.isEstimated || end.isEstimated || start.quality === "estimated" || end.quality === "estimated") {
    return start.estimatedReason || end.estimatedReason || "estimated";
  }
  if (start.renderActualToNext) {
    return "";
  }
  const elapsedMs = trackSegmentElapsedMs(start, end);
  if (elapsedMs === null) {
    return "";
  }
  if (elapsedMs <= 0) {
    return "interrupted_gap";
  }
  const impliedSpeedKt = trackSegmentImpliedSpeedKt(start, end, elapsedMs);
  if (impliedSpeedKt > routeStyle.maxImpliedSpeedKt) {
    return "interrupted_gap";
  }
  return elapsedMs > routeStyle.maxGapMs ? "coverage_gap" : "";
}

function trackBreakReason(start, end) {
  if (start.quality === "invalid" || end.quality === "invalid") {
    return "invalid_quality";
  }
  return "";
}

function splitTrackPathAtAntimeridian(start, end) {
  const startLng = normalizeLongitude(start.lng);
  const endLng = normalizeLongitude(end.lng);
  const rawDelta = endLng - startLng;
  if (Math.abs(rawDelta) <= 180) {
    return [[[start.lat, startLng], [end.lat, endLng]]];
  }

  const unwrappedEndLng = rawDelta > 180 ? endLng - 360 : endLng + 360;
  const boundaryLng = unwrappedEndLng > startLng ? 180 : -180;
  const ratio = (boundaryLng - startLng) / (unwrappedEndLng - startLng);
  const boundaryLat = start.lat + (end.lat - start.lat) * ratio;
  const oppositeBoundaryLng = boundaryLng === 180 ? -180 : 180;
  return [
    [[start.lat, startLng], [boundaryLat, boundaryLng]],
    [[boundaryLat, oppositeBoundaryLng], [end.lat, endLng]]
  ];
}

function trackPointIdentity(point, fallbackIndex) {
  if (Number.isFinite(point.timestamp)) {
    return `t${point.timestamp}`;
  }
  return `p${Number(point.lat).toFixed(5)},${Number(point.lng).toFixed(5)},${fallbackIndex}`;
}

function metricsWithMissingCarry(points, key) {
  let lastValid = null;
  let missingCount = 0;
  return points.map((point) => {
    const value = trackNumericValue(point[key]);
    if (value !== null) {
      lastValid = value;
      missingCount = 0;
      return value;
    }
    missingCount += 1;
    return missingCount <= routeStyle.maxMissingCarryPoints ? lastValid : null;
  });
}

function trackSegments(points, selected, colorMode = state.routeColorMode) {
  const segments = [];
  const altitudeValues = metricsWithMissingCarry(points, "altitudeFt");
  const speedValues = metricsWithMissingCarry(points, "groundSpeedKt");
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const invalidQuality = start.quality === "invalid" || end.quality === "invalid";
    const estimatedReason = invalidQuality ? "" : trackEstimationReason(start, end);
    const estimated = Boolean(estimatedReason);
    const invalidReason = invalidQuality ? "invalid_quality" : estimated ? "" : trackBreakReason(start, end);
    const color = estimated ? routeStyle.estimatedColor : segmentColor(start, end, colorMode, {
        startAltitude: altitudeValues[index],
        endAltitude: altitudeValues[index + 1],
        startSpeed: speedValues[index],
        endSpeed: speedValues[index + 1]
      });
    const paths = invalidReason
      ? [[[start.lat, start.lng], [end.lat, end.lng]]]
      : splitTrackPathAtAntimeridian(start, end);
    paths.forEach((path, pathIndex) => {
      segments.push({
        id: `${trackPointIdentity(start, index)}>${trackPointIdentity(end, index + 1)}:${pathIndex}`,
        path,
        pathBreakBefore: pathIndex > 0,
        color,
        estimated,
        estimatedReason,
        invalid: Boolean(invalidReason),
        invalidReason,
        selected,
        start,
        end
      });
    });
  }
  return segments;
}

function actualTrackPaths(segments) {
  const paths = [];
  let currentPath = [];
  const flushPath = () => {
    if (currentPath.length >= 2) {
      paths.push(currentPath);
    }
    currentPath = [];
  };
  const coordinatesMatch = (first, second) => Math.abs(first[0] - second[0]) < 0.000001
    && Math.abs(first[1] - second[1]) < 0.000001;
  segments.forEach((segment) => {
    if (segment.estimated || segment.invalid) {
      flushPath();
      return;
    }
    const [start, end] = segment.path;
    if (segment.pathBreakBefore || (currentPath.length && !coordinatesMatch(currentPath[currentPath.length - 1], start))) {
      flushPath();
    }
    if (!currentPath.length) {
      currentPath.push(start);
    }
    currentPath.push(end);
  });
  flushPath();
  return paths;
}

function trackReasonLabel(reason) {
  const labels = {
    actual: "Actual",
    estimated: "Estimated",
    coverage_gap: "Coverage gap",
    interrupted_gap: "Interrupted gap",
    latest_position_gap: "Live tail gap",
    invalid_quality: "Invalid",
    planned_route: "Planned",
    planned_destination: "Destination link"
  };
  return labels[reason] || displayOrDash(reason);
}

function formatTrackDistanceNm(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return NA_TEXT;
  }
  return `${numeric < 10 ? numeric.toFixed(1) : Math.round(numeric)} nm`;
}

function formatTrackElapsed(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return NA_TEXT;
  }
  return formatDuration(numeric);
}

function clearAllRenderedTracks() {
  state.map?.removeInactiveTracks?.(new Set());
}

function renderSelectedAircraftTrack() {
  const activeIds = new Set();
  const jet = selectedAircraft();
  if (!state.trails || state.selectedKind !== "aircraft" || !jet || aircraftIsPanelOnly(jet)) {
    clearAllRenderedTracks();
    return;
  }

  activeIds.add(jet.id);
  state.map.setTrack(jet.id, trackPointsForRender(jet, true), true, {
    stale: aircraftFreshnessState(jet) === "stale",
    plannedPath: selectedPlannedRoutePath(jet)
  });
  state.map.removeInactiveTracks?.(activeIds);
}

function selectedLatestEndpointDiagnostics(jet = selectedAircraft()) {
  if (!jet) {
    return null;
  }
  const store = selectedTrackStoreMatches(jet) ? state.selectedTrackStore : null;
  const storedPoints = store?.mergedPoints || [];
  const storedLast = storedPoints[storedPoints.length - 1] || null;
  const renderCurrent = selectedRenderCurrentTrackPoint(jet, storedLast);
  if (!storedLast || !renderCurrent) {
    return {
      uniqueKey: selectedTrackKey(jet),
      aircraftId: jet.id,
      registration: jet.registration,
      reason: !storedLast ? "no_stored_track_tail" : "no_current_position",
      storedTailPoint: storedLast,
      currentPoint: renderCurrent
    };
  }
  const elapsedMs = trackSegmentElapsedMs(storedLast, renderCurrent);
  const distanceNm = greatCircleDistanceNm(storedLast, renderCurrent);
  const impliedSpeedKt = trackSegmentImpliedSpeedKt(storedLast, renderCurrent, elapsedMs);
  const estimationReason = trackEstimationReason(storedLast, renderCurrent);
  const breakReason = trackBreakReason(storedLast, renderCurrent);
  return {
    uniqueKey: selectedTrackKey(jet),
    aircraftId: jet.id,
    registration: jet.registration,
    reason: estimationReason || breakReason || "actual",
    elapsedMs,
    distanceNm: Math.round(distanceNm * 100) / 100,
    impliedSpeedKt: Number.isFinite(impliedSpeedKt) ? Math.round(impliedSpeedKt) : null,
    storedTailPoint: storedLast,
    currentPoint: renderCurrent,
    historyPoints: store?.historyPoints.length || 0,
    liveTailPoints: store?.liveTailPoints.length || 0,
    mergedPoints: storedPoints.length
  };
}

function renderAircraft() {
  const start = performance.now();
  document.body.classList.toggle("labels-off", !state.labels);
  const aircraftLayer = document.getElementById("aircraftLayer");
  const aircraftMarkers = aircraftForCurrentView();
  state.renderedAircraft = aircraftMarkers;
  state.aircraftViewportLoaded = aircraftMarkers.length;
  updateAircraftIconDiagnostics(aircraftMarkers);
  if (state.map.renderAircraftMarkers) {
    state.map.renderAircraftMarkers(aircraftMarkers);
  } else {
    aircraftLayer.innerHTML = aircraftMarkers.map(markerHtml).join("");
    aircraftLayer.querySelectorAll(".aircraft-marker").forEach((button) => {
      button.addEventListener("click", () => selectAircraft(button.dataset.id));
    });
  }
  enqueueIconTypeCodeProfileLoads(aircraftMarkers);
  renderSelectedAircraftTrack();
  state.lastRenderCostMs = Math.round((performance.now() - start) * 10) / 10;
}

function updateAircraftIconDiagnostics(aircraftList = []) {
  const unmapped = new Map();
  let mappedCount = 0;
  let missingCount = 0;
  aircraftList.forEach((jet) => {
    const resolution = resolveAircraftIcon(jet);
    if (!resolution.icaoCode) {
      missingCount += 1;
      return;
    }
    if (resolution.fallbackReason) {
      if (!unmapped.has(resolution.icaoCode)) {
        unmapped.set(resolution.icaoCode, {
          icaoCode: resolution.icaoCode,
          count: 0,
          sample: jet.registration || jet.callsign || jet.id || ""
        });
      }
      unmapped.get(resolution.icaoCode).count += 1;
      return;
    }
    mappedCount += 1;
  });
  const selected = selectedAircraft();
  state.aircraftIconDiagnostics = {
    mappingVersion: aircraftIconMappingVersion,
    renderedAircraft: aircraftList.length,
    mappedCount,
    missingIcaoCodeCount: missingCount,
    unmappedIcaoCodeCount: [...unmapped.values()].reduce((sum, item) => sum + item.count, 0),
    unmappedIcaoCodes: [...unmapped.values()].sort((a, b) => a.icaoCode.localeCompare(b.icaoCode)),
    selectedAircraft: selected ? {
      registration: selected.registration || selected.callsign || selected.id,
      ...resolveAircraftIcon(selected)
    } : null
  };
  window.BIZJET_AIRCRAFT_ICON_DIAGNOSTICS = state.aircraftIconDiagnostics;
  document.body.dataset.aircraftIconDiagnostics = JSON.stringify(state.aircraftIconDiagnostics);
}

function renderAirports() {
  const airportLayer = document.getElementById("airportLayer");
  if (!state.airports && !selectedAirport() && !getSelectedAircraftRouteEndpointMap().size) {
    state.hoveredAirportId = null;
    syncAirportHoverMarkers("");
    state.renderedAirports = [];
    if (state.map.renderAirportMarkers) {
      state.map.renderAirportMarkers([]);
    } else {
      airportLayer.innerHTML = "";
    }
    return;
  }
  const airportMarkers = airportsForCurrentView();
  if (state.hoveredAirportId && !airportMarkers.some((airport) => airport.id === state.hoveredAirportId)) {
    state.hoveredAirportId = null;
  }
  state.renderedAirports = airportMarkers;
  if (state.map.renderAirportMarkers) {
    state.map.renderAirportMarkers(airportMarkers);
    restoreAirportHoverFromPointer();
    return;
  }
  airportLayer.innerHTML = airportMarkers.map((airport) => {
    const point = state.map.project([airport.lat, airport.lng]);
    const { metrics, cssText } = airportMarkerCssVars(airport);
    const activeIds = activeAirportPopupIds();
    const hoveredClass = airportHoverIsActive(airport.id, activeIds) ? " is-hovered" : "";
    const popupReadyClass = airportPopupIsReady(airport.id, activeIds) ? " is-popup-ready" : "";
    const currentHover = airportHoverId(state.hoveredAirportId) === airportHoverId(airport.id);
    const currentHoverClass = currentHover ? " is-current-hover" : "";
    const currentHoverAttr = currentHover ? ' data-current-hover="true"' : "";
    const routeEndpointRole = selectedAircraftRouteEndpointRole(airport);
    const routeEndpointAttr = routeEndpointRole ? ` data-route-endpoint-role="${routeEndpointRole}"` : "";
    const popupVars = airportPopupPlacementVars(airport, activeIds);
    const popupCssText = `--airport-popup-left:${popupVars.left}; --airport-popup-top:${popupVars.top}; --airport-popup-transform:${popupVars.transform};`;
    return `
      <button type="button" class="${airportMarkerClass(airport, metrics)}${hoveredClass}${popupReadyClass}${currentHoverClass}" data-id="${airport.id}" data-level="${airportPriorityLevel(airport)}" data-marker-visible="${metrics.visualWidth > 0 && metrics.visualHeight > 0}"${airportParkingBadgeDataAttributes(airport)} data-popup-placement="${popupVars.placement}"${currentHoverAttr}${routeEndpointAttr} style="left:${point.x}px; top:${point.y}px; ${cssText} ${popupCssText}" aria-label="${escapeHtml(airportFullLabel(airport))}">
        <span class="airport-marker-hit">
          <span class="marker-map-shadow airport-map-shadow" aria-hidden="true"></span>
          <span class="airport-pin-symbol">
            <svg class="airport-pin-icon" viewBox="0 0 28 36" aria-hidden="true">
              <path class="airport-pin-body" d="M14 1.8C7.1 1.8 2.3 6.8 2.3 13.2c0 7.8 9.2 19 11 21a.95.95 0 0 0 1.4 0c1.8-2 11-13.2 11-21C25.7 6.8 20.9 1.8 14 1.8Z"></path>
              <path class="airport-pin-tower" d="M12.4 8.5h3.2l.8 4.1h2.1v2.2h-1.7l.9 4.8h1.5v2.2H8.8v-2.2h1.5l.9-4.8H9.5v-2.2h2.1l.8-4.1Zm.5 11.1h2.2l-.8-4.8h-.6l-.8 4.8Zm.2-7h1.8l-.3-1.8h-1.2l-.3 1.8Z"></path>
            </svg>
            ${airportParkingBadgeHtml(airport)}
          </span>
          <span class="airport-code-label">${escapeHtml(airport.renderLabelMode === "full" ? airportFullLabel(airport) : airportDisplayCode(airport))}</span>
          <span class="airport-hover-label">${airportHoverLabelHtml(airport)}</span>
        </span>
      </button>
    `;
  }).join("");
  airportLayer.querySelectorAll(".airport-pin").forEach((button) => {
    button.addEventListener("click", () => selectAirport(button.dataset.id));
    button.addEventListener("mouseenter", (event) => beginAirportMarkerHover(button.dataset.id, event));
    button.addEventListener("mousemove", updateAirportHoverPointer);
    button.addEventListener("mouseleave", (event) => endAirportMarkerHover(button.dataset.id, event));
  });
  restoreAirportHoverFromPointer();
}

function airportDistanceSortScore(item, centerPoint) {
  if (!item?.point || !centerPoint) {
    return 0;
  }
  const dx = Number(item.point.x) - Number(centerPoint.x);
  const dy = Number(item.point.y) - Number(centerPoint.y);
  return Number.isFinite(dx) && Number.isFinite(dy) ? dx * dx + dy * dy : 0;
}

function airportHoverNeedsDetail(airport) {
  if (!airport || airport.apiDetail) {
    return false;
  }
  const parts = airportHoverLabelParts(airport);
  return parts.nameCn === "N/A" || parts.nameEn === "N/A" || parts.icao === "N/A";
}

function handleAirportMarkerHover(id) {
  const airport = airportById(id);
  if (airportHoverNeedsDetail(airport)) {
    loadAirportDetail(airport);
  }
}

function airportsForCurrentView() {
  const protectedIds = protectedAirportIds();
  if (!state.map) {
    const maxLevel = airportLevelLimit();
    const baseRecords = airports
      .map(normalizeAirportRecord)
      .filter((airport) => airportPriorityLevel(airport) <= maxLevel)
      .filter(airportMarkerIsVisible);
    return applyAirportLabelCollision(
      addProtectedAirports(baseRecords, protectedIds)
    );
  }
  if (airportLayerIsOff()) {
    return applyAirportLabelCollision(protectedAirportRecords(protectedIds));
  }
  const bounds = currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const maxLevel = airportLevelLimit();
  const maxMarkers = airportRenderLimit();
  const inView = airports
    .filter((airport) => positionInBounds([airport.lat, airport.lng], bounds))
    .map((airport) => normalizeAirportRecord(airport))
    .map((airport) => ({
      airport,
      level: airportPriorityLevel(airport),
      protected: airportIsProtected(airport, protectedIds),
      point: state.map.project ? state.map.project([airport.lat, airport.lng]) : null
    }))
    .filter((item) => (item.protected || item.level <= maxLevel) && airportMarkerIsVisible(item.airport))
    .sort((a, b) => Number(b.protected) - Number(a.protected)
      || a.level - b.level
      || airportDistanceSortScore(a, state.map.project ? state.map.project(currentMapCenter()) : null)
      - airportDistanceSortScore(b, state.map.project ? state.map.project(currentMapCenter()) : null));
  const rendered = Number.isFinite(maxMarkers)
    ? inView.slice(0, maxMarkers).map((item) => item.airport)
    : inView.map((item) => item.airport);
  addProtectedAirports(rendered, protectedIds);
  return applyAirportLabelCollision(rendered);
}

function finiteNumber(value) {
  return Number.isFinite(Number(value));
}

function missingValue(value) {
  if (value === null || value === undefined) {
    return true;
  }
  const text = String(value).trim();
  if (!text) {
    return true;
  }
  const normalized = text.replace(/\s+/g, " ").toUpperCase();
  return missingValueTexts.has(normalized)
    || /^(UNKNOWN|UNCONFIRMED)( AIRPORT| DESTINATION)?$/.test(normalized)
    || /^(目的地|到达机场|机场)?(未知|待确认|待定|未确认)$/.test(text);
}

function firstMatchedValue(...values) {
  const matched = values.find((value) => !missingValue(value));
  return matched === undefined ? NA_TEXT : matched;
}

function mergePresentFields(...records) {
  return records.reduce((merged, record) => {
    Object.entries(record || {}).forEach(([key, value]) => {
      if (!missingValue(value)) {
        merged[key] = value;
      }
    });
    return merged;
  }, {});
}

function displayOrDash(value) {
  return missingValue(value) ? NA_TEXT : value;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = displayOrDash(value);
  }
}

function setPanelText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value).trim().toUpperCase() === "N/A" ? "N/A" : displayOrDash(value);
  }
}

function setTextWithToast(id, value, toastValue = value) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  const text = displayOrDash(value);
  element.textContent = text;
  const toastText = displayOrDash(toastValue);
  if (toastText === NA_TEXT) {
    element.removeAttribute("data-toast-text");
    element.removeAttribute("title");
    return;
  }
  element.dataset.toastText = String(toastText);
  element.title = String(toastText);
}

function setHtml(id, html) {
  const element = document.getElementById(id);
  if (element) {
    element.innerHTML = html || NA_TEXT;
  }
}

function normalizeFieldText(value) {
  return String(displayOrDash(value));
}

function formatAltitude(value) {
  return finiteNumber(value) ? `${formatNumber(Number(value))} ft` : NA_TEXT;
}

function formatFlightLevel(value) {
  return finiteNumber(value) ? `FL${Math.round(Number(value) / 100)}` : NA_TEXT;
}

function formatSpeed(value) {
  return finiteNumber(value) ? `${Math.round(Number(value))} kt` : NA_TEXT;
}

function chartUnitMode() {
  return state.speedAltitudeUnit === "metric" ? "metric" : "imperial";
}

function chartUnitLabels(unit = chartUnitMode()) {
  return unit === "metric"
    ? { altitude: "M", speed: "KMH" }
    : { altitude: "FT", speed: "KT" };
}

function formatChartAltitude(value, unit = chartUnitMode()) {
  if (!finiteNumber(value)) {
    return NA_TEXT;
  }
  const numeric = Number(value);
  return unit === "metric"
    ? `${formatNumber(Math.round(numeric * 0.3048))} m`
    : `${formatNumber(Math.round(numeric))} ft`;
}

function formatChartSpeed(value, unit = chartUnitMode()) {
  if (!finiteNumber(value)) {
    return NA_TEXT;
  }
  const numeric = Number(value);
  return unit === "metric"
    ? `${formatNumber(Math.round(numeric * 1.852))} km/h`
    : `${Math.round(numeric)} kt`;
}

function formatVerticalSpeed(value) {
  return finiteNumber(value) ? `${formatNumber(Number(value))} fpm` : NA_TEXT;
}

function binaryStateLabel(value, positive = "是", negative = "否") {
  const text = String(value ?? "").trim();
  if (!text) {
    return NA_TEXT;
  }
  if (text === "1" || /^true$/i.test(text)) {
    return positive;
  }
  if (text === "0" || /^false$/i.test(text)) {
    return negative;
  }
  return text;
}

function serviceStatusLabel(value) {
  return binaryStateLabel(value, "已营运", "未营运");
}

function shareStateLabel(value) {
  return binaryStateLabel(value, "已共享", "未共享");
}

function certStateLabel(value) {
  const code = String(value ?? "").trim();
  if (code === "0") return "未认证";
  if (code === "1") return "审核中";
  if (code === "2") return "已认证";
  return code || NA_TEXT;
}

function formatSpecDistance(value, unit = "km") {
  if (missingValue(value)) {
    return NA_TEXT;
  }
  return finiteNumber(value) ? `${formatNumber(Number(value))} ${unit}` : displayOrDash(value);
}

function formatHeading(value) {
  return finiteNumber(value) ? `${Math.round(Number(value))} deg` : NA_TEXT;
}

function formatCoordinates(position) {
  return Array.isArray(position) && position.length === 2 && finiteNumber(position[0]) && finiteNumber(position[1])
    ? `${Number(position[0]).toFixed(3)}, ${Number(position[1]).toFixed(3)}`
    : NA_TEXT;
}

function formatProgressPercent(jet) {
  const progress = liveProgress(jet);
  return Number.isFinite(progress) ? Math.round(progress * 100) : 0;
}

function formatAirportElevation(airport) {
  if (airport.elevationMeters !== null && airport.elevationMeters !== undefined && airport.apiDetail) {
    return `${formatNumber(airport.elevationMeters)} m`;
  }
  return finiteNumber(airport.elevation) ? `${formatNumber(Number(airport.elevation))} ft` : NA_TEXT;
}

function parsePanelEpoch(value, options = {}) {
  if (value && typeof value === "object" && "epochMs" in value) {
    return Number.isFinite(Number(value.epochMs)) ? Number(value.epochMs) : null;
  }
  if (timeUtils.normalizeEpochMs) {
    return timeUtils.normalizeEpochMs(value, options);
  }
  if (!value) {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10000000000 ? numeric : numeric * 1000;
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const parsed = Date.parse(text.replace(" ", "T"));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatPanelTime(value, options = {}) {
  if (missingValue(value)) {
    return NA_TEXT;
  }
  if (value && typeof value === "object" && "epochMs" in value && timeUtils.formatTimeRef) {
    return timeUtils.formatTimeRef(value, {
      date: options.date,
      seconds: options.seconds,
      timeZone: options.timeZone || value.displayZone || "UTC",
      includeZone: options.includeZone !== false,
      zoneLabel: options.zoneLabel,
      fallback: NA_TEXT
    });
  }
  const epoch = parsePanelEpoch(value, options);
  if (epoch !== null) {
    if (timeUtils.formatEpochMs) {
      return timeUtils.formatEpochMs(epoch, {
        date: options.date,
        seconds: options.seconds,
        timeZone: options.timeZone || "UTC",
        includeZone: options.includeZone !== false,
        zoneLabel: options.zoneLabel,
        fallback: NA_TEXT
      });
    }
    const date = new Date(epoch);
    return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
  }
  const text = String(value);
  return options.rawUnknown === false ? NA_TEXT : `${text}${options.includeUnknownLabel === false ? "" : " timezone unknown"}`;
}

function formatMetersDistance(value) {
  return value !== null && value !== undefined && value !== "" && finiteNumber(value)
    ? `${formatNumber(Math.round(Number(value) / 1000))} km`
    : NA_TEXT;
}

function formatDuration(valueMs) {
  if (valueMs === null || valueMs === undefined || valueMs === "" || !finiteNumber(valueMs) || Number(valueMs) < 0) {
    return NA_TEXT;
  }
  const totalMinutes = Math.round(Number(valueMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

function routeSideMissing(side) {
  return ![
    side?.iata,
    side?.icao,
    side?.code,
    side?.name,
    side?.nameCn,
    side?.nameEn
  ].some((value) => !missingValue(value));
}

function routeSideDisplay(side, role) {
  const missing = routeSideMissing(side);
  const fallbackCn = missing ? "N/A" : "N/A";
  const fallbackEn = missing ? "N/A" : "N/A";
  const code = normalizeAirportPanelCode(side?.code);
  const iata = firstMatchedValue(side?.iata, code.length === 3 ? code : "");
  const icao = firstMatchedValue(side?.icao, code.length === 4 ? code : "");
  return {
    missing,
    iata: missing ? "N/A" : firstMatchedValue(iata, "IATA"),
    icao: missing ? "N/A" : firstMatchedValue(icao, "ICAO"),
    nameCn: firstMatchedValue(side?.nameCn, side?.name, fallbackCn),
    nameEn: firstMatchedValue(side?.nameEn, fallbackEn),
    zone: missing ? "N/A" : firstMatchedValue(side?.zone, "UTC"),
    airportCode: firstMatchedValue(side?.icao, side?.iata, side?.code)
  };
}

function trackDistanceMeters(points = []) {
  const validPoints = points.filter(selectedTrackPointIsValid);
  if (validPoints.length < 2) {
    return null;
  }
  const distanceNm = validPoints.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }
    return total + greatCircleDistanceNm(validPoints[index - 1], point);
  }, 0);
  const meters = distanceNm * 1852;
  return Number.isFinite(meters) && meters > 0 ? meters : null;
}

function trackTimeSpanMs(points = []) {
  const timestamps = points
    .map(trackPointTimestamp)
    .filter((timestamp) => timestamp !== null)
    .sort((a, b) => a - b);
  if (timestamps.length < 2) {
    return null;
  }
  const span = timestamps[timestamps.length - 1] - timestamps[0];
  return span > 0 ? span : null;
}

function lastTrackTimestamp(points = []) {
  const timestamp = maxTrackTimestamp(points);
  return timestamp || null;
}

function plausibleActiveFlightDurationMs(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0 && duration <= 96 * 3600000;
}

function selectPanelNowEpoch(routeTimes, jet, points, departedAt, arrivalAt) {
  const serverNow = routeTimes.serverNow.epochMs || null;
  const trackNow = lastTrackTimestamp(points);
  const liveNow = parsePanelEpoch(jet.positionTimestamp || jet.updatedAtEpochMs || jet.updatedAt);
  const primaryNow = serverNow || liveNow || trackNow || Date.now();
  if (
    trackNow
      && serverNow
      && Math.abs(serverNow - trackNow) > 6 * 3600000
      && (!departedAt || trackNow >= departedAt - 30 * 60000)
      && (!arrivalAt || trackNow <= arrivalAt + 12 * 3600000)
  ) {
    return trackNow;
  }
  return primaryNow;
}

function selectedRouteDistanceMeters(jet) {
  const dep = selectedRouteEndpoint(jet, "departure");
  const arr = selectedRouteEndpoint(jet, "arrival");
  if (!dep || !arr) {
    return null;
  }
  const meters = greatCircleDistanceNm(dep, arr) * 1852;
  return Number.isFinite(meters) && meters > 0 ? meters : null;
}

function selectPanelDistanceMeters(summaryDistance, calculatedDistance) {
  const apiDistance = finiteNumber(summaryDistance) && Number(summaryDistance) > 0 ? Number(summaryDistance) : null;
  const trackDistance = finiteNumber(calculatedDistance) && Number(calculatedDistance) > 0 ? Number(calculatedDistance) : null;
  if (!apiDistance) {
    return trackDistance;
  }
  if (!trackDistance) {
    return apiDistance;
  }
  if (trackDistance > apiDistance * 1.15 || apiDistance > trackDistance * 4) {
    return trackDistance;
  }
  return apiDistance;
}

function journeyMetricsForPanel(jet, routeTimes, summary) {
  const points = aircraftTrackPoints(jet);
  const departedAt = routeTimes.actualDeparture.epochMs;
  const arrivalAt = routeTimes.estimatedArrival.epochMs;
  const now = selectPanelNowEpoch(routeTimes, jet, points, departedAt, arrivalAt);
  const elapsedFromTime = departedAt && now > departedAt ? now - departedAt : null;
  const elapsedFromTrack = trackTimeSpanMs(points);
  const elapsedMs = plausibleActiveFlightDurationMs(elapsedFromTime)
    ? elapsedFromTime
    : plausibleActiveFlightDurationMs(elapsedFromTrack)
      ? elapsedFromTrack
      : null;
  const remainingFromEta = arrivalAt && now < arrivalAt ? arrivalAt - now : null;
  const flightDistanceM = selectPanelDistanceMeters(summary.distance, trackDistanceMeters(points));
  const routeDistanceM = selectedRouteDistanceMeters(jet);
  const distanceProgress = flightDistanceM && routeDistanceM
    ? Math.max(0, Math.min(1, flightDistanceM / routeDistanceM))
    : null;
  const timeProgress = departedAt && arrivalAt && arrivalAt > departedAt
    ? Math.max(0, Math.min(1, (now - departedAt) / (arrivalAt - departedAt)))
    : null;
  const explicitProgress = finiteNumber(jet.progress) && Number(jet.progress) > 0
    ? Math.max(0, Math.min(1, Number(jet.progress)))
    : null;
  const preferredDistanceProgress = Number.isFinite(distanceProgress)
    && (!Number.isFinite(timeProgress) || Math.abs(distanceProgress - timeProgress) <= 0.35)
    ? distanceProgress
    : null;
  const progress = Number.isFinite(preferredDistanceProgress)
    ? preferredDistanceProgress
    : Number.isFinite(timeProgress)
      ? timeProgress
      : Number.isFinite(distanceProgress)
        ? distanceProgress
        : Number.isFinite(explicitProgress)
          ? explicitProgress
          : 0;
  let remainingMs = plausibleActiveFlightDurationMs(remainingFromEta) ? remainingFromEta : null;
  if (remainingMs === null && elapsedMs && progress > 0.02 && progress < 0.98) {
    remainingMs = elapsedMs * (1 - progress) / progress;
  }
  if (remainingMs === null && routeDistanceM && flightDistanceM && finiteNumber(jet.speed) && Number(jet.speed) > 30) {
    const remainingMeters = Math.max(0, routeDistanceM - flightDistanceM);
    remainingMs = remainingMeters / (Number(jet.speed) * 0.514444) * 1000;
  }
  const plannedDurationMs = departedAt && arrivalAt && arrivalAt > departedAt ? arrivalAt - departedAt : null;
  let totalDurationMs = plausibleActiveFlightDurationMs(plannedDurationMs) ? plannedDurationMs : null;
  if (totalDurationMs === null && elapsedMs !== null && remainingMs !== null) {
    const combinedDurationMs = elapsedMs + remainingMs;
    totalDurationMs = plausibleActiveFlightDurationMs(combinedDurationMs) ? combinedDurationMs : null;
  }
  if (totalDurationMs === null && elapsedMs !== null && progress > 0.02 && progress <= 1) {
    const derivedDurationMs = elapsedMs / progress;
    totalDurationMs = plausibleActiveFlightDurationMs(derivedDurationMs) ? derivedDurationMs : null;
  }
  if (totalDurationMs === null && routeDistanceM && finiteNumber(jet.speed) && Number(jet.speed) > 30) {
    const cruiseDurationMs = routeDistanceM / (Number(jet.speed) * 0.514444) * 1000;
    totalDurationMs = plausibleActiveFlightDurationMs(cruiseDurationMs) ? cruiseDurationMs : null;
  }
  return {
    distanceMeters: flightDistanceM,
    elapsedMs,
    remainingMs,
    totalDurationMs,
    progressPercent: Math.round(progress * 100),
    progressRatio: progress
  };
}

function calculateAircraftAge(deliveryDate) {
  if (missingValue(deliveryDate)) {
    return NA_TEXT;
  }
  const year = Number.parseInt(String(deliveryDate), 10);
  if (!Number.isFinite(year) || year < 1900 || year > new Date().getFullYear()) {
    return NA_TEXT;
  }
  return `${new Date().getFullYear() - year} yr`;
}

function maybeAppendAcrossDays(time, acrossDays) {
  const text = String(time || "");
  const formatted = typeof time === "string" && text && !/^\d{4}-\d{2}-\d{2}/.test(text) && !/^\d{10,}$/.test(text)
    ? displayOrDash(time)
    : formatPanelTime(time);
  const days = Number.parseInt(acrossDays, 10);
  return formatted !== NA_TEXT && Number.isFinite(days) && days > 0 ? `${formatted} +${days}d` : formatted;
}

function updateDataSourceLabels() {
  const aircraftLabel = document.getElementById("railAircraftSourceLabel");
  const airportLabel = document.getElementById("railAirportSourceLabel");
  if (!aircraftLabel || !airportLabel) {
    return;
  }
  const liveText = state.dataStatus === "live"
    ? aircraftIconVisibilityUsesGlobalScope() ? "global live" : "viewport live"
    : state.dataStatus === "stale"
      ? "stale API"
      : state.dataStatus === "error"
        ? "API unavailable"
        : state.dataStatus === "loading"
          ? "loading API"
          : "local data";
  const timeText = state.realtimeLoadedAt
    ? formatUtcTime(state.realtimeLoadedAt, { seconds: true })
    : "";
  const countText = `${state.aircraftViewportLoaded}/${state.aircraftTotalMatched || state.aircraftViewportLoaded}`;
  const truncatedText = state.aircraftTruncated ? " limit" : "";
  aircraftLabel.textContent = timeText ? `${liveText} ${countText}${truncatedText} ${timeText}` : `${liveText} ${countText}`;
  const airportText = state.airportDataStatus === "live"
    ? "airport database"
    : state.airportDataStatus === "stale"
      ? "stale airports"
      : state.airportDataStatus === "error"
        ? "API unavailable"
        : state.airportDataStatus === "local"
          ? "local data"
          : "loading airports";
  const airportTimeText = state.airportLoadedAt
    ? formatUtcTime(state.airportLoadedAt, { seconds: true })
    : "";
  airportLabel.textContent = airportTimeText
    ? `${airportText} ${airports.length} ${airportTimeText}`
    : `${airportText} ${airports.length}`;
}

function aircraftRegistrationScore(value) {
  const text = String(value || "").trim();
  if (!text || text === "-" || text.toUpperCase() === NA_TEXT || text.toLowerCase() === "protected") {
    return 0;
  }
  return text.includes("*") ? 1 : 2;
}

function shouldReplaceAircraftRegistration(currentValue, nextValue) {
  const currentScore = aircraftRegistrationScore(currentValue);
  const nextScore = aircraftRegistrationScore(nextValue);
  if (!nextScore) {
    return false;
  }
  if (nextScore !== currentScore) {
    return nextScore > currentScore;
  }
  return String(nextValue || "").trim().length >= String(currentValue || "").trim().length;
}

function applyJetDetailUpdates(jet, updates = {}) {
  [
    "from",
    "to",
    "fromName",
    "toName",
    "depart",
    "arrive",
    "status",
    "registration",
    "model",
    "family",
    "operator",
    "source",
    "apiCallsign",
    "callsign",
    "flightNo",
    "flightNumber",
    "icaoCode",
    "aircraftTypeCode",
    "fr24IconKey",
    "sizeClass",
    "planeSize",
    "altitude",
    "altitudeAglFt",
    "radioAltitudeFt",
    "terrainElevationFt",
    "onGround",
    "positionTimestamp",
    "speed",
    "heading"
  ].forEach((key) => {
    const value = updates[key];
    if (value !== null && value !== undefined && value !== "") {
      if (key === "registration") {
        if (shouldReplaceAircraftRegistration(jet.registration, value)) {
          jet.registration = value;
        }
        return;
      }
      jet[key] = value;
    }
  });
  applyAircraftTypeMetadata(jet);
}

function flightTrackEndpointFromDetail(detail) {
  const lastPoint = Array.isArray(detail?.coordinates) && detail.coordinates.length
    ? detail.coordinates[detail.coordinates.length - 1]
    : null;
  const position = Array.isArray(detail?.livePosition) && detail.livePosition.length === 2
    ? detail.livePosition
    : lastPoint
      ? [lastPoint.lat, lastPoint.lng]
      : null;
  if (!position) {
    return null;
  }
  const lat = Number(position[0]);
  const lng = Number(position[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) {
    return null;
  }
  return {
    lat,
    lng: normalizeLongitude(lng),
    timestamp: trackPointTimestamp(lastPoint) || parseTrackTime(detail?.updates?.positionTimestamp)
  };
}

function aircraftLivePoint(jet) {
  if (!Array.isArray(jet?.livePosition) || jet.livePosition.length !== 2) {
    return null;
  }
  const lat = Number(jet.livePosition[0]);
  const lng = Number(jet.livePosition[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) {
    return null;
  }
  return {
    lat,
    lng: normalizeLongitude(lng),
    timestamp: parseTrackTime(jet.positionTimestamp || jet.updatedAtEpochMs || jet.updatedAt || jet.viewportSeenAtEpochMs)
  };
}

function shouldPreferFlightTrackEndpoint(jet, endpoint) {
  if (!endpoint) {
    return false;
  }
  const livePoint = aircraftLivePoint(jet);
  if (!livePoint) {
    return true;
  }
  const distanceNm = greatCircleDistanceNm(livePoint, endpoint);
  if (distanceNm <= mapLoadingConfig.trackContinuity.duplicateDistanceNm) {
    return true;
  }
  const liveTime = trackPointTimestamp(livePoint);
  const endpointTime = trackPointTimestamp(endpoint);
  if (endpointTime !== null && liveTime !== null) {
    const elapsedMs = liveTime - endpointTime;
    if (elapsedMs <= 0) {
      return true;
    }
    const impliedSpeedKt = distanceNm * 3600000 / elapsedMs;
    return impliedSpeedKt > routeStyle.maxImpliedSpeedKt;
  }
  return false;
}

function applyFlightTrackEndpoint(jet, detail) {
  const endpoint = flightTrackEndpointFromDetail(detail);
  if (!shouldPreferFlightTrackEndpoint(jet, endpoint)) {
    return;
  }
  jet.livePosition = [endpoint.lat, endpoint.lng];
  jet.positionTimestamp = endpoint.timestamp || jet.positionTimestamp;
  jet.updatedAtEpochMs = endpoint.timestamp || jet.updatedAtEpochMs;
  jet.previousLivePosition = null;
  jet.liveInterpolationStartedAtEpochMs = null;
}

function applyFlightTrackDetail(jet, detail) {
  if (!detail) {
    return;
  }
  jet.flightDetail = detail;
  if (Array.isArray(detail.route) && detail.route.length >= 2) {
    jet.trackRoute = detail.route;
  }
  applyJetDetailUpdates(jet, detail.updates);
  cacheAircraftIconTypeCode(jet, detail);
  applyFlightTrackEndpoint(jet, detail);
  syncSelectedTrackHistoryFromDetail(jet, detail);
}

function normalizedAircraftProfileCacheValue(value) {
  return String(value || "").trim().toUpperCase();
}

function aircraftProfileCacheKeyIsUsable(value) {
  return Boolean(value
    && value !== "PROTECTED"
    && value !== NA_TEXT
    && value !== "-"
    && !value.includes("*"));
}

function aircraftProfileCacheKeys(jet, detail = jet?.planeDetail) {
  const plane = detail?.planeInfo || detail?.raw?.planeInfo || {};
  const values = [
    jet?.tailNoEncrypted,
    jet?.tailNo,
    plane.tailNoEncrypted,
    plane.tailNo,
    jet?.tailNoClear,
    jet?.registration,
    plane.tailNoClear,
    plane.registrationClear,
    plane.tailNoDisplay,
    plane.registration
  ];
  return values
    .map(normalizedAircraftProfileCacheValue)
    .filter((value, index, list) => aircraftProfileCacheKeyIsUsable(value) && list.indexOf(value) === index);
}

function cacheAircraftProfileDetail(jet, detail) {
  aircraftProfileCacheKeys(jet, detail).forEach((key) => {
    state.aircraftProfileDetails.set(key, detail);
  });
}

function aircraftIconTypeCodeFromDetail(jet, detail) {
  return firstAircraftTypeCodeCandidateFromSources(
    { label: "cache.detail.planeInfo.icaoCode", value: detail?.planeInfo },
    { label: "cache.detail.raw.planeInfo.icaoCode", value: detail?.raw?.planeInfo },
    { label: "cache.detail.raw.icaoCode", value: detail?.raw },
    { label: "cache.detail.updates.icaoCode", value: detail?.updates },
    { label: "cache.aircraft.icaoCode", value: jet }
  ).code;
}

function cacheAircraftIconTypeCode(jet, detail) {
  const icaoCode = cleanExplicitAircraftTypeCode(aircraftIconTypeCodeFromDetail(jet, detail));
  if (!icaoCode) {
    return false;
  }
  const entry = {
    icaoCode,
    iconKey: aircraftIconKeyByIcaoCode[icaoCode] || "",
    updatedAt: new Date().toISOString()
  };
  const keys = aircraftProfileCacheKeys(jet, detail);
  if (!keys.length) {
    return false;
  }
  keys.forEach((key) => {
    aircraftIconTypeCodeCache.delete(key);
    aircraftIconTypeCodeCache.set(key, entry);
    state.iconTypeCodeProfiles.failedAt.delete(key);
  });
  pruneAircraftIconTypeCodeCache();
  writeAircraftIconTypeCodeCache();
  return true;
}

function cachedAircraftProfileDetail(jet) {
  for (const key of aircraftProfileCacheKeys(jet)) {
    const detail = state.aircraftProfileDetails.get(key);
    if (detail) {
      return detail;
    }
  }
  return null;
}

function aircraftProfileKeysOverlap(a, b) {
  const aKeys = new Set(aircraftProfileCacheKeys(a));
  return aircraftProfileCacheKeys(b).some((key) => aKeys.has(key));
}

function cacheAircraftPanelRecord(jet) {
  if (!jet?.id) {
    return;
  }
  const keys = [
    normalizedLookupKey(jet.id),
    ...aircraftProfileCacheKeys(jet)
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  keys.forEach((key) => state.aircraftPanelRecords.set(key, jet));
}

function panelAircraftByDetailSeed(seedJet) {
  if (!seedJet) {
    return null;
  }
  for (const key of [
    normalizedLookupKey(seedJet.id),
    ...aircraftProfileCacheKeys(seedJet)
  ]) {
    const jet = state.aircraftPanelRecords.get(key);
    if (jet) {
      return jet;
    }
  }
  return null;
}

function buildExistingAircraftLookup() {
  const byId = new Map();
  const byProfileKey = new Map();
  businessJets.forEach((jet) => {
    byId.set(jet.id, jet);
    aircraftProfileCacheKeys(jet).forEach((key) => {
      if (!byProfileKey.has(key)) {
        byProfileKey.set(key, jet);
      }
    });
  });
  return { byId, byProfileKey };
}

function findExistingAircraftForIncoming(incoming, lookup) {
  const existingById = lookup.byId.get(incoming.id);
  if (existingById) {
    return existingById;
  }
  for (const key of aircraftProfileCacheKeys(incoming)) {
    const existing = lookup.byProfileKey.get(key);
    if (existing) {
      return existing;
    }
  }
  return null;
}

function applyCachedAircraftProfile(jet) {
  if (jet.planeDetail) {
    cacheAircraftProfileDetail(jet, jet.planeDetail);
    return false;
  }
  const detail = cachedAircraftProfileDetail(jet);
  if (!detail) {
    return false;
  }
  applyPlaneDetail(jet, detail);
  return true;
}

function applyPlaneDetailToMatchingAircraft(seedJet, detail) {
  if (!detail) {
    return;
  }
  if (aircraftIsPanelOnly(seedJet)) {
    applyPlaneDetail(seedJet, detail);
    cacheAircraftPanelRecord(seedJet);
  }
  businessJets.forEach((jet) => {
    if (jet === seedJet || aircraftProfileKeysOverlap(jet, seedJet)) {
      applyPlaneDetail(jet, detail);
    }
  });
}

function applyPlaneDetail(jet, detail) {
  if (!detail) {
    return;
  }
  jet.planeDetail = detail;
  cacheAircraftProfileDetail(jet, detail);
  applyJetDetailUpdates(jet, detail.updates);
  cacheAircraftIconTypeCode(jet, detail);
}

function cacheAircraftHistoryDetail(jet, detail) {
  if (!jet || !detail) {
    return;
  }
  aircraftProfileCacheKeys(jet).forEach((key) => {
    state.aircraftHistoryDetails.set(key, detail);
  });
}

function cachedAircraftHistoryDetail(jet) {
  for (const key of aircraftProfileCacheKeys(jet)) {
    const detail = state.aircraftHistoryDetails.get(key);
    if (detail) {
      return detail;
    }
  }
  return null;
}

function applyAircraftHistory(jet, detail) {
  if (!jet || !detail) {
    return;
  }
  jet.flightHistoryDetail = detail;
  cacheAircraftHistoryDetail(jet, detail);
}

function replaceAircraftData(nextAircraft) {
  if (!Array.isArray(nextAircraft)) {
    return;
  }
  const existingLookup = buildExistingAircraftLookup();
  const merged = nextAircraft.map((incoming) => {
    const existing = findExistingAircraftForIncoming(incoming, existingLookup);
    const jet = {
      ...(existing || {}),
      ...incoming
    };
    if (existing?.flightDetail) {
      applyFlightTrackDetail(jet, existing.flightDetail);
    }
    if (existing?.planeDetail) {
      applyPlaneDetail(jet, existing.planeDetail);
    }
    if (existing?.flightHistoryDetail) {
      applyAircraftHistory(jet, existing.flightHistoryDetail);
    }
    if (existing?.trackRoute && !jet.trackRoute) {
      jet.trackRoute = existing.trackRoute;
    }
    const cachedHistory = cachedAircraftHistoryDetail(jet);
    if (cachedHistory && !jet.flightHistoryDetail) {
      applyAircraftHistory(jet, cachedHistory);
    }
    applyCachedAircraftProfile(jet);
    return applyAircraftTypeMetadata(jet);
  });
  businessJets.splice(0, businessJets.length, ...merged);
  rebuildAircraftIndexes();
}

function applyAirportDetail(airport, detail) {
  if (!detail) {
    return;
  }
  airport.apiDetail = detail;
  Object.entries(detail.updates || {}).forEach(([key, value]) => {
    if (key === "id") {
      return;
    }
    if (key === "groundCountAvailable" && value === false) {
      return;
    }
    if (value !== null && value !== undefined && value !== "") {
      airport[key] = value;
    }
  });
  syncAirportGroundCountFields(airport);
  cacheAirportGroundCount(airport);
  syncAirportParkingBadgeForAirport(airport);
}

function applyAirportPanelUpdates(airport, detail) {
  Object.entries(detail?.updates || {}).forEach(([key, value]) => {
    if (key === "id") {
      return;
    }
    if (key === "groundCountAvailable" && value === false) {
      return;
    }
    if (value !== null && value !== undefined && value !== "") {
      airport[key] = value;
    }
  });
  syncAirportGroundCountFields(airport);
  cacheAirportGroundCount(airport);
  syncAirportParkingBadgeForAirport(airport);
}

function cacheAirportDynamicDetail(airport, detail) {
  if (!airport || !detail) {
    return;
  }
  [airport.id, airport.iata, airport.airportCode, airport.icaoCode]
    .filter((value) => !missingValue(value))
    .forEach((key) => state.airportDynamicDetails.set(normalizedLookupKey(key), detail));
}

function cacheAirportGroundDetail(airport, detail) {
  if (!airport || !detail) {
    return;
  }
  [airport.id, airport.iata, airport.airportCode, airport.icaoCode]
    .filter((value) => !missingValue(value))
    .forEach((key) => state.airportGroundDetails.set(normalizedLookupKey(key), detail));
}

function applyAirportDynamic(airport, detail) {
  if (!airport || !detail) {
    return;
  }
  airport.apiDynamic = detail;
  cacheAirportDynamicDetail(airport, detail);
  applyAirportPanelUpdates(airport, detail);
}

function applyAirportGround(airport, detail) {
  if (!airport || !detail) {
    return;
  }
  airport.apiGround = detail;
  cacheAirportGroundDetail(airport, detail);
  applyAirportPanelUpdates(airport, detail);
}

function replaceAirportData(nextAirports) {
  if (!Array.isArray(nextAirports)) {
    return;
  }
  const now = Date.now();
  const existingById = new Map(airports.map((airport) => [airport.id, airport]));
  const existingByIata = new Map(airports.map((airport) => [airport.iata, airport]));
  const merged = nextAirports.map((incoming) => {
    const existing = existingById.get(incoming.id) || existingByIata.get(incoming.iata);
    const airport = {
      ...(existing || {}),
      ...incoming
    };
    if (existing?.apiDetail) {
      applyAirportDetail(airport, existing.apiDetail);
    }
    if (existing?.apiDynamic) {
      applyAirportDynamic(airport, existing.apiDynamic);
    }
    if (existing?.apiGround) {
      applyAirportGround(airport, existing.apiGround);
    }
    applyCachedAirportGroundCount(airport);
    airport.viewportSeenAtEpochMs = now;
    const normalized = normalizeAirportRecord(airport);
    cacheAirportGroundCount(normalized);
    return normalized;
  });
  const mergedById = new Map(airports.map((airport) => [airport.id, airport]));
  merged.forEach((airport) => mergedById.set(airport.id, airport));
  const protectedIds = protectedAirportIds();
  const retained = [...mergedById.values()].filter((airport) => {
    if (protectedIds.has(airport.id) || !airport.viewportSeenAtEpochMs) {
      return true;
    }
    return now - Number(airport.viewportSeenAtEpochMs) <= AIRPORT_VIEWPORT_CACHE_TTL_MS;
  });
  if (retained.length > AIRPORT_VIEWPORT_CACHE_MAX_RECORDS) {
    retained.sort((a, b) => Number(b.viewportSeenAtEpochMs || 0) - Number(a.viewportSeenAtEpochMs || 0));
    retained.length = AIRPORT_VIEWPORT_CACHE_MAX_RECORDS;
  }
  airports.splice(0, airports.length, ...retained);
  rebuildAirportIndexes();
  refreshSelectedRouteEndpointCache();
}

function clearSelectionIfMissing() {
  const selectedKey = normalizedLookupKey(state.selectedId);
  const missingAircraft = state.selectedKind === "aircraft"
    && !businessJets.some((jet) => jet.id === state.selectedId)
    && !state.aircraftPanelRecords.has(selectedKey);
  const missingAirport = state.selectedKind === "airport" && !airports.some((airport) => airport.id === state.selectedId);
  if (!missingAircraft && !missingAirport) {
    return;
  }
  clearSelection({ render: false });
}

function renderViewport() {
  updateAircraftViewportStatsFromCache();
  renderAirports();
  renderAircraft();
  syncSelectedRouteVisuals();
  updateRouteLegend();
  updateRail();
}

function roundedCoordinate(value) {
  return Math.round(Number(value) * 1000000) / 1000000;
}

function buildAirportViewportRequest(reason = "timer") {
  const bounds = currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const selected = selectedAirport();
  const scaleKm = effectiveScaleKm();
  const scaleBand = airportScaleBand(scaleKm);
  const suppressTabletLabels = responsivePerformanceConfig.tabletHideAirportLabelsDuringInteraction
    && tabletLayoutProfile()
    && state.mapInteractionPhase === "active";
  const protectedCodes = [
    ...protectedAirportRecords()
      .map((airport) => airport.icaoCode || airport.id || airport.iata),
    ...selectedRouteEndpointCodes()
  ]
    .map((code) => String(code || "").trim().toUpperCase())
    .filter(Boolean)
    .filter((code, index, list) => list.indexOf(code) === index)
    .join(",");
  return {
    north: roundedCoordinate(bounds.north),
    south: roundedCoordinate(bounds.south),
    west: roundedCoordinate(bounds.west),
    east: roundedCoordinate(bounds.east),
    zoom: Math.round(currentZoom() * 100) / 100,
    effectiveScaleKm: scaleKm,
    scaleBand,
    viewportPaddingRatio: mapLoadingConfig.viewportPaddingRatio,
    airportScope: "viewport",
    airportLayerMode: airportLayerMode(),
    maxAirports: airportRequestLimit(),
    displayLevelMax: airportRequestLevelLimit(),
    includeAllAirports: airportShowsAllInCurrentViewport(),
    includeLabels: !suppressTabletLabels && state.labels && Number.isFinite(scaleKm)
      && scaleKm <= mapLoadingConfig.airportCodeLabelScaleKm,
    clientProfile: state.layoutProfile,
    mapInteractionPhase: state.mapInteractionPhase,
    selectedAirportCode: selected?.icaoCode || selected?.id || selected?.iata || "",
    protectedAirportCodes: protectedCodes,
    businessJetOnly: false,
    includeAirports: true,
    includeAircraft: false,
    reason
  };
}

function buildAirportViewportRequestMetadata() {
  const request = buildAirportViewportRequest("viewport-metadata");
  return {
    airportNorth: request.north,
    airportSouth: request.south,
    airportWest: request.west,
    airportEast: request.east,
    airportScope: request.airportScope,
    airportLayerMode: request.airportLayerMode,
    maxAirports: request.maxAirports,
    displayLevelMax: request.displayLevelMax,
    effectiveScaleKm: request.effectiveScaleKm,
    scaleBand: request.scaleBand,
    includeAllAirports: request.includeAllAirports,
    includeLabels: request.includeLabels,
    clientProfile: request.clientProfile,
    mapInteractionPhase: request.mapInteractionPhase,
    selectedAirportCode: request.selectedAirportCode,
    protectedAirportCodes: request.protectedAirportCodes,
    businessJetOnly: request.businessJetOnly
  };
}

function buildAircraftViewportRequest(reason = "timer") {
  const bounds = aircraftRequestBounds();
  const selectedCandidate = selectedAircraft();
  const selected = aircraftIsPanelOnly(selectedCandidate) ? null : selectedCandidate;
  const protectedAircraft = protectedAircraftForRendering(selected);
  return {
    north: roundedCoordinate(bounds.north),
    south: roundedCoordinate(bounds.south),
    west: roundedCoordinate(bounds.west),
    east: roundedCoordinate(bounds.east),
    zoom: Math.round(currentZoom() * 100) / 100,
    viewportPaddingRatio: aircraftIconVisibilityUsesGlobalScope() ? 0 : mapLoadingConfig.viewportPaddingRatio,
    aircraftScope: aircraftIconVisibilityUsesGlobalScope() ? "global" : "viewport",
    aircraftLimit: aircraftRequestLimit(),
    clientProfile: state.layoutProfile,
    mapInteractionPhase: state.mapInteractionPhase,
    aircraftCategory: "business_jet",
    categories: "J",
    includeAircraft: true,
    includeAirports: true,
    ...buildAirportViewportRequestMetadata(),
    includeGround: mapLoadingConfig.showAllAircraftIconsAtAllZooms || currentZoom() >= 8.5,
    sinceVersion: state.aircraftViewportVersion || "",
    selectedUniqueKey: selected?.uniqueKey || selected?.id || "",
    pinnedAircraftKeys: protectedAircraft
      .map((jet) => jet.uniqueKey || jet.id)
      .filter(Boolean)
      .join(","),
    ttlMs: aircraftRefreshIntervalMs(false),
    reason
  };
}

function updateAircraftViewportStatsFromCache() {
  if (routeFocusActive()) {
    state.aircraftTotalMatched = selectedAircraft() ? 1 : 0;
    state.aircraftTruncated = false;
    return;
  }
  if (!state.map) {
    const matched = businessJets.filter(aircraftPassesLockedFilter).length;
    state.aircraftTotalMatched = matched;
    state.aircraftTruncated = aircraftRenderIsLimited() && matched > aircraftRenderLimit();
    return;
  }
  const bounds = aircraftIconVisibilityUsesGlobalScope()
    ? null
    : currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const selected = selectedAircraft();
  const matched = businessJets.filter((jet) => {
    if (!aircraftPassesLockedFilter(jet) || aircraftIsExpired(jet)) {
      return false;
    }
    return !bounds || positionInBounds(currentPosition(jet), bounds) || jet.id === selected?.id;
  }).length;
  state.aircraftTotalMatched = matched;
  state.aircraftTruncated = aircraftRenderIsLimited() && matched > aircraftRenderLimit();
}

function positionsDiffer(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }
  return Math.abs(Number(a[0]) - Number(b[0])) > 0.00001
    || Math.abs(Number(a[1]) - Number(b[1])) > 0.00001;
}

function updateSnapshotStats(snapshot) {
  state.aircraftViewportVersion = snapshot.viewportVersion || state.aircraftViewportVersion;
  state.aircraftTotalMatched = Number.isFinite(Number(snapshot.totalMatched))
    ? Number(snapshot.totalMatched)
    : snapshot.aircraft?.length || state.aircraftTotalMatched;
  state.aircraftTruncated = Boolean(snapshot.truncated);
}

function mergeAircraftViewportData(snapshot) {
  if (!Array.isArray(snapshot.aircraft)) {
    return;
  }
  const now = snapshot.loadedAt || Date.now();
  const incomingIds = new Set(snapshot.aircraft.map((jet) => jet.id));
  const selected = selectedAircraft();

  if (snapshot.aircraft.length && !state.liveAircraftActivated) {
    for (let index = businessJets.length - 1; index >= 0; index -= 1) {
      const jet = businessJets[index];
      if (jet.isLocalSample && jet.id !== selected?.id && !incomingIds.has(jet.id)) {
        businessJets.splice(index, 1);
      }
    }
    state.liveAircraftActivated = true;
  }

  const existingLookup = buildExistingAircraftLookup();
  snapshot.aircraft.forEach((incoming) => {
    const existing = findExistingAircraftForIncoming(incoming, existingLookup);
    const previousPosition = existing ? (Array.isArray(existing.livePosition) ? existing.livePosition : currentPosition(existing)) : null;
    const next = {
      ...(existing || {}),
      ...incoming,
      isLocalSample: false,
      viewportSeenAtEpochMs: now,
      viewportTtlMs: snapshot.ttlMs || incoming.viewportTtlMs || mapLoadingConfig.aircraftRefresh.interpolationMs
    };
    if (existing?.flightDetail) {
      applyFlightTrackDetail(next, existing.flightDetail);
    }
    if (existing?.planeDetail) {
      applyPlaneDetail(next, existing.planeDetail);
    }
    if (existing?.flightHistoryDetail) {
      applyAircraftHistory(next, existing.flightHistoryDetail);
    }
    if (existing?.trackRoute && !next.trackRoute) {
      next.trackRoute = existing.trackRoute;
    }
    const cachedHistory = cachedAircraftHistoryDetail(next);
    if (cachedHistory && !next.flightHistoryDetail) {
      applyAircraftHistory(next, cachedHistory);
    }
    applyCachedAircraftProfile(next);
    if (previousPosition && positionsDiffer(previousPosition, next.livePosition)) {
      next.previousLivePosition = previousPosition;
      next.liveInterpolationStartedAtEpochMs = now;
    } else if (existing?.previousLivePosition) {
      next.previousLivePosition = existing.previousLivePosition;
      next.liveInterpolationStartedAtEpochMs = existing.liveInterpolationStartedAtEpochMs;
    }
    applyAircraftTypeMetadata(next);
    if (existing) {
      Object.assign(existing, next);
      return;
    }
    businessJets.push(next);
  });

  (snapshot.removedAircraftUniqueKeys || []).forEach((id) => {
    const index = businessJets.findIndex((jet) => jet.id === id || jet.uniqueKey === id);
    if (index === -1) {
      return;
    }
    const jet = businessJets[index];
    if (aircraftIsProtectedFromRemoval(jet)) {
      jet.quality = "stale";
      jet.status = "Stale";
      jet.viewportSeenAtEpochMs = now;
      return;
    }
    businessJets.splice(index, 1);
  });

  for (let index = businessJets.length - 1; index >= 0; index -= 1) {
    const jet = businessJets[index];
    if (!aircraftIsProtectedFromRemoval(jet) && aircraftIsExpired(jet)) {
      businessJets.splice(index, 1);
    }
  }
  rebuildAircraftIndexes();
}

function applyRealtimeSnapshot(snapshot) {
  const shouldApplyAirports = Array.isArray(snapshot.airports)
    && (snapshot.airports.length || snapshot.sourcePid === (appConfig.api?.snapshotPid || "513008"));
  if (shouldApplyAirports) {
    replaceAirportData(snapshot.airports);
    state.airportLoadedAt = snapshot.loadedAt;
    state.airportDataStatus = "live";
    state.airportDataError = null;
  }
  mergeAircraftViewportData(snapshot);
  updateSnapshotStats(snapshot);
  appendSelectedRealtimeTrackPoint(selectedAircraft());
  clearSelectionIfMissing();
  state.realtimeLoadedAt = snapshot.loadedAt;
  state.dataStatus = "live";
  state.dataError = null;
  state.refreshBackoffMs = 0;
}

function aircraftRefreshIntervalMs(useBackoff = true) {
  const refresh = mapLoadingConfig.aircraftRefresh;
  if (document.hidden) {
    return refresh.hiddenMs;
  }
  if (useBackoff && state.refreshBackoffMs) {
    return state.refreshBackoffMs;
  }
  const zoom = currentZoom();
  if (selectedAircraft()) {
    return refresh.selectedMs;
  }
  if (zoom < 3.5) {
    return refresh.globalMs;
  }
  if (zoom >= 8.5) {
    return refresh.airportMs;
  }
  return refresh.normalMs;
}

function scheduleNextRealtimeRefresh() {
  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = null;
  if (!dataService?.isEnabled() || journeyHistoryPanelIsOpen()) {
    return;
  }
  state.refreshTimer = window.setTimeout(() => refreshRealtimeData("timer"), aircraftRefreshIntervalMs());
}

function scheduleNextAirportRefresh() {
  window.clearTimeout(state.airportRefreshTimer);
  state.airportRefreshTimer = null;
  if (!dataService?.isEnabled() || !airportSnapshotRefreshMs || journeyHistoryPanelIsOpen()) {
    return;
  }
  state.airportRefreshTimer = window.setTimeout(() => refreshAirportData("timer"), airportSnapshotRefreshMs);
}

async function refreshAirportData(reason = "timer") {
  if (!dataService?.isEnabled()) {
    if (liveDataOnly) {
      state.airportDataStatus = "error";
      state.airportDataError = new Error("API access is disabled");
      updateRail();
    }
    return;
  }
  if (journeyHistoryPanelIsOpen()) {
    pausePageDataRefreshForJourneyHistory();
    return;
  }
  if (tabletLayoutProfile() && state.isInteractingWithMap && reason === "timer") {
    scheduleNextAirportRefresh();
    return;
  }
  if (state.airportLoading) {
    return;
  }
  state.airportLoading = true;
  updateDataSourceLabels();
  try {
    const snapshot = await dataService.getRealtimeSnapshot(buildAirportViewportRequest(`airport-${reason}`));
    if (journeyHistoryPanelIsOpen()) {
      pausePageDataRefreshForJourneyHistory();
      return;
    }
    if (Array.isArray(snapshot.airports)) {
      replaceAirportData(snapshot.airports);
      state.airportLoadedAt = snapshot.loadedAt;
      state.airportDataStatus = "live";
      state.airportDataError = null;
      clearSelectionIfMissing();
      renderViewport();
    }
  } catch (error) {
    state.airportDataStatus = state.airportLoadedAt ? "stale" : liveDataOnly ? "error" : "local";
    state.airportDataError = error;
    updateRail();
  } finally {
    state.airportLoading = false;
    updateDataSourceLabels();
    scheduleNextAirportRefresh();
  }
}

async function refreshRealtimeData(reason = "timer") {
  if (!dataService?.isEnabled()) {
    if (liveDataOnly) {
      state.dataStatus = "error";
      state.dataError = new Error("API access is disabled");
      renderViewport();
      return;
    }
    updateAircraftViewportStatsFromCache();
    updateRail();
    return;
  }
  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = null;
  if (journeyHistoryPanelIsOpen()) {
    pausePageDataRefreshForJourneyHistory();
    return;
  }
  if (state.isInteractingWithMap && reason === "timer") {
    scheduleNextRealtimeRefresh();
    return;
  }
  if (state.realtimeLoading) {
    state.pendingViewportReason = reason;
    return;
  }
  const requestSeq = state.viewportRequestSeq + 1;
  state.viewportRequestSeq = requestSeq;
  state.realtimeLoading = true;
  updateDataSourceLabels();
  try {
    const snapshot = await dataService.getRealtimeSnapshot(buildAircraftViewportRequest(reason));
    if (journeyHistoryPanelIsOpen()) {
      pausePageDataRefreshForJourneyHistory();
      return;
    }
    if (requestSeq !== state.viewportRequestSeq) {
      return;
    }
    applyRealtimeSnapshot(snapshot);
    if (state.selectedKind === "aircraft" && state.selectedId) {
      selectAircraft(state.selectedId, false, { preserveReducedIconState: true });
    } else if (state.selectedKind === "airport" && state.selectedId) {
      selectAirport(state.selectedId, false);
    } else {
      renderViewport();
    }
  } catch (error) {
    state.dataStatus = state.realtimeLoadedAt ? "stale" : liveDataOnly ? "error" : "local";
    state.dataError = error;
    state.refreshBackoffMs = state.refreshBackoffMs
      ? Math.min(mapLoadingConfig.aircraftRefresh.failureMaxMs, state.refreshBackoffMs * 1.6)
      : mapLoadingConfig.aircraftRefresh.failureMinMs;
    renderViewport();
    updateRail();
  } finally {
    state.realtimeLoading = false;
    updateDataSourceLabels();
    scheduleNextRealtimeRefresh();
    if (state.pendingViewportReason && state.pendingViewportReason !== reason) {
      const nextReason = state.pendingViewportReason;
      state.pendingViewportReason = "";
      if (!journeyHistoryPanelIsOpen()) {
        refreshRealtimeData(nextReason);
      }
    }
  }
}

function iconTypeCodeProfileKey(jet) {
  return jet?.tailNoEncrypted || jet?.id || "";
}

function iconTypeCodeProfileRecentlyFailed(key) {
  const profileState = state.iconTypeCodeProfiles;
  const failedAt = profileState.failedAt.get(key);
  if (!failedAt) {
    return false;
  }
  if (Date.now() - failedAt < profileState.retryAfterMs) {
    return true;
  }
  profileState.failedAt.delete(key);
  return false;
}

function aircraftInCurrentViewport(jet) {
  if (!state.map?.contains) {
    return true;
  }
  return state.map.contains(currentPosition(jet));
}

function iconTypeCodeProfilePriority(jet) {
  return (aircraftInCurrentViewport(jet) ? 0 : 100000000)
    + (aircraftIsSelected(jet) ? -1000000 : 0)
    + aircraftPriority(jet);
}

function iconTypeCodeProfileCandidate(jet) {
  if (!dataService?.isEnabled() || !jet || jet.planeDetail || !jet.tailNoEncrypted) {
    return false;
  }
  const key = iconTypeCodeProfileKey(jet);
  const profileState = state.iconTypeCodeProfiles;
  if (!key
    || profileState.loadedKeys.has(key)
    || profileState.loadingKeys.has(key)
    || profileState.queuedKeys.has(key)
    || iconTypeCodeProfileRecentlyFailed(key)) {
    return false;
  }
  const resolution = resolveAircraftIcon(jet);
  return resolution.fallbackReason === "missing-icao-code"
    && resolution.iconKey === defaultBusinessJetIconKey;
}

function enqueueIconTypeCodeProfileLoads(jets) {
  const profileState = state.iconTypeCodeProfiles;
  if (!Array.isArray(jets) || !jets.length || !dataService?.isEnabled()) {
    return;
  }
  const candidates = jets
    .filter(iconTypeCodeProfileCandidate)
    .sort((a, b) => iconTypeCodeProfilePriority(a) - iconTypeCodeProfilePriority(b))
    .slice(0, profileState.maxPerRender);

  candidates.forEach((jet) => {
    const inViewport = aircraftInCurrentViewport(jet);
    if (profileState.queue.length >= profileState.maxQueue) {
      const removableIndex = inViewport ? profileState.queue.findIndex((task) => !task.inViewport) : -1;
      if (removableIndex === -1) {
        return;
      }
      const [removed] = profileState.queue.splice(removableIndex, 1);
      profileState.queuedKeys.delete(removed.key);
    }
    const key = iconTypeCodeProfileKey(jet);
    profileState.queuedKeys.add(key);
    const task = { key, id: jet.id, tailNoEncrypted: jet.tailNoEncrypted, inViewport };
    if (inViewport) {
      profileState.queue.unshift(task);
    } else {
      profileState.queue.push(task);
    }
  });
  pumpIconTypeCodeProfileQueue();
}

function pumpIconTypeCodeProfileQueue() {
  const profileState = state.iconTypeCodeProfiles;
  while (profileState.loadingKeys.size < profileState.maxConcurrent && profileState.queue.length) {
    const next = profileState.queue.shift();
    profileState.queuedKeys.delete(next.key);
    if (profileState.loadedKeys.has(next.key)
      || profileState.loadingKeys.has(next.key)
      || iconTypeCodeProfileRecentlyFailed(next.key)) {
      continue;
    }
    profileState.loadingKeys.add(next.key);
    loadIconTypeCodeProfile(next);
  }
}

async function loadIconTypeCodeProfile(task) {
  const profileState = state.iconTypeCodeProfiles;
  try {
    const detail = await dataService.getPlaneDetail(task.tailNoEncrypted);
    const currentJet = businessJets.find((jet) => jet.id === task.id || jet.tailNoEncrypted === task.tailNoEncrypted);
    if (currentJet && detail) {
      applyPlaneDetailToMatchingAircraft(currentJet, detail);
      profileState.loadedKeys.add(task.key);
      profileState.failedAt.delete(task.key);
      renderAircraft();
      if (state.selectedKind === "aircraft" && state.selectedId === currentJet.id) {
        renderAircraftDetailPanel(currentJet);
      }
      updateRail();
    } else {
      profileState.failedAt.set(task.key, Date.now());
    }
  } catch (error) {
    profileState.failedAt.set(task.key, Date.now());
  } finally {
    profileState.loadingKeys.delete(task.key);
    pumpIconTypeCodeProfileQueue();
  }
}

function aircraftByDetailSeed(seedJet) {
  if (!seedJet) {
    return null;
  }
  return aircraftById.get(normalizedLookupKey(seedJet.id))
    || aircraftByUniqueKey.get(normalizedLookupKey(seedJet.uniqueKey))
    || aircraftByEncryptedTail.get(normalizedLookupKey(seedJet.tailNoEncrypted))
    || aircraftByRegistration.get(normalizedLookupKey(seedJet.registration))
    || aircraftByRegistration.get(normalizedLookupKey(seedJet.tailNoClear))
    || panelAircraftByDetailSeed(seedJet)
    || businessJets.find((item) => aircraftProfileKeysOverlap(item, seedJet))
    || null;
}

function aircraftHistoryLoadTarget(seedJet, historyTailNo) {
  const matched = aircraftByDetailSeed(seedJet);
  if (matched) {
    return matched;
  }
  const selected = selectedAircraft();
  if (!selected) {
    return null;
  }
  const selectedTailNo = aircraftHistoryRequestTailNo(selected);
  const selectedKey = normalizedLookupKey(state.selectedId);
  const matchesSelectedAircraft = selectedTailNo && selectedTailNo === historyTailNo
    || selectedKey && selectedKey === normalizedLookupKey(seedJet?.id)
    || selectedKey && selectedKey === normalizedLookupKey(seedJet?.uniqueKey)
    || aircraftProfileKeysOverlap(selected, seedJet);
  return matchesSelectedAircraft ? selected : null;
}

function aircraftHistoryLoadTargetIsSelected(target, seedJet, historyTailNo) {
  if (!target || state.selectedKind !== "aircraft") {
    return false;
  }
  const selectedKey = normalizedLookupKey(state.selectedId);
  if (selectedKey && selectedKey === normalizedLookupKey(target.id)) {
    return true;
  }
  if (selectedKey && (selectedKey === normalizedLookupKey(seedJet?.id) || selectedKey === normalizedLookupKey(seedJet?.uniqueKey))) {
    return true;
  }
  const selected = selectedAircraft();
  return Boolean(selected && (
    selected === target
    || aircraftHistoryRequestTailNo(selected) === historyTailNo
    || aircraftProfileKeysOverlap(selected, target)
  ));
}

function renderAfterAircraftDetailUpdate(currentJet, { routeChanged = false, profileChanged = false } = {}) {
  if (!currentJet) {
    return;
  }
  applyAircraftTypeMetadata(currentJet);
  rebuildAircraftIndexes();
  if (state.selectedKind === "aircraft" && state.selectedId === currentJet.id) {
    refreshSelectedRouteEndpointCache(aircraftIsPanelOnly(currentJet) ? null : currentJet);
    renderAircraftDetailPanel(currentJet);
    if (!aircraftIsPanelOnly(currentJet)) {
      renderViewport();
    }
    if (routeChanged && routeFocusIsActiveFor(currentJet.id)) {
      requestAnimationFrame(() => fitSelectedRouteBounds(currentJet));
    }
    maybeLoadApiDebugSelectionDetails();
    renderApiDebugConsole();
    return;
  }
  if (profileChanged) {
    renderAircraft();
  }
  if (routeChanged) {
    syncSelectedRouteVisuals();
  }
  updateRail();
  maybeLoadApiDebugSelectionDetails();
  renderApiDebugConsole();
}

async function loadAircraftDetails(jet) {
  if (!dataService?.isEnabled() || !jet) {
    return;
  }
  const loadKey = aircraftDetailLoadKey(jet);
  if (state.detailLoads.has(loadKey)) {
    return;
  }
  if (!loadKey || !aircraftNeedsDetailLoad(jet)) {
    return;
  }
  const needsTrack = jet.uniqueKey && !jet.flightDetail;
  const needsProfile = jet.tailNoEncrypted && !jet.planeDetail;

  state.detailLoads.add(loadKey);
  const pending = [];
  if (needsTrack) {
    pending.push(
      dataService.getFlightTrack(jet.uniqueKey)
        .then((detail) => {
          const currentJet = aircraftByDetailSeed(jet);
          if (!currentJet || !detail) {
            return;
          }
          applyFlightTrackDetail(currentJet, detail);
          renderAfterAircraftDetailUpdate(currentJet, { routeChanged: true });
        })
        .catch(() => {})
    );
  }
  if (needsProfile) {
    pending.push(
      dataService.getPlaneDetail(jet.tailNoEncrypted)
        .then((detail) => {
          const currentJet = aircraftByDetailSeed(jet);
          if (!currentJet || !detail) {
            return;
          }
          applyPlaneDetailToMatchingAircraft(currentJet, detail);
          renderAfterAircraftDetailUpdate(currentJet, { profileChanged: true });
        })
        .catch(() => {})
    );
  }

  try {
    await Promise.allSettled(pending);
  } finally {
    state.detailLoads.delete(loadKey);
    const currentJet = aircraftByDetailSeed(jet);
    if (currentJet && state.selectedKind === "aircraft" && state.selectedId === currentJet.id) {
      renderAfterAircraftDetailUpdate(currentJet);
    }
  }
}

async function loadAircraftHistory(jet, options = {}) {
  if (!jet) {
    return;
  }
  const renderOptions = options.resetScroll
    ? { resetScroll: true, resetToken: options.resetToken, holdResetLock: true }
    : { preserveScroll: true };
  let historyPanelRendered = false;
  const historyTailNo = aircraftHistoryRequestTailNo(jet);
  if (!dataService?.isEnabled() || !historyTailNo) {
    applyStaticAircraftHistory(jet);
    renderRecentFlights(jet, renderOptions);
    if (options.resetScroll) {
      finishHistoryScrollReset(options.resetToken);
    }
    return;
  }
  if (jet.flightHistoryDetail && !jet.flightHistoryDetail.isStaticSample && !options.force) {
    if (options.resetScroll) {
      renderRecentFlights(jet, renderOptions);
      if (historyScrollResetShouldPin(options.resetToken)) {
        resetHistoryScrollTop({ resetToken: options.resetToken });
      }
      finishHistoryScrollReset(options.resetToken);
    }
    return;
  }
  const loadKey = aircraftHistoryLoadKey(jet);
  if (state.detailLoads.has(loadKey)) {
    if (options.resetScroll) {
      renderRecentFlights(jet, renderOptions);
      if (historyScrollResetShouldPin(options.resetToken)) {
        resetHistoryScrollTop({ resetToken: options.resetToken });
      }
      finishHistoryScrollReset(options.resetToken);
    }
    return;
  }
  state.detailLoads.add(loadKey);
  try {
    const detail = await fetchAircraftHistoryDetail(historyTailNo);
    const currentJet = aircraftHistoryLoadTarget(jet, historyTailNo);
    if (!currentJet) {
      return;
    }
    applyAircraftHistory(currentJet, detail || createEmptyAircraftHistoryDetail());
    state.detailLoads.delete(loadKey);
    if (aircraftHistoryLoadTargetIsSelected(currentJet, jet, historyTailNo)) {
      renderAircraftDetailPanel(currentJet);
      historyPanelRendered = true;
    }
    renderApiDebugConsole();
  } catch (error) {
    const currentJet = aircraftHistoryLoadTarget(jet, historyTailNo);
    if (currentJet) {
      currentJet.flightHistoryError = error;
      applyStaticAircraftHistory(currentJet);
      state.detailLoads.delete(loadKey);
      if (aircraftHistoryLoadTargetIsSelected(currentJet, jet, historyTailNo)) {
        renderRecentFlights(currentJet, renderOptions);
      }
      renderApiDebugConsole();
    }
  } finally {
    state.detailLoads.delete(loadKey);
    const currentJet = aircraftHistoryLoadTarget(jet, historyTailNo);
    if (currentJet && aircraftHistoryLoadTargetIsSelected(currentJet, jet, historyTailNo)) {
      if (!historyPanelRendered) {
        renderAircraftDetailPanel(currentJet);
      }
      if (options.resetScroll && historyScrollResetShouldPin(options.resetToken)) {
        resetHistoryScrollTop({ resetToken: options.resetToken });
      }
    }
    if (options.resetScroll) {
      finishHistoryScrollReset(options.resetToken);
    }
  }
}

function historyRequestOptions(page = 1) {
  return {
    rangeDays: historyTimelineConfig.defaultRangeDays,
    page,
    pageSize: historyTimelineConfig.pageSize,
    status: state.historyTimeline.status === "all" ? "" : state.historyTimeline.status,
    airportCode: state.historyTimeline.airportQuery
  };
}

function mergeFlightHistoryDetails(base, next) {
  const mergedFlights = [];
  const seen = new Set();
  [base?.flights, next?.flights].forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((item) => {
      const key = String(historyFlightKey(item));
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      mergedFlights.push(item);
    });
  });
  mergedFlights.sort((a, b) => historyComparableEpoch(b) - historyComparableEpoch(a));
  const totalMinutes = mergedFlights.reduce((sum, item) => sum + (historyDurationMinutes(item) || 0), 0);
  const totalCount = Math.max(
    Number(base?.totalCount) || 0,
    Number(next?.totalCount) || 0,
    mergedFlights.length
  );
  return {
    ...base,
    ...next,
    raw: {
      source: "merged-513013-pages",
      pages: [
        ...((Array.isArray(base?.raw?.pages) ? base.raw.pages : [base?.raw]).filter(Boolean)),
        next?.raw
      ].filter(Boolean)
    },
    totalCount,
    totalMinutes: Number.isFinite(Number(next?.totalMinutes)) ? Number(next.totalMinutes) : totalMinutes,
    flights: mergedFlights
  };
}

async function fetchAircraftHistoryDetail(tailNoEncrypted) {
  let merged = null;
  let page = 1;
  for (let pageIndex = 0; pageIndex < historyTimelineConfig.maxPages; pageIndex += 1) {
    const detail = await dataService.getFlightHistory(tailNoEncrypted, historyRequestOptions(page));
    if (!detail) {
      break;
    }
    const beforeCount = merged?.flights?.length || 0;
    merged = merged ? mergeFlightHistoryDetails(merged, detail) : detail;
    if (!detail.hasNextPage) {
      break;
    }
    const currentPage = Number(detail.currentPage);
    const nextPage = Number.isFinite(currentPage) && currentPage >= page ? currentPage + 1 : page + 1;
    if (nextPage === page || (pageIndex > 0 && (merged?.flights?.length || 0) <= beforeCount)) {
      merged.hasNextPage = false;
      break;
    }
    page = nextPage;
  }
  return merged;
}

function createEmptyAircraftHistoryDetail() {
  return {
    source: "513013",
    raw: null,
    serverNowEpochMs: Date.now(),
    currentPage: 1,
    hasNextPage: false,
    totalCount: 0,
    totalMinutes: 0,
    monthlyStats: [],
    flights: [],
    groundAirportInfo: null
  };
}

async function loadAirportDetail(airport) {
  if (!dataService?.isEnabled() || !airport) {
    return;
  }
  const airportCode = airport.airportCode || airport.iata;
  if (!airportCode) {
    return;
  }
  const needsDetail = !airport.apiDetail;
  const needsDynamic = !airport.apiDynamic;
  if (!needsDetail && !needsDynamic) {
    return;
  }
  const loadKey = `airport:${airportCode}:detail`;
  if (state.detailLoads.has(loadKey)) {
    return;
  }
  state.detailLoads.add(loadKey);
  try {
    const pending = [];
    if (needsDetail) {
      pending.push(
        dataService.getAirportDetail(airportCode)
          .then((detail) => ({ type: "detail", detail }))
      );
    }
    if (needsDynamic) {
      pending.push(
        dataService.getAirportDynamic(airportCode)
          .then((detail) => ({ type: "dynamic", detail }))
      );
    }
    const results = await Promise.allSettled(pending);
    const currentAirport = airportById(airport.id);
    if (!currentAirport) {
      return;
    }
    results.forEach((result) => {
      if (result.status !== "fulfilled" || !result.value?.detail) {
        return;
      }
      if (result.value.type === "dynamic") {
        applyAirportDynamic(currentAirport, result.value.detail);
      } else {
        applyAirportDetail(currentAirport, result.value.detail);
      }
    });
    if (state.selectedKind === "airport" && state.selectedId === currentAirport.id) {
      selectAirport(currentAirport.id, false);
    } else {
      const activeHover = airportHoverId(state.hoveredAirportId);
      renderAirports();
      if (activeHover && state.hoveredAirportId === activeHover && pointerStillInsideAirportMarker(activeHover)) {
        syncAirportHoverMarkers(activeHover);
      }
      updateRail();
    }
    renderApiDebugConsole();
  } finally {
    state.detailLoads.delete(loadKey);
  }
}

async function loadAirportGround(airport) {
  if (!dataService?.isEnabled() || !airport || airport.apiGround) {
    return;
  }
  const airportCode = airport.airportCode || airport.iata;
  if (!airportCode) {
    return;
  }
  const loadKey = `airport:${airportCode}:ground`;
  if (state.detailLoads.has(loadKey)) {
    return;
  }
  state.detailLoads.add(loadKey);
  try {
    const detail = await dataService.getAirportGround(airportCode);
    const currentAirport = airportById(airport.id);
    if (!currentAirport || !detail) {
      return;
    }
    applyAirportGround(currentAirport, detail);
    if (state.selectedKind === "airport" && state.selectedId === currentAirport.id) {
      renderAirportDetailPanel(currentAirport);
      if (state.airportSegment === "dynamic") {
        discoverAirportMovementHistory(currentAirport);
      }
    }
    renderApiDebugConsole();
  } catch (error) {
    const currentAirport = airportById(airport.id);
    if (currentAirport) {
      currentAirport.airportGroundError = error;
      if (state.selectedKind === "airport" && state.selectedId === currentAirport.id) {
        renderAirportGroundPanel(currentAirport);
      }
      renderApiDebugConsole();
    }
  } finally {
    state.detailLoads.delete(loadKey);
  }
}

const aircraftDetailSegments = ["overview", "track", "airframe", "journey"];
const airportDetailSegments = ["ground", "dynamic", "operations", "airport"];

function syncSelectionDomState() {
  const panel = document.getElementById("leftDetailPanel");
  const shell = document.querySelector(".fr-shell");
  const hasDetail = detailPanelIsOpen();
  if (shell) {
    shell.classList.toggle("detail-open", hasDetail);
    shell.dataset.detailOpen = hasDetail ? "true" : "false";
  }
  if (panel) {
    panel.dataset.detailKind = state.selectedKind || "";
    panel.dataset.drawerState = state.layoutProfile === "tablet-portrait" && hasDetail ? "mid" : "";
    const jet = selectedAircraft();
    panel.classList.toggle("signal-fresh", Boolean(jet && aircraftFreshnessState(jet) === "fresh"));
  }
}

function setDetailSegment(buttonSelector, panelSelector, segment, validSegments) {
  const nextSegment = validSegments.includes(segment) ? segment : validSegments[0];
  document.querySelectorAll(buttonSelector).forEach((button) => {
    const isActive = button.dataset.aircraftSegment === nextSegment || button.dataset.airportSegment === nextSegment;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll(panelSelector).forEach((panel) => {
    const isActive = panel.dataset.aircraftPanel === nextSegment || panel.dataset.airportPanel === nextSegment;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });
  return nextSegment;
}

function setAircraftSegment(segment, options = {}) {
  const previousSegment = state.aircraftSegment;
  const nextSegment = setDetailSegment(
    "[data-aircraft-segment]",
    "[data-aircraft-panel]",
    segment,
    aircraftDetailSegments
  );
  state.aircraftSegment = nextSegment;
  if (options.remember !== false && state.selectedKind === "aircraft" && state.selectedId) {
    state.aircraftSegmentById.set(state.selectedId, nextSegment);
  }
  if (nextSegment === "journey") {
    pausePageDataRefreshForJourneyHistory();
    const shouldResetHistoryScroll = options.resetScroll === true || previousSegment !== "journey";
    const resetToken = shouldResetHistoryScroll ? beginHistoryScrollReset() : 0;
    const jet = selectedAircraft();
    if (shouldResetHistoryScroll) {
      resetHistoryTimelineMount();
      resetHistoryScrollTop({ resetToken });
    }
    loadAircraftHistory(jet, { resetScroll: shouldResetHistoryScroll, resetToken });
  } else if (previousSegment === "journey") {
    releaseHistoryScrollReset();
    scheduleNextRealtimeRefresh();
    scheduleNextAirportRefresh();
  }
}

function setAirportSegment(segment) {
  state.airportSegment = setDetailSegment(
    "[data-airport-segment]",
    "[data-airport-panel]",
    segment,
    airportDetailSegments
  );
  document.querySelectorAll("[data-airport-segment]").forEach((button) => {
    const isActive = button.dataset.airportSegment === state.airportSegment;
    if (isActive) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  const airport = selectedAirport();
  if (airport) {
    loadAirportDetail(airport);
    if (state.airportSegment === "ground" || state.airportSegment === "dynamic") {
      loadAirportGround(airport);
    }
    if (state.airportSegment === "dynamic") {
      if (state.airportTab !== "arrivals" && state.airportTab !== "departures") {
        state.airportDynamicFilter = "all";
      }
      renderAirportDynamicPanel(airport);
      discoverAirportMovementDetails(airport);
      discoverAirportMovementHistory(airport);
    } else if (state.airportSegment === "operations") {
      renderAirportOperationsPanel(airport);
    } else if (state.airportSegment === "airport") {
      renderAirportInfoPanel(airport);
    } else {
      renderAirportGroundPanel(airport);
    }
  }
}

function openAircraftView(segment = state.aircraftSegment, options = {}) {
  const panel = document.getElementById("leftDetailPanel");
  panel.hidden = false;
  document.getElementById("aircraftDetailView").hidden = false;
  document.getElementById("airportDetailView").hidden = true;
  setAircraftSegment(segment, { remember: false, resetScroll: options.resetHistoryScroll === true });
  syncSelectionDomState();
}

function openAirportView(segment = state.airportSegment) {
  const panel = document.getElementById("leftDetailPanel");
  panel.hidden = false;
  document.getElementById("aircraftDetailView").hidden = true;
  document.getElementById("airportDetailView").hidden = false;
  setAirportSegment(segment);
  syncSelectionDomState();
}

function panSelectedTarget(latLng) {
  if (!Array.isArray(latLng) || !state.map) {
    return;
  }
  if (typeof state.map.panTargetToDetailViewport === "function") {
    state.map.panTargetToDetailViewport(latLng);
    return;
  }
  state.map.panTo(latLng);
}

function clearSelection(options = {}) {
  const hadSelection = Boolean(state.selectedKind || state.selectedId);
  const previousAircraftId = state.selectedKind === "aircraft" ? state.selectedId : "";
  if (previousAircraftId) {
    rememberRecentlySelectedAircraft(previousAircraftId);
  }
  clearRouteFocus({ restore: false });
  document.getElementById("leftDetailPanel").hidden = true;
  state.selectedId = null;
  state.selectedKind = null;
  state.hoveredAirportId = null;
  refreshSelectedRouteEndpointCache(null);
  state.selectedTrackStore = null;
  state.followSelectedAircraft = false;
  state.hideOtherAircraft = false;
  updateFollowButton();
  syncAirportHoverMarkers("");
  syncSelectionDomState();
  if (hadSelection && options.render !== false) {
    renderViewport();
    scheduleNextRealtimeRefresh();
  }
  renderApiDebugConsole();
}

function apiDebugConsoleConfig() {
  return appConfig.apiDebugConsole || {};
}

function apiDebugCurrentUserId() {
  return String(appConfig.api?.authorizedUser?.hlUserId || "").trim();
}

function apiDebugAllowedUserIds() {
  const config = apiDebugConsoleConfig();
  return (Array.isArray(config.allowedHlUserIds) ? config.allowedHlUserIds : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function apiDebugConsoleHostAllowed() {
  const config = apiDebugConsoleConfig();
  if (config.allowPublicHost === true) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const location = window.location || {};
  const protocol = String(location.protocol || "").toLowerCase();
  const hostname = String(location.hostname || "").toLowerCase();
  if (protocol === "file:" || hostname === "" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  return /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    || hostname.endsWith(".local");
}

function apiDebugConsoleAuthorized() {
  const config = apiDebugConsoleConfig();
  const userId = apiDebugCurrentUserId();
  return config.enabled === true && apiDebugConsoleHostAllowed() && Boolean(userId) && apiDebugAllowedUserIds().includes(userId);
}

function apiDebugInitialOpen() {
  const config = apiDebugConsoleConfig();
  if (config.openByDefault === true) {
    return true;
  }
  try {
    const params = new URL(window.location.href).searchParams;
    if (params.get("apiDebug") === "1") {
      return true;
    }
  } catch (error) {
    // Ignore malformed local file URLs and fall back to local storage.
  }
  const storedState = apiDebugReadStorage(API_DEBUG_STORAGE_KEY);
  return storedState === "open" || storedState?.open === true;
}

function apiDebugStorageKey(baseKey) {
  const userId = apiDebugCurrentUserId() || "anonymous";
  return `${baseKey}:${userId}`;
}

function apiDebugReadWindowNameStore() {
  try {
    const text = String(window.name || "");
    if (!text.startsWith(API_DEBUG_WINDOW_NAME_PREFIX)) {
      return {};
    }
    return JSON.parse(text.slice(API_DEBUG_WINDOW_NAME_PREFIX.length)) || {};
  } catch (error) {
    return {};
  }
}

function apiDebugWriteWindowNameStore(store) {
  try {
    window.name = `${API_DEBUG_WINDOW_NAME_PREFIX}${JSON.stringify(store)}`;
    return true;
  } catch (error) {
    return false;
  }
}

function apiDebugReadStorage(baseKey) {
  const key = apiDebugStorageKey(baseKey);
  try {
    const raw = window.localStorage?.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return raw;
      }
    }
  } catch (error) {
    // Fall back to window.name below when localStorage is unavailable.
  }
  return apiDebugReadWindowNameStore()[key] || null;
}

function apiDebugWriteStorage(baseKey, value) {
  const key = apiDebugStorageKey(baseKey);
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
  } catch (error) {
    // Fall back to window.name below when localStorage quota or access fails.
  }
  const store = apiDebugReadWindowNameStore();
  store[key] = value;
  return apiDebugWriteWindowNameStore(store);
}

function apiDebugStorageArrayLimit(key, depth) {
  const normalized = String(key || "").toLowerCase();
  if (["airportlist"].includes(normalized)) {
    return 5;
  }
  if (["aircraft", "flyingplanes", "data", "coordinates"].includes(normalized)) {
    return depth <= 1 ? 20 : 8;
  }
  return depth <= 1 ? 40 : 12;
}

function apiDebugStorageSerialize(value, depth = 0, seen = new WeakSet(), key = "") {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  if (depth > 6) {
    return "[MaxDepth]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const limit = apiDebugStorageArrayLimit(key, depth);
    const items = value.slice(0, limit).map((item) => apiDebugStorageSerialize(item, depth + 1, seen, key));
    if (value.length > limit) {
      items.push(`[+${value.length - limit} more]`);
    }
    return items;
  }
  return Object.keys(value)
    .filter((field) => !["marker", "element", "node", "map"].includes(field))
    .slice(0, 120)
    .reduce((record, field) => {
      record[field] = apiDebugStorageSerialize(value[field], depth + 1, seen, field);
      return record;
    }, {});
}

function apiDebugCompactPayloadForStorage(record = {}) {
  const payload = record.payload || record.rawResponse || null;
  if (!payload || typeof payload !== "object") {
    return payload ?? null;
  }
  if (String(record.pid) === "513008") {
    return {
      airportListCount: Array.isArray(payload.airportList) ? payload.airportList.length : 0,
      aircraftCount: Array.isArray(payload.aircraft) ? payload.aircraft.length : 0,
      flyingPlanesCount: Array.isArray(payload.flyingPlanes) ? payload.flyingPlanes.length : 0,
      totalMatched: payload.totalMatched,
      viewportVersion: payload.viewportVersion || payload.version || "",
      bounds: payload.bounds || null,
      aircraft: apiDebugStorageSerialize(payload.aircraft || payload.flyingPlanes || [], 0, new WeakSet(), "aircraft"),
      airportList: apiDebugStorageSerialize(payload.airportList || [], 0, new WeakSet(), "airportList")
    };
  }
  return apiDebugStorageSerialize(payload);
}

function apiDebugPersistableRequest(record = {}) {
  return {
    id: record.id,
    status: record.status,
    pid: record.pid,
    params: apiDebugStorageSerialize(record.params || {}),
    startedAt: record.startedAt,
    receivedAt: record.receivedAt,
    durationMs: record.durationMs,
    error: record.error || "",
    rawText: String(record.rawText || "").slice(0, 2000),
    payload: apiDebugCompactPayloadForStorage(record),
    callsignReport: record.callsignReport || apiDebugCallsignReport(record.payload || record.rawResponse || null)
  };
}

function persistApiDebugRequests() {
  if (!state.apiDebug.authorized) {
    return;
  }
  const maxRequests = Math.max(10, Number(apiDebugConsoleConfig().maxRequests) || 60);
  const payload = {
    savedAt: Date.now(),
    selectedRequestId: state.apiDebug.selectedRequestId || "",
    requests: state.apiDebug.requests.slice(0, maxRequests).map(apiDebugPersistableRequest)
  };
  if (!apiDebugWriteStorage(API_DEBUG_REQUESTS_STORAGE_KEY, payload) && payload.requests.length > 20) {
    payload.requests = payload.requests.slice(0, 20);
    apiDebugWriteStorage(API_DEBUG_REQUESTS_STORAGE_KEY, payload);
  }
}

function persistApiDebugSelectionSnapshot(snapshot) {
  if (!state.apiDebug.authorized || !snapshot?.sections?.length) {
    return;
  }
  state.apiDebug.lastSelectionSnapshot = snapshot;
  apiDebugWriteStorage(API_DEBUG_SELECTION_STORAGE_KEY, snapshot);
}

function hydrateApiDebugPersistentState() {
  const requestState = apiDebugReadStorage(API_DEBUG_REQUESTS_STORAGE_KEY);
  if (Array.isArray(requestState?.requests)) {
    state.apiDebug.requests = requestState.requests;
    state.apiDebug.selectedRequestId = requestState.selectedRequestId || requestState.requests[0]?.id || "";
    state.apiDebug.lastEventAt = requestState.savedAt || null;
  }
  const selectionSnapshot = apiDebugReadStorage(API_DEBUG_SELECTION_STORAGE_KEY);
  if (selectionSnapshot?.sections?.length) {
    state.apiDebug.lastSelectionSnapshot = selectionSnapshot;
  }
}

function createApiDebugConsole() {
  if (document.getElementById("apiDebugConsole")) {
    return;
  }
  document.querySelector(".fr-shell")?.insertAdjacentHTML("beforeend", `
    <button id="apiDebugToggle" class="api-debug-toggle" type="button" aria-controls="apiDebugConsole" aria-expanded="false">
      API
    </button>
    <aside id="apiDebugConsole" class="api-debug-console" aria-label="接口调试台" hidden>
      <header class="api-debug-head">
        <div>
          <span>仅授权账号可见</span>
          <strong>接口调试台</strong>
          <small id="apiDebugSelectionLabel">未选择地图控件</small>
        </div>
        <button id="apiDebugClose" type="button" aria-label="关闭接口调试台">
          <svg><use href="#icon-close"></use></svg>
        </button>
      </header>
      <nav class="api-debug-tabs" aria-label="接口调试台视图">
        <button type="button" class="active" data-api-debug-tab="selection">当前控件</button>
        <button type="button" data-api-debug-tab="requests">请求日志</button>
      </nav>
      <div class="api-debug-actions">
        <button type="button" data-api-debug-action="refresh">刷新关联接口</button>
        <button type="button" data-api-debug-action="copy">复制当前 JSON</button>
      </div>
      <section id="apiDebugSelectionPanel" class="api-debug-panel active"></section>
      <section id="apiDebugRequestsPanel" class="api-debug-panel" hidden></section>
    </aside>
  `);
}

function setApiDebugOpen(open) {
  if (!state.apiDebug.authorized) {
    return;
  }
  state.apiDebug.open = Boolean(open);
  const panel = document.getElementById("apiDebugConsole");
  const toggle = document.getElementById("apiDebugToggle");
  if (panel) {
    panel.hidden = !state.apiDebug.open;
  }
  if (toggle) {
    toggle.classList.toggle("active", state.apiDebug.open);
    toggle.setAttribute("aria-expanded", state.apiDebug.open ? "true" : "false");
  }
  try {
    apiDebugWriteStorage(API_DEBUG_STORAGE_KEY, { open: state.apiDebug.open });
  } catch (error) {
    // Storage can be unavailable in private contexts; the console still works.
  }
  if (state.apiDebug.open) {
    maybeLoadApiDebugSelectionDetails();
    renderApiDebugConsole();
  }
}

function setApiDebugTab(tab) {
  state.apiDebug.activeTab = tab === "requests" ? "requests" : "selection";
  document.querySelectorAll("[data-api-debug-tab]").forEach((button) => {
    const active = button.dataset.apiDebugTab === state.apiDebug.activeTab;
    button.classList.toggle("active", active);
  });
  const selectionPanel = document.getElementById("apiDebugSelectionPanel");
  const requestsPanel = document.getElementById("apiDebugRequestsPanel");
  if (selectionPanel) {
    selectionPanel.hidden = state.apiDebug.activeTab !== "selection";
    selectionPanel.classList.toggle("active", state.apiDebug.activeTab === "selection");
  }
  if (requestsPanel) {
    requestsPanel.hidden = state.apiDebug.activeTab !== "requests";
    requestsPanel.classList.toggle("active", state.apiDebug.activeTab === "requests");
  }
  renderApiDebugConsole();
}

function bindApiDebugConsoleEvents() {
  document.getElementById("apiDebugToggle")?.addEventListener("click", () => setApiDebugOpen(!state.apiDebug.open));
  const panel = document.getElementById("apiDebugConsole");
  panel?.addEventListener("click", (event) => {
    const close = event.target.closest("#apiDebugClose");
    if (close) {
      setApiDebugOpen(false);
      return;
    }
    const tab = event.target.closest("[data-api-debug-tab]");
    if (tab) {
      setApiDebugTab(tab.dataset.apiDebugTab);
      return;
    }
    const action = event.target.closest("[data-api-debug-action]");
    if (action?.dataset.apiDebugAction === "refresh") {
      maybeLoadApiDebugSelectionDetails({ force: true });
      renderApiDebugConsole();
      return;
    }
    if (action?.dataset.apiDebugAction === "copy") {
      copyApiDebugSelection();
      return;
    }
    const request = event.target.closest("[data-api-debug-request-id]");
    if (request) {
      state.apiDebug.selectedRequestId = request.dataset.apiDebugRequestId || "";
      persistApiDebugRequests();
      renderApiDebugConsole();
    }
  });
  window.addEventListener(API_DEBUG_EVENT_NAME, handleApiDebugEvent);
}

function initApiDebugConsole() {
  state.apiDebug.authorized = apiDebugConsoleAuthorized();
  if (!state.apiDebug.authorized) {
    return;
  }
  hydrateApiDebugPersistentState();
  createApiDebugConsole();
  bindApiDebugConsoleEvents();
  setApiDebugOpen(apiDebugInitialOpen());
  renderApiDebugConsole();
}

function handleApiDebugEvent(event) {
  if (!state.apiDebug.authorized) {
    return;
  }
  const detail = event.detail || {};
  const requestId = `${Date.now()}-${state.apiDebug.requests.length}-${String(detail.pid || "api")}`;
  state.apiDebug.requests.unshift({
    id: requestId,
    ...detail,
    callsignReport: apiDebugCallsignReport(detail.payload || detail.rawResponse || null)
  });
  const maxRequests = Math.max(10, Number(apiDebugConsoleConfig().maxRequests) || 60);
  state.apiDebug.requests = state.apiDebug.requests.slice(0, maxRequests);
  state.apiDebug.selectedRequestId ||= requestId;
  state.apiDebug.lastEventAt = Date.now();
  persistApiDebugRequests();
  renderApiDebugConsole();
}

function maybeLoadApiDebugSelectionDetails(options = {}) {
  if (!state.apiDebug.authorized || !state.apiDebug.open || !dataService?.isEnabled()) {
    return;
  }
  if (state.selectedKind === "aircraft") {
    const jet = selectedAircraft();
    if (!jet) {
      return;
    }
    loadAircraftDetails(jet);
    if (options.force || !jet.flightHistoryDetail) {
      loadAircraftHistory(jet);
    }
    return;
  }
  if (state.selectedKind === "airport") {
    const airport = selectedAirport();
    if (!airport) {
      return;
    }
    loadAirportDetail(airport);
    if (options.force || !airport.apiGround) {
      loadAirportGround(airport);
    }
  }
}

function apiDebugSerialize(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  if (depth > 8) {
    return "[MaxDepth]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const limit = depth <= 1 ? 120 : 40;
    const items = value.slice(0, limit).map((item) => apiDebugSerialize(item, depth + 1, seen));
    if (value.length > limit) {
      items.push(`[+${value.length - limit} more]`);
    }
    return items;
  }
  return Object.keys(value)
    .filter((key) => !["marker", "element", "node", "map"].includes(key))
    .slice(0, 220)
    .reduce((record, key) => {
      record[key] = apiDebugSerialize(value[key], depth + 1, seen);
      return record;
    }, {});
}

function apiDebugJson(value) {
  try {
    return JSON.stringify(apiDebugSerialize(value), null, 2);
  } catch (error) {
    return JSON.stringify({ error: error?.message || String(error) }, null, 2);
  }
}

function apiDebugWithoutRaw(value) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  return Object.keys(value).reduce((record, key) => {
    if (key !== "raw" && key !== "rawResponse") {
      record[key] = value[key];
    }
    return record;
  }, {});
}

function apiDebugFlattenFields(value, prefix = "", rows = [], depth = 0) {
  if (rows.length >= 240) {
    return rows;
  }
  if (value === null || value === undefined || typeof value !== "object") {
    rows.push({ path: prefix || "root", value });
    return rows;
  }
  if (depth > 5) {
    rows.push({ path: prefix || "root", value: "[MaxDepth]" });
    return rows;
  }
  if (Array.isArray(value)) {
    rows.push({ path: prefix || "root", value: `Array(${value.length})` });
    value.slice(0, 5).forEach((item, index) => {
      apiDebugFlattenFields(item, `${prefix || "root"}[${index}]`, rows, depth + 1);
    });
    return rows;
  }
  const keys = Object.keys(value);
  if (prefix) {
    rows.push({ path: prefix, value: `Object(${keys.length})` });
  }
  keys.slice(0, 80).forEach((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    apiDebugFlattenFields(value[key], path, rows, depth + 1);
  });
  if (keys.length > 80) {
    rows.push({ path: `${prefix || "root"}.*`, value: `+${keys.length - 80} fields` });
  }
  return rows;
}

function apiDebugValueLabel(value) {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return value || "\"\"";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return apiDebugJson(value);
}

function renderApiDebugFieldRows(value) {
  const rows = apiDebugFlattenFields(value);
  if (!rows.length) {
    return `<p class="api-debug-empty">暂无字段</p>`;
  }
  return `<div class="api-debug-field-table">${rows.map((row) => `
    <div><code>${escapeHtml(row.path)}</code><span>${escapeHtml(apiDebugValueLabel(row.value))}</span></div>
  `).join("")}</div>`;
}

function apiDebugLoaded(value) {
  return value !== null && value !== undefined && !(typeof value === "object" && !Object.keys(value).length);
}

function apiDebugCallsignKeyType(key) {
  const normalized = String(key || "").toLowerCase();
  if (API_DEBUG_CALLSIGN_PRIMARY_KEYS.has(normalized)) {
    return "callsign";
  }
  if (API_DEBUG_CALLSIGN_FALLBACK_KEYS.has(normalized)) {
    return "fallback";
  }
  return "";
}

function apiDebugCallsignFieldHasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return !missingValue(value);
  }
  return true;
}

function apiDebugOrderedKeys(record) {
  const priority = [
    "callSign",
    "callsign",
    "call_sign",
    "flightNo",
    "flightNumber",
    "tripNo",
    "taskNo",
    "flightBaseInfo",
    "summaryInfo",
    "planeInfo",
    "aircraft",
    "flyingPlanes",
    "data",
    "raw"
  ];
  const keys = Object.keys(record || {});
  return [
    ...priority.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !priority.includes(key))
  ];
}

function apiDebugCollectCallsignEntries(value, options = {}) {
  const entries = [];
  const seen = new WeakSet();
  const budget = { nodes: 0 };
  const maxEntries = options.maxEntries || 80;
  const maxNodes = options.maxNodes || 6000;

  function walk(current, path = options.rootPath || "root", depth = 0) {
    if (entries.length >= maxEntries || budget.nodes >= maxNodes) {
      return;
    }
    if (current === null || current === undefined || typeof current !== "object") {
      return;
    }
    if (seen.has(current) || depth > 7) {
      return;
    }
    seen.add(current);
    budget.nodes += 1;
    if (Array.isArray(current)) {
      const arrayLimit = path.endsWith("airportList") ? 8 : Math.min(current.length, 260);
      current.slice(0, arrayLimit).forEach((item, index) => walk(item, `${path}[${index}]`, depth + 1));
      return;
    }
    apiDebugOrderedKeys(current).forEach((key) => {
      if (entries.length >= maxEntries || budget.nodes >= maxNodes) {
        return;
      }
      const fieldPath = `${path}.${key}`;
      const type = apiDebugCallsignKeyType(key);
      if (type) {
        entries.push({
          path: fieldPath,
          key,
          type,
          value: current[key],
          hasValue: apiDebugCallsignFieldHasValue(current[key])
        });
      }
      walk(current[key], fieldPath, depth + 1);
    });
  }

  walk(value);
  return entries;
}

function apiDebugFirstCallsignValue(entries, type = "") {
  return entries.find((entry) => (!type || entry.type === type) && entry.hasValue)?.value;
}

function apiDebugCallsignReport(raw, adapted = null) {
  const rawEntries = apiDebugCollectCallsignEntries(raw, { rootPath: "接口返回" });
  const adaptedEntries = apiDebugCollectCallsignEntries(adapted, { rootPath: "页面适配" });
  const rawCallsignValue = apiDebugFirstCallsignValue(rawEntries, "callsign");
  const rawFallbackValue = apiDebugFirstCallsignValue(rawEntries, "fallback");
  const adaptedCallsignValue = apiDebugFirstCallsignValue(adaptedEntries, "callsign");
  const adaptedFallbackValue = apiDebugFirstCallsignValue(adaptedEntries, "fallback");
  const finalValue = adaptedCallsignValue
    ?? adaptedFallbackValue
    ?? rawCallsignValue
    ?? rawFallbackValue
    ?? "";
  const hasPrimaryField = rawEntries.some((entry) => entry.type === "callsign")
    || adaptedEntries.some((entry) => entry.type === "callsign");
  const hasPrimaryValue = rawEntries.some((entry) => entry.type === "callsign" && entry.hasValue)
    || adaptedEntries.some((entry) => entry.type === "callsign" && entry.hasValue);
  const hasFallbackValue = rawEntries.some((entry) => entry.type === "fallback" && entry.hasValue)
    || adaptedEntries.some((entry) => entry.type === "fallback" && entry.hasValue);
  const hasDisplayValue = apiDebugCallsignFieldHasValue(finalValue);
  let status = "航班号未返回";
  if (hasDisplayValue || hasPrimaryValue) {
    status = "航班号已返回";
  } else if (hasFallbackValue) {
    status = "航班号已返回（备选字段）";
  } else if (hasPrimaryField) {
    status = "航班号字段为空";
  }
  return {
    status,
    hasPrimaryField,
    hasPrimaryValue: hasPrimaryValue || hasDisplayValue,
    hasFallbackValue,
    finalValue,
    rawCallsignValue: rawCallsignValue ?? "",
    rawFallbackValue: rawFallbackValue ?? "",
    adaptedCallsignValue: adaptedCallsignValue ?? "",
    adaptedFallbackValue: adaptedFallbackValue ?? "",
    rawEntries: rawEntries.slice(0, 24),
    adaptedEntries: adaptedEntries.slice(0, 12)
  };
}

function renderApiDebugCallsignReport(report) {
  if (!report) {
    return "";
  }
  const entries = [
    ...report.rawEntries.map((entry) => ({ ...entry, group: "接口" })),
    ...report.adaptedEntries.map((entry) => ({ ...entry, group: "适配" }))
  ];
  const statusClass = report.hasPrimaryValue
    ? "is-returned"
    : report.hasFallbackValue
      ? "is-fallback"
      : "is-missing";
  const value = apiDebugCallsignFieldHasValue(report.finalValue) ? apiDebugValueLabel(report.finalValue) : "—";
  const rows = entries.length
    ? entries.map((entry) => `
      <div>
        <span>${escapeHtml(entry.group)}</span>
        <code>${escapeHtml(entry.path)}</code>
        <strong>${escapeHtml(apiDebugValueLabel(entry.value))}</strong>
      </div>
    `).join("")
    : `<p>未检测到 callsign / callSign / call_sign 字段，也没有可用的 flightNo 兜底字段。</p>`;
  return `
    <section class="api-debug-callsign">
      <header>
        <span>航班号返回状态</span>
        <strong class="${statusClass}">${escapeHtml(report.status)}</strong>
      </header>
      <div class="api-debug-callsign-value">
        <span>当前展示值</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
      <div class="api-debug-callsign-fields">${rows}</div>
    </section>
  `;
}

function apiDebugSectionCallsignReport(section) {
  if (apiDebugLoaded(section?.raw) || apiDebugLoaded(section?.adapted)) {
    return apiDebugCallsignReport(section.raw, section.adapted);
  }
  return section?.callsignReport || apiDebugCallsignReport(section?.raw, section?.adapted);
}

function apiDebugRequestCallsignReport(record = {}) {
  const payload = record.payload || record.rawResponse || null;
  if (apiDebugLoaded(payload)) {
    return apiDebugCallsignReport(payload);
  }
  return record.callsignReport || apiDebugCallsignReport(payload);
}

function apiDebugAircraftSummary(jet) {
  if (!jet) {
    return null;
  }
  return {
    id: jet.id,
    uniqueKey: jet.uniqueKey,
    tailNoEncrypted: jet.tailNoEncrypted,
    historyRequestTailNo: aircraftHistoryRequestTailNo(jet),
    registration: firstMatchedValue(jet.registration, jet.tailNoClear),
    callsign: aircraftCallsignLabel(jet, ""),
    aircraftTypeCode: firstMatchedValue(jet.aircraftTypeCode, jet.icaoCode),
    operator: jet.operator,
    status: jet.status,
    source: jet.source,
    livePosition: currentPosition(jet),
    altitude: jet.altitude,
    speed: jet.speed,
    updatedAtEpochMs: jet.updatedAtEpochMs,
    detailLoaded: {
      "513009": Boolean(jet.flightDetail),
      "513011": Boolean(jet.planeDetail),
      "513013": Boolean(jet.flightHistoryDetail)
    }
  };
}

function apiDebugAirportSummary(airport) {
  if (!airport) {
    return null;
  }
  return {
    id: airport.id,
    iata: airport.iata || airport.airportCode,
    icaoCode: airport.icaoCode,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    lat: airport.lat,
    lng: airport.lng,
    ground: airport.ground,
    groundCount: airportParkingBadgeCount(airport),
    rawGroundNum: airport.raw?.groundNum,
    groundCountSource: airportGroundCountSource(airport),
    groundCountUpdatedAt: airportGroundCountUpdatedAt(airport),
    badgeTier: airportParkingBadgeModel(airport)?.tier || "",
    source: airport.source,
    detailLoaded: {
      "513010": Boolean(airport.apiDetail),
      "513014": Boolean(airport.apiGround),
      "513015": Boolean(airport.apiDynamic)
    }
  };
}

function selectedApiDebugSections() {
  if (state.selectedKind === "aircraft") {
    const jet = selectedAircraft();
    if (!jet) {
      return [];
    }
    const requestTailNo = aircraftHistoryRequestTailNo(jet);
    return [
      {
        pid: "513008",
        title: "实时在途飞机条目",
        request: { selectedUniqueKey: jet.uniqueKey || jet.id, tailNo: requestTailNo },
        raw: jet.raw || null,
        adapted: apiDebugAircraftSummary(jet)
      },
      {
        pid: "513009",
        title: "飞行轨迹与航班详情",
        request: { uniqueKey: jet.uniqueKey || "" },
        raw: jet.flightDetail?.raw || null,
        adapted: apiDebugWithoutRaw(jet.flightDetail)
      },
      {
        pid: "513011",
        title: "飞机基础信息",
        request: { tailNo: requestTailNo },
        raw: jet.planeDetail?.raw || null,
        adapted: apiDebugWithoutRaw(jet.planeDetail)
      },
      {
        pid: "513013",
        title: "飞机行程历史",
        request: { tailNo: requestTailNo },
        raw: jet.flightHistoryDetail?.raw || null,
        adapted: apiDebugWithoutRaw(jet.flightHistoryDetail)
      },
      {
        pid: "513014",
        title: "停场飞机来源条目",
        request: { airportCode: jet.groundAirport || "" },
        raw: jet.rawGroundPlane?.raw || jet.rawGroundPlane || null,
        adapted: apiDebugWithoutRaw(jet.rawGroundPlane)
      }
    ].filter((section) => section.pid !== "513014" || apiDebugLoaded(section.raw));
  }
  if (state.selectedKind === "airport") {
    const airport = selectedAirport();
    if (!airport) {
      return [];
    }
    return [
      {
        pid: "513008",
        title: "机场列表条目",
        request: { airportCode: airport.airportCode || airport.iata || "", icaoCode: airport.icaoCode || airport.id || "" },
        raw: airport.raw || null,
        adapted: apiDebugAirportSummary(airport)
      },
      {
        pid: "513010",
        title: "机场基础信息",
        request: { airportCode: airport.airportCode || airport.iata || "" },
        raw: airport.apiDetail?.raw || null,
        adapted: apiDebugWithoutRaw(airport.apiDetail)
      },
      {
        pid: "513014",
        title: "机场停场信息",
        request: { airportCode: airport.airportCode || airport.iata || "" },
        raw: airport.apiGround?.raw || null,
        adapted: apiDebugWithoutRaw(airport.apiGround)
      },
      {
        pid: "513015",
        title: "机场动态信息",
        request: { airportCode: airport.airportCode || airport.iata || "" },
        raw: airport.apiDynamic?.raw || null,
        adapted: apiDebugWithoutRaw(airport.apiDynamic)
      }
    ];
  }
  return [];
}

function apiDebugSelectionLabel() {
  if (state.selectedKind === "aircraft") {
    const jet = selectedAircraft();
    return jet
      ? `飞机 ${firstMatchedValue(aircraftCallsignLabel(jet, ""), jet.registration, jet.id)}`
      : "飞机未找到";
  }
  if (state.selectedKind === "airport") {
    const airport = selectedAirport();
    return airport
      ? `机场 ${firstMatchedValue(airport.iata, airport.icaoCode, airport.id)}`
      : "机场未找到";
  }
  if (state.apiDebug.lastSelectionSnapshot?.selection?.label) {
    return `上次 ${state.apiDebug.lastSelectionSnapshot.selection.label}`;
  }
  return "未选择地图控件";
}

function renderApiDebugSection(section) {
  const loaded = apiDebugLoaded(section.raw);
  const adaptedLoaded = apiDebugLoaded(section.adapted);
  const callsignReport = apiDebugSectionCallsignReport(section);
  return `
    <article class="api-debug-card">
      <header>
        <div>
          <span class="api-debug-pid">${escapeHtml(section.pid)}</span>
          <strong>${escapeHtml(section.title)}</strong>
        </div>
        <em class="${loaded ? "is-loaded" : "is-waiting"}">${loaded ? "已返回" : "等待返回"}</em>
      </header>
      <div class="api-debug-meta">
        <span>请求参数</span>
        <code>${escapeHtml(apiDebugJson(section.request || {}))}</code>
      </div>
      ${renderApiDebugCallsignReport(callsignReport)}
      ${loaded ? `
        <h4>返回字段</h4>
        ${renderApiDebugFieldRows(section.raw)}
        <details>
          <summary>原始返回 JSON</summary>
          <pre>${escapeHtml(apiDebugJson(section.raw))}</pre>
        </details>
      ` : `<p class="api-debug-empty">当前控件尚未加载该接口返回。打开调试台后会自动补齐可用的关联接口。</p>`}
      ${adaptedLoaded ? `
        <details>
          <summary>页面适配结果</summary>
          <pre>${escapeHtml(apiDebugJson(section.adapted))}</pre>
        </details>
      ` : ""}
    </article>
  `;
}

function apiDebugSelectionSnapshot(sections) {
  if (!sections.length) {
    return null;
  }
  return {
    savedAt: Date.now(),
    selection: {
      kind: state.selectedKind,
      id: state.selectedId,
      label: apiDebugSelectionLabel()
    },
    sections: sections.map((section) => ({
      pid: section.pid,
      title: section.title,
      request: apiDebugStorageSerialize(section.request || {}),
      raw: apiDebugStorageSerialize(section.raw),
      adapted: apiDebugStorageSerialize(section.adapted),
      callsignReport: apiDebugCallsignReport(section.raw, section.adapted)
    }))
  };
}

function apiDebugRetainedSnapshotBanner(snapshot) {
  const time = apiDebugTimeLabel(snapshot?.savedAt);
  const label = snapshot?.selection?.label || "上次选择";
  return `
    <div class="api-debug-retained-banner">
      <strong>保留数据</strong>
      <span>${escapeHtml(label)} · ${escapeHtml(time)}</span>
    </div>
  `;
}

function renderApiDebugSelection() {
  const panel = document.getElementById("apiDebugSelectionPanel");
  if (!panel) {
    return;
  }
  const sections = selectedApiDebugSections();
  if (!sections.length) {
    const snapshot = state.apiDebug.lastSelectionSnapshot;
    if (snapshot?.sections?.length) {
      panel.innerHTML = `${apiDebugRetainedSnapshotBanner(snapshot)}${snapshot.sections.map(renderApiDebugSection).join("")}`;
      return;
    }
    panel.innerHTML = `<p class="api-debug-empty api-debug-large-empty">在地图上点选飞机或机场后，这里会显示相关接口的原始返回字段。</p>`;
    return;
  }
  const snapshot = apiDebugSelectionSnapshot(sections);
  if (snapshot && sections.some((section) => apiDebugLoaded(section.raw) || apiDebugLoaded(section.adapted))) {
    persistApiDebugSelectionSnapshot(snapshot);
  }
  panel.innerHTML = sections.map(renderApiDebugSection).join("");
}

function apiDebugRequestSummary(record) {
  const payload = record.payload || record.rawResponse || null;
  const callsignReport = apiDebugRequestCallsignReport(record);
  const callsignSuffix = callsignReport?.finalValue
    ? `航班号:${apiDebugValueLabel(callsignReport.finalValue)}`
    : callsignReport?.status || "";
  if (!payload || typeof payload !== "object") {
    return [record.error || "无结构化返回", callsignSuffix].filter(Boolean).join(" | ");
  }
  const keys = Object.keys(payload).slice(0, 8);
  const counts = [
    Array.isArray(payload.aircraft) ? `aircraft:${payload.aircraft.length}` : "",
    Array.isArray(payload.flyingPlanes) ? `flyingPlanes:${payload.flyingPlanes.length}` : "",
    Array.isArray(payload.airportList) ? `airportList:${payload.airportList.length}` : "",
    Array.isArray(payload.data) ? `data:${payload.data.length}` : ""
  ].filter(Boolean);
  return [...counts, keys.join(", "), callsignSuffix].filter(Boolean).join(" | ") || "Object";
}

function apiDebugTimeLabel(epochMs) {
  if (!Number.isFinite(Number(epochMs))) {
    return "—";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(Number(epochMs)));
}

function renderApiDebugRequests() {
  const panel = document.getElementById("apiDebugRequestsPanel");
  if (!panel) {
    return;
  }
  const requests = state.apiDebug.requests;
  if (!requests.length) {
    panel.innerHTML = `<p class="api-debug-empty api-debug-large-empty">暂无接口请求记录。地图开始加载或点选控件后，请求会显示在这里。</p>`;
    return;
  }
  const selected = requests.find((record) => record.id === state.apiDebug.selectedRequestId) || requests[0];
  state.apiDebug.selectedRequestId = selected.id;
  const list = requests.map((record) => `
    <button type="button" class="${record.id === selected.id ? "active" : ""}" data-api-debug-request-id="${escapeHtml(record.id)}">
      <span><strong>${escapeHtml(record.pid || "API")}</strong><em>${escapeHtml(apiDebugTimeLabel(record.receivedAt || record.startedAt))}</em></span>
      <small>${escapeHtml(record.status || "unknown")} · ${escapeHtml(String(record.durationMs ?? "—"))}ms</small>
      <p>${escapeHtml(apiDebugRequestSummary(record))}</p>
    </button>
  `).join("");
  panel.innerHTML = `
    <div class="api-debug-request-layout">
      <div class="api-debug-request-list">${list}</div>
      <article class="api-debug-request-detail">
        <header>
          <span class="api-debug-pid">${escapeHtml(selected.pid || "API")}</span>
          <strong>${escapeHtml(selected.status || "unknown")}</strong>
        </header>
        <div class="api-debug-meta">
          <span>请求参数</span>
          <code>${escapeHtml(apiDebugJson(selected.params || {}))}</code>
        </div>
        ${renderApiDebugCallsignReport(apiDebugRequestCallsignReport(selected))}
        <details open>
          <summary>返回 / 错误</summary>
          <pre>${escapeHtml(apiDebugJson({
            rawResponse: selected.rawResponse || null,
            payload: selected.payload || null,
            rawText: selected.rawText || "",
            error: selected.error || ""
          }))}</pre>
        </details>
      </article>
    </div>
  `;
}

function renderApiDebugConsole() {
  if (!state.apiDebug.authorized) {
    return;
  }
  const label = document.getElementById("apiDebugSelectionLabel");
  if (label) {
    label.textContent = apiDebugSelectionLabel();
  }
  if (!state.apiDebug.open) {
    return;
  }
  renderApiDebugSelection();
  renderApiDebugRequests();
}

async function copyApiDebugSelection() {
  const payload = {
    selection: {
      kind: state.selectedKind,
      id: state.selectedId,
      label: apiDebugSelectionLabel()
    },
    sections: selectedApiDebugSections().map((section) => ({
      pid: section.pid,
      title: section.title,
      request: section.request,
      raw: section.raw,
      adapted: section.adapted,
      callsignReport: section.callsignReport || apiDebugCallsignReport(section.raw, section.adapted)
    })),
    retainedSelection: state.apiDebug.lastSelectionSnapshot || null,
    latestRequests: state.apiDebug.requests.slice(0, 10)
  };
  const text = apiDebugJson(payload);
  try {
    await navigator.clipboard?.writeText(text);
  } catch (error) {
    window.prompt("复制当前接口 JSON", text);
  }
}

function normalizeAirportPanelCode(value) {
  return String(displayOrDash(value)).trim().toUpperCase();
}

function firstAirportCodeByLength(length, ...values) {
  return values
    .map(normalizeAirportPanelCode)
    .find((value) => value !== NA_TEXT && value.length === length) || NA_TEXT;
}

function firstDistinctAirportName(primary, fallback) {
  const value = firstMatchedValue(...primary);
  if (value !== NA_TEXT) {
    return value;
  }
  return firstMatchedValue(...fallback);
}

function selectedRouteSide(jet, side) {
  const detail = jet.flightDetail || {};
  const base = detail.flightBaseInfo || {};
  const routeAirport = side === "dep" ? detail.airportInfo?.dep : detail.airportInfo?.arr;
  const knownAirport = side === "dep" ? airportByCode(jet.from) : airportByCode(jet.to);
  if (side === "dep") {
    const iata = firstAirportCodeByLength(3, routeAirport?.airportCode, knownAirport?.iata, base.depAirport, jet.from);
    const icao = firstAirportCodeByLength(4, base.depIcaoCode, routeAirport?.icaoCode, knownAirport?.icaoCode, knownAirport?.id, jet.from);
    return {
      code: iata !== NA_TEXT ? iata : firstMatchedValue(base.depAirport, routeAirport?.airportCode, jet.from),
      iata,
      icao,
      name: firstMatchedValue(base.depAirportName, routeAirport?.airportNameEn, routeAirport?.airportName, routeAirport?.airportFourName, jet.fromName, airportDisplayName(knownAirport)),
      nameCn: firstDistinctAirportName(
        [routeAirport?.airportName, routeAirport?.airportFourName],
        [base.depAirportName, routeAirport?.airportNameEn, jet.fromName, airportDisplayName(knownAirport)]
      ),
      nameEn: firstDistinctAirportName(
        [routeAirport?.airportNameEn, base.depAirportName, knownAirport?.name],
        [routeAirport?.airportName, routeAirport?.airportFourName, jet.fromName]
      ),
      zone: firstMatchedValue(base.depZoneId, routeAirport?.zoneId, knownAirport?.zoneId, base.depTimeZone, routeAirport?.timeZone, knownAirport?.timeZone)
    };
  }
  const iata = firstAirportCodeByLength(3, routeAirport?.airportCode, knownAirport?.iata, base.arrAirport, jet.to);
  const icao = firstAirportCodeByLength(4, base.arrIcaoCode, routeAirport?.icaoCode, knownAirport?.icaoCode, knownAirport?.id, jet.to);
  return {
    code: iata !== NA_TEXT ? iata : firstMatchedValue(base.arrAirport, routeAirport?.airportCode, jet.to),
    iata,
    icao,
    name: firstMatchedValue(base.arrAirportName, routeAirport?.airportNameEn, routeAirport?.airportName, routeAirport?.airportFourName, jet.toName, airportDisplayName(knownAirport)),
    nameCn: firstDistinctAirportName(
      [routeAirport?.airportName, routeAirport?.airportFourName],
      [base.arrAirportName, routeAirport?.airportNameEn, jet.toName, airportDisplayName(knownAirport)]
    ),
    nameEn: firstDistinctAirportName(
      [routeAirport?.airportNameEn, base.arrAirportName, knownAirport?.name],
      [routeAirport?.airportName, routeAirport?.airportFourName, jet.toName]
    ),
    zone: firstMatchedValue(base.arrZoneId, routeAirport?.zoneId, knownAirport?.zoneId, base.arrTimeZone, routeAirport?.timeZone, knownAirport?.timeZone)
  };
}

function makePanelTimeRef(value, options = {}) {
  if (value && typeof value === "object" && "epochMs" in value) {
    return {
      ...value,
      displayZone: value.displayZone || options.timeZone || "",
      sourceField: value.sourceField || options.sourceField || "",
      semantic: value.semantic || options.semantic || ""
    };
  }
  if (missingValue(value)) {
    return {
      raw: "",
      epochMs: null,
      displayZone: options.timeZone || "",
      offsetMinutes: null,
      sourceField: options.sourceField || "",
      semantic: options.semantic || "",
      confidence: "missing"
    };
  }
  if (timeUtils.makeTimeRef) {
    return timeUtils.makeTimeRef(value, options);
  }
  return {
    raw: value === null || value === undefined ? "" : String(value),
    epochMs: parsePanelEpoch(value, options),
    displayZone: options.timeZone || "",
    offsetMinutes: null,
    sourceField: options.sourceField || "",
    semantic: options.semantic || "",
    confidence: value ? "raw-only" : "missing"
  };
}

function flightTimeRefsForPanel(jet, base, dep, arr) {
  const refs = jet.flightDetail?.timeRefs || {};
  return {
    scheduledDeparture: makePanelTimeRef(refs.scheduledDeparture || firstMatchedValue(base.depTime2EpochMs, base.scheduledDepartureEpochMs, base.depTime2, base.scheduledDepartureTime, base.depPlanTime), {
      timeZone: dep.zone,
      sourceField: "flightBaseInfo.depTime2",
      semantic: "scheduled_departure"
    }),
    actualDeparture: makePanelTimeRef(refs.actualDeparture || firstMatchedValue(base.depActualEpochMs, base.depTime1EpochMs, base.depTime1, jet.depart), {
      timeZone: dep.zone,
      sourceField: "flightBaseInfo.depTime1",
      semantic: "actual_departure"
    }),
    scheduledArrival: makePanelTimeRef(refs.scheduledArrival || firstMatchedValue(base.arrTime2EpochMs, base.scheduledArrivalEpochMs, base.arrTime2, base.scheduledArrivalTime, base.arrPlanTime), {
      timeZone: arr.zone,
      sourceField: "flightBaseInfo.arrTime2",
      semantic: "scheduled_arrival"
    }),
    estimatedArrival: makePanelTimeRef(refs.estimatedArrival || firstMatchedValue(base.arrEstimatedEpochMs, base.arrTime1EpochMs, base.arrActualEpochMs, base.arrTime1, jet.arrive), {
      timeZone: arr.zone,
      sourceField: "flightBaseInfo.arrTime1",
      semantic: "estimated_arrival"
    }),
    serverNow: makePanelTimeRef(refs.serverNow || firstMatchedValue(base.serverNowEpochMs, jet.flightDetail?.serverNowEpochMs, base.currentTimeGmt8, jet.updatedAtEpochMs, Date.now()), {
      timeZone: refs.serverNow?.displayZone || (base.serverNowEpochMs || jet.flightDetail?.serverNowEpochMs ? "UTC" : "Asia/Shanghai"),
      sourceField: "flightBaseInfo.serverNowEpochMs",
      semantic: "server_now"
    })
  };
}

function formatRouteTime(ref, options = {}) {
  return formatPanelTime(ref, {
    date: options.date !== false,
    timeZone: ref?.displayZone || options.timeZone || "UTC",
    includeZone: true
  });
}

function utcOffsetLabelFromMinutes(offsetMinutes) {
  const offset = Number(offsetMinutes);
  if (!Number.isFinite(offset) || offset === 0) {
    return "UTC";
  }
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return minutes ? `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}` : `UTC${sign}${hours}`;
}

function utcOffsetMinutesForZone(zone, epochMs = Date.now()) {
  const zoneText = displayOrDash(zone);
  if (zoneText === NA_TEXT) {
    return null;
  }
  const explicitOffset = timeUtils.parseUtcOffsetMinutes ? timeUtils.parseUtcOffsetMinutes(zoneText) : null;
  if (explicitOffset !== null && explicitOffset !== undefined) {
    return explicitOffset;
  }
  if (timeUtils.isIanaTimeZone?.(zoneText) && timeUtils._private?.timeZoneOffsetMinutes) {
    try {
      return timeUtils._private.timeZoneOffsetMinutes(parsePanelEpoch(epochMs) || Date.now(), zoneText);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function utcOffsetLabelForZone(zone, epochMs = Date.now()) {
  const zoneText = displayOrDash(zone);
  if (zoneText === NA_TEXT) {
    return "UTC";
  }
  const offset = utcOffsetMinutesForZone(zoneText, epochMs);
  if (offset !== null && offset !== undefined) {
    return utcOffsetLabelFromMinutes(offset);
  }
  return /^UTC/i.test(zoneText) ? zoneText.replace(/\s+/g, "") : "UTC";
}

function utcStandardOffsetLabelForZone(zone, epochMs = Date.now()) {
  const offset = utcOffsetMinutesForZone(zone, epochMs);
  if (offset === null || offset === undefined) {
    return NA_TEXT;
  }
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

function formatRouteZoneLocalTime(zone, timeRef) {
  return utcOffsetLabelForZone(zone, timeRef?.epochMs || Date.now());
}

function formatRouteTimeZoneDifference(depZone, arrZone, timeRef) {
  const epoch = timeRef?.epochMs || Date.now();
  const depOffset = utcOffsetMinutesForZone(depZone, epoch);
  const arrOffset = utcOffsetMinutesForZone(arrZone, epoch);
  if (!Number.isFinite(depOffset) || !Number.isFinite(arrOffset)) {
    return { hidden: true, text: "" };
  }
  const diffMinutes = arrOffset - depOffset;
  if (diffMinutes === 0) {
    return { hidden: true, text: "" };
  }
  const sign = diffMinutes > 0 ? "+" : "-";
  const absolute = Math.abs(diffMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const diffText = minutes ? `${sign}${hours}h ${minutes}m` : `${sign}${hours}h`;
  return {
    hidden: false,
    text: `${utcOffsetLabelFromMinutes(depOffset)} → ${utcOffsetLabelFromMinutes(arrOffset)} · ${diffText}`
  };
}

function formatPanelTimeHighlight(ref, zone, options = {}) {
  const timeZone = zone && zone !== NA_TEXT ? zone : ref?.displayZone || "UTC";
  const epoch = parsePanelEpoch(ref);
  const zoneLabel = utcOffsetLabelForZone(timeZone, epoch || Date.now());
  const timeText = formatPanelTime(ref, {
    date: false,
    timeZone,
    includeZone: false,
    includeUnknownLabel: false,
    rawUnknown: false
  });
  const dateTimeText = formatPanelTime(ref, {
    date: true,
    timeZone,
    includeZone: false,
    includeUnknownLabel: false,
    rawUnknown: false
  });
  const dateText = timeText !== NA_TEXT && dateTimeText !== NA_TEXT && dateTimeText.endsWith(timeText)
    ? dateTimeText.slice(0, -timeText.length).trim()
    : NA_TEXT;
  const acrossDays = Number.parseInt(options.acrossDays, 10);
  const dateWithOffset = Number.isFinite(acrossDays) && acrossDays > 0 && dateText !== NA_TEXT
    ? `${dateText} +${acrossDays}d`
    : dateText;
  return {
    time: timeText,
    date: dateWithOffset,
    zone: zoneLabel
  };
}

function localizedFlightStatus(jet, base = {}, summary = {}) {
  return { text: "途中", tone: "normal" };
}

function formatUtcTime(value, options = {}) {
  return formatPanelTime(value, {
    date: options.date,
    seconds: options.seconds,
    timeZone: "UTC",
    includeZone: true
  });
}

function formatRelativeUpdatedTime(value) {
  const epoch = parsePanelEpoch(value);
  if (epoch === null) {
    return NA_TEXT;
  }
  return timeUtils.relativeTime ? timeUtils.relativeTime(epoch) : formatUtcTime(epoch);
}

function aircraftProfileForPanel(jet) {
  const profile = jet.planeDetail || {};
  const trackDetail = jet.flightDetail || {};
  return {
    plane: {
      ...(trackDetail.planeInfo || {}),
      ...(profile.planeInfo || {})
    },
    provider: {
      ...(trackDetail.serviceProvider || {}),
      ...(profile.serviceProvider || {})
    },
    summary: trackDetail.summaryInfo || {},
    base: trackDetail.flightBaseInfo || {},
    airportInfo: trackDetail.airportInfo || {}
  };
}

function aircraftPanelImages(jet) {
  const { plane } = aircraftProfileForPanel(jet);
  const images = [];
  if (Array.isArray(plane.flightRadarImgs)) {
    plane.flightRadarImgs.forEach((item) => {
      if (item?.url) images.push({ url: item.url, source: item.source || item.credit || "" });
    });
  }
  if (Array.isArray(plane.slideImgs)) {
    plane.slideImgs.forEach((item) => {
      if (item?.url) images.push({ url: item.url, source: item.source || item.credit || "" });
    });
  }
  if (plane.modelImg) {
    images.push({ url: plane.modelImg, source: "model image" });
  }
  return images.filter((item, index, list) => item.url && list.findIndex((candidate) => candidate.url === item.url) === index);
}

function renderAircraftMedia(jet) {
  const images = aircraftPanelImages(jet);
  if (!images.length) {
    setHtml("aircraftMedia", `<span>Aircraft image</span>`);
    setText("aircraftMediaSource", NA_TEXT);
    setText("aircraftMediaCount", NA_TEXT);
    return;
  }
  const image = images[0];
  setHtml("aircraftMedia", `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(displayOrDash(jet.model))}">`);
  setText("aircraftMediaSource", firstMatchedValue(image.source, "authorized image"));
  setText("aircraftMediaCount", `${images.length} image${images.length > 1 ? "s" : ""}`);
}

function speedAltitudeRouteTimes(jet, routeTimes) {
  if (routeTimes) {
    return routeTimes;
  }
  const profile = aircraftProfileForPanel(jet);
  const dep = selectedRouteSide(jet, "dep");
  const arr = selectedRouteSide(jet, "arr");
  return flightTimeRefsForPanel(jet, profile.base, dep, arr);
}

function chartValueRange(values) {
  if (!values.length) {
    return { min: 0, max: 1 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const pad = Math.max(1, Math.abs(max) * 0.04);
    return { min: min - pad, max: max + pad };
  }
  return { min, max };
}

function chartLocalTimeZoneFromRouteTimes(routeTimes) {
  return firstMatchedValue(
    routeTimes?.estimatedArrival?.displayZone,
    routeTimes?.scheduledArrival?.displayZone,
    routeTimes?.actualDeparture?.displayZone,
    routeTimes?.scheduledDeparture?.displayZone,
    "UTC"
  );
}

function chartTimeParts(value, routeTimes) {
  const epoch = parsePanelEpoch(value);
  if (epoch === null) {
    return {
      utc: NA_TEXT,
      utcShort: NA_TEXT,
      utcAxis: NA_TEXT,
      local: NA_TEXT,
      localShort: NA_TEXT,
      localAxis: NA_TEXT,
      localZone: "UTC",
      combined: NA_TEXT
    };
  }
  const localZone = chartLocalTimeZoneFromRouteTimes(routeTimes);
  const localZoneLabel = utcOffsetLabelForZone(localZone, epoch);
  const utc = formatUtcTime(epoch, { date: true });
  const utcShort = formatPanelTime(epoch, {
    date: false,
    timeZone: "UTC",
    includeZone: false
  });
  const local = formatPanelTime(epoch, {
    date: true,
    timeZone: localZone,
    includeZone: false,
    includeUnknownLabel: false,
    rawUnknown: false
  });
  const localShort = formatPanelTime(epoch, {
    date: false,
    timeZone: localZone,
    includeZone: false,
    includeUnknownLabel: false,
    rawUnknown: false
  });
  return {
    utc,
    utcShort,
    utcAxis: `${utcShort}Z`,
    local,
    localShort,
    localAxis: `${localShort} ${localZoneLabel}`,
    localZone: localZoneLabel,
    combined: `${local} ${localZoneLabel} · ${utc.replace(/\sUTC$/, "Z")}`
  };
}

function chartAxisTimeLabel(value, routeTimes) {
  return chartTimeParts(value, routeTimes).combined;
}

function chartAxisTimeSvg(x, y, timeParts, options = {}) {
  const anchorClass = options.end ? " chart-axis-end" : options.middle ? " chart-axis-mid" : "";
  const anchor = options.middle ? ' text-anchor="middle"' : "";
  return `
      <text x="${x}" y="${y}" class="chart-axis${anchorClass}"${anchor}>
        <tspan class="chart-axis-local" x="${x}">${escapeHtml(timeParts.localAxis)}</tspan>
        <tspan class="chart-axis-utc" x="${x}" dy="11">${escapeHtml(timeParts.utcAxis)}</tspan>
      </text>`;
}

function speedAltitudeCurrentPoint(jet, timestamp) {
  const position = currentPosition(jet);
  if (!Array.isArray(position) || position.length !== 2) {
    return null;
  }
  const lat = Number(position[0]);
  const lng = Number(position[1]);
  const pointTimestamp = parsePanelEpoch(timestamp) || aircraftLastUpdatedAt(jet) || Date.now();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) {
    return null;
  }
  return {
    lat,
    lng: normalizeLongitude(lng),
    altitudeFt: trackNumericValue(jet.altitude),
    groundSpeedKt: trackNumericValue(jet.speed),
    heading: aircraftHeading(jet),
    timestamp: pointTimestamp,
    source: "current",
    quality: jet.quality || "good"
  };
}

function mergeChartMetricPoint(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    altitudeFt: trackNumericValue(incoming.altitudeFt) ?? trackNumericValue(existing.altitudeFt),
    groundSpeedKt: trackNumericValue(incoming.groundSpeedKt) ?? trackNumericValue(existing.groundSpeedKt),
    source: firstMatchedValue(incoming.source, existing.source),
    quality: firstMatchedValue(incoming.quality, existing.quality)
  };
}

function completeSpeedAltitudeChartPoints(jet, startTime, endTime) {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return [];
  }
  const rawPoints = aircraftTrackPoints(jet)
    .filter((point) => finiteNumber(point.timestamp) && (finiteNumber(point.altitudeFt) || finiteNumber(point.groundSpeedKt)))
    .sort((first, second) => Number(first.timestamp) - Number(second.timestamp));
  const beforeStart = [...rawPoints]
    .reverse()
    .find((point) => Number(point.timestamp) < startTime && (finiteNumber(point.altitudeFt) || finiteNumber(point.groundSpeedKt)));
  const windowPoints = rawPoints.filter((point) => Number(point.timestamp) >= startTime && Number(point.timestamp) <= endTime);
  const currentPoint = speedAltitudeCurrentPoint(jet, endTime);
  const seedPoints = [
    beforeStart ? { ...beforeStart, timestamp: startTime, source: firstMatchedValue(beforeStart.source, "boundary") } : null,
    ...windowPoints,
    currentPoint
  ].filter(Boolean);
  const byTimestamp = new Map();
  seedPoints.forEach((point) => {
    const timestamp = Number(point.timestamp);
    if (!Number.isFinite(timestamp)) {
      return;
    }
    const normalized = {
      ...point,
      timestamp,
      altitudeFt: trackNumericValue(point.altitudeFt),
      groundSpeedKt: trackNumericValue(point.groundSpeedKt)
    };
    const existing = byTimestamp.get(timestamp);
    byTimestamp.set(timestamp, existing ? mergeChartMetricPoint(existing, normalized) : normalized);
  });
  let points = [...byTimestamp.values()].sort((first, second) => first.timestamp - second.timestamp);
  if (points.length === 1) {
    const only = points[0];
    points = [
      {
        ...only,
        timestamp: startTime,
        source: firstMatchedValue(only.source, "chart-start")
      },
      {
        ...only,
        ...(currentPoint || {}),
        timestamp: endTime,
        source: firstMatchedValue(currentPoint?.source, only.source, "current")
      }
    ];
  }
  let lastAltitude = null;
  let lastSpeed = null;
  points = points.map((point) => {
    const altitude = trackNumericValue(point.altitudeFt);
    const speed = trackNumericValue(point.groundSpeedKt);
    const completed = {
      ...point,
      altitudeFilled: altitude === null && lastAltitude !== null,
      speedFilled: speed === null && lastSpeed !== null,
      altitudeFt: altitude ?? lastAltitude,
      groundSpeedKt: speed ?? lastSpeed
    };
    if (completed.altitudeFt !== null) {
      lastAltitude = completed.altitudeFt;
    }
    if (completed.groundSpeedKt !== null) {
      lastSpeed = completed.groundSpeedKt;
    }
    return completed;
  });
  let nextAltitude = null;
  let nextSpeed = null;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point.altitudeFt === null && nextAltitude !== null) {
      point.altitudeFt = nextAltitude;
      point.altitudeFilled = true;
    }
    if (point.groundSpeedKt === null && nextSpeed !== null) {
      point.groundSpeedKt = nextSpeed;
      point.speedFilled = true;
    }
    if (point.altitudeFt !== null) {
      nextAltitude = point.altitudeFt;
    }
    if (point.groundSpeedKt !== null) {
      nextSpeed = point.groundSpeedKt;
    }
  }
  return points.filter((point) => finiteNumber(point.timestamp) && (finiteNumber(point.altitudeFt) || finiteNumber(point.groundSpeedKt)));
}

function sampleSpeedAltitudeChartPoints(points, maxPoints = SPEED_ALTITUDE_CHART_MAX_POINTS) {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return points || [];
  }
  const sorted = [...points].sort((first, second) => Number(first.timestamp) - Number(second.timestamp));
  const sampled = new Map();
  const lastIndex = sorted.length - 1;
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index / (maxPoints - 1)) * lastIndex);
    const point = sorted[sourceIndex];
    if (point) {
      sampled.set(sourceIndex, point);
    }
  }
  sampled.set(0, sorted[0]);
  sampled.set(lastIndex, sorted[lastIndex]);
  return [...sampled.entries()]
    .sort((first, second) => first[0] - second[0])
    .map((entry) => entry[1]);
}

function speedAltitudeChartDiagnostics(jet = selectedAircraft(), routeTimes) {
  if (!jet) {
    return null;
  }
  const resolvedRouteTimes = speedAltitudeRouteTimes(jet, routeTimes);
  const initialPoints = aircraftTrackPoints(jet)
    .filter((point) => finiteNumber(point.timestamp) && (finiteNumber(point.altitudeFt) || finiteNumber(point.groundSpeedKt)));
  const departedAt = resolvedRouteTimes.actualDeparture.epochMs;
  const startTime = departedAt || (initialPoints.length ? Math.min(...initialPoints.map((point) => Number(point.timestamp))) : null);
  const currentTime = selectPanelNowEpoch(
    resolvedRouteTimes,
    jet,
    initialPoints,
    startTime,
    resolvedRouteTimes.estimatedArrival.epochMs
  ) || Date.now();
  const endTime = startTime ? Math.max(currentTime, startTime + 60000) : currentTime;
  const completedPoints = startTime ? completeSpeedAltitudeChartPoints(jet, startTime, endTime) : [];
  const sampledPoints = sampleSpeedAltitudeChartPoints(completedPoints);
  const windowMetricPoints = startTime
    ? initialPoints.filter((point) => Number(point.timestamp) >= startTime && Number(point.timestamp) <= endTime)
    : initialPoints;
  return {
    aircraftId: jet.id,
    registration: aircraftRegistrationLabel(jet),
    startTime,
    endTime,
    sourceMetricPoints: initialPoints.length,
    sourceWindowMetricPoints: windowMetricPoints.length,
    sourceAltitudePoints: windowMetricPoints.filter((point) => finiteNumber(point.altitudeFt)).length,
    sourceSpeedPoints: windowMetricPoints.filter((point) => finiteNumber(point.groundSpeedKt)).length,
    completedPoints: completedPoints.length,
    renderedPoints: sampledPoints.length,
    renderSampling: completedPoints.length > sampledPoints.length ? "uniform-full-span" : "none",
    firstSourceMetricTime: initialPoints[0]?.timestamp || null,
    firstRenderedTime: sampledPoints[0]?.timestamp || null,
    lastRenderedTime: sampledPoints[sampledPoints.length - 1]?.timestamp || null
  };
}

function attachSpeedAltitudeChartHover(chartElement, points, meta) {
  if (!chartElement) {
    return;
  }
  const svg = chartElement.querySelector("[data-speed-altitude-chart]");
  const hover = svg?.querySelector("[data-chart-hover]");
  if (!svg || !hover || !points.length) {
    return;
  }
  const line = hover.querySelector("[data-chart-hover-line]");
  const altitudePoint = hover.querySelector("[data-chart-hover-altitude]");
  const speedPoint = hover.querySelector("[data-chart-hover-speed]");
  const card = hover.querySelector("[data-chart-hover-card]");
  const timeText = hover.querySelector("[data-chart-hover-time]");
  const localTimeText = hover.querySelector("[data-chart-hover-local-time]");
  const altitudeText = hover.querySelector("[data-chart-hover-altitude-text]");
  const speedText = hover.querySelector("[data-chart-hover-speed-text]");
  const plotSpan = Math.max(1, meta.endTime - meta.startTime);

  function nearestPoint(targetTime) {
    return points.reduce((nearest, point) => (
      !nearest || Math.abs(point.timestamp - targetTime) < Math.abs(nearest.timestamp - targetTime)
        ? point
        : nearest
    ), null);
  }

  function setPoint(circle, x, y) {
    if (!circle || !Number.isFinite(y)) {
      circle?.setAttribute("display", "none");
      return;
    }
    circle.removeAttribute("display");
    circle.setAttribute("cx", x.toFixed(1));
    circle.setAttribute("cy", y.toFixed(1));
  }

  function updateHover(event) {
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }
    const viewX = (Number(event.clientX) - bounds.left) / bounds.width * meta.width;
    const clampedX = Math.max(meta.pad.left, Math.min(meta.width - meta.pad.right, viewX));
    const targetTime = meta.startTime + ((clampedX - meta.pad.left) / meta.plotWidth) * plotSpan;
    const point = nearestPoint(targetTime);
    if (!point) {
      return;
    }
    hover.style.display = "block";
    line?.setAttribute("x1", point.x.toFixed(1));
    line?.setAttribute("x2", point.x.toFixed(1));
    setPoint(altitudePoint, point.x, point.altitudeY);
    setPoint(speedPoint, point.x, point.speedY);
    const timeParts = chartTimeParts(point.timestamp, meta.routeTimes);
    if (timeText) timeText.textContent = `${timeParts.local} ${timeParts.localZone}`;
    if (localTimeText) localTimeText.textContent = `UTC ${timeParts.utc.replace(/\sUTC$/, "Z")}`;
    if (altitudeText) altitudeText.textContent = `ALT ${formatChartAltitude(point.altitudeFt, meta.unit)}${point.altitudeFilled ? " est." : ""}`;
    if (speedText) speedText.textContent = `G/S ${formatChartSpeed(point.groundSpeedKt, meta.unit)}${point.speedFilled ? " est." : ""}`;
    const cardWidth = 164;
    const cardX = point.x > meta.width - cardWidth - 12 ? point.x - cardWidth - 10 : point.x + 10;
    card?.setAttribute("transform", `translate(${Math.max(8, Math.min(meta.width - cardWidth - 8, cardX)).toFixed(1)} ${meta.pad.top + 8})`);
  }

  svg.addEventListener("pointermove", updateHover);
  svg.addEventListener("pointerleave", () => {
    hover.style.display = "none";
  });
}

function renderSpeedAltitudeChart(jet, routeTimes) {
  const resolvedRouteTimes = speedAltitudeRouteTimes(jet, routeTimes);
  const chartUnit = chartUnitMode();
  const unitLabels = chartUnitLabels(chartUnit);
  const initialPoints = aircraftTrackPoints(jet)
    .filter((point) => finiteNumber(point.timestamp) && (finiteNumber(point.altitudeFt) || finiteNumber(point.groundSpeedKt)));
  const last = initialPoints[initialPoints.length - 1];
  const departedAt = resolvedRouteTimes.actualDeparture.epochMs;
  const startTime = departedAt || (initialPoints.length ? Math.min(...initialPoints.map((point) => Number(point.timestamp))) : null);
  const currentTime = selectPanelNowEpoch(
    resolvedRouteTimes,
    jet,
    initialPoints,
    startTime,
    resolvedRouteTimes.estimatedArrival.epochMs
  ) || Date.now();
  const endTime = startTime ? Math.max(currentTime, startTime + 60000) : currentTime;
  const currentAltitude = finiteNumber(jet.altitude) ? Number(jet.altitude) : last?.altitudeFt;
  const currentSpeed = finiteNumber(jet.speed) ? Number(jet.speed) : last?.groundSpeedKt;
  setText("trackCurrentAltitude", formatChartAltitude(currentAltitude, chartUnit));
  setText("trackCurrentSpeed", formatChartSpeed(currentSpeed, chartUnit));
  setText("trackChartStartTime", startTime ? chartAxisTimeLabel(startTime, resolvedRouteTimes) : NA_TEXT);
  setText("trackChartEndTime", chartAxisTimeLabel(endTime, resolvedRouteTimes));

  const chartPoints = startTime ? sampleSpeedAltitudeChartPoints(completeSpeedAltitudeChartPoints(jet, startTime, endTime)) : [];
  if (chartPoints.length < 2) {
    setHtml("speedAltitudeChart", `<div class="chart-empty">暂无速度/高度曲线</div>`);
    return;
  }

  const width = 328;
  const height = 214;
  const pad = { left: 34, right: 18, top: 24, bottom: 44 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const altitudeRange = chartValueRange(chartPoints.map((point) => Number(point.altitudeFt)).filter(Number.isFinite));
  const speedRange = chartValueRange(chartPoints.map((point) => Number(point.groundSpeedKt)).filter(Number.isFinite));
  const timeSpan = Math.max(1, endTime - startTime);

  function xForTime(timestamp) {
    return pad.left + ((Number(timestamp) - startTime) / timeSpan) * plotWidth;
  }

  function yFor(value, range) {
    const span = Math.max(1, range.max - range.min);
    return pad.top + plotHeight - ((Number(value) - range.min) / span) * plotHeight;
  }

  const interactivePoints = chartPoints.map((point) => {
    const x = xForTime(point.timestamp);
    const altitudeFt = Number(point.altitudeFt);
    const groundSpeedKt = Number(point.groundSpeedKt);
    return {
      timestamp: Number(point.timestamp),
      x,
      altitudeFt,
      groundSpeedKt,
      altitudeFilled: Boolean(point.altitudeFilled),
      speedFilled: Boolean(point.speedFilled),
      altitudeY: Number.isFinite(altitudeFt) ? yFor(altitudeFt, altitudeRange) : null,
      speedY: Number.isFinite(groundSpeedKt) ? yFor(groundSpeedKt, speedRange) : null
    };
  });
  const altitudePolyline = interactivePoints
    .map((point) => Number.isFinite(point.altitudeY) ? `${point.x.toFixed(1)},${point.altitudeY.toFixed(1)}` : "")
    .filter(Boolean)
    .join(" ");
  const speedPolyline = interactivePoints
    .map((point) => Number.isFinite(point.speedY) ? `${point.x.toFixed(1)},${point.speedY.toFixed(1)}` : "")
    .filter(Boolean)
    .join(" ");
  const startTimeParts = chartTimeParts(startTime, resolvedRouteTimes);
  const midTime = startTime + timeSpan * 0.5;
  const midTimeParts = chartTimeParts(midTime, resolvedRouteTimes);
  const endTimeParts = chartTimeParts(endTime, resolvedRouteTimes);

  setHtml("speedAltitudeChart", `
    <svg data-speed-altitude-chart viewBox="0 0 ${width} ${height}" role="img" aria-label="Speed and altitude graph">
      <rect x="0" y="0" width="${width}" height="${height}" rx="6" class="chart-bg"></rect>
      <g class="chart-grid">
        <path d="M${pad.left} ${pad.top + plotHeight * 0.25}H${width - pad.right}"></path>
        <path d="M${pad.left} ${pad.top + plotHeight * 0.5}H${width - pad.right}"></path>
        <path d="M${pad.left} ${pad.top + plotHeight * 0.75}H${width - pad.right}"></path>
        <path d="M${pad.left} ${pad.top}V${pad.top + plotHeight}M${pad.left + plotWidth * 0.5} ${pad.top}V${pad.top + plotHeight}M${width - pad.right} ${pad.top}V${pad.top + plotHeight}"></path>
      </g>
      <polyline class="chart-line chart-altitude" points="${altitudePolyline}"></polyline>
      <polyline class="chart-line chart-speed" points="${speedPolyline}"></polyline>
      <g class="chart-legend">
        <circle cx="38" cy="13" r="3" class="legend-alt"></circle><text x="46" y="17">ALT ${escapeHtml(unitLabels.altitude)}</text>
        <circle cx="110" cy="13" r="3" class="legend-speed"></circle><text x="118" y="17">G/S ${escapeHtml(unitLabels.speed)}</text>
      </g>
      ${chartAxisTimeSvg(pad.left, height - 22, startTimeParts)}
      ${chartAxisTimeSvg(pad.left + plotWidth * 0.5, height - 22, midTimeParts, { middle: true })}
      ${chartAxisTimeSvg(width - pad.right, height - 22, endTimeParts, { end: true })}
      <text x="${pad.left}" y="${pad.top + 12}" class="chart-axis">${escapeHtml(formatChartAltitude(altitudeRange.max, chartUnit))}</text>
      <text x="${width - pad.right}" y="${pad.top + 12}" class="chart-axis chart-axis-end">${escapeHtml(formatChartSpeed(speedRange.max, chartUnit))}</text>
      <g data-chart-hover class="chart-hover-layer" style="display:none">
        <line data-chart-hover-line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${pad.top + plotHeight}"></line>
        <circle data-chart-hover-altitude class="chart-hover-point chart-hover-altitude-point" r="3.4"></circle>
        <circle data-chart-hover-speed class="chart-hover-point chart-hover-speed-point" r="3.4"></circle>
        <g data-chart-hover-card class="chart-hover-card" transform="translate(${pad.left + 8} ${pad.top + 8})">
          <rect width="164" height="72" rx="6"></rect>
          <text data-chart-hover-time x="8" y="15">—</text>
          <text data-chart-hover-local-time x="8" y="31">—</text>
          <text data-chart-hover-altitude-text x="8" y="49">ALT —</text>
          <text data-chart-hover-speed-text x="8" y="65">G/S —</text>
        </g>
      </g>
      <rect class="chart-hit-zone" x="${pad.left}" y="${pad.top}" width="${plotWidth}" height="${plotHeight}" rx="4"></rect>
    </svg>
  `);
  attachSpeedAltitudeChartHover(document.getElementById("speedAltitudeChart"), interactivePoints, {
    width,
    height,
    pad,
    plotWidth,
    plotHeight,
    startTime,
    endTime,
    routeTimes: resolvedRouteTimes,
    unit: chartUnit
  });
}

function aircraftHistoryRequestTailNo(jet) {
  const plane = jet?.planeDetail?.planeInfo || jet?.planeDetail?.raw?.planeInfo || {};
  const flight = jet?.flightDetail?.planeInfo || jet?.flightDetail?.raw?.planeInfo || {};
  const flightRaw = jet?.flightDetail?.raw || {};
  const raw = jet?.raw || {};
  const rawPlane = raw.planeInfo || raw.plane || raw.aircraft || {};
  const value = firstMatchedValue(
    jet?.tailNoEncrypted,
    jet?.tailNo,
    raw.tailNo,
    flightRaw.tailNo,
    flight.tailNoEncrypted,
    flight.tailNo,
    plane.tailNoEncrypted,
    plane.tailNo,
    rawPlane.tailNoEncrypted,
    rawPlane.tailNo
  );
  return value === NA_TEXT ? "" : String(value).trim();
}

function aircraftHistoryLoadKey(jet) {
  const tailNo = aircraftHistoryRequestTailNo(jet);
  return tailNo ? `aircraft-history:${tailNo}` : "";
}

function historyTimelineState() {
  return state.historyTimeline;
}

function resetHistoryTimelineMount(options = {}) {
  const timeline = historyTimelineState();
  if (options.clearAnchor !== false) {
    timeline.anchorMonth = "";
  }
  timeline.visibleCount = historyTimelineConfig.mountLimit;
  timeline.highlightMonth = options.highlightMonth || "";
  timeline.summaryCollapsed = false;
}

function historyDetailScroller() {
  return document.querySelector("#aircraftDetailView .detail-scroll-body");
}

function beginHistoryScrollReset() {
  const timeline = historyTimelineState();
  timeline.scrollResetToken = (Number(timeline.scrollResetToken) || 0) + 1;
  nextHistoryScrollRestoreSeq();
  timeline.scrollResetTopLocked = true;
  timeline.scrollResetHardUntil = Date.now() + 220;
  return timeline.scrollResetToken;
}

function nextHistoryScrollRestoreSeq() {
  const timeline = historyTimelineState();
  timeline.scrollRestoreSeq = (Number(timeline.scrollRestoreSeq) || 0) + 1;
  timeline.pendingScrollRestoreSeq = 0;
  return timeline.scrollRestoreSeq;
}

function currentHistoryScrollRestoreSeq() {
  return Number(historyTimelineState().scrollRestoreSeq) || 0;
}

function historyScrollRestoreIsPending() {
  const timeline = historyTimelineState();
  return Number(timeline.pendingScrollRestoreSeq) === currentHistoryScrollRestoreSeq();
}

function historyUserScrollIsSettling(timeline = historyTimelineState()) {
  return Date.now() - Number(timeline.lastUserScrollAt || 0) < HISTORY_USER_SCROLL_SETTLE_MS;
}

function historyScrollResetIsActive(token) {
  const timeline = historyTimelineState();
  return Boolean(timeline.scrollResetTopLocked && (!token || token === timeline.scrollResetToken));
}

function releaseHistoryScrollReset(token) {
  const timeline = historyTimelineState();
  if (!token || token === timeline.scrollResetToken) {
    timeline.scrollResetTopLocked = false;
    timeline.scrollResetHardUntil = 0;
  }
}

function historyScrollResetShouldPin(token) {
  if (!historyScrollResetIsActive(token)) {
    return false;
  }
  const timeline = historyTimelineState();
  const scroller = historyDetailScroller();
  const hardLocked = Date.now() < Number(timeline.scrollResetHardUntil || 0);
  const expectedScrollTop = historyJourneyListTopScrollTop(scroller);
  const hasMovedAwayFromListTop = Math.abs(Number(scroller?.scrollTop || 0) - expectedScrollTop) > 4;
  if (!hardLocked && !timeline.applyingScrollRestore && hasMovedAwayFromListTop) {
    releaseHistoryScrollReset(token);
    return false;
  }
  return true;
}

function beginHistoryProgrammaticScroll(timeline = historyTimelineState()) {
  timeline.applyingScrollRestore = true;
  timeline.programmaticScrollSeq = (Number(timeline.programmaticScrollSeq) || 0) + 1;
  const programmaticScrollSeq = timeline.programmaticScrollSeq;
  window.requestAnimationFrame(() => {
    if (Number(timeline.programmaticScrollSeq) === programmaticScrollSeq) {
      timeline.applyingScrollRestore = false;
    }
  });
}

function finishHistoryScrollReset(token) {
  if (!historyScrollResetShouldPin(token)) {
    return;
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (historyScrollResetShouldPin(token)) {
        resetHistoryScrollTop({ resetToken: token });
        window.setTimeout(() => releaseHistoryScrollReset(token), 760);
      }
    });
  });
}

function handleHistoryScrollIntent() {
  if (state.aircraftSegment !== "journey") {
    return;
  }
  const timeline = historyTimelineState();
  const hardLocked = Date.now() < Number(timeline.scrollResetHardUntil || 0);
  if (historyScrollResetIsActive() && hardLocked) {
    return;
  }
  timeline.lastUserScrollAt = Date.now();
  nextHistoryScrollRestoreSeq();
  if (historyScrollResetIsActive()) {
    releaseHistoryScrollReset();
  }
}

function historyScrollAnchorData(element) {
  if (!element?.dataset) {
    return null;
  }
  if (element.dataset.historyFlightCard) {
    return { type: "flight", value: element.dataset.historyFlightCard };
  }
  if (element.dataset.historyMonthGroup) {
    return { type: "month", value: element.dataset.historyMonthGroup };
  }
  return null;
}

function historyScrollAnchorElement(anchor, scroller = historyDetailScroller()) {
  if (!anchor || !scroller) {
    return null;
  }
  const selector = anchor.type === "flight"
    ? "[data-history-flight-card]"
    : anchor.type === "month"
      ? "[data-history-month-group]"
      : "";
  if (!selector) {
    return null;
  }
  return [...scroller.querySelectorAll(selector)]
    .find((element) => historyScrollAnchorData(element)?.value === anchor.value) || null;
}

function captureHistoryScrollAnchor(scroller) {
  if (!scroller?.getBoundingClientRect) {
    return null;
  }
  const scrollerRect = scroller.getBoundingClientRect();
  const visibleTop = scrollerRect.top + 6;
  const visibleBottom = scrollerRect.bottom - 6;
  const candidates = [...scroller.querySelectorAll("[data-history-flight-card], [data-history-month-group]")]
    .map((element) => {
      const anchor = historyScrollAnchorData(element);
      const rect = element.getBoundingClientRect();
      return { anchor, rect };
    })
    .filter((item) => item.anchor && item.rect.bottom > visibleTop && item.rect.top < visibleBottom)
    .sort((first, second) => {
      const firstDistance = first.rect.top >= visibleTop
        ? first.rect.top - visibleTop
        : visibleTop - first.rect.top + 10000;
      const secondDistance = second.rect.top >= visibleTop
        ? second.rect.top - visibleTop
        : visibleTop - second.rect.top + 10000;
      return firstDistance - secondDistance;
    });
  const selected = candidates[0];
  if (!selected) {
    return null;
  }
  return {
    ...selected.anchor,
    offsetTop: selected.rect.top - scrollerRect.top
  };
}

function captureHistoryScrollState(options = {}, restoreSeq = currentHistoryScrollRestoreSeq()) {
  if (options.preserveScroll === false || state.aircraftSegment !== "journey") {
    return null;
  }
  const scroller = historyDetailScroller();
  if (!scroller) {
    return null;
  }
  const timeline = historyTimelineState();
  if (timeline.scrollResetTopLocked) {
    return {
      forceTop: true,
      resetToken: timeline.scrollResetToken,
      restoreSeq
    };
  }
  const activeUserScroll = historyUserScrollIsSettling(timeline);
  return {
    scrollTop: scroller.scrollTop,
    topPinned: Number(scroller.scrollTop) <= 4,
    activeUserScroll,
    skipScrollRestore: activeUserScroll,
    anchor: captureHistoryScrollAnchor(scroller),
    restoreSeq
  };
}

function syncHistoryCollapsedState(scroller = historyDetailScroller()) {
  const root = scroller?.querySelector?.('.detail-segment-panel[data-aircraft-panel="journey"]:not([hidden]) .history-timeline-root');
  if (!root) {
    return;
  }
  historyTimelineState().summaryCollapsed = false;
  root.classList.remove("summary-collapsed");
}

function restoreHistoryScrollState(snapshot) {
  if (!snapshot) {
    return;
  }
  window.requestAnimationFrame(() => {
    const timeline = historyTimelineState();
    if (Number(snapshot.restoreSeq) !== currentHistoryScrollRestoreSeq()) {
      if (Number(timeline.pendingScrollRestoreSeq) === Number(snapshot.restoreSeq)) {
        timeline.pendingScrollRestoreSeq = 0;
      }
      return;
    }
    const scroller = historyDetailScroller();
    if (!scroller || state.aircraftSegment !== "journey") {
      if (Number(timeline.pendingScrollRestoreSeq) === Number(snapshot.restoreSeq)) {
        timeline.pendingScrollRestoreSeq = 0;
      }
      return;
    }
    if (snapshot.skipScrollRestore) {
      if (Number(timeline.pendingScrollRestoreSeq) === Number(snapshot.restoreSeq)) {
        timeline.pendingScrollRestoreSeq = 0;
      }
      syncHistoryCollapsedState(scroller);
      return;
    }
    const restoreTop = (nextTop) => {
      const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      beginHistoryProgrammaticScroll(timeline);
      scroller.scrollTop = Math.min(maxScrollTop, Math.max(0, Number(nextTop) || 0));
      syncHistoryCollapsedState(scroller);
      window.requestAnimationFrame(() => {
        if (Number(timeline.pendingScrollRestoreSeq) === Number(snapshot.restoreSeq)) {
          timeline.pendingScrollRestoreSeq = 0;
        }
      });
    };
    if (snapshot.forceTop) {
      if (historyScrollResetIsActive(snapshot.resetToken)) {
        restoreTop(historyJourneyListTopScrollTop(scroller));
      } else if (Number(timeline.pendingScrollRestoreSeq) === Number(snapshot.restoreSeq)) {
        timeline.pendingScrollRestoreSeq = 0;
      }
      return;
    }
    if (historyScrollResetIsActive()) {
      restoreTop(historyJourneyListTopScrollTop(scroller));
      return;
    }
    if (snapshot.topPinned) {
      restoreTop(0);
      return;
    }
    if (Number.isFinite(Number(snapshot.scrollTop))) {
      restoreTop(snapshot.scrollTop);
      return;
    }
    const anchorElement = historyScrollAnchorElement(snapshot.anchor, scroller);
    if (anchorElement?.getBoundingClientRect) {
      const scrollerRect = scroller.getBoundingClientRect();
      const anchorRect = anchorElement.getBoundingClientRect();
      restoreTop(scroller.scrollTop + (anchorRect.top - scrollerRect.top) - Number(snapshot.anchor.offsetTop || 0));
      return;
    }
    restoreTop(snapshot.scrollTop);
  });
}

function historyJourneyListTopScrollTop(scroller = historyDetailScroller()) {
  return 0;
}

function scrollHistoryToListTop(scroller = historyDetailScroller()) {
  if (!scroller) {
    return;
  }
  beginHistoryProgrammaticScroll();
  scroller.scrollTop = historyJourneyListTopScrollTop(scroller);
}

function resetHistoryScrollTop(options = {}) {
  const resetToken = options.resetToken || 0;
  const scrollTop = () => {
    const scroller = historyDetailScroller();
    if (!scroller) {
      return;
    }
    if (resetToken && !historyScrollResetShouldPin(resetToken)) {
      return;
    }
    scrollHistoryToListTop(scroller);
    syncHistoryCollapsedState(scroller);
  };
  scrollTop();
  window.requestAnimationFrame(() => {
    scrollTop();
    window.requestAnimationFrame(() => {
      scrollTop();
    });
  });
  window.setTimeout(scrollTop, 80);
  window.setTimeout(scrollTop, 180);
  window.setTimeout(scrollTop, 360);
  window.setTimeout(scrollTop, 720);
}

function clearPendingRecentFlightsHtml(timeline = historyTimelineState()) {
  if (timeline.pendingRecentFlightsTimer) {
    window.clearTimeout(timeline.pendingRecentFlightsTimer);
  }
  timeline.pendingRecentFlightsHtml = null;
  timeline.pendingRecentFlightsOptions = null;
  timeline.pendingRecentFlightsTimer = 0;
}

function flushPendingRecentFlightsHtml() {
  const timeline = historyTimelineState();
  if (timeline.pendingRecentFlightsHtml === null) {
    timeline.pendingRecentFlightsTimer = 0;
    return;
  }
  if (state.aircraftSegment === "journey" && historyUserScrollIsSettling(timeline)) {
    const waitMs = Math.max(120, HISTORY_USER_SCROLL_SETTLE_MS - (Date.now() - Number(timeline.lastUserScrollAt || 0)));
    timeline.pendingRecentFlightsTimer = window.setTimeout(flushPendingRecentFlightsHtml, waitMs);
    return;
  }
  const nextHtml = timeline.pendingRecentFlightsHtml;
  const nextOptions = {
    ...(timeline.pendingRecentFlightsOptions || {}),
    preserveScroll: true,
    allowDuringUserScroll: true
  };
  timeline.pendingRecentFlightsHtml = null;
  timeline.pendingRecentFlightsOptions = null;
  timeline.pendingRecentFlightsTimer = 0;
  setRecentFlightsHtml(nextHtml, nextOptions);
}

function schedulePendingRecentFlightsHtmlFlush(timeline = historyTimelineState()) {
  if (timeline.pendingRecentFlightsTimer) {
    window.clearTimeout(timeline.pendingRecentFlightsTimer);
  }
  const waitMs = Math.max(120, HISTORY_USER_SCROLL_SETTLE_MS - (Date.now() - Number(timeline.lastUserScrollAt || 0)));
  timeline.pendingRecentFlightsTimer = window.setTimeout(flushPendingRecentFlightsHtml, waitMs);
}

function setRecentFlightsHtml(html, options = {}) {
  const element = document.getElementById("recentFlightsList");
  if (!element) {
    return;
  }
  const timeline = historyTimelineState();
  const nextHtml = html || NA_TEXT;
  const staleResetScroll = options.resetScroll === true
    && options.resetToken
    && !historyScrollResetShouldPin(options.resetToken);
  const effectiveOptions = staleResetScroll
    ? { ...options, resetScroll: false, preserveScroll: true }
    : options;
  const htmlChanged = timeline.recentFlightsHtml !== nextHtml;
  if (effectiveOptions.resetScroll === true || effectiveOptions.deferDuringUserScroll === false || effectiveOptions.allowDuringUserScroll === true) {
    clearPendingRecentFlightsHtml(timeline);
  }
  const shouldDeferHtmlWrite = htmlChanged
    && effectiveOptions.resetScroll !== true
    && effectiveOptions.deferDuringUserScroll !== false
    && effectiveOptions.allowDuringUserScroll !== true
    && state.aircraftSegment === "journey"
    && historyUserScrollIsSettling(timeline);
  if (shouldDeferHtmlWrite) {
    timeline.pendingRecentFlightsHtml = nextHtml;
    timeline.pendingRecentFlightsOptions = { ...effectiveOptions, preserveScroll: true };
    schedulePendingRecentFlightsHtmlFlush(timeline);
    return;
  }
  const restoreSeq = nextHistoryScrollRestoreSeq();
  const snapshot = captureHistoryScrollState(effectiveOptions, restoreSeq);
  const shouldRestoreScroll = Boolean(snapshot && !snapshot.skipScrollRestore);
  if (htmlChanged) {
    clearPendingRecentFlightsHtml(timeline);
    if (shouldRestoreScroll) {
      timeline.pendingScrollRestoreSeq = restoreSeq;
    }
    element.innerHTML = nextHtml;
    timeline.recentFlightsHtml = nextHtml;
  }
  if (effectiveOptions.resetScroll === true) {
    const resetToken = options.resetToken || beginHistoryScrollReset();
    resetHistoryScrollTop({ resetToken });
    if (options.holdResetLock !== true) {
      finishHistoryScrollReset(resetToken);
    }
    return;
  }
  if (htmlChanged) {
    if (shouldRestoreScroll) {
      restoreHistoryScrollState(snapshot);
    }
  }
}

function makeHistoryTimeRef(value, zone, semantic, sourceField) {
  return makePanelTimeRef(value, {
    timeZone: zone,
    semantic,
    sourceField
  });
}

function historyTimeRef(item, key, fallback) {
  const ref = item?.times?.[key];
  if (ref && typeof ref === "object") {
    return ref;
  }
  return fallback || makeHistoryTimeRef("", "", key, "");
}

function historyNumberValue(value) {
  if (value === null || value === undefined || value === "" || value === NA_TEXT) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function historyTimeRefWithEpoch(...refs) {
  return refs.find((ref) => Number.isFinite(historyNumberValue(ref?.epochMs))) || null;
}

function historyFlightKey(item) {
  return String(firstMatchedValue(item?.uniqueKey, item?.flightId, item?.id, `${item?.depAirport}-${item?.arrAirport}-${item?.depActualEpochMs}`));
}

function historyPrimaryDeparture(item) {
  return historyTimeRefWithEpoch(
    historyTimeRef(item, "actualDeparture"),
    item?.depTimeRef,
    historyTimeRef(item, "scheduledDeparture")
  ) || historyTimeRef(item, "actualDeparture", item?.depTimeRef);
}

function historyPrimaryArrival(item) {
  return historyTimeRefWithEpoch(
    historyTimeRef(item, "actualArrival"),
    item?.arrTimeRef,
    historyTimeRef(item, "estimatedArrival"),
    historyTimeRef(item, "scheduledArrival")
  ) || historyTimeRef(item, "actualArrival", item?.arrTimeRef);
}

function historyComparableEpoch(item) {
  return historyPrimaryDeparture(item)?.epochMs
    || historyTimeRef(item, "scheduledDeparture")?.epochMs
    || item?.depActualEpochMs
    || 0;
}

function historyDateParts(epochMs, zone = "UTC") {
  const epoch = Number(epochMs);
  if (!Number.isFinite(epoch)) {
    return null;
  }
  const timeZone = missingValue(zone) ? "UTC" : String(zone);
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit"
    }).formatToParts(new Date(epoch)).map((part) => [part.type, part.value]));
    return {
      year: Number(parts.year),
      monthName: parts.month,
      monthNumber: historyMonthNumberFromName(parts.month, epoch),
      day: Number(parts.day),
      weekday: parts.weekday
    };
  } catch (error) {
    const date = new Date(epoch);
    return {
      year: date.getUTCFullYear(),
      monthName: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      monthNumber: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: date.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })
    };
  }
}

function historyMonthNumberFromName(monthName, fallbackEpochMs) {
  const index = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    .findIndex((name) => name.toLowerCase() === String(monthName || "").slice(0, 3).toLowerCase());
  if (index >= 0) {
    return index + 1;
  }
  const fallback = new Date(Number(fallbackEpochMs));
  return Number.isFinite(fallback.getTime()) ? fallback.getUTCMonth() + 1 : 1;
}

function historyMonthKey(item) {
  const epoch = historyComparableEpoch(item);
  if (!Number.isFinite(Number(epoch)) || Number(epoch) <= 0) {
    return "unknown";
  }
  return historyUtcMonthKeyFromDate(new Date(Number(epoch)));
}

function historyMonthLabel(monthKey) {
  if (monthKey === "unknown") {
    return "Unknown";
  }
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${year} ${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}`;
}

function historyDateLabel(item) {
  const departure = historyPrimaryDeparture(item) || historyTimeRef(item, "scheduledDeparture");
  const parts = historyDateParts(historyComparableEpoch(item), departure?.displayZone);
  return parts ? `${String(parts.day).padStart(2, "0")} ${parts.weekday}` : "—";
}

function historyRecentDateLabel(item) {
  const departure = historyPrimaryDeparture(item) || historyTimeRef(item, "scheduledDeparture");
  const parts = historyDateParts(historyComparableEpoch(item), departure?.displayZone);
  return parts ? `${parts.monthName} ${String(parts.day).padStart(2, "0")}` : NA_TEXT;
}

function formatHistoryTime(timeRef, options = {}) {
  if (!timeRef || !timeRef.epochMs) {
    return NA_TEXT;
  }
  const timeZone = timeRef.displayZone || "UTC";
  return formatPanelTime(timeRef, {
    date: options.date !== false,
    timeZone,
    includeZone: options.includeZone !== false,
    zoneLabel: options.zoneLabel || utcOffsetLabelForZone(timeZone, timeRef.epochMs),
    rawUnknown: false
  });
}

function formatHistoryTimeShort(timeRef) {
  if (!timeRef || !timeRef.epochMs) {
    return NA_TEXT;
  }
  const timeZone = timeRef.displayZone || "UTC";
  return formatPanelTime(timeRef, {
    date: false,
    timeZone,
    includeZone: true,
    zoneLabel: utcOffsetLabelForZone(timeZone, timeRef.epochMs),
    rawUnknown: false
  });
}

function historyDurationMinutes(item) {
  const dep = historyPrimaryDeparture(item)?.epochMs;
  const arr = historyPrimaryArrival(item)?.epochMs || historyTimeRef(item, "estimatedArrival")?.epochMs;
  if (dep && arr && arr > dep) {
    return Math.round((arr - dep) / 60000);
  }
  const explicitDuration = historyNumberValue(item?.durationMinutes);
  if (explicitDuration !== null) {
    return explicitDuration;
  }
  const estimatedDuration = historyNumberValue(item?.estimateTimeMinutes);
  if (estimatedDuration !== null) {
    return estimatedDuration;
  }
  return null;
}

function historyDurationLabel(item) {
  const minutes = historyDurationMinutes(item);
  return Number.isFinite(minutes) ? formatDuration(minutes * 60000).replace(" ", "") : NA_TEXT;
}

function historyStatus(item) {
  const stateText = String(firstMatchedValue(item?.flightStateStr, "")).trim();
  const normalized = stateText.toLowerCase();
  const stateCode = Number(item?.flightState);
  if (stateCode === 30 || /live|途中|巡航|在途|飞行中/.test(normalized)) {
    return { key: "live", label: "途中", tone: "live" };
  }
  if (stateCode === 50 || /cancel|取消/.test(normalized)) {
    return { key: "cancelled", label: "取消", tone: "cancelled" };
  }
  if (/delay|延误|异常/.test(normalized)) {
    return { key: "delayed", label: "延误", tone: "delayed" };
  }
  if (stateCode === 20 || /schedule|计划|预计/.test(normalized)) {
    return { key: "scheduled", label: "计划", tone: "scheduled" };
  }
  if (stateCode === 40 || /land|到达|已落地|完成/.test(normalized)) {
    return { key: "landed", label: "到达", tone: "landed" };
  }
  return { key: "unknown", label: stateText || "—", tone: "unknown" };
}

function historyStatusMatchesFilter(status, filter) {
  if (!filter || filter === "all") {
    return true;
  }
  if (filter === "exception") {
    return status.key === "delayed" || status.key === "cancelled";
  }
  if (filter === "landed") {
    return status.key === "landed";
  }
  return status.key === filter;
}

function historyAirportMatchesFilter(item, query) {
  const text = String(query || "").trim().toUpperCase();
  if (!text) {
    return true;
  }
  return [
    item.depAirport,
    item.arrAirport,
    item.depAirportName,
    item.arrAirportName,
    item.depAirportFullName,
    item.arrAirportFullName,
    item.depAirportNameEn,
    item.arrAirportNameEn
  ].some((value) => String(value || "").toUpperCase().includes(text));
}

function historyTimelineNowEpoch(detail) {
  const flights = Array.isArray(detail?.flights) ? detail.flights : [];
  const serverEpochs = [
    detail?.serverNowEpochMs,
    detail?.raw?.serverNowEpochMs,
    detail?.raw?.serverNow,
    detail?.raw?.serverTime,
    ...flights.map((item) => item?.serverNowEpochMs)
  ].map((value) => parsePanelEpoch(value)).filter((value) => Number.isFinite(value));
  if (serverEpochs.length) {
    return Math.max(...serverEpochs);
  }
  const latestFlightEpoch = Math.max(
    ...flights.map(historyComparableEpoch).filter((value) => Number.isFinite(value) && value > 0)
  );
  return Number.isFinite(latestFlightEpoch) ? latestFlightEpoch : Date.now();
}

function historyFlightsForTimeline(detail) {
  const timeline = historyTimelineState();
  const now = historyTimelineNowEpoch(detail);
  const start = now - Number(timeline.rangeDays || historyTimelineConfig.defaultRangeDays) * 86400000;
  return (detail?.flights || [])
    .filter((item) => {
      const status = historyStatus(item);
      const epoch = historyComparableEpoch(item);
      return (!epoch || epoch >= start || status.key === "scheduled")
        && historyStatusMatchesFilter(status, timeline.status)
        && historyAirportMatchesFilter(item, timeline.airportQuery);
    })
    .sort((a, b) => historyComparableEpoch(b) - historyComparableEpoch(a));
}

function historyFlightsForRecords(detail) {
  return (detail?.flights || [])
    .slice()
    .sort((a, b) => historyComparableEpoch(b) - historyComparableEpoch(a));
}

function historyGroupFlights(flights) {
  const groups = [];
  const groupMap = new Map();
  flights.forEach((item) => {
    const monthKey = historyMonthKey(item);
    if (!groupMap.has(monthKey)) {
      const group = { monthKey, label: historyMonthLabel(monthKey), flights: [], minutes: 0 };
      groupMap.set(monthKey, group);
      groups.push(group);
    }
    const group = groupMap.get(monthKey);
    group.flights.push(item);
    group.minutes += historyCountedDurationMinutes(item);
  });
  return groups;
}

function historyCountedDurationMinutes(item) {
  return historyStatus(item).key === "cancelled" ? 0 : (historyDurationMinutes(item) || 0);
}

function historyPeriodSummary(flights) {
  const totalCount = Array.isArray(flights) ? flights.length : 0;
  const totalMinutes = (Array.isArray(flights) ? flights : [])
    .reduce((sum, item) => sum + historyCountedDurationMinutes(item), 0);
  return { totalCount, totalMinutes };
}

function historySummary(detail, flights) {
  return historyPeriodSummary(flights);
}

function historyRangeLabel(days) {
  return Number(days) >= 365 ? "1y" : `${Number(days) || historyTimelineConfig.defaultRangeDays}d`;
}

function historyUtcDayKeyFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function historyUtcMonthKeyFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function historyUtcBucketDate(epochMs) {
  const date = new Date(Number(epochMs));
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function historyActivityBuckets(flights, anchorEpochMs = Date.now()) {
  const rangeDays = Number(historyTimelineState().rangeDays || historyTimelineConfig.defaultRangeDays);
  const isYear = rangeDays >= 365;
  const anchorDate = historyUtcBucketDate(anchorEpochMs);
  const buckets = [];
  if (isYear) {
    for (let index = 11; index >= 0; index -= 1) {
      const date = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() - index, 1));
      buckets.push({
        key: historyUtcMonthKeyFromDate(date),
        label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
        secondaryLabel: "",
        fullLabel: historyMonthLabel(historyUtcMonthKeyFromDate(date)),
        count: 0,
        minutes: 0,
        monthKey: historyUtcMonthKeyFromDate(date)
      });
    }
  } else {
    const dayCount = rangeDays <= 7 ? 7 : 30;
    let previousMonth = "";
    for (let index = dayCount - 1; index >= 0; index -= 1) {
      const date = new Date(anchorDate.getTime() - index * 86400000);
      const monthShort = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      const monthKey = historyUtcMonthKeyFromDate(date);
      const day = String(date.getUTCDate()).padStart(2, "0");
      const monthNumber = String(date.getUTCMonth() + 1).padStart(2, "0");
      const isMonthBoundary = Boolean(previousMonth && previousMonth !== monthKey);
      buckets.push({
        key: historyUtcDayKeyFromDate(date),
        label: rangeDays <= 7 ? `${monthNumber}-${day}` : "",
        secondaryLabel: rangeDays <= 7 ? "" : (!previousMonth || isMonthBoundary ? monthShort : ""),
        fullLabel: `${monthNumber}-${day}`,
        count: 0,
        minutes: 0,
        monthKey,
        monthBoundary: rangeDays > 7 && (!previousMonth || isMonthBoundary)
      });
      previousMonth = monthKey;
    }
  }

  const byKey = new Map(buckets.map((item) => [item.key, item]));
  (Array.isArray(flights) ? flights : []).forEach((item) => {
    const epoch = historyComparableEpoch(item);
    if (!Number.isFinite(Number(epoch)) || Number(epoch) <= 0) {
      return;
    }
    const date = new Date(Number(epoch));
    const key = isYear ? historyUtcMonthKeyFromDate(date) : historyUtcDayKeyFromDate(date);
    const bucket = byKey.get(key);
    if (!bucket) {
      return;
    }
    bucket.count += 1;
    if (historyStatus(item).key !== "cancelled") {
      bucket.activeCount = (bucket.activeCount || 0) + 1;
      bucket.minutes += historyCountedDurationMinutes(item);
    }
  });

  const peak = Math.max(1, ...buckets.map((item) => item.activeCount || 0));
  return buckets.map((item) => ({
    ...item,
    heightPx: item.activeCount ? Math.max(3, Math.round(item.activeCount / peak * 42)) : 3,
    active: (item.activeCount || 0) > 0
  }));
}

function historyCurrentLiveFlight(detail, filteredFlights) {
  return [
    ...(Array.isArray(detail?.flights) ? detail.flights : []),
    ...(Array.isArray(filteredFlights) ? filteredFlights : [])
  ].find((item) => historyStatus(item).key === "live") || null;
}

function historyGroundAirportCodes(ground) {
  const known = airportByCode(ground?.airportCode) || airportByCode(ground?.icaoCode);
  const iata = firstMatchedValue(ground?.airportCode, known?.iata, known?.airportCode);
  const icao = firstMatchedValue(ground?.icaoCode, known?.icao, known?.icaoCode, known?.id);
  return [iata, icao]
    .filter((value, index, list) => !missingValue(value) && list.indexOf(value) === index)
    .join(" / ") || NA_TEXT;
}

function renderHistoryGroundCard(ground) {
  return renderHistoryGroundStatusCard(ground, null);
}

function historyCompactDurationLabel(minutes) {
  const number = historyNumberValue(minutes);
  if (number === null) {
    return NA_TEXT;
  }
  const totalMinutes = Math.max(0, Math.round(number));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  if (days) {
    return `${days}d ${hours}h`;
  }
  if (hours) {
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  }
  return `${mins}m`;
}

function historyGroundDurationLabel(ground) {
  const minutes = firstMatchedValue(
    ground?.groundDurationMinutes,
    ground?.groundMinutes,
    ground?.parkingMinutes,
    ground?.stayMinutes
  );
  const formatted = historyCompactDurationLabel(minutes);
  if (formatted !== NA_TEXT) {
    return formatted;
  }
  return firstMatchedValue(
    ground?.groundTime,
    ground?.groundDuration,
    ground?.parkingTime,
    ground?.stayDuration,
    ground?.durationText,
    NA_TEXT
  );
}

function historyAirportDisplay(item, side) {
  const isDeparture = side === "dep";
  const prefix = isDeparture ? "dep" : "arr";
  const code = isDeparture ? item?.depAirport : item?.arrAirport;
  const knownAirport = airportByCode(code)
    || airportByCode(item?.[`${prefix}Iata`])
    || airportByCode(item?.[`${prefix}Icao`]);
  const codeSet = new Set([
    code,
    item?.[`${prefix}Iata`],
    item?.[`${prefix}Icao`],
    knownAirport?.iata,
    knownAirport?.icaoCode,
    knownAirport?.icao,
    knownAirport?.id
  ].map(normalizeAirportCodeText).filter(Boolean));
  const matchedName = firstMeaningfulAirportName(
    codeSet,
    { requiresChinese: true },
    item?.[`${prefix}AirportFullName`],
    item?.[`${prefix}AirportName`],
    knownAirport?.apiDetail?.airportInfo?.airportName,
    knownAirport?.apiDetail?.airportInfo?.airportFourName,
    knownAirport?.raw?.airportName,
    knownAirport?.raw?.airportFourName,
    knownAirport?.nameCn,
    knownAirport?.nameZh
  );
  const name = missingValue(matchedName) ? "未知机场" : matchedName;
  const iata = firstAirportCodeByLength(
    3,
    item?.[`${prefix}Iata`],
    item?.[`${prefix}AirportIata`],
    knownAirport?.iata,
    knownAirport?.airportCode,
    code
  );
  const icao = firstAirportCodeByLength(
    4,
    item?.[`${prefix}Icao`],
    item?.[`${prefix}IcaoCode`],
    item?.[`${prefix}AirportIcao`],
    knownAirport?.icaoCode,
    knownAirport?.icao,
    knownAirport?.id,
    code
  );
  const codes = [iata, icao]
    .filter((value, index, list) => value !== NA_TEXT && list.indexOf(value) === index)
    .join(" / ");
  return {
    missing: name === "未知机场",
    name,
    iata,
    icao,
    codes: codes || historyAirportCodeLabel(code)
  };
}

function historyAirportCodePair(airport) {
  return `${firstMatchedValue(airport?.iata, NA_TEXT)} / ${firstMatchedValue(airport?.icao, NA_TEXT)}`;
}

function historyClockLabel(timeRef) {
  if (!timeRef || !timeRef.epochMs) {
    return NA_TEXT;
  }
  const timeZone = timeRef.displayZone || "UTC";
  return formatPanelTime(timeRef, {
    date: false,
    timeZone,
    includeZone: false,
    rawUnknown: false
  });
}

function historyLocalTimeLabel(timeRef) {
  const label = historyClockLabel(timeRef);
  return label === NA_TEXT ? NA_TEXT : `${label} LT`;
}

function historyDayOffsetLabel(depRef, arrRef) {
  if (!depRef?.epochMs || !arrRef?.epochMs) {
    return "";
  }
  const depParts = historyDateParts(depRef.epochMs, depRef.displayZone);
  const arrParts = historyDateParts(arrRef.epochMs, arrRef.displayZone);
  if (!depParts || !arrParts) {
    return "";
  }
  const depDay = Date.UTC(depParts.year, depParts.monthNumber - 1, depParts.day);
  const arrDay = Date.UTC(arrParts.year, arrParts.monthNumber - 1, arrParts.day);
  const offset = Math.round((arrDay - depDay) / 86400000);
  if (offset > 0) {
    return `+${offset}d`;
  }
  if (offset < 0) {
    return `${offset}d`;
  }
  return "";
}

function historyRowDateMeta(item) {
  const departure = historyPrimaryDeparture(item) || historyTimeRef(item, "scheduledDeparture");
  const parts = historyDateParts(historyComparableEpoch(item), departure?.displayZone);
  if (!parts) {
    return { date: NA_TEXT, weekday: NA_TEXT };
  }
  return {
    date: `${String(parts.monthNumber).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    weekday: parts.weekday || NA_TEXT
  };
}

function historyStatusActionLabel(status) {
  if (status.key === "live") {
    return "在途";
  }
  if (status.key === "landed") {
    return "到达";
  }
  return status.label;
}

function historyLiveProgress(item, nowEpochMs) {
  const depRef = historyPrimaryDeparture(item);
  const arrRef = historyPrimaryArrival(item);
  const dep = historyNumberValue(depRef?.epochMs);
  const arr = historyNumberValue(arrRef?.epochMs);
  const now = historyNumberValue(nowEpochMs);
  const totalMs = dep !== null && arr !== null && arr > dep ? arr - dep : null;
  const elapsedMs = dep !== null && now !== null && now > dep ? now - dep : null;
  const remainingMs = arr !== null && now !== null && arr > now ? arr - now : null;
  const progress = totalMs && elapsedMs !== null
    ? Math.max(0, Math.min(100, Math.round(elapsedMs / totalMs * 100)))
    : 0;
  return {
    progress,
    elapsed: elapsedMs === null ? NA_TEXT : formatDuration(elapsedMs),
    remaining: remainingMs === null ? NA_TEXT : formatDuration(remainingMs)
  };
}

function historyMetricNumber(jet, ...fields) {
  for (const field of fields) {
    const value = field.split(".").reduce((record, key) => record?.[key], jet);
    if (finiteNumber(value)) {
      return Number(value);
    }
  }
  return null;
}

function renderHistoryLiveStatusCard(item, jet, nowEpochMs) {
  const depAirport = historyAirportDisplay(item, "dep");
  const arrAirport = historyAirportDisplay(item, "arr");
  const depRef = historyPrimaryDeparture(item);
  const arrRef = historyPrimaryArrival(item);
  const progress = historyLiveProgress(item, nowEpochMs);
  const dayOffset = historyDayOffsetLabel(depRef, arrRef);
  const altitude = historyMetricNumber(jet, "altitude", "raw.altitude", "flightDetail.flightBaseInfo.altitude");
  const speed = historyMetricNumber(jet, "speed", "raw.speed", "flightDetail.flightBaseInfo.speed");
  const verticalSpeed = historyMetricNumber(jet, "verticalSpeed", "verticalRate", "climbRate", "raw.verticalSpeed", "raw.verticalRate", "flightDetail.flightBaseInfo.verticalSpeed");
  return `
    <section class="history-current-block" data-history-current="live">
      <article class="history-status-card history-status-card-live">
        <header>
          <span>当前在途</span>
          <button type="button" data-history-action="live">Live</button>
        </header>
        <div class="history-live-route">
          <span class="history-live-airport">
            <strong class="${depAirport.missing ? "missing" : ""}">${escapeHtml(depAirport.name)}</strong>
            <small>${escapeHtml(historyAirportCodePair(depAirport))}</small>
          </span>
          <i aria-hidden="true"></i>
          <span class="history-live-airport">
            <strong class="${arrAirport.missing ? "missing" : ""}">${escapeHtml(arrAirport.name)}</strong>
            <small>${escapeHtml(historyAirportCodePair(arrAirport))}</small>
          </span>
        </div>
        <div class="history-live-progress" style="--history-progress:${progress.progress}%">
          <span></span>
        </div>
        <div class="history-live-progress-meta">
          <span>已飞 <strong>${escapeHtml(progress.elapsed)}</strong></span>
          <span>剩余 <strong>${escapeHtml(progress.remaining)}</strong></span>
        </div>
        <div class="history-live-times">
          <span><em>实际起飞</em><strong>${escapeHtml(historyClockLabel(depRef))}</strong></span>
          <span><em>预计到达</em><strong>${escapeHtml(historyClockLabel(arrRef))}${dayOffset ? ` <mark>${escapeHtml(dayOffset)}</mark>` : ""}</strong></span>
        </div>
        <dl class="history-current-metrics">
          <div><dt>高度</dt><dd>${escapeHtml(formatAltitude(altitude))}</dd></div>
          <div><dt>地速</dt><dd>${escapeHtml(formatSpeed(speed))}</dd></div>
          <div><dt>升降率</dt><dd>${escapeHtml(formatVerticalSpeed(verticalSpeed))}</dd></div>
        </dl>
      </article>
    </section>
  `;
}

function historyPreviousCompletedFlight(detail, filteredFlights) {
  return [
    ...(Array.isArray(filteredFlights) ? filteredFlights : []),
    ...(Array.isArray(detail?.flights) ? detail.flights : [])
  ].find((item) => ["landed", "delayed"].includes(historyStatus(item).key)) || null;
}

function renderHistoryGroundStatusCard(ground, previousFlight) {
  const airportName = firstMatchedValue(ground?.airportFourName, ground?.airportName, ground?.airportCode, "N/A");
  const airportNameEn = firstMatchedValue(ground?.airportNameEn, ground?.cityName, ground?.country, ground?.countryName);
  const airportCode = firstMatchedValue(ground?.icaoCode, ground?.airportCode);
  const previousRoute = previousFlight
    ? `${historyAirportCodeLabel(previousFlight.depAirport)}▸${historyAirportCodeLabel(previousFlight.arrAirport)}`
    : NA_TEXT;
  const inboundTime = previousFlight
    ? formatHistoryTime(historyPrimaryArrival(previousFlight), { includeZone: false })
    : firstMatchedValue(ground?.inboundTime, ground?.arrivalTime, ground?.updatedAt);
  return `
    <section class="history-current-block">
      <article class="history-status-card history-status-card-ground" data-status="ground">
        <header>
          <span>当前停场</span>
          <button type="button" data-history-airport="${escapeHtml(airportCode === NA_TEXT ? "" : airportCode)}">机场</button>
        </header>
        <div class="history-ground-visual">
          <strong>${escapeHtml(historyGroundDurationLabel(ground))}</strong>
          <span>
            <em>${escapeHtml(historyGroundAirportCodes(ground))}</em>
            <small title="${escapeHtml(`${airportName} ${airportNameEn}`)}">${escapeHtml(airportName)} · ${escapeHtml(airportNameEn)}</small>
          </span>
        </div>
        <dl class="history-current-metrics">
          <div><dt>入场时间</dt><dd>${escapeHtml(inboundTime)}</dd></div>
          <div><dt>上一段航线</dt><dd>${escapeHtml(previousRoute)}</dd></div>
          <div><dt>上一段时长</dt><dd>${previousFlight ? escapeHtml(historyDurationLabel(previousFlight)) : NA_TEXT}</dd></div>
        </dl>
      </article>
    </section>
  `;
}

function renderHistoryCurrentStatus(detail, flights, jet, historyNow) {
  const liveFlight = historyCurrentLiveFlight(detail, flights);
  if (liveFlight) {
    return renderHistoryLiveStatusCard(liveFlight, jet, historyNow);
  }
  const ground = detail?.groundAirportInfo;
  if (ground) {
    return renderHistoryGroundStatusCard(ground, historyPreviousCompletedFlight(detail, flights));
  }
  return `
    <section class="history-current-block">
      <article class="history-status-card history-status-card-idle" data-status="idle">
        <header><span>当前状态</span></header>
        <p>暂无当前在途或停场信息</p>
      </article>
    </section>
  `;
}

function renderHistorySummary(detail, flights) {
  return renderHistoryCurrentStatus(detail, flights, selectedAircraft(), historyTimelineNowEpoch(detail));
}

function renderHistoryActivityBar(flights, anchorEpochMs) {
  const buckets = historyActivityBuckets(flights, anchorEpochMs);
  const rangeDays = Number(historyTimelineState().rangeDays || historyTimelineConfig.defaultRangeDays);
  const isYear = rangeDays >= 365;
  const isMonth = !isYear && rangeDays > 7;
  return `
    <section class="history-activity" aria-label="行程活跃量">
      <div class="history-activity-bars ${isYear ? "is-year" : rangeDays <= 7 ? "is-week" : "is-month"}">
        ${buckets.map((bucket) => {
          const tooltip = `${bucket.fullLabel} · ${bucket.count} 段 · ${formatDuration(bucket.minutes * 60000)}`;
          return `
            <button type="button" class="${bucket.active ? "active" : ""} ${bucket.monthBoundary ? "is-month-boundary" : ""}"
              data-history-bucket="${escapeHtml(bucket.key)}"
              aria-label="${escapeHtml(tooltip)}"
              data-history-activity-tooltip="${escapeHtml(tooltip)}">
              <span style="height:${bucket.heightPx}px"></span>
              ${isMonth
                ? `<em class="history-activity-axis-dot" aria-hidden="true"></em>`
                : `<em>${escapeHtml(bucket.label)}</em>`}
              ${bucket.secondaryLabel ? `<small>${escapeHtml(bucket.secondaryLabel)}</small>` : ""}
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderHistoryControls(summary = historyPeriodSummary([])) {
  const timeline = historyTimelineState();
  const rangeButtons = [7, 30, 365].map((days) => `
    <button type="button" class="${timeline.rangeDays === days ? "active" : ""}" data-history-range="${days}" aria-pressed="${timeline.rangeDays === days ? "true" : "false"}">${historyRangeLabel(days)}</button>
  `).join("");
  return `
    <section class="history-controls" aria-label="行程筛选">
      <div class="history-range" role="group" aria-label="历史范围">${rangeButtons}</div>
      <dl class="history-period-summary" aria-label="行程汇总">
        <div><dt>航段数</dt><dd>${escapeHtml(formatNumber(summary.totalCount))}</dd></div>
        <div><dt>飞行总时长</dt><dd>${escapeHtml(formatDuration(summary.totalMinutes * 60000))}</dd></div>
      </dl>
    </section>
  `;
}

function renderHistoryStatsModule(summary, flights, historyNow) {
  return `
    <section class="history-module history-stats-module" aria-labelledby="historyStatsTitle">
      <h3 class="history-module-title" id="historyStatsTitle">运行统计</h3>
      <div class="history-module-panel history-stats-panel">
        ${renderHistoryControls(summary)}
        ${renderHistoryActivityBar(flights, historyNow)}
      </div>
    </section>
  `;
}

function historyAirportCodeLabel(value) {
  return missingValue(value) ? "N/A" : displayOrDash(value);
}

function renderHistoryCard(item, options = {}) {
  return renderHistoryFlightTableRow(item, options);
}

function renderHistoryFlightTableRow(item, options = {}) {
  const status = historyStatus(item);
  const key = historyFlightKey(item);
  const expanded = historyTimelineState().expandedKey === key;
  const depAirport = historyAirportDisplay(item, "dep");
  const arrAirport = historyAirportDisplay(item, "arr");
  const depRef = historyPrimaryDeparture(item);
  const depTime = historyLocalTimeLabel(depRef);
  const arrRef = historyPrimaryArrival(item);
  const arrTime = historyLocalTimeLabel(arrRef);
  const rowDate = historyRowDateMeta(item);
  const dayOffset = historyDayOffsetLabel(depRef, arrRef);
  const action = status.key === "live" ? "Live" : item.uniqueKey ? "Playback" : "No track";
  const disabledAction = status.key !== "live" && !item.uniqueKey;
  const duration = status.key === "cancelled" ? NA_TEXT : historyDurationLabel(item);
  return `
    <article class="history-flight-row ${options.current ? "history-current-row" : ""}" data-status="${escapeHtml(status.tone)}">
      <button type="button" class="history-flight-row-main" data-history-flight-card="${escapeHtml(key)}" aria-expanded="${expanded ? "true" : "false"}">
        <span class="history-flight-date-cell">
          <strong>${escapeHtml(rowDate.date)}</strong>
          <em>${escapeHtml(rowDate.weekday)}</em>
        </span>
        <span class="history-flight-route-cell">
          <span class="history-flight-airport-names ${status.key === "cancelled" ? "is-cancelled" : ""}" title="${escapeHtml(`${depAirport.name} → ${arrAirport.name}`)}">
            <strong class="${depAirport.missing ? "missing" : ""}">${escapeHtml(depAirport.name)}</strong><i>▸</i><strong class="${arrAirport.missing ? "missing" : ""}">${escapeHtml(arrAirport.name)}</strong>
          </span>
          <span class="history-flight-airport-codes">${escapeHtml(depAirport.codes)} → ${escapeHtml(arrAirport.codes)}</span>
          <span class="history-flight-local-times">${escapeHtml(depTime)} → ${escapeHtml(arrTime)}${dayOffset ? ` <em>${escapeHtml(dayOffset)}</em>` : ""}</span>
        </span>
        <span class="history-flight-duration-cell">
          <strong>${escapeHtml(duration)}</strong>
          <em>${escapeHtml(historyStatusActionLabel(status))}</em>
        </span>
      </button>
      ${expanded ? `
        <div class="history-flight-expanded">
          <dl>
            <div><dt>STD</dt><dd>${escapeHtml(formatHistoryTime(historyTimeRef(item, "scheduledDeparture")))}</dd></div>
            <div><dt>ATD</dt><dd>${escapeHtml(formatHistoryTime(historyTimeRef(item, "actualDeparture")))}</dd></div>
            <div><dt>STA</dt><dd>${escapeHtml(formatHistoryTime(historyTimeRef(item, "scheduledArrival")))}</dd></div>
            <div><dt>ATA</dt><dd>${escapeHtml(formatHistoryTime(historyTimeRef(item, "actualArrival")))}</dd></div>
            <div><dt>UTC</dt><dd>${escapeHtml([formatPanelTime(historyPrimaryDeparture(item), { date: true, timeZone: "UTC", zoneLabel: "UTC" }), formatPanelTime(arrRef, { date: true, timeZone: "UTC", zoneLabel: "UTC" })].filter((value) => value !== NA_TEXT).join(" → "))}</dd></div>
            <div><dt>ID</dt><dd>${escapeHtml(firstMatchedValue(item.uniqueKey, item.flightId))}</dd></div>
          </dl>
          <div class="history-card-actions">
            <button type="button" ${disabledAction ? "disabled" : ""}>${escapeHtml(action)}</button>
            <button type="button" ${item.uniqueKey ? "" : "disabled"}>航迹</button>
            <button type="button">详情</button>
          </div>
        </div>
      ` : ""}
    </article>
  `;
}

function renderHistoryTimelineGroups(flights) {
  const timeline = historyTimelineState();
  const anchorIndex = timeline.anchorMonth
    ? Math.max(0, flights.findIndex((item) => historyMonthKey(item) === timeline.anchorMonth))
    : 0;
  const startIndex = anchorIndex < 0 ? 0 : anchorIndex;
  const mounted = flights.slice(startIndex, startIndex + Math.max(historyTimelineConfig.mountLimit, timeline.visibleCount));
  const groups = historyGroupFlights(mounted);
  const currentFlightKey = historyFlightKey(historyCurrentLiveFlight(null, flights));
  if (!mounted.length) {
    return `<div class="history-empty">当前筛选条件下暂无历史行程</div>`;
  }
  const topNotice = startIndex > 0
    ? `<div class="history-anchor-notice"><span>上方还有 ${startIndex} 段</span><button type="button" data-history-action="latest">回到最新</button></div>`
    : "";
  const moreCount = flights.length - startIndex - mounted.length;
  const moreButton = moreCount > 0
    ? `<button type="button" class="history-load-more" data-history-action="load-more">继续加载 · 剩余 ${moreCount} 段</button>`
    : "";
  return `
    ${topNotice}
    <div class="history-flight-table">
      ${groups.map((group) => `
        <section class="history-month-group history-month-table-group ${timeline.highlightMonth === group.monthKey ? "highlight" : ""}" data-history-month-group="${escapeHtml(group.monthKey)}">
          <header><span>${escapeHtml(group.label)}</span><em>${group.flights.length} 段 · ${escapeHtml(formatDuration(group.minutes * 60000))}</em></header>
          <div class="history-flight-table-rows">${group.flights.map((item) => renderHistoryFlightTableRow(item, { current: Boolean(currentFlightKey && historyFlightKey(item) === currentFlightKey) })).join("")}</div>
        </section>
      `).join("")}
    </div>
    ${moreButton}
    <div class="history-dom-budget">已显示 ${mounted.length} / ${flights.length} 段</div>
  `;
}

function renderHistoryRecordsModule(flights, loading) {
  return `
    <section class="history-module history-records-module" aria-labelledby="historyRecordsTitle">
      <h3 class="history-module-title" id="historyRecordsTitle">运行记录</h3>
      <div class="history-timeline-scroll" data-history-timeline-scroll>
        ${loading ? `<p class="empty-related">行程记录加载中...</p>` : renderHistoryTimelineGroups(flights)}
      </div>
    </section>
  `;
}

function renderFlightHistoryTimeline(detail) {
  const statsFlights = historyFlightsForTimeline(detail);
  const recordFlights = historyFlightsForRecords(detail);
  const historyNow = historyTimelineNowEpoch(detail);
  const summary = historySummary(detail, statsFlights);
  const loading = state.detailLoads.has(aircraftHistoryLoadKey(selectedAircraft()));
  return `
    <div class="history-timeline-root ${historyTimelineState().overviewExpanded ? "overview-expanded" : ""} ${historyTimelineState().summaryCollapsed ? "summary-collapsed" : ""}">
      <button type="button" class="history-overview-chip" data-history-action="toggle-overview">概览</button>
      <div class="history-fixed-region">
        ${renderHistoryCurrentStatus(detail, recordFlights, selectedAircraft(), historyNow)}
        ${renderHistoryStatsModule(summary, statsFlights, historyNow)}
      </div>
      ${renderHistoryRecordsModule(recordFlights, loading)}
    </div>
  `;
}

function renderFlightHistoryRows(detail) {
  return renderFlightHistoryTimeline(detail);
}

function aircraftHistorySampleMatches(jet) {
  const target = comparableAircraftIdentity(historyTimelineConfig.sampleRegistration);
  return [
    jet?.registration,
    jet?.tailNoClear,
    jet?.tailNoDisplay,
    jet?.callsign,
    jet?.apiCallsign,
    jet?.id,
    jet?.raw?.tailNoDisplay,
    jet?.raw?.tailNoClear,
    jet?.raw?.registrationClear
  ].some((value) => comparableAircraftIdentity(value) === target);
}

function sampleAirportMeta(code) {
  return {
    PEK: { name: "北京首都", full: "北京首都国际机场", en: "Beijing Capital", zone: "Asia/Shanghai", country: "中国" },
    HND: { name: "东京羽田", full: "东京羽田机场", en: "Tokyo Haneda", zone: "Asia/Tokyo", country: "日本" },
    CAN: { name: "广州白云", full: "广州白云国际机场", en: "Guangzhou Baiyun", zone: "Asia/Shanghai", country: "中国" },
    DXB: { name: "迪拜", full: "迪拜国际机场", en: "Dubai Intl", zone: "Asia/Dubai", country: "阿联酋" },
    LHR: { name: "伦敦希思罗", full: "伦敦希思罗机场", en: "London Heathrow", zone: "Europe/London", country: "英国" },
    KHN: { name: "南昌昌北", full: "南昌昌北国际机场", en: "Nanchang Changbei", zone: "Asia/Shanghai", country: "中国" },
    SHA: { name: "上海虹桥", full: "上海虹桥国际机场", en: "Shanghai Hongqiao", zone: "Asia/Shanghai", country: "中国" },
    HKG: { name: "香港", full: "香港国际机场", en: "Hong Kong Intl", zone: "Asia/Hong_Kong", country: "中国香港" },
    KIX: { name: "大阪关西", full: "大阪关西国际机场", en: "Osaka Kansai", zone: "Asia/Tokyo", country: "日本" },
    BKK: { name: "曼谷素万那普", full: "曼谷素万那普机场", en: "Bangkok Suvarnabhumi", zone: "Asia/Bangkok", country: "泰国" }
  }[String(code || "").toUpperCase()] || { name: code, full: code, en: code, zone: "UTC", country: "" };
}

function localSampleEpoch(date, time, zone) {
  return timeUtils.normalizeEpochMs(`${date} ${time}`, { timeZone: zone });
}

function createSampleHistoryFlight(def, index) {
  const dep = sampleAirportMeta(def.dep);
  const arr = sampleAirportMeta(def.arr);
  const depEpoch = localSampleEpoch(def.date, def.time, dep.zone);
  const actualDelay = Number(def.delayMinutes || 0);
  const actualDepEpoch = depEpoch + actualDelay * 60000;
  const durationMinutes = Number(def.durationMinutes || 120);
  const arrEpoch = actualDepEpoch + durationMinutes * 60000;
  const stateKey = def.status || "landed";
  const scheduledOnly = stateKey === "scheduled" || stateKey === "cancelled";
  const actualArrival = stateKey === "live" || scheduledOnly ? "" : arrEpoch;
  const estimatedArrival = stateKey === "live" ? arrEpoch : "";
  const flightState = { scheduled: 20, live: 30, landed: 40, delayed: 40, cancelled: 50 }[stateKey] || 40;
  const flightStateStr = { scheduled: "计划", live: "途中", landed: "到达", delayed: "延误", cancelled: "取消" }[stateKey] || "到达";
  const times = {
    scheduledDeparture: makeHistoryTimeRef(depEpoch, dep.zone, "history_scheduled_departure", "static.scheduledDeparture"),
    actualDeparture: makeHistoryTimeRef(scheduledOnly ? "" : actualDepEpoch, dep.zone, "history_actual_departure", "static.actualDeparture"),
    scheduledArrival: makeHistoryTimeRef(depEpoch + durationMinutes * 60000, arr.zone, "history_scheduled_arrival", "static.scheduledArrival"),
    actualArrival: makeHistoryTimeRef(actualArrival, arr.zone, "history_actual_arrival", "static.actualArrival"),
    estimatedArrival: makeHistoryTimeRef(estimatedArrival, arr.zone, "history_estimated_arrival", "static.estimatedArrival")
  };
  const depTimeRef = scheduledOnly ? times.scheduledDeparture : times.actualDeparture;
  const arrTimeRef = times.actualArrival.epochMs ? times.actualArrival : times.estimatedArrival.epochMs ? times.estimatedArrival : times.scheduledArrival;
  return {
    raw: { ...def, source: "static-v1.24" },
    id: `B8202-HIST-${index + 1}`,
    uniqueKey: stateKey === "scheduled" || stateKey === "cancelled" ? "" : `B8202-HIST-${index + 1}`,
    flightId: `B8202-${String(index + 1).padStart(3, "0")}`,
    callSign: "B-8202",
    flightNo: "B-8202",
    depAirport: def.dep,
    depAirportName: dep.name,
    depAirportFullName: dep.full,
    depAirportNameEn: dep.en,
    depAirportCountry: dep.country,
    arrAirport: def.arr,
    arrAirportName: arr.name,
    arrAirportFullName: arr.full,
    arrAirportNameEn: arr.en,
    arrAirportCountry: arr.country,
    flightState,
    flightStateStr,
    depTimeZone: dep.zone,
    arrTimeZone: arr.zone,
    times,
    depTimeRef,
    arrTimeRef,
    depActualEpochMs: depTimeRef.epochMs,
    arrActualEpochMs: arrTimeRef.epochMs,
    acrossDays: 0,
    estimateTimeMinutes: durationMinutes,
    durationMinutes,
    delayMinutes: actualDelay || null
  };
}

function b8202SampleFlightDefs() {
  const fixed = [
    { date: "2026-08-19", status: "scheduled", dep: "HND", arr: "PEK", time: "10:30", durationMinutes: 190 },
    { date: "2026-08-17", status: "live", dep: "PEK", arr: "HND", time: "14:20", durationMinutes: 195 },
    { date: "2026-08-13", status: "landed", dep: "PEK", arr: "CAN", time: "15:30", durationMinutes: 202 },
    { date: "2026-08-11", status: "landed", dep: "DXB", arr: "PEK", time: "12:00", durationMinutes: 497 },
    { date: "2026-08-08", status: "delayed", dep: "PEK", arr: "DXB", time: "07:20", durationMinutes: 567, delayMinutes: 27 },
    { date: "2026-08-06", status: "delayed", dep: "LHR", arr: "PEK", time: "06:15", durationMinutes: 659, delayMinutes: 44 },
    { date: "2026-08-01", status: "landed", dep: "PEK", arr: "LHR", time: "09:15", durationMinutes: 632 },
    { date: "2026-07-24", status: "cancelled", dep: "PEK", arr: "KHN", time: "11:05", durationMinutes: 144 },
    { date: "2026-06-29", status: "delayed", dep: "HKG", arr: "SHA", time: "17:40", durationMinutes: 191, delayMinutes: 31 },
    { date: "2026-05-04", status: "delayed", dep: "SHA", arr: "KIX", time: "17:00", durationMinutes: 139, delayMinutes: 19 }
  ];
  const counts = [
    ["2026-07", 9], ["2026-06", 6], ["2026-05", 11], ["2026-04", 6],
    ["2026-03", 11], ["2026-02", 9], ["2026-01", 8], ["2025-12", 13],
    ["2025-11", 15], ["2025-10", 12], ["2025-09", 13]
  ];
  const routes = [
    ["KHN", "PEK", 155], ["PEK", "LHR", 621], ["LHR", "PEK", 633],
    ["HND", "PEK", 208], ["PEK", "HND", 207], ["HKG", "PEK", 204],
    ["SHA", "HKG", 144], ["HKG", "BKK", 173], ["BKK", "HKG", 184],
    ["SHA", "KIX", 129], ["KIX", "SHA", 133], ["PEK", "SHA", 128]
  ];
  const generated = [];
  counts.forEach(([monthKey, count], monthIndex) => {
    const [year, month] = monthKey.split("-").map(Number);
    for (let i = 0; i < count; i += 1) {
      const day = Math.max(1, 28 - ((i * 3 + monthIndex) % 27));
      const route = routes[(i + monthIndex) % routes.length];
      generated.push({
        date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        status: "landed",
        dep: route[0],
        arr: route[1],
        time: `${String(6 + ((i * 3) % 13)).padStart(2, "0")}:${String((i * 5) % 60).padStart(2, "0")}`,
        durationMinutes: route[2]
      });
    }
  });
  return [...fixed, ...generated];
}

function createB8202StaticHistoryDetail() {
  const flights = b8202SampleFlightDefs()
    .map(createSampleHistoryFlight)
    .sort((a, b) => historyComparableEpoch(b) - historyComparableEpoch(a));
  const totalMinutes = flights.reduce((sum, item) => sum + (historyDurationMinutes(item) || 0), 0);
  return {
    raw: { source: "static-v1.24", registration: "B-8202", serverNowEpochMs: localSampleEpoch("2026-08-17", "18:00", "Asia/Shanghai") },
    source: "static-v1.24",
    isStaticSample: true,
    serverNowEpochMs: localSampleEpoch("2026-08-17", "18:00", "Asia/Shanghai"),
    currentPage: 1,
    hasNextPage: false,
    totalCount: flights.length,
    totalMinutes,
    monthlyStats: [],
    flights,
    groundAirportInfo: null
  };
}

function applyStaticAircraftHistory(jet) {
  if (!jet || !aircraftHistorySampleMatches(jet) || (jet.flightHistoryDetail && !jet.flightHistoryDetail.isStaticSample)) {
    return false;
  }
  applyAircraftHistory(jet, createB8202StaticHistoryDetail());
  return true;
}

function renderRecentFlights(jet, options = {}) {
  let historyDetail = jet.flightHistoryDetail || cachedAircraftHistoryDetail(jet);
  if (!historyDetail) {
    applyStaticAircraftHistory(jet);
    historyDetail = jet.flightHistoryDetail || cachedAircraftHistoryDetail(jet);
  }
  if (historyDetail && (!historyDetail.isStaticSample || historyDetail?.flights?.length || historyDetail?.groundAirportInfo)) {
    setRecentFlightsHtml(renderFlightHistoryRows(historyDetail), options);
    return;
  }
  const historyLoadKey = aircraftHistoryLoadKey(jet);
  if (historyLoadKey && state.detailLoads.has(historyLoadKey)) {
    setRecentFlightsHtml(`<p class="empty-related">行程记录加载中...</p>`, options);
    return;
  }
  if (jet.flightHistoryError) {
    setRecentFlightsHtml(`<p class="empty-related">行程记录暂时无法加载</p>`, options);
    return;
  }
  if (state.aircraftSegment === "journey" && dataService?.isEnabled() && (!historyDetail || historyDetail.isStaticSample)) {
    if (historyLoadKey) {
      loadAircraftHistory(jet);
      setRecentFlightsHtml(`<p class="empty-related">行程记录加载中...</p>`, options);
      return;
    }
    if (aircraftDetailIsLoading(jet) || aircraftNeedsDetailLoad(jet)) {
      loadAircraftDetails(jet);
      setRecentFlightsHtml(`<p class="empty-related">行程记录等待飞机信息同步...</p>`, options);
      return;
    }
  }
  const raw = jet.planeDetail?.raw || jet.flightDetail?.raw || {};
  const candidates = [
    raw.recentFlights,
    raw.flightHistory,
    raw.historyFlights,
    raw.flights,
    raw.recentFlightList,
    jet.recentFlights
  ].find(Array.isArray) || [];
  const flights = candidates
    .map((item) => ({
      uniqueKey: firstMatchedValue(item.uniqueKey, item.flightId, item.id),
      date: firstMatchedValue(item.date, item.depTime, item.depTime1, item.startDate),
      flight: firstMatchedValue(item.callSign, item.flightNo, item.callsign, item.flight, item.taskNo),
      dep: firstMatchedValue(item.depAirport, item.originAirportCode, item.from, item.depIcaoCode),
      arr: firstMatchedValue(item.arrAirport, item.destinationAirportCode, item.to, item.arrIcaoCode),
      state: firstMatchedValue(item.flightStateStr, item.status)
    }))
    .filter((item) => [item.date, item.flight, item.dep, item.arr].some((value) => value !== NA_TEXT))
    .slice(0, 6);

  if (!flights.length) {
    setRecentFlightsHtml(`<p class="empty-related">暂无近期航班记录</p>`, options);
    return;
  }

  setRecentFlightsHtml(flights.map((item) => `
    <button type="button" class="related-flight" data-id="${escapeHtml(item.uniqueKey === NA_TEXT ? "" : item.uniqueKey)}">
      <span>
        <strong>${escapeHtml(firstMatchedValue(item.flight, item.date))}</strong>
        <small>${escapeHtml(item.dep)} - ${escapeHtml(item.arr)} | ${escapeHtml(item.state)}</small>
      </span>
      <svg><use href="#icon-chevron"></use></svg>
    </button>
  `).join(""), options);
}

function rerenderSelectedHistoryTimeline(options = {}) {
  const jet = selectedAircraft();
  if (jet) {
    renderRecentFlights(jet, options);
  }
}

function handleHistoryTimelineClick(event) {
  const airportButton = event.target.closest("[data-history-airport]");
  if (airportButton) {
    const code = airportButton.dataset.historyAirport || "";
    if (code) {
      selectAirportFromCode(code);
    }
    return;
  }

  const monthButton = event.target.closest("[data-history-month]");
  if (monthButton) {
    const month = monthButton.dataset.historyMonth || "";
    const timeline = historyTimelineState();
    timeline.anchorMonth = month;
    timeline.visibleCount = historyTimelineConfig.mountLimit;
    timeline.highlightMonth = month;
    rerenderSelectedHistoryTimeline({ resetScroll: true });
    window.setTimeout(() => {
      if (timeline.highlightMonth === month) {
        timeline.highlightMonth = "";
        rerenderSelectedHistoryTimeline({ preserveScroll: true });
      }
    }, 1200);
    return;
  }

  const rangeButton = event.target.closest("[data-history-range]");
  if (rangeButton) {
    historyTimelineState().rangeDays = Number(rangeButton.dataset.historyRange) || historyTimelineConfig.defaultRangeDays;
    rerenderSelectedHistoryTimeline({ preserveScroll: true, deferDuringUserScroll: false });
    return;
  }

  const cardButton = event.target.closest("[data-history-flight-card]");
  if (cardButton) {
    const timeline = historyTimelineState();
    const key = cardButton.dataset.historyFlightCard || "";
    timeline.expandedKey = timeline.expandedKey === key ? "" : key;
    rerenderSelectedHistoryTimeline({ preserveScroll: true, deferDuringUserScroll: false });
    return;
  }

  const action = event.target.closest("[data-history-action]")?.dataset.historyAction;
  if (!action) {
    return;
  }
  const timeline = historyTimelineState();
  if (action === "load-more") {
    timeline.visibleCount += historyTimelineConfig.mountLimit;
  } else if (action === "latest") {
    resetHistoryTimelineMount();
  } else if (action === "toggle-overview") {
    timeline.overviewExpanded = !timeline.overviewExpanded;
  } else if (action === "live") {
    setAircraftMapMode("follow");
    return;
  }
  rerenderSelectedHistoryTimeline({
    preserveScroll: action !== "latest",
    resetScroll: action === "latest",
    deferDuringUserScroll: false
  });
}

function handleHistoryTimelineScroll(event) {
  const scroller = event.currentTarget || event.target;
  if (!scroller || historyTimelineState().overviewExpanded) {
    return;
  }
  if (historyScrollResetIsActive()) {
    const expectedScrollTop = historyJourneyListTopScrollTop(scroller);
    const hasMovedAwayFromListTop = Math.abs(Number(scroller.scrollTop || 0) - expectedScrollTop) > 4;
    if (hasMovedAwayFromListTop) {
      const timeline = historyTimelineState();
      const hardLocked = Date.now() < Number(timeline.scrollResetHardUntil || 0);
      if (timeline.applyingScrollRestore || hardLocked) {
        scrollHistoryToListTop(scroller);
      } else {
        timeline.lastUserScrollAt = Date.now();
        nextHistoryScrollRestoreSeq();
        releaseHistoryScrollReset();
      }
    }
    syncHistoryCollapsedState(scroller);
    return;
  }
  const timeline = historyTimelineState();
  if (!timeline.applyingScrollRestore && !historyScrollRestoreIsPending()) {
    timeline.lastUserScrollAt = Date.now();
    nextHistoryScrollRestoreSeq();
  }
  syncHistoryCollapsedState(scroller);
}

function aircraftDetailLoadKey(jet) {
  return jet?.id ? `aircraft:${jet.id}` : "";
}

function aircraftNeedsDetailLoad(jet) {
  return Boolean(jet && ((jet.uniqueKey && !jet.flightDetail) || (jet.tailNoEncrypted && !jet.planeDetail)));
}

function aircraftDetailIsLoading(jet) {
  const loadKey = aircraftDetailLoadKey(jet);
  return Boolean(loadKey && state.detailLoads.has(loadKey));
}

function syncAircraftDetailLoadingState(loading) {
  const view = document.getElementById("aircraftDetailView");
  const indicator = document.getElementById("aircraftDetailLoading");
  if (view) {
    view.setAttribute("aria-busy", loading ? "true" : "false");
  }
  if (indicator) {
    indicator.hidden = !loading;
  }
}

function renderAircraftDetailPanel(jet) {
  const position = currentPosition(jet);
  const heading = aircraftHeading(jet);
  const profile = aircraftProfileForPanel(jet);
  const plane = profile.plane;
  const provider = profile.provider;
  const base = profile.base;
  const summary = profile.summary;
  const dep = selectedRouteSide(jet, "dep");
  const arr = selectedRouteSide(jet, "arr");
  const routeTimes = flightTimeRefsForPanel(jet, base, dep, arr);
  const depDisplay = routeSideDisplay(dep, "dep");
  const arrDisplay = routeSideDisplay(arr, "arr");
  const journey = journeyMetricsForPanel(jet, routeTimes, summary);
  const typeCode = aircraftTypeCodeForIcon(jet);
  const typeName = firstMatchedValue(
    plane.modelName,
    plane.modelNameCn,
    plane.modelNameZh,
    jet.modelName,
    jet.modelNameCn,
    plane.modelNameEn,
    jet.model,
    jet.family
  );
  const operatorName = firstMatchedValue(provider.companyNameShort, provider.companyName, jet.operator);
  const status = localizedFlightStatus(jet, base, summary);
  const statusElement = document.getElementById("aircraftStatus");
  const detailLoading = aircraftDetailIsLoading(jet);
  const callsignText = aircraftCallsignLabel(jet, "");
  const callsignLoading = detailLoading && !jet.flightDetail;
  const callsignElement = document.getElementById("aircraftCallsign");

  setText("aircraftStatus", status.text);
  statusElement?.setAttribute("data-tone", status.tone);
  syncAircraftDetailLoadingState(detailLoading);
  callsignElement?.classList.toggle("is-loading", callsignLoading);
  if (callsignElement) {
    if (callsignLoading) {
      callsignElement.setAttribute("aria-label", "航班号同步中");
    } else {
      callsignElement.removeAttribute("aria-label");
    }
  }
  setText("aircraftCallsign", callsignLoading
    ? ""
    : firstMatchedValue(callsignText, "暂无航班号"));
  setText("aircraftRegistrationHero", firstMatchedValue(jet.registration, plane.tailNoDisplay, jet.tailNoClear));
  setTextWithToast("aircraftTypeNameHero", detailLoading ? firstMatchedValue(typeName, NA_TEXT) : typeName);
  setText("aircraftTypeIcaoHero", detailLoading ? firstMatchedValue(typeCode, NA_TEXT) : firstMatchedValue(typeCode, "ICAO待确认"));
  setText("aircraftOperatorHero", detailLoading ? firstMatchedValue(operatorName, NA_TEXT) : firstMatchedValue(operatorName, "运营商待确认"));
  renderAircraftMedia(jet);

  setPanelText("routeFrom", depDisplay.iata);
  setPanelText("routeFromIcao", depDisplay.icao);
  setTextWithToast("routeFromNameCn", depDisplay.nameCn);
  setTextWithToast("routeFromNameEn", depDisplay.nameEn);
  setPanelText("routeFromTimezone", depDisplay.missing ? "N/A" : formatRouteZoneLocalTime(depDisplay.zone, routeTimes.serverNow));
  setPanelText("routeTo", arrDisplay.iata);
  setPanelText("routeToIcao", arrDisplay.icao);
  setTextWithToast("routeToNameCn", arrDisplay.nameCn);
  setTextWithToast("routeToNameEn", arrDisplay.nameEn);
  setPanelText("routeToTimezone", arrDisplay.missing ? "N/A" : formatRouteZoneLocalTime(arrDisplay.zone, routeTimes.serverNow));
  const fromButton = document.getElementById("routeFromButton");
  const toButton = document.getElementById("routeToButton");
  if (fromButton) {
    fromButton.dataset.airportCode = depDisplay.airportCode === NA_TEXT ? "" : depDisplay.airportCode;
    fromButton.classList.toggle("route-airport-missing", depDisplay.missing);
  }
  if (toButton) {
    toButton.dataset.airportCode = arrDisplay.airportCode === NA_TEXT ? "" : arrDisplay.airportCode;
    toButton.classList.toggle("route-airport-missing", arrDisplay.missing);
  }
  ["routeToIcao", "routeToNameCn", "routeToNameEn", "routeToTimezone"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.hidden = arrDisplay.missing;
    }
  });

  const actualDepartureHighlight = formatPanelTimeHighlight(routeTimes.actualDeparture, depDisplay.zone);
  const estimatedArrivalHighlight = formatPanelTimeHighlight(routeTimes.estimatedArrival, arrDisplay.zone, { acrossDays: base.acrossDays });
  const timeZoneDifference = formatRouteTimeZoneDifference(depDisplay.zone, arrDisplay.zone, routeTimes.serverNow);
  setText("flightTotalDuration", formatDuration(journey.totalDurationMs));
  setText("flightTimeZoneDiff", timeZoneDifference.text || NA_TEXT);
  setText("flightDistance", formatMetersDistance(journey.distanceMeters));
  setText("flightElapsed", formatDuration(journey.elapsedMs));
  setText("flightRemaining", formatDuration(journey.remainingMs));
  const totalDurationRow = document.getElementById("flightTotalDurationRow");
  if (totalDurationRow) {
    totalDurationRow.hidden = arrDisplay.missing;
  }
  const timeZoneDiffRow = document.getElementById("flightTimeZoneDiffRow");
  if (timeZoneDiffRow) {
    timeZoneDiffRow.hidden = arrDisplay.missing || timeZoneDifference.hidden;
    timeZoneDiffRow.title = timeZoneDifference.hidden ? "" : "到达机场相对出发机场的 UTC 时区差";
  }
  setText("departedTime", actualDepartureHighlight.time);
  setText("departedDate", actualDepartureHighlight.date);
  setText("departedTimeZone", actualDepartureHighlight.zone);
  setText("arrivalTime", estimatedArrivalHighlight.time);
  setText("arrivalDate", estimatedArrivalHighlight.date);
  const arrivalTimeZoneElement = document.getElementById("arrivalTimeZone");
  if (arrivalTimeZoneElement) {
    arrivalTimeZoneElement.hidden = arrDisplay.missing;
    arrivalTimeZoneElement.textContent = arrDisplay.missing ? "" : displayOrDash(estimatedArrivalHighlight.zone);
  }
  const progressTrack = document.getElementById("flightProgressTrack");
  const progressBar = document.getElementById("flightProgress");
  const progressMarker = document.getElementById("flightProgressMarker");
  const progressPercent = arrDisplay.missing ? 100 : Math.max(0, Math.min(100, journey.progressPercent));
  if (progressTrack) {
    progressTrack.style.setProperty("--journey-progress", `${progressPercent}%`);
    progressTrack.setAttribute("aria-valuenow", String(progressPercent));
  }
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  if (progressMarker) progressMarker.style.left = `${progressPercent}%`;

  setText("aircraftModel", firstMatchedValue(plane.modelName, plane.modelNameCn, jet.modelName, plane.modelNameEn, jet.model));
  setText("aircraftTypeCode", typeCode);
  setText("aircraftTypeCodeOverview", typeCode);
  setText("aircraftModelEn", firstMatchedValue(plane.modelNameEn));
  setText("aircraftModelSeries", firstMatchedValue(plane.modelSeries));
  setText("aircraftRegistration", firstMatchedValue(jet.registration, plane.tailNoDisplay, jet.tailNoClear));
  setText("aircraftCountry", firstMatchedValue(plane.registrationPlace));
  setText("aircraftSerial", firstMatchedValue(plane.planeMsn));
  setText("aircraftTransponder", firstMatchedValue(plane.transponderCode, plane.icao24, plane.icaoAddress));
  setText("aircraftAge", calculateAircraftAge(plane.deliveryDate));
  setText("aircraftCategory", firstMatchedValue(plane.planeSize, jet.planeSize, jet.family));
  setText("aircraftOperator", operatorName);
  setText("aircraftTrustee", firstMatchedValue(plane.trusteeship));
  setText("aircraftServiceStatus", serviceStatusLabel(plane.serviceStatus));
  setText("aircraftShareState", shareStateLabel(plane.shareState));
  setText("aircraftOwnPlane", binaryStateLabel(plane.ownPlane));
  setText("aircraftCertState", certStateLabel(plane.certState));
  setText("aircraftDeliveryDate", firstMatchedValue(plane.deliveryDate));
  setText("aircraftRenovationDate", firstMatchedValue(plane.renovationDate));
  setText("aircraftMaxRange", formatSpecDistance(plane.maxRange, "km"));
  setText("aircraftMaxSpeedSpec", firstMatchedValue(plane.maxSpeed));
  setText("aircraftPracticalCeiling", formatSpecDistance(plane.practicalCeiling, "m"));
  setText("aircraftTakeoffDistance", formatSpecDistance(plane.takeoffDistance, "m"));
  setText("aircraftSource", firstMatchedValue(jet.source, "private database"));

  setText("flightAltitude", formatAltitude(jet.altitude));
  setText("flightSpeed", formatSpeed(jet.speed));
  setText("flightVerticalSpeed", formatVerticalSpeed(jet.verticalSpeed));
  setText("flightHeading", formatHeading(heading));
  setText("flightCoordinates", formatCoordinates(position));
  setText("flightSquawk", firstMatchedValue(jet.squawk, summary.squawk));
  setText("flightMaxAltitude", formatAltitude(normalizeAltitudeFeet(summary.maxAltitude, null)));
  setText("flightMaxSpeed", formatSpeed(normalizeSpeedKnots(summary.maxSpeed, null)));

  const lat = Array.isArray(position) ? position[0] : null;
  const lng = Array.isArray(position) ? position[1] : null;
  setText("dataSourceType", firstMatchedValue(jet.source, "private database"));
  setText("dataIcao24", firstMatchedValue(plane.icao24, plane.icaoAddress, plane.transponderCode));
  setText("dataLastPositionTime", formatUtcTime(jet.positionTimestamp || jet.updatedAtEpochMs, { date: true }));
  setText("dataLatitude", finiteNumber(lat) ? Number(lat).toFixed(5) : NA_TEXT);
  setText("dataLongitude", finiteNumber(lng) ? Number(lng).toFixed(5) : NA_TEXT);
  setText("dataQuality", firstMatchedValue(jet.quality, aircraftFreshnessState(jet)));

  syncSpeedAltitudeUnitButtons();
  renderSpeedAltitudeChart(jet, routeTimes);
  renderRecentFlights(jet, { preserveScroll: true });
  syncSelectionDomState();
}

function airportCodes(airport) {
  return new Set([
    airport?.id,
    airport?.iata,
    airport?.icao,
    airport?.icaoCode,
    airport?.airportCode
  ].filter((value) => !missingValue(value)).map((value) => String(value).trim().toUpperCase()));
}

function jetMatchesAirport(jet, airport, direction) {
  const codes = airportCodes(airport);
  const candidates = direction === "arrivals"
    ? [jet.to, jet.arrivalAirport, jet.arrAirport, jet.arrIcaoCode]
    : direction === "departures"
      ? [jet.from, jet.departureAirport, jet.depAirport, jet.depIcaoCode]
      : [jet.groundAirport, jet.airportCode, jet.currentAirport, jet.from, jet.to];
  return candidates.some((value) => codes.has(String(value || "").trim().toUpperCase()));
}

function airportGroundPlanes(airport) {
  return airport?.apiGround?.groundPlanes
    || airport?.apiGround?.groundInfo?.groundPlanes
    || [];
}

function airportGroundModels(airport) {
  return airportGroundCompositionFromPlanes(airport, "model");
}

const airportGroundDurationLayers = Object.freeze([
  { key: "today", label: "今日入场", maxSeconds: 86400, tone: "mint" },
  { key: "week", label: "7 天内", maxSeconds: 604800, tone: "blue" },
  { key: "month", label: "30 天内", maxSeconds: 2592000, tone: "amber" },
  { key: "long", label: "30 天以上", maxSeconds: Infinity, tone: "slate" },
  { key: "unknown", label: "时长未知", maxSeconds: null, tone: "unknown" }
]);
const airportGroundDurationLayerByKey = new Map(airportGroundDurationLayers.map((layer) => [layer.key, layer]));
const airportOpsRangeLabels = Object.freeze({
  today: "今日",
  sevenDays: "7 天",
  thirtyDays: "30 天"
});
const airportStatsRangeAliases = Object.freeze({
  today: ["today", "day", "currentDay", "current", "24h", "oneDay"],
  sevenDays: ["sevenDays", "7d", "sevenDay", "week", "last7Days"],
  thirtyDays: ["thirtyDays", "30d", "thirtyDay", "month", "last30Days"]
});

function airportGroundLoadKey(airport) {
  const airportCode = airport?.airportCode || airport?.iata;
  return airportCode ? `airport:${airportCode}:ground` : "";
}

function airportGroundBrands(airport) {
  return airportGroundCompositionFromPlanes(airport, "brand");
}

function airportGroundPlaneIsInTransit(plane) {
  return plane.flightState === 30 || Number(plane?.flightState) === 30;
}

function groundTimeSeconds(plane) {
  const value = Number(plane?.groundTime);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function airportGroundDurationLayer(plane) {
  const seconds = groundTimeSeconds(plane);
  if (seconds === null) {
    return airportGroundDurationLayerByKey.get("unknown");
  }
  return airportGroundDurationLayers.find((layer) => layer.maxSeconds !== null && seconds < layer.maxSeconds)
    || airportGroundDurationLayerByKey.get("long");
}

function airportGroundDurationLabel(plane) {
  const seconds = groundTimeSeconds(plane);
  if (seconds === null) {
    return firstMatchedValue(plane?.groundTimeStr, "未知");
  }
  if (seconds < 86400) {
    return "今日入场";
  }
  if (seconds < 2592000) {
    return `停场 ${Math.max(1, Math.floor(seconds / 86400))} 天`;
  }
  if (seconds < 31536000) {
    return `停场 ${Math.max(1, Math.round(seconds / 2592000))} 个月`;
  }
  return `停场 ${Math.max(1, Math.round(seconds / 31536000))} 年`;
}

function groundPlaneDirectValue(...values) {
  return values
    .map((value) => String(value ?? "").trim())
    .find((value) => value && value !== NA_TEXT) || "";
}

function groundPlaneRegistrationState(plane = {}) {
  const display = groundPlaneDirectValue(plane.registrationClear, plane.tailNoClear, plane.registration, plane.tailNoDisplay);
  const masked = /[*＊•●·]{2,}/.test(display) || /X{3,}/i.test(display);
  if (!display) {
    return {
      state: "hidden",
      display: NA_TEXT,
      lookup: "",
      html: `<strong class="ground-registration is-hidden">${escapeHtml(NA_TEXT)}</strong>`
    };
  }
  if (masked) {
    return {
      state: "hidden",
      display: NA_TEXT,
      lookup: "",
      html: `<strong class="ground-registration is-hidden">${escapeHtml(NA_TEXT)}</strong>`
    };
  }
  return {
    state: "clear",
    display,
    lookup: display,
    html: `<strong class="ground-registration is-clear">${escapeHtml(display)}</strong>`
  };
}

function groundPlaneModelLabel(plane = {}) {
  const rawModel = groundPlaneDirectValue(plane.modelName, plane.modelNameEn, plane.modelCode);
  if (!rawModel) {
    return "未知机型";
  }
  const brand = groundPlaneDirectValue(plane.brandName, plane.brandNameEn);
  const prefixes = [
    brand,
    brand.replace(/(?:宇航|航空|飞机|公司)$/u, ""),
    "湾流宇航", "湾流", "Gulfstream",
    "庞巴迪", "Bombardier",
    "达索航空", "达索", "Dassault",
    "塞斯纳", "赛斯纳", "Cessna",
    "巴西航空工业", "巴航工业", "Embraer",
    "德事隆航空", "德事隆", "Textron",
    "空中客车", "空客", "Airbus",
    "波音", "Boeing"
  ].filter(Boolean).sort((a, b) => b.length - a.length);
  let model = rawModel.trim();
  for (const prefix of prefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const next = model.replace(new RegExp(`^${escaped}(?:\\s+|[-_/·]+)*`, "i"), "").trim();
    if (next && next !== model) {
      model = next;
      break;
    }
  }
  return model || rawModel;
}

function groundPlaneBrandLabel(plane = {}) {
  const direct = groundPlaneDirectValue(plane.brandName, plane.brandNameEn);
  if (direct) {
    return direct;
  }
  const model = groundPlaneDirectValue(plane.modelName, plane.modelNameEn, plane.modelCode);
  const patterns = [
    [/湾流|Gulfstream/i, "湾流宇航"],
    [/庞巴迪|Bombardier|环球|挑战者/i, "庞巴迪"],
    [/达索|Dassault|猎鹰/i, "达索"],
    [/塞斯纳|赛斯纳|Cessna|Citation/i, "赛斯纳"],
    [/巴航工业|Embraer|莱格赛|领航/i, "巴航工业"],
    [/德事隆|Textron|豪客|Hawker|Beechcraft/i, "德事隆航空"],
    [/空客|Airbus|ACJ/i, "空中客车"],
    [/波音|Boeing|BBJ/i, "波音"]
  ];
  return patterns.find(([pattern]) => pattern.test(model))?.[1] || "其他";
}

function airportGroundCompositionFromPlanes(airport, dimension) {
  const totals = new Map();
  airportGroundPlanes(airport)
    .filter((plane) => !airportGroundPlaneIsInTransit(plane))
    .forEach((plane) => {
      const brandName = groundPlaneBrandLabel(plane);
      const modelName = groundPlaneModelLabel(plane);
      const modelCode = groundPlaneDirectValue(plane.modelCode, plane.icaoCode);
      const key = dimension === "brand"
        ? normalizedLookupKey(brandName)
        : normalizedLookupKey(modelCode || `${brandName}|${modelName}`);
      const existing = totals.get(key) || {
        dimension,
        brandName,
        modelName: dimension === "brand" ? "" : modelName,
        modelCode,
        count: 0
      };
      existing.count += 1;
      totals.set(key, existing);
    });
  return Array.from(totals.values());
}

function groundPlaneOperatorMeta(plane = {}) {
  const trustee = firstMatchedValue(plane.trusteeship);
  const provider = firstMatchedValue(plane.serviceProvider);
  const items = [];
  if (trustee !== NA_TEXT) {
    items.push(trustee);
  }
  if (provider !== NA_TEXT && provider !== trustee) {
    items.push(provider);
  }
  return items.join(" · ") || NA_TEXT;
}

function groundPlaneSearchText(plane = {}) {
  return [
    plane.registration,
    plane.tailNoDisplay,
    plane.brandName,
    plane.modelName,
    plane.modelCode,
    plane.trusteeship,
    plane.serviceProvider
  ].filter((value) => !missingValue(value)).join(" ").toLowerCase();
}

function compareAirportText(a, b) {
  return String(a || "").localeCompare(String(b || ""), "zh-Hans", {
    numeric: true,
    sensitivity: "base"
  });
}

function sortedAirportGroundPlanes(planes) {
  const sort = state.airportGroundSort || "duration-asc";
  return [...planes].sort((a, b) => {
    if (sort === "duration-desc") {
      return (groundTimeSeconds(b) ?? -1) - (groundTimeSeconds(a) ?? -1);
    }
    if (sort === "model") {
      return compareAirportText(groundPlaneModelLabel(a), groundPlaneModelLabel(b))
        || ((groundTimeSeconds(a) ?? Number.POSITIVE_INFINITY) - (groundTimeSeconds(b) ?? Number.POSITIVE_INFINITY));
    }
    if (sort === "trustee") {
      return compareAirportText(firstMatchedValue(a.trusteeship, a.serviceProvider), firstMatchedValue(b.trusteeship, b.serviceProvider))
        || compareAirportText(groundPlaneModelLabel(a), groundPlaneModelLabel(b));
    }
    return (groundTimeSeconds(a) ?? Number.POSITIVE_INFINITY) - (groundTimeSeconds(b) ?? Number.POSITIVE_INFINITY);
  });
}

function airportGroundData(airport) {
  const planes = airportGroundPlanes(airport);
  const parked = planes.filter((plane) => !airportGroundPlaneIsInTransit(plane));
  const inTransit = planes.filter(airportGroundPlaneIsInTransit);
  const layerCounts = airportGroundDurationLayers.reduce((counts, layer) => {
    counts[layer.key] = 0;
    return counts;
  }, {});
  parked.forEach((plane) => {
    const layer = airportGroundDurationLayer(plane);
    layerCounts[layer.key] += 1;
  });
  const reportedTotal = airportReportedGroundCount(airport, parked.length);
  return {
    planes,
    parked,
    inTransit,
    layerCounts,
    reportedTotal,
    missingDetailCount: Math.max(0, reportedTotal - parked.length)
  };
}

function airportReportedGroundCount(airport, returnedCount = 0) {
  const candidates = [
    airport?.apiGround?.groundInfo?.groundNum,
    airport?.apiGround?.raw?.groundInfo?.groundNum,
    airport?.apiDetail?.groundInfo?.groundNum,
    airport?.ground
  ];
  const reported = candidates
    .map(Number)
    .find((value) => Number.isFinite(value) && value >= 0);
  return Math.max(returnedCount, reported ?? returnedCount);
}

function airportFilteredGroundPlanes(airport) {
  const data = airportGroundData(airport);
  const activeLayer = state.airportGroundFilter || "all";
  const query = String(state.airportGroundSearch || "").trim().toLowerCase();
  const filtered = data.parked.filter((plane) => {
    const layer = airportGroundDurationLayer(plane);
    if (activeLayer !== "all" && layer.key !== activeLayer) {
      return false;
    }
    if (query && !groundPlaneSearchText(plane).includes(query)) {
      return false;
    }
    return true;
  });
  return sortedAirportGroundPlanes(filtered);
}

function panelAircraftId(seed) {
  const normalized = normalizedLookupKey(seed).replace(/[^A-Z0-9_-]+/g, "");
  return `ground-${normalized || Date.now()}`;
}

function createPanelAircraftFromGroundPlane(airport, plane = {}) {
  const registrationState = groundPlaneRegistrationState(plane);
  const registration = registrationState.state === "clear" ? registrationState.display : "";
  const airportCode = firstMatchedValue(airport?.icaoCode, airport?.id, airport?.iata, airport?.airportCode);
  const livePosition = finiteNumber(airport?.lat) && finiteNumber(airport?.lng)
    ? [Number(airport.lat), Number(airport.lng)]
    : null;
  const id = panelAircraftId(firstMatchedValue(
    plane.tailNoEncrypted,
    registration,
    plane.modelName,
    airportCode
  ));
  const jet = state.aircraftPanelRecords.get(normalizedLookupKey(id)) || {
    id,
    uniqueKey: "",
    route: livePosition ? [livePosition] : [],
    trackRoute: null,
    livePosition,
    panelOnly: true,
    dataCategory: "business_jet",
    source: "513014 ground aircraft"
  };
  Object.assign(jet, {
    tailNoEncrypted: plane.tailNoEncrypted || jet.tailNoEncrypted || "",
    tailNoClear: registration,
    registration,
    callsign: firstMatchedValue(plane.callsign, registration),
    model: firstMatchedValue(plane.modelName, jet.model),
    modelName: firstMatchedValue(plane.modelName, jet.modelName),
    aircraftTypeCode: firstMatchedValue(plane.modelCode, plane.icaoCode, jet.aircraftTypeCode),
    icaoCode: firstMatchedValue(plane.modelCode, plane.icaoCode, jet.icaoCode),
    family: firstMatchedValue(plane.brandName, plane.modelName, jet.family),
    operator: firstMatchedValue(plane.serviceProvider, plane.trusteeship, jet.operator),
    companyLogo: firstMatchedValue(plane.companyLogo, jet.companyLogo),
    category: jet.category || "midsize",
    sizeClass: jet.sizeClass || "midsize",
    from: NA_TEXT,
    to: NA_TEXT,
    altitude: null,
    speed: null,
    verticalSpeed: null,
    heading: null,
    progress: 0,
    onGround: true,
    groundAirport: airportCode === NA_TEXT ? "" : airportCode,
    status: plane.flightState === 30 ? "即将入场" : firstMatchedValue(plane.groundTimeStr, "停场"),
    quality: "ground-profile",
    updatedAtEpochMs: Date.now(),
    positionTimestamp: Date.now(),
    viewportTtlMs: mapLoadingConfig.aircraftRefresh.interpolationMs,
    rawGroundPlane: plane
  });
  applyCachedAircraftProfile(jet);
  applyAircraftTypeMetadata(jet);
  cacheAircraftPanelRecord(jet);
  return jet;
}

function selectGroundPlaneFromAirport(airport, plane = {}) {
  const tail = normalizedLookupKey(plane.tailNoEncrypted);
  const registration = normalizedLookupKey(firstMatchedValue(plane.registration, plane.tailNoDisplay));
  const liveJet = aircraftByEncryptedTail.get(tail) || aircraftByRegistration.get(registration);
  if (liveJet) {
    selectAircraft(liveJet.id);
    return;
  }
  const jet = createPanelAircraftFromGroundPlane(airport, plane);
  if (state.selectedKind === "aircraft" && state.selectedId) {
    rememberRecentlySelectedAircraft(state.selectedId);
  }
  clearRouteFocus({ restore: false });
  state.selectedTrackStore = null;
  state.followSelectedAircraft = false;
  state.hideOtherAircraft = false;
  state.lastTargetSelectAt = performance.now();
  state.selectedKind = "aircraft";
  state.selectedId = jet.id;
  state.hoveredAirportId = null;
  state.aircraftSegmentById.set(jet.id, "airframe");
  refreshSelectedRouteEndpointCache(null);
  loadAircraftDetails(jet);
  openAircraftView("airframe");
  updateFollowButton();
  renderAircraftDetailPanel(jet);
  syncAirportHoverMarkers("");
  renderViewport();
  maybeLoadApiDebugSelectionDetails();
  renderApiDebugConsole();
  scheduleNextRealtimeRefresh();
}

function renderGroundPlaneRows(airport, planes) {
  return planes.map((plane) => {
    const registration = groundPlaneRegistrationState(plane);
    const layer = airportGroundDurationLayer(plane);
    const isInTransit = airportGroundPlaneIsInTransit(plane);
    const modelLabel = groundPlaneModelLabel(plane);
    const operatorMeta = groundPlaneOperatorMeta(plane);
    const stateText = isInTransit ? "即将入场" : airportGroundDurationLabel(plane);
    const airbusRemark = firstMatchedValue(plane.airbusRemark, plane.raw?.airbusRemark);
    const primaryHtml = registration.html;
    return `
      <button type="button" class="related-flight ground-plane-row ground-plane-row-v120" data-layer="${escapeHtml(layer.key)}" data-registration-state="${escapeHtml(registration.state)}" data-tail="${escapeHtml(plane.tailNoEncrypted || "")}" data-registration="${escapeHtml(registration.lookup)}">
        <span class="ground-row-color" aria-hidden="true"></span>
        <span class="ground-row-main">
          <span class="ground-row-title">${primaryHtml}${isInTransit ? `<em class="ground-live-badge">即将入场</em>` : ""}</span>
          <small>${escapeHtml(modelLabel)}</small>
          <small>${escapeHtml(operatorMeta)}</small>
          ${airbusRemark !== NA_TEXT ? `<small class="ground-row-remark">${escapeHtml(airbusRemark)}</small>` : ""}
        </span>
        <span class="related-flight-meta ground-row-meta">
          <strong>${escapeHtml(stateText)}</strong>
        </span>
      </button>`;
  }).join("");
}

function renderAirportTabList(airport) {
  const list = document.getElementById("airportRelatedFlights");
  if (!list) {
    return;
  }
  const planes = airportGroundPlanes(airport);
  const filtered = airportFilteredGroundPlanes(airport);
  if (filtered.length) {
    list.innerHTML = renderGroundPlaneRows(airport, filtered);
    list.querySelectorAll(".ground-plane-row").forEach((button) => {
      button.addEventListener("click", () => {
        const tail = normalizedLookupKey(button.dataset.tail);
        const registration = normalizedLookupKey(button.dataset.registration);
        const plane = planes.find((item) => normalizedLookupKey(item.tailNoEncrypted) === tail
          || normalizedLookupKey(item.registration) === registration
          || normalizedLookupKey(item.tailNoDisplay) === registration);
        selectGroundPlaneFromAirport(airport, plane || {
          tailNoEncrypted: button.dataset.tail,
          registration: button.dataset.registration
        });
      });
    });
    return;
  }
  if (state.detailLoads.has(airportGroundLoadKey(airport))) {
    list.innerHTML = `<p class="empty-related">停场飞机加载中...</p>`;
  } else if (airport.airportGroundError) {
    list.innerHTML = `<p class="empty-related">停场飞机暂时无法加载</p>`;
  } else if (airportGroundPlanes(airport).length) {
    list.innerHTML = `<p class="empty-related">当前筛选下没有停场飞机</p>`;
  } else {
    list.innerHTML = `<p class="empty-related">该机场暂无停场公务机记录</p>`;
  }
}

function renderAirportGroundLayerBar(airport, data) {
  const container = document.getElementById("airportGroundLayerBar");
  if (!container) {
    return;
  }
  const total = Math.max(data.reportedTotal, 1);
  const allActive = (state.airportGroundFilter || "all") === "all";
  const allPercent = data.reportedTotal ? 100 : 0;
  container.innerHTML = `
    <button type="button" class="${allActive ? "active" : ""}" data-airport-ground-filter="all" aria-pressed="${allActive ? "true" : "false"}">
      <span><strong>${escapeHtml(formatNumber(data.reportedTotal))} 架</strong><small>全部停场</small></span>
      <em style="--share:${allPercent}%"></em>
    </button>
    ${airportGroundDurationLayers.map((layer) => {
      const count = data.layerCounts[layer.key] || 0;
      const active = state.airportGroundFilter === layer.key;
      const share = Math.max(0, Math.min(100, (count / total) * 100));
      return `
        <button type="button" class="${active ? "active" : ""}" data-tone="${escapeHtml(layer.tone)}" data-airport-ground-filter="${escapeHtml(layer.key)}" aria-pressed="${active ? "true" : "false"}">
          <span><strong>${escapeHtml(formatNumber(count))} 架</strong><small>${escapeHtml(layer.label)}</small></span>
          <em style="--share:${share}%"></em>
        </button>`;
    }).join("")}`;
}

function renderAirportGroundInTransit(airport, data) {
  const container = document.getElementById("airportGroundInTransit");
  if (!container) {
    return;
  }
  if (!data.inTransit.length) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.innerHTML = `
    <header>
      <strong>即将入场 ${escapeHtml(formatNumber(data.inTransit.length))} 架</strong>
      <span>预计抵达本场</span>
    </header>
    <div class="airport-ground-intransit-rows">${renderGroundPlaneRows(airport, data.inTransit)}</div>`;
  container.querySelectorAll(".ground-plane-row").forEach((button) => {
    button.addEventListener("click", () => {
      const tail = normalizedLookupKey(button.dataset.tail);
      const registration = normalizedLookupKey(button.dataset.registration);
      const plane = data.inTransit.find((item) => normalizedLookupKey(item.tailNoEncrypted) === tail
        || normalizedLookupKey(item.registration) === registration
        || normalizedLookupKey(item.tailNoDisplay) === registration);
      selectGroundPlaneFromAirport(airport, plane || {
        tailNoEncrypted: button.dataset.tail,
        registration: button.dataset.registration
      });
    });
  });
}

function compositionEntryName(item) {
  if (item.dimension === "brand") {
    return firstMatchedValue(item.brandName, item.name, "未知");
  }
  return firstMatchedValue(item.modelName, item.brandName, item.name, item.modelCode, item.brandCode, "未知");
}

function compositionEntryCount(item) {
  const value = Number(firstMatchedValue(item.count, item.groundNum, item.num, item.value, 0));
  return Number.isFinite(value) ? value : 0;
}

function renderCompositionRows(items, emptyText) {
  if (!items.length) {
    return `<p class="empty-related">${escapeHtml(emptyText)}</p>`;
  }
  const top = [...items]
    .map((item) => ({ item, count: compositionEntryCount(item), name: compositionEntryName(item) }))
    .filter((entry) => entry.count > 0 || entry.name !== NA_TEXT)
    .sort((a, b) => b.count - a.count || compareAirportText(a.name, b.name))
    .slice(0, 10);
  const max = Math.max(...top.map((entry) => entry.count), 1);
  return top.map((entry) => `
    <div class="airport-composition-row">
      <span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.item.dimension === "brand" ? "" : firstMatchedValue(entry.item.brandName, entry.item.modelCode, ""))}</small></span>
      <em style="--share:${Math.max(5, (entry.count / max) * 100)}%"></em>
      <b>${escapeHtml(formatNumber(entry.count))}</b>
    </div>`).join("");
}

function renderAirportGroundComposition(airport) {
  const container = document.getElementById("airportGroundComposition");
  const list = document.getElementById("airportRelatedFlights");
  if (!container || !list) {
    return;
  }
  const view = state.airportGroundView || "list";
  const showComposition = view !== "list";
  container.hidden = !showComposition;
  list.hidden = showComposition;
  if (!showComposition) {
    container.innerHTML = "";
    return;
  }
  const items = view === "brand" ? airportGroundBrands(airport) : airportGroundModels(airport);
  container.innerHTML = renderCompositionRows(
    items,
    view === "brand" ? "暂无品牌构成数据" : "暂无机型构成数据"
  );
}

function syncAirportGroundControls() {
  const search = document.getElementById("airportGroundSearch");
  const sort = document.getElementById("airportGroundSort");
  if (search && search.value !== state.airportGroundSearch) {
    search.value = state.airportGroundSearch || "";
  }
  if (sort && sort.value !== state.airportGroundSort) {
    sort.value = state.airportGroundSort || "duration-asc";
  }
  document.querySelectorAll("[data-airport-ground-view]").forEach((button) => {
    const active = button.dataset.airportGroundView === (state.airportGroundView || "list");
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderAirportGroundPanel(airport) {
  syncAirportGroundControls();
  const data = airportGroundData(airport);
  setText("airportGround", `${formatNumber(data.reportedTotal)} 架`);
  renderAirportGroundLayerBar(airport, data);
  renderAirportGroundInTransit(airport, data);
  renderAirportGroundComposition(airport);
  renderAirportTabList(airport);
  const unavailable = document.getElementById("airportGroundUnavailable");
  if (unavailable) {
    unavailable.hidden = data.missingDetailCount === 0;
    unavailable.innerHTML = data.missingDetailCount
      ? `<strong>另有 ${escapeHtml(formatNumber(data.missingDetailCount))} 架停场飞机</strong><span>513014 当前未返回注册号、机型及停场时间明细</span>`
      : "";
  }
  renderAirportGroundModels(airport);
}

function formatAirportLocalTime(airport) {
  const info = airport.apiDetail?.airportInfo || {};
  const zone = firstMatchedValue(info.zoneId, airport.zoneId, info.timeZone, airport.timeZone);
  if (zone === NA_TEXT) {
    return NA_TEXT;
  }
  const nowEpochMs = parsePanelEpoch(info.serverNowEpochMs || airport.serverNowEpochMs || airport.apiDetail?.updates?.serverNowEpochMs) || Date.now();
  if (timeUtils.nowInZone) {
    return timeUtils.nowInZone({ timeZone: zone, nowEpochMs });
  }
  return formatUtcTime(nowEpochMs);
}

function formatAirportTimeZone(airport) {
  const info = mergePresentFields(
    airport.apiDetail?.airportInfo,
    airport.apiDynamic?.airportInfo,
    airport.apiGround?.airportInfo
  );
  const zone = firstMatchedValue(info.zoneId, airport.zoneId, info.timeZone, airport.timeZone);
  if (zone === NA_TEXT) {
    return NA_TEXT;
  }
  const nowEpochMs = parsePanelEpoch(info.serverNowEpochMs || airport.serverNowEpochMs) || Date.now();
  return utcStandardOffsetLabelForZone(zone, nowEpochMs);
}

function formatAirportEventTime(airport, value, options = {}) {
  if (missingValue(value)) {
    return NA_TEXT;
  }
  const info = airport.apiDetail?.airportInfo || {};
  const zone = firstMatchedValue(info.zoneId, airport.zoneId, info.timeZone, airport.timeZone);
  return formatPanelTime(value, {
    date: options.date !== false,
    seconds: options.seconds,
    timeZone: zone === NA_TEXT ? "UTC" : zone,
    includeZone: true,
    includeUnknownLabel: true
  });
}

function renderAirportGroundModels(airport) {
  const section = document.getElementById("airportGroundModelsSection");
  const container = document.getElementById("airportGroundModels");
  if (!section || !container) {
    return;
  }
  if (document.getElementById("airportDetailView")?.classList.contains("airport-detail-v120")) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }
  const models = airportGroundModels(airport);
  section.hidden = !models.length;
  if (!models.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = models.slice(0, 8).map((model) => `
    <span class="airport-model-chip">
      <strong>${escapeHtml(displayOrDash(firstMatchedValue(model.modelName, model.modelCode)))}</strong>
      <small>${escapeHtml(firstMatchedValue(model.brandName, model.modelCode))}</small>
      <em>${escapeHtml(formatNumber(Number(model.count || 0)))}</em>
    </span>
  `).join("");
}

function renderAirportNoticeList(id, items, options = {}) {
  const container = document.getElementById(id);
  if (!container) {
    return;
  }
  const list = Array.isArray(items) ? [...items] : [];
  if (!list.length) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }
  container.hidden = false;
  if (options.dateAirport) {
    list.sort((a, b) => (parsePanelEpoch(b.sendDate) || 0) - (parsePanelEpoch(a.sendDate) || 0));
  }
  container.innerHTML = list.slice(0, options.limit || 3).map((item) => {
    const title = firstMatchedValue(item.title, item.label, item.weather, options.fallbackTitle, "提示");
    const content = firstMatchedValue(item.content, item.contentHtml, item.subtitle, item.sendDate);
    const date = options.dateAirport ? formatAirportEventTime(options.dateAirport, item.sendDate, { date: true }) : "";
    return `
      <div class="airport-notice-item">
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(content)}</small>
        ${date && date !== NA_TEXT ? `<em>${escapeHtml(date)}</em>` : ""}
      </div>`;
  }).join("");
}

function airportBoardDate(airport) {
  return firstMatchedValue(airport?.apiDynamic?.date, airport?.apiDetail?.date, "");
}

function parseAirportBoardClock(airport, value) {
  const epoch = parsePanelEpoch(value);
  if (epoch !== null) {
    return epoch;
  }
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  const date = airportBoardDate(airport);
  if (!match || missingValue(date)) {
    return null;
  }
  const parsed = Date.parse(`${date}T${String(match[1]).padStart(2, "0")}:${match[2]}:00+08:00`);
  return Number.isFinite(parsed) ? parsed : null;
}

function airportBoardTimeLabel(airport, value) {
  const epoch = parseAirportBoardClock(airport, value);
  if (epoch === null) {
    return firstMatchedValue(value, "--:--");
  }
  const info = airport.apiDetail?.airportInfo || airport.apiDynamic?.airportInfo || {};
  const zone = firstMatchedValue(info.zoneId, airport.zoneId, info.timeZone, airport.timeZone);
  return formatPanelTime(epoch, {
    date: false,
    timeZone: zone === NA_TEXT ? "UTC" : zone,
    includeZone: false
  });
}

function airportBoardSortEpoch(airport, jet) {
  const detail = jet.flightDetail || {};
  const base = detail.flightBaseInfo || {};
  return parseAirportBoardClock(airport, firstMatchedValue(
    detail.timeRefs?.actualDeparture,
    base.depActualEpochMs,
    base.depTime1EpochMs,
    base.depTime1,
    jet.depart,
    jet.updatedAtEpochMs
  )) || 0;
}

function airportDirectionForJet(jet, airport) {
  const inbound = jetMatchesAirport(jet, airport, "arrivals");
  const outbound = jetMatchesAirport(jet, airport, "departures");
  if (outbound && !inbound) {
    return "departures";
  }
  if (inbound && !outbound) {
    return "arrivals";
  }
  return outbound ? "departures" : inbound ? "arrivals" : "";
}

function airportBoardStatus(record = {}) {
  const text = String(firstMatchedValue(
    record.status,
    record.flightStateStr,
    record.flightStatus,
    record.jet?.status,
    record.jet?.flightDetail?.flightBaseInfo?.flightStateStr,
    ""
  )).trim();
  const lower = text.toLowerCase();
  if (/取消|cancel/.test(text) || lower.includes("cancel")) {
    return { key: "cancelled", label: "取消" };
  }
  if (/延误|delay/.test(text) || lower.includes("delay")) {
    return { key: "delayed", label: "延误" };
  }
  if (/到达|落地|land|arriv/.test(text) || record.onGround || record.jet?.onGround) {
    return { key: "landed", label: "到达" };
  }
  if (/计划|sched|pending/.test(text)) {
    return { key: "scheduled", label: "计划" };
  }
  return { key: "live", label: "在途" };
}

const airportMovementDiscoveryConfig = Object.freeze({
  radiusNm: 2500,
  nearbyCandidates: 16,
  outboundCandidates: 16,
  globalCandidates: 4,
  maxCandidates: 36,
  concurrency: 4,
  refreshMs: 300000
});

const airportMovementHistoryConfig = Object.freeze({
  rangeDays: 7,
  pageSize: 30,
  maxCandidates: 12,
  concurrency: 3,
  refreshMs: 300000,
  maxArrivalDeltaMs: 3 * 24 * 60 * 60 * 1000
});

function airportMovementBearingDegrees(start, end) {
  const lat1 = Number(start.lat) * Math.PI / 180;
  const lat2 = Number(end.lat) * Math.PI / 180;
  const deltaLng = (Number(end.lng) - Number(start.lng)) * Math.PI / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function airportMovementHeadingDelta(a, b) {
  if (!Number.isFinite(Number(a)) || !Number.isFinite(Number(b))) {
    return 180;
  }
  const difference = Math.abs(((Number(a) - Number(b) + 540) % 360) - 180);
  return Number.isFinite(difference) ? difference : 180;
}

function airportMovementAirportFromHistory(item, side, zone = "") {
  const display = historyAirportDisplay(item, side);
  return {
    name: display.name,
    iata: display.iata,
    icao: display.icao,
    codes: display.codes,
    zone
  };
}

function airportMovementAirportFromRouteSide(side = {}) {
  const name = firstMatchedValue(side.nameCn, side.name, side.nameEn, "未知机场");
  const codes = [side.iata, side.icao]
    .filter((value, index, list) => value && value !== NA_TEXT && list.indexOf(value) === index)
    .join(" / ");
  return {
    name,
    iata: firstMatchedValue(side.iata),
    icao: firstMatchedValue(side.icao),
    codes: codes || firstMatchedValue(side.code),
    zone: firstMatchedValue(side.zone, "")
  };
}

function airportMovementModelLabel(source = {}) {
  const modelSource = {
    brandName: firstMatchedValue(source.brandName, source.manufacturer, ""),
    brandNameEn: firstMatchedValue(source.brandNameEn, ""),
    modelName: firstMatchedValue(source.modelName, source.model, source.family, ""),
    modelNameEn: firstMatchedValue(source.modelNameEn, ""),
    modelCode: firstMatchedValue(source.modelCode, source.aircraftTypeCode, source.icaoCode, "")
  };
  const model = groundPlaneDirectValue(modelSource.modelName, modelSource.modelNameEn, modelSource.modelCode);
  if (!model) {
    return "未知机型";
  }
  const brand = groundPlaneDirectValue(modelSource.brandName, modelSource.brandNameEn);
  if (!brand || groundPlaneModelLabel(modelSource) !== model) {
    return model;
  }
  return `${brand} ${model}`;
}

function airportMovementArrivalRef(jet, arrivalSide) {
  const detail = jet?.flightDetail || {};
  const base = detail.flightBaseInfo || {};
  const adaptedActual = detail.timeRefs?.actualArrival;
  const explicit = firstMatchedValue(
    adaptedActual?.epochMs ? adaptedActual : "",
    base.arrActualEpochMs,
    base.actualArrivalEpochMs,
    base.arrActualTime,
    ""
  );
  const operational = firstMatchedValue(base.arrTime1EpochMs, base.arrTime1, jet?.arrive, "");
  return makePanelTimeRef(firstMatchedValue(explicit, operational, ""), {
    timeZone: arrivalSide.zone,
    sourceField: explicit ? "flightBaseInfo.arrActualEpochMs" : "flightBaseInfo.arrTime1",
    semantic: explicit ? "actual_arrival" : "operational_arrival"
  });
}

function airportMovementArraySources(dynamic = {}) {
  const sources = [];
  const seen = new Set();
  const add = (owner, keys, direction = "") => {
    if (!owner || typeof owner !== "object") {
      return;
    }
    keys.forEach((key) => {
      const value = owner[key];
      if (!Array.isArray(value) || seen.has(value)) {
        return;
      }
      seen.add(value);
      sources.push({ rows: value, direction });
    });
  };
  const owners = [dynamic, dynamic.raw, dynamic.flightsInfo, dynamic.raw?.flightsInfo];
  owners.forEach((owner) => {
    add(owner, ["flights", "flightList", "flightsList", "movements", "movementList", "records", "rows", "list"]);
    add(owner, ["arrivals", "arrivalFlights", "inbound", "inboundFlights", "inboundList"], "arrivals");
    add(owner, ["departures", "departureFlights", "outbound", "outboundFlights", "outboundList"], "departures");
  });
  if (Array.isArray(dynamic.raw?.data) && !seen.has(dynamic.raw.data)) {
    sources.push({ rows: dynamic.raw.data, direction: "" });
  }
  return sources;
}

function airportMovementDirection(record, airport, hint = "") {
  if (hint === "arrivals" || hint === "departures") {
    return hint;
  }
  const directionText = String(firstMatchedValue(record.direction, record.flightDirection, record.inOut, "")).toLowerCase();
  if (/arrival|inbound|进港|到达/.test(directionText)) {
    return "arrivals";
  }
  if (/departure|outbound|出港|离港/.test(directionText)) {
    return "departures";
  }
  const codes = airportCodes(airport);
  const fromCode = normalizeAirportCodeText(firstMatchedValue(
    record.depAirport,
    record.depAirportCode,
    record.departureAirport,
    record.departureAirportCode,
    record.from,
    record.depIcaoCode
  ));
  const toCode = normalizeAirportCodeText(firstMatchedValue(
    record.arrAirport,
    record.arrAirportCode,
    record.arrivalAirport,
    record.arrivalAirportCode,
    record.to,
    record.arrIcaoCode
  ));
  if (toCode && codes.has(toCode) && (!fromCode || !codes.has(fromCode))) {
    return "arrivals";
  }
  if (fromCode && codes.has(fromCode)) {
    return "departures";
  }
  return "";
}

function airportMovementLiveJet(record = {}) {
  const lookupValues = [
    record.uniqueKey,
    record.flightUniqueKey,
    record.tailNo,
    record.tailNoClear,
    record.registrationClear,
    record.registration,
    record.tailNoDisplay
  ];
  for (const value of lookupValues) {
    const key = normalizedLookupKey(value);
    if (!key) {
      continue;
    }
    const jet = aircraftByUniqueKey.get(key)
      || aircraftByEncryptedTail.get(key)
      || aircraftByRegistration.get(key);
    if (jet) {
      return jet;
    }
  }
  return null;
}

function airportMovementRegistration(record = {}) {
  return groundPlaneRegistrationState({
    registrationClear: record.registrationClear,
    tailNoClear: record.tailNoClear,
    registration: record.registration,
    tailNoDisplay: record.tailNoDisplay
  }).display;
}

function airportMovementDateTime(date, time) {
  const dateText = missingValue(date) ? "" : String(date).trim();
  const timeText = missingValue(time) ? "" : String(time).trim();
  return dateText && timeText ? `${dateText} ${timeText}` : timeText || dateText;
}

function normalizeAirportMovementRecord(airport, record = {}, directionHint = "", index = 0) {
  if (!record || typeof record !== "object") {
    return null;
  }
  const direction = airportMovementDirection(record, airport, directionHint);
  if (!direction) {
    return null;
  }
  const jet = airportMovementLiveJet(record);
  const fromCode = normalizeAirportCodeText(firstMatchedValue(record.depAirport, record.depAirportCode, record.departureAirport, record.from, record.depIcaoCode)) || NA_TEXT;
  const toCode = normalizeAirportCodeText(firstMatchedValue(record.arrAirport, record.arrAirportCode, record.arrivalAirport, record.to, record.arrIcaoCode)) || NA_TEXT;
  const registration = airportMovementRegistration(record);
  const departure = firstMatchedValue(record.depActualEpochMs, record.actualDepartureEpochMs, record.depTime1, record.depActualTime, record.departureTime, record.depTime, record.depart);
  const status = airportBoardStatus(record);
  const arrival = firstMatchedValue(
    record.arrActualEpochMs,
    record.actualArrivalEpochMs,
    record.arrActualTime,
    record.arrTime1,
    record.arrivalTime,
    record.arrTime,
    record.arrive
  );
  const directionLabel = direction === "arrivals" ? "进港" : "出港";
  const otherCode = direction === "arrivals" ? fromCode : toCode;
  const departureAirport = airportMovementAirportFromHistory({
    depAirport: fromCode,
    depIata: record.depIata,
    depIcao: firstMatchedValue(record.depIcao, record.depIcaoCode),
    depAirportName: firstMatchedValue(record.depAirportName, record.departureAirportName)
  }, "dep", firstMatchedValue(record.depZoneId, record.depTimeZone, ""));
  const arrivalAirport = airportMovementAirportFromHistory({
    arrAirport: toCode,
    arrIata: record.arrIata,
    arrIcao: firstMatchedValue(record.arrIcao, record.arrIcaoCode),
    arrAirportName: firstMatchedValue(record.arrAirportName, record.arrivalAirportName)
  }, "arr", firstMatchedValue(record.arrZoneId, record.arrTimeZone, ""));
  return {
    source: "dynamic",
    jet,
    plane: null,
    direction,
    directionLabel,
    fromCode,
    toCode,
    otherCode,
    callsign: firstMatchedValue(record.callSign, record.callsign, record.flightNo, registration),
    registration,
    model: airportMovementModelLabel(record),
    departureAirport,
    arrivalAirport,
    departure,
    arrival,
    actualDepartureRef: makePanelTimeRef(departure, {
      timeZone: departureAirport.zone,
      sourceField: "movement.depActual",
      semantic: "actual_departure"
    }),
    actualArrivalRef: makePanelTimeRef(arrival, {
      timeZone: arrivalAirport.zone,
      sourceField: "movement.arrActual",
      semantic: "actual_arrival"
    }),
    status,
    sortEpoch: parseAirportBoardClock(airport, firstMatchedValue(departure, arrival)) || 0,
    identity: normalizedLookupKey(firstMatchedValue(record.uniqueKey, record.flightUniqueKey, record.flightId, `${direction}-${fromCode}-${toCode}-${departure}-${index}`))
  };
}

function airportDynamicInterfaceItems(airport) {
  const dynamic = airport?.apiDynamic || {};
  return airportMovementArraySources(dynamic).flatMap((source) => source.rows
    .map((record, index) => normalizeAirportMovementRecord(airport, record, source.direction, index))
    .filter(Boolean));
}

function airportLiveMovementItems(airport) {
  return businessJets.map((jet) => {
    const direction = airportDirectionForJet(jet, airport);
    if (!direction) {
      return null;
    }
    const fromCode = normalizeAirportCodeText(firstMatchedValue(jet.from, jet.depAirportCode)) || NA_TEXT;
    const toCode = normalizeAirportCodeText(firstMatchedValue(jet.to, jet.arrAirportCode)) || NA_TEXT;
    const departureSide = selectedRouteSide(jet, "dep");
    const arrivalSide = selectedRouteSide(jet, "arr");
    const departureAirport = airportMovementAirportFromRouteSide(departureSide);
    const arrivalAirport = airportMovementAirportFromRouteSide(arrivalSide);
    const detail = jet.flightDetail || {};
    const base = detail.flightBaseInfo || {};
    const plane = detail.planeInfo || {};
    const status = airportBoardStatus(jet);
    const actualDepartureRef = makePanelTimeRef(firstMatchedValue(
      detail.timeRefs?.actualDeparture,
      base.depActualEpochMs,
      base.depTime1EpochMs,
      base.depTime1,
      jet.depart,
      ""
    ), {
      timeZone: departureAirport.zone,
      sourceField: "flightBaseInfo.depTime1",
      semantic: "actual_departure"
    });
    const actualArrivalRef = airportMovementArrivalRef(jet, arrivalAirport);
    const registration = firstMatchedValue(
      jet.registration,
      jet.tailNoClear,
      plane.tailNoClear,
      plane.registrationClear,
      plane.tailNoDisplay,
      aircraftCallsignLabel(jet, "")
    );
    return {
      source: "live",
      jet,
      plane: null,
      direction,
      directionLabel: direction === "arrivals" ? "进港" : "出港",
      fromCode,
      toCode,
      otherCode: direction === "arrivals" ? fromCode : toCode,
      callsign: registration,
      registration,
      model: airportMovementModelLabel({ ...jet, ...plane }),
      departureAirport,
      arrivalAirport,
      departure: actualDepartureRef,
      arrival: actualArrivalRef,
      actualDepartureRef,
      actualArrivalRef,
      status,
      sortEpoch: airportBoardSortEpoch(airport, jet),
      identity: normalizedLookupKey(firstMatchedValue(jet.uniqueKey, jet.id))
    };
  }).filter(Boolean);
}

function airportBoardLocalDate(airport) {
  const provided = String(airportBoardDate(airport) || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(provided)) {
    return provided;
  }
  const info = mergePresentFields(airport?.apiDetail?.airportInfo, airport?.apiDynamic?.airportInfo, airport?.apiGround?.airportInfo);
  const zone = firstMatchedValue(info.zoneId, airport?.zoneId, info.timeZone, airport?.timeZone, "UTC");
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone === NA_TEXT ? "UTC" : zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch (_error) {
    return new Date().toISOString().slice(0, 10);
  }
}

function airportMovementHomeAirport(airport) {
  const info = mergePresentFields(airport?.apiDetail?.airportInfo, airport?.apiDynamic?.airportInfo, airport?.apiGround?.airportInfo);
  const iata = firstAirportCodeByLength(3, info.airportCode, airport?.iata, airport?.airportCode, airport?.id);
  const icao = firstAirportCodeByLength(4, info.icaoCode, airport?.icaoCode, airport?.icao, airport?.id);
  return {
    name: firstMatchedValue(info.airportName, info.airportFourName, airport?.nameCn, airport?.nameZh, airportDisplayName(airport)),
    iata,
    icao,
    codes: [iata, icao].filter((value, index, list) => value !== NA_TEXT && list.indexOf(value) === index).join(" / ") || NA_TEXT,
    zone: firstMatchedValue(info.zoneId, airport?.zoneId, info.timeZone, airport?.timeZone, "")
  };
}

function airportGroundPlaneIsCurrentMovement(airport, plane) {
  const arrivalDate = String(plane?.arrDate || "").trim().slice(0, 10);
  return airportGroundPlaneIsInTransit(plane) || arrivalDate === airportBoardLocalDate(airport);
}

function airportMovementPlaneHistoryKey(plane) {
  return normalizedLookupKey(groundPlaneDirectValue(
    plane?.tailNoEncrypted,
    plane?.tailNoClear,
    plane?.registrationClear,
    plane?.registration,
    plane?.tailNoDisplay,
    plane?.traceId
  ));
}

function airportMovementHistoryRequestTailNo(plane) {
  return groundPlaneDirectValue(
    plane?.tailNoEncrypted,
    plane?.tailNoClear,
    plane?.registrationClear,
    plane?.registration
  );
}

function airportMovementPlaneNeedsHistory(plane) {
  const departure = airportMovementAirportFromHistory({
    depAirport: plane?.depAirport,
    depIata: plane?.depIata,
    depIcao: plane?.depIcao,
    depAirportName: plane?.depAirportName
  }, "dep", firstMatchedValue(plane?.depZoneId, plane?.depTimeZone, ""));
  return departure.missing || missingValue(departure.name) || missingValue(departure.codes);
}

function airportMovementHistoryArrivesAt(flight, airport) {
  const selectedCodes = airportCodes(airport);
  return [flight?.arrAirport, flight?.arrIata, flight?.arrIcao]
    .map(normalizeAirportCodeText)
    .some((code) => code && selectedCodes.has(code));
}

function airportMovementHistoryArrivalEpoch(flight) {
  return Number(firstMatchedValue(
    flight?.times?.actualArrival?.epochMs,
    flight?.arrTimeRef?.epochMs,
    flight?.arrActualEpochMs,
    ""
  ));
}

function airportMovementHistoryMatch(airport, plane, detail) {
  const flights = Array.isArray(detail?.flights) ? detail.flights : [];
  const arrivals = flights.filter((flight) => airportMovementHistoryArrivesAt(flight, airport));
  if (!arrivals.length) {
    return null;
  }
  const traceKey = normalizedLookupKey(plane?.traceId);
  const exact = traceKey ? arrivals.find((flight) => [flight.uniqueKey, flight.flightId, flight.id]
    .map(normalizedLookupKey)
    .includes(traceKey)) : null;
  if (exact) {
    return exact;
  }
  const homeAirport = airportMovementHomeAirport(airport);
  const expectedArrival = makePanelTimeRef(airportMovementDateTime(plane?.arrDate, plane?.arrTime), {
    timeZone: homeAirport.zone,
    semantic: "ground_arrival"
  }).epochMs;
  const inTransit = airportGroundPlaneIsInTransit(plane);
  const ranked = arrivals.map((flight) => {
    const arrivalEpoch = airportMovementHistoryArrivalEpoch(flight);
    return {
      flight,
      statePenalty: inTransit ? (Number(flight.flightState) === 30 ? 0 : 1) : (Number(flight.flightState) === 40 ? 0 : 1),
      arrivalDelta: Number.isFinite(expectedArrival) && Number.isFinite(arrivalEpoch)
        ? Math.abs(arrivalEpoch - expectedArrival)
        : Number.POSITIVE_INFINITY,
      sortEpoch: Number.isFinite(arrivalEpoch) ? arrivalEpoch : historyComparableEpoch(flight)
    };
  }).sort((a, b) => (
    a.statePenalty - b.statePenalty
    || a.arrivalDelta - b.arrivalDelta
    || b.sortEpoch - a.sortEpoch
  ));
  const best = ranked[0];
  if (!inTransit
    && Number.isFinite(expectedArrival)
    && Number.isFinite(best.arrivalDelta)
    && best.arrivalDelta > airportMovementHistoryConfig.maxArrivalDeltaMs) {
    return null;
  }
  return best.flight;
}

function airportMovementHistoryCandidates(airport) {
  return airportGroundPlanes(airport)
    .filter((plane) => airportGroundPlaneIsCurrentMovement(airport, plane))
    .filter((plane) => airportMovementPlaneNeedsHistory(plane))
    .filter((plane) => airportMovementHistoryRequestTailNo(plane))
    .slice(0, airportMovementHistoryConfig.maxCandidates);
}

function applyAirportMovementHistoryMatches(candidates, matches) {
  candidates.forEach((plane) => {
    const match = matches?.get(airportMovementPlaneHistoryKey(plane));
    if (match) {
      plane.airportMovementHistoryFlight = match;
    }
  });
}

async function discoverAirportMovementHistory(airport) {
  if (!dataService?.isEnabled() || !airport || state.airportSegment !== "dynamic") {
    return;
  }
  const airportKey = airportMovementDiscoveryKey(airport);
  const candidates = airportMovementHistoryCandidates(airport);
  if (!airportKey || !candidates.length) {
    return;
  }
  const fingerprint = candidates.map(airportMovementPlaneHistoryKey).filter(Boolean).sort().join("|");
  const cached = state.airportMovementHistory.get(airportKey);
  applyAirportMovementHistoryMatches(candidates, cached?.matches);
  if (cached?.pending) {
    return cached.pending;
  }
  if (cached?.fingerprint === fingerprint && cached?.loadedAt && Date.now() - cached.loadedAt < airportMovementHistoryConfig.refreshMs) {
    return;
  }
  const pending = (async () => {
    const matches = new Map();
    let cursor = 0;
    const workers = Array.from({ length: Math.min(airportMovementHistoryConfig.concurrency, candidates.length) }, async () => {
      while (cursor < candidates.length) {
        const plane = candidates[cursor];
        cursor += 1;
        const planeKey = airportMovementPlaneHistoryKey(plane);
        try {
          const detail = await dataService.getFlightHistory(airportMovementHistoryRequestTailNo(plane), {
            rangeDays: airportMovementHistoryConfig.rangeDays,
            page: 1,
            pageSize: airportMovementHistoryConfig.pageSize,
            airportCode: firstMatchedValue(airport.iata, airport.airportCode, "")
          });
          const match = airportMovementHistoryMatch(airport, plane, detail);
          matches.set(planeKey, match);
          if (match) {
            plane.airportMovementHistoryFlight = match;
          }
        } catch (_error) {
          matches.set(planeKey, null);
        }
      }
    });
    await Promise.all(workers);
    state.airportMovementHistory.set(airportKey, {
      loadedAt: Date.now(),
      fingerprint,
      matches
    });
    const currentAirport = selectedAirport();
    if (currentAirport && airportMovementDiscoveryKey(currentAirport) === airportKey && state.airportSegment === "dynamic") {
      renderAirportDynamicPanel(currentAirport);
    }
  })();
  state.airportMovementHistory.set(airportKey, {
    pending,
    fingerprint,
    matches: cached?.matches || new Map()
  });
  return pending;
}

function airportGroundFallbackMovementItems(airport) {
  const homeCode = normalizeAirportCodeText(firstMatchedValue(airport.iata, airport.airportCode, airport.icaoCode, airport.id)) || NA_TEXT;
  const homeAirport = airportMovementHomeAirport(airport);
  return airportGroundPlanes(airport).filter((plane) => airportGroundPlaneIsCurrentMovement(airport, plane)).map((plane, index) => {
    const history = plane.airportMovementHistoryFlight || null;
    const fromCode = normalizeAirportCodeText(firstMatchedValue(history?.depAirport, history?.depIata, history?.depIcao, plane.depAirport)) || NA_TEXT;
    const toCode = normalizeAirportCodeText(firstMatchedValue(plane.arrAirport, plane.airportCode, homeCode)) || homeCode;
    const arrival = airportMovementDateTime(plane.arrDate, plane.arrTime);
    const isInTransit = airportGroundPlaneIsInTransit(plane);
    const departureAirport = airportMovementAirportFromHistory(history || {
      depAirport: fromCode,
      depIata: plane.depIata,
      depIcao: plane.depIcao,
      depAirportName: plane.depAirportName
    }, "dep", firstMatchedValue(history?.depTimeZone, plane.depZoneId, plane.depTimeZone, ""));
    const registration = groundPlaneRegistrationState(plane).display;
    const actualDepartureRef = history?.depTimeRef || makePanelTimeRef("", {
      timeZone: departureAirport.zone,
      semantic: "actual_departure"
    });
    const actualArrivalRef = history?.arrTimeRef || makePanelTimeRef(isInTransit ? "" : arrival, {
      timeZone: homeAirport.zone,
      sourceField: "513014.arrDate+arrTime",
      semantic: "actual_arrival"
    });
    return {
      source: "ground",
      jet: null,
      plane,
      direction: "arrivals",
      directionLabel: "进港",
      fromCode,
      toCode,
      otherCode: fromCode,
      callsign: registration,
      registration,
      model: airportMovementModelLabel(plane),
      departureAirport,
      arrivalAirport: homeAirport,
      departure: actualDepartureRef,
      arrival: actualArrivalRef,
      actualDepartureRef,
      actualArrivalRef,
      status: isInTransit ? { key: "live", label: "即将入场" } : { key: "landed", label: "到达" },
      sortEpoch: parseAirportBoardClock(airport, arrival) || index,
      identity: normalizedLookupKey(firstMatchedValue(history?.uniqueKey, history?.flightId, plane.traceId, plane.tailNoEncrypted, `${fromCode}-${toCode}-${arrival}-${index}`))
    };
  });
}

function airportMovementIdentity(item) {
  return item.identity || normalizedLookupKey([
    item.direction,
    item.fromCode,
    item.toCode,
    item.callsign,
    item.departure,
    item.arrival
  ].join("|"));
}

function airportMovementDedupKeys(item) {
  return [
    airportMovementIdentity(item),
    `${item.direction}|${normalizedLookupKey(item.registration || item.callsign)}`,
    normalizedLookupKey(item.jet?.uniqueKey),
    normalizedLookupKey(item.plane?.traceId)
  ].filter((value) => value && !value.endsWith("|"));
}

function airportRelatedFlightItems(airport) {
  const source = [
    ...airportLiveMovementItems(airport),
    ...airportDynamicInterfaceItems(airport),
    ...airportGroundFallbackMovementItems(airport)
  ];
  const seen = new Set();
  return source.filter((item) => {
    const keys = airportMovementDedupKeys(item);
    if (!keys.length || keys.some((key) => seen.has(key))) {
      return false;
    }
    keys.forEach((key) => seen.add(key));
    return true;
  }).sort((a, b) => a.sortEpoch - b.sortEpoch || compareAirportText(a.callsign, b.callsign));
}

function airportMovementDiscoveryKey(airport) {
  return normalizedLookupKey(firstMatchedValue(airport?.icaoCode, airport?.icao, airport?.iata, airport?.airportCode, airport?.id));
}

function airportMovementDiscoveryCandidates(airport) {
  if (!finiteNumber(airport?.lat) || !finiteNumber(airport?.lng)) {
    return [];
  }
  const airportPosition = { lat: Number(airport.lat), lng: Number(airport.lng) };
  const candidates = businessJets
    .map((jet) => {
      const position = currentPosition(jet);
      const point = Array.isArray(position) && position.length === 2
        ? { lat: Number(position[0]), lng: Number(position[1]) }
        : null;
      const bearing = point ? airportMovementBearingDegrees(airportPosition, point) : Number.NaN;
      return {
        jet,
        distanceNm: point ? greatCircleDistanceNm(point, airportPosition) : Number.NaN,
        outboundHeadingDelta: airportMovementHeadingDelta(jet.heading, bearing)
      };
    })
    .filter(({ jet, distanceNm }) => {
      const key = normalizedLookupKey(jet.uniqueKey);
      return Boolean(key && !jet.flightDetail && Number.isFinite(distanceNm));
    });
  const selected = [];
  const selectedKeys = new Set();
  const add = (entry) => {
    const key = normalizedLookupKey(entry?.jet?.uniqueKey);
    if (!key || selectedKeys.has(key) || selected.length >= airportMovementDiscoveryConfig.maxCandidates) {
      return;
    }
    selectedKeys.add(key);
    selected.push(entry);
  };
  candidates
    .filter((entry) => entry.distanceNm <= airportMovementDiscoveryConfig.radiusNm)
    .sort((a, b) => a.distanceNm - b.distanceNm)
    .slice(0, airportMovementDiscoveryConfig.nearbyCandidates)
    .forEach(add);
  candidates
    .filter((entry) => !selectedKeys.has(normalizedLookupKey(entry.jet.uniqueKey)))
    .sort((a, b) => a.outboundHeadingDelta - b.outboundHeadingDelta || a.distanceNm - b.distanceNm)
    .slice(0, airportMovementDiscoveryConfig.outboundCandidates)
    .forEach(add);
  const remaining = candidates.filter((entry) => !selectedKeys.has(normalizedLookupKey(entry.jet.uniqueKey)));
  const stride = Math.max(1, Math.floor(remaining.length / Math.max(1, airportMovementDiscoveryConfig.globalCandidates)));
  for (let index = 0; index < remaining.length && selected.length < airportMovementDiscoveryConfig.maxCandidates; index += stride) {
    add(remaining[index]);
  }
  return selected.map(({ jet }) => jet);
}

async function discoverAirportMovementDetails(airport) {
  if (!dataService?.isEnabled() || !airport || state.airportSegment !== "dynamic") {
    return;
  }
  const key = airportMovementDiscoveryKey(airport);
  if (!key) {
    return;
  }
  const cached = state.airportMovementDiscovery.get(key);
  if (cached?.pending) {
    return cached.pending;
  }
  if (cached?.loadedAt && Date.now() - cached.loadedAt < airportMovementDiscoveryConfig.refreshMs) {
    return;
  }
  const candidates = airportMovementDiscoveryCandidates(airport);
  if (!candidates.length) {
    state.airportMovementDiscovery.set(key, { loadedAt: Date.now(), matched: 0 });
    return;
  }
  const pending = (async () => {
    let cursor = 0;
    let scanned = 0;
    let matched = 0;
    let departureFoundAt = airportLiveMovementItems(airport).some((item) => item.direction === "departures") ? 0 : null;
    const workers = Array.from({ length: Math.min(airportMovementDiscoveryConfig.concurrency, candidates.length) }, async () => {
      while (cursor < candidates.length) {
        if (departureFoundAt !== null && scanned >= Math.max(airportMovementDiscoveryConfig.nearbyCandidates, departureFoundAt + 8)) {
          break;
        }
        const seed = candidates[cursor];
        cursor += 1;
        scanned += 1;
        try {
          const detail = await dataService.getFlightTrack(seed.uniqueKey);
          const jet = aircraftByDetailSeed(seed);
          if (!jet || !detail) {
            continue;
          }
          applyFlightTrackDetail(jet, detail);
          applyAircraftTypeMetadata(jet);
          const direction = airportDirectionForJet(jet, airport);
          if (direction) {
            matched += 1;
            if (direction === "departures" && departureFoundAt === null) {
              departureFoundAt = scanned;
            }
            const currentAirport = selectedAirport();
            if (currentAirport && airportMovementDiscoveryKey(currentAirport) === key && state.airportSegment === "dynamic") {
              renderAirportDynamicPanel(currentAirport);
            }
          }
        } catch (_error) {
          // A single unavailable flight must not block the rest of the airport board.
        }
      }
    });
    await Promise.all(workers);
    rebuildAircraftIndexes();
    state.airportMovementDiscovery.set(key, { loadedAt: Date.now(), matched });
    const currentAirport = selectedAirport();
    if (currentAirport && airportMovementDiscoveryKey(currentAirport) === key && state.airportSegment === "dynamic") {
      renderAirportDynamicPanel(currentAirport);
    }
  })();
  state.airportMovementDiscovery.set(key, { pending, startedAt: Date.now() });
  return pending;
}

function renderAirportDynamicFilters(items) {
  const container = document.getElementById("airportDynamicFilterBar");
  if (!container) {
    return;
  }
  const counts = {
    all: items.length,
    arrivals: items.filter((item) => item.direction === "arrivals").length,
    departures: items.filter((item) => item.direction === "departures").length
  };
  container.innerHTML = [
    ["all", "全部"],
    ["arrivals", "进港"],
    ["departures", "出港"]
  ].map(([key, label]) => {
    const active = (state.airportDynamicFilter || "all") === key;
    return `
      <button type="button" class="${active ? "active" : ""}" data-direction="${escapeHtml(key)}" data-airport-dynamic-filter="${escapeHtml(key)}" aria-pressed="${active ? "true" : "false"}">
        <span>${escapeHtml(label)}</span><strong>${escapeHtml(formatNumber(counts[key]))}</strong>
      </button>`;
  }).join("");
}

function airportMovementActualTimeLabel(ref, airport, fallback = "") {
  if (ref && typeof ref === "object" && Number.isFinite(Number(ref.epochMs))) {
    const value = formatPanelTime(ref, {
      date: false,
      timeZone: ref.displayZone || "UTC",
      includeZone: false,
      rawUnknown: false
    });
    return value === NA_TEXT ? "N/A" : value;
  }
  const value = fallback ? airportBoardTimeLabel(airport, fallback) : NA_TEXT;
  return value === NA_TEXT ? "N/A" : value;
}

function airportMovementUtcOffsetLabel(ref, airport) {
  const zone = groundPlaneDirectValue(ref?.displayZone, airport?.zone);
  if (!zone) {
    return "N/A";
  }
  const epochMs = Number.isFinite(Number(ref?.epochMs)) ? Number(ref.epochMs) : Date.now();
  const label = utcStandardOffsetLabelForZone(zone, epochMs);
  return label === NA_TEXT ? "N/A" : label;
}

function airportMovementLocalDepartureSortValue(item, airport) {
  const label = airportMovementActualTimeLabel(item.actualDepartureRef, airport, item.departure);
  const match = String(label).match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
}

function airportMovementStopHtml(airport) {
  const name = firstMatchedValue(airport?.name, "未知机场");
  const codes = firstMatchedValue(airport?.codes, [airport?.iata, airport?.icao].filter((value) => value && value !== NA_TEXT).join(" / "));
  return `
    <span class="airport-movement-stop">
      <strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong>
      <small>${escapeHtml(codes === NA_TEXT ? "N/A" : codes)}</small>
    </span>`;
}

function renderAirportDynamicPanel(airport) {
  const items = airportRelatedFlightItems(airport);
  renderAirportDynamicFilters(items);
  const board = document.getElementById("airportFlightBoard");
  if (!board) {
    return;
  }
  const activeFilter = state.airportDynamicFilter || "all";
  const filtered = activeFilter === "all" ? items : items.filter((item) => item.direction === activeFilter);
  const visible = [...filtered].sort((a, b) => (
    airportMovementLocalDepartureSortValue(a, airport) - airportMovementLocalDepartureSortValue(b, airport)
    || a.sortEpoch - b.sortEpoch
    || compareAirportText(a.registration, b.registration)
  ));
  if (!visible.length) {
    board.innerHTML = `<p class="empty-related">当前筛选下没有行程</p>`;
    return;
  }
  board.innerHTML = visible.map((item, index) => {
    const { direction, directionLabel, status } = item;
    const departureTime = airportMovementActualTimeLabel(item.actualDepartureRef, airport, item.departure);
    const arrivalTime = airportMovementActualTimeLabel(item.actualArrivalRef, airport, item.arrival);
    const departureOffset = airportMovementUtcOffsetLabel(item.actualDepartureRef, item.departureAirport);
    const arrivalOffset = airportMovementUtcOffsetLabel(item.actualArrivalRef, item.arrivalAirport);
    return `
      <button type="button" class="airport-movement-card" data-direction="${escapeHtml(direction)}" data-status="${escapeHtml(status.key)}" data-movement-index="${index}">
        <span class="airport-timeline-axis" aria-hidden="true"><i></i></span>
        <span class="airport-movement-content">
          <span class="airport-movement-registration">
            <strong>${escapeHtml(firstMatchedValue(item.registration, item.callsign))}</strong>
            <em>${escapeHtml(directionLabel)}</em>
          </span>
          <span class="airport-movement-route">
            ${airportMovementStopHtml(item.departureAirport)}
            <i aria-hidden="true">→</i>
            ${airportMovementStopHtml(item.arrivalAirport)}
          </span>
          <span class="airport-movement-time-pair">
            <span class="airport-timeline-time airport-timeline-time-depart">
              <em>起飞</em>
              <strong>${escapeHtml(departureTime)}</strong>
              <small>${escapeHtml(departureOffset)}</small>
            </span>
            <i aria-hidden="true">→</i>
            <span class="airport-timeline-time airport-timeline-time-arrive">
              <em>到达</em>
              <strong>${escapeHtml(arrivalTime)}</strong>
              <small>${escapeHtml(arrivalOffset)}</small>
            </span>
          </span>
          <span class="airport-movement-footer">
            <span>${escapeHtml(firstMatchedValue(item.model, "未知机型"))}</span>
            <strong>${escapeHtml(status.label)}</strong>
          </span>
        </span>
      </button>`;
  }).join("");
  board.querySelectorAll(".airport-movement-card").forEach((button) => {
    button.addEventListener("click", () => {
      const item = visible[Number(button.dataset.movementIndex)];
      if (item?.jet) {
        selectAircraft(item.jet.id);
      } else if (item?.plane) {
        selectGroundPlaneFromAirport(airport, item.plane);
      }
    });
  });
  discoverAirportMovementHistory(airport);
}

function airportStatsRangeSource(source, range) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return source;
  }
  const aliases = airportStatsRangeAliases[range] || [range];
  const directKey = aliases.find((key) => source[key] !== undefined);
  return directKey ? source[directKey] : source;
}

function statNumberFrom(item, fields) {
  if (typeof item === "number") {
    return item;
  }
  if (typeof item === "string" && item.trim() && Number.isFinite(Number(item))) {
    return Number(item);
  }
  if (!item || typeof item !== "object") {
    return 0;
  }
  const value = fields.map((field) => Number(item[field])).find(Number.isFinite);
  return value || 0;
}

function statsEntries(source, options = {}) {
  if (Array.isArray(source)) {
    return source.map((item, index) => ({
      label: firstMatchedValue(item?.date, item?.name, item?.label, options.indexLabel ? options.indexLabel(index) : `#${index + 1}`),
      total: statNumberFrom(item, ["total", "count", "num", "value", "actual", "actually"]),
      inbound: statNumberFrom(item, ["inbound", "inboundActually", "arrivals", "arr"]),
      outbound: statNumberFrom(item, ["outbound", "outboundActually", "departures", "dep"]),
      cancel: statNumberFrom(item, ["cancel", "cancelCount", "cancelled", "canceled"])
    }));
  }
  if (!source || typeof source !== "object") {
    return [];
  }
  return Object.entries(source).map(([key, value], index) => ({
    label: firstMatchedValue(value?.date, value?.name, value?.label, key || (options.indexLabel ? options.indexLabel(index) : `#${index + 1}`)),
    total: statNumberFrom(value, ["total", "count", "num", "value", "actual", "actually"]),
    inbound: statNumberFrom(value, ["inbound", "inboundActually", "arrivals", "arr"]),
    outbound: statNumberFrom(value, ["outbound", "outboundActually", "departures", "dep"]),
    cancel: statNumberFrom(value, ["cancel", "cancelCount", "cancelled", "canceled"])
  }));
}

function renderDailyStatistics(dynamic) {
  const container = document.getElementById("airportDailyTrend");
  if (!container) {
    return;
  }
  const dailyStatistics = dynamic.dailyStatistics || {};
  const inbound = statsEntries(dailyStatistics.inbound || dailyStatistics.arrivals || []);
  const outbound = statsEntries(dailyStatistics.outbound || dailyStatistics.departures || []);
  const maxLength = Math.max(inbound.length, outbound.length);
  const rows = Array.from({ length: maxLength }, (_, index) => {
    const inRow = inbound[index] || {};
    const outRow = outbound[index] || {};
    return {
      label: firstMatchedValue(inRow.label, outRow.label, `D-${maxLength - index}`),
      inbound: inRow.total || inRow.inbound || 0,
      outbound: outRow.total || outRow.outbound || 0,
      cancel: (inRow.cancel || 0) + (outRow.cancel || 0)
    };
  });
  if (!rows.length) {
    container.innerHTML = `<p class="empty-related">暂无近 15 天趋势数据</p>`;
    return;
  }
  const maxValue = Math.max(...rows.map((row) => row.inbound + row.outbound + row.cancel), 1);
  container.innerHTML = rows.map((row) => {
    const total = row.inbound + row.outbound + row.cancel;
    return `
      <div class="airport-daily-bar" style="--height:${Math.max(8, (total / maxValue) * 100)}%">
        <span>
          <i style="--in:${Math.max(0, (row.inbound / Math.max(total, 1)) * 100)}%; --out:${Math.max(0, (row.outbound / Math.max(total, 1)) * 100)}%"></i>
        </span>
        <small>${escapeHtml(row.label)}</small>
      </div>`;
  }).join("");
}

function renderTotalStatistics(dynamic, range) {
  const container = document.getElementById("airportTotalTrend");
  if (!container) {
    return;
  }
  const source = airportStatsRangeSource(dynamic.totalStatistics, range);
  const rows = statsEntries(source).slice(0, 12);
  if (!rows.length) {
    container.innerHTML = `<p class="empty-related">暂无${escapeHtml(airportOpsRangeLabels[range] || "")}运行分布</p>`;
    return;
  }
  const maxValue = Math.max(...rows.map((row) => row.total || row.inbound + row.outbound + row.cancel), 1);
  container.innerHTML = rows.map((row) => {
    const value = row.total || row.inbound + row.outbound + row.cancel;
    return `
      <div class="airport-total-row">
        <span>${escapeHtml(row.label)}</span>
        <em style="--share:${Math.max(5, (value / maxValue) * 100)}%"></em>
        <strong>${escapeHtml(formatNumber(value))}</strong>
      </div>`;
  }).join("");
}

function rankEntries(source, range) {
  const selected = airportStatsRangeSource(source, range);
  if (Array.isArray(selected)) {
    return selected.map((item) => ({
      label: firstMatchedValue(item.modelName, item.modelCode, item.airportCode, item.name, item.label),
      count: statNumberFrom(item, ["count", "num", "total", "value"])
    }));
  }
  if (!selected || typeof selected !== "object") {
    return [];
  }
  if (objectLooksLikeRangeBuckets(selected)) {
    return [];
  }
  return Object.entries(selected).map(([key, value]) => ({
    label: firstMatchedValue(value?.modelName, value?.modelCode, value?.airportCode, value?.name, key),
    count: statNumberFrom(value, ["count", "num", "total", "value"])
  }));
}

function objectLooksLikeRangeBuckets(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return false;
  }
  const rangeKeys = new Set(Object.values(airportStatsRangeAliases).flat());
  const keys = Object.keys(source);
  return Boolean(keys.length && keys.every((key) => rangeKeys.has(key)));
}

function originDestSideSource(source, side, range) {
  if (!source || typeof source !== "object") {
    return [];
  }
  const sideKeys = side === "origin"
    ? ["origin", "origins", "departure", "departures", "dep"]
    : ["dest", "destination", "destinations", "arrival", "arrivals", "arr"];
  const ranged = airportStatsRangeSource(source, range);
  if (ranged && ranged !== source && typeof ranged === "object") {
    const nestedKey = sideKeys.find((key) => ranged[key] !== undefined);
    return nestedKey ? ranged[nestedKey] : [];
  }
  const directKey = sideKeys.find((key) => source[key] !== undefined);
  if (!directKey) {
    return [];
  }
  const selected = airportStatsRangeSource(source[directKey], range);
  return selected === source[directKey] && objectLooksLikeRangeBuckets(source[directKey]) ? [] : selected;
}

function renderRankList(id, items, emptyText) {
  const container = document.getElementById(id);
  if (!container) {
    return;
  }
  const ranked = items.filter((item) => !missingValue(item.label)).sort((a, b) => b.count - a.count).slice(0, 5);
  if (!ranked.length) {
    container.innerHTML = `<p class="empty-related">${escapeHtml(emptyText)}</p>`;
    return;
  }
  const max = Math.max(...ranked.map((item) => item.count), 1);
  container.innerHTML = ranked.map((item, index) => `
    <div class="airport-rank-row">
      <span>${index + 1}</span>
      <strong>${escapeHtml(item.label)}</strong>
      <em style="--share:${Math.max(7, (item.count / max) * 100)}%"></em>
      <b>${escapeHtml(formatNumber(item.count))}</b>
    </div>`).join("");
}

function renderOriginDest(dynamic, range) {
  const container = document.getElementById("airportOriginDest");
  if (!container) {
    return;
  }
  const source = dynamic.originAndDest || {};
  const origins = rankEntries(originDestSideSource(source, "origin", range), range).slice(0, 5);
  const destinations = rankEntries(originDestSideSource(source, "dest", range), range).slice(0, 5);
  const columnHtml = (title, rows) => `
    <div class="airport-origin-dest-column">
      <strong>${escapeHtml(title)}</strong>
      ${rows.length ? rows.map((item) => `
        <button type="button" data-airport-code="${escapeHtml(item.label)}">
          <span>${escapeHtml(item.label)}</span><em>${escapeHtml(formatNumber(item.count))}</em>
        </button>`).join("") : `<p class="empty-related">暂无数据</p>`}
    </div>`;
  container.innerHTML = columnHtml("始发地", origins) + columnHtml("目的地", destinations);
}

function renderAirportOperationsPanel(airport) {
  const dynamic = airport.apiDynamic || {};
  const detail = airport.apiDetail || {};
  const flights = mergePresentFields(detail.flightsInfo, dynamic.flightsInfo);
  const planned = Number(firstMatchedValue(flights.inboundPlan, 0)) + Number(firstMatchedValue(flights.outboundPlan, 0));
  const actual = Number(firstMatchedValue(flights.inboundActually, 0)) + Number(firstMatchedValue(flights.outboundActually, 0));
  const cancel = Number(firstMatchedValue(flights.inboundCancel, 0)) + Number(firstMatchedValue(flights.outboundCancel, 0));
  const executionRate = planned > 0 ? `${Math.round((actual / planned) * 100)}%` : NA_TEXT;
  const range = state.airportOpsRange || "today";
  setText("airportOpsSorties", firstMatchedValue(flights.sortiesEstimate, planned || actual || ""));
  setText("airportOpsExecution", executionRate);
  setText("airportOpsCancel", cancel || "");
  setText("airportOpsRangeLabel", airportOpsRangeLabels[range] || "今日");
  document.querySelectorAll("[data-airport-ops-range]").forEach((button) => {
    const active = button.dataset.airportOpsRange === range;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  renderDailyStatistics(dynamic);
  renderTotalStatistics(dynamic, range);
  renderRankList("airportPopularModels", rankEntries(dynamic.popularModels, range), "暂无机型排行数据");
  renderOriginDest(dynamic, range);
  const bigscreen = document.getElementById("airportBigScreenLink");
  if (bigscreen) {
    const enabled = String(firstMatchedValue(detail.raw?.jumpToBigScreen, dynamic.raw?.jumpToBigScreen, "")).trim() === "1";
    bigscreen.hidden = !enabled;
  }
}

function airportTagRawValue(value) {
  const text = String(value ?? "").trim();
  return text && !["-", "—", "N/A", "NA", "NULL", "UNDEFINED"].includes(text.toUpperCase()) ? text : "";
}

function firstAirportTagRawValue(...values) {
  return values.map(airportTagRawValue).find(Boolean) || "";
}

function airportOperationalTags(airport, info = {}, weather = {}) {
  const tags = [];
  const push = (label, tone = "attribute", source = "") => {
    if (!label || tags.some((tag) => tag.label === label)) {
      return;
    }
    tags.push({ label, tone, source });
  };
  const type = firstAirportTagRawValue(info.type, airport?.airportType);
  const openState = firstAirportTagRawValue(info.openState, airport?.openState);
  const plateau = firstAirportTagRawValue(info.plateau, airport?.plateau);
  if (type) {
    if (/军民合用|军用|军/.test(type)) {
      push(type, "restriction", "type");
    } else if (!/^(民用|民用机场|普通机场)$/i.test(type)) {
      push(type, /未知|待确认/.test(type) ? "unknown" : "attribute", "type");
    }
  }
  if (openState) {
    if (/未开放外机|不开放|限制|禁止/.test(openState)) {
      push(openState, "restriction", "openState");
    } else if (!/^(开放|开放外机|对外开放|允许)$/i.test(openState)) {
      push(openState, /未知|待确认/.test(openState) ? "unknown" : "attribute", "openState");
    }
  }
  if (plateau) {
    if (/高高原|高原/.test(plateau) && !/非高原/.test(plateau)) {
      push(plateau, "condition", "plateau");
    } else if (!/^(非高原|普通机场|平原)$/i.test(plateau)) {
      push(plateau, /未知|待确认/.test(plateau) ? "unknown" : "attribute", "plateau");
    }
  }
  const grade = firstAirportTagRawValue(info.grade, airport?.grade);
  if (grade) {
    push(`等级 ${grade}`, "attribute", "grade");
  }
  const runwayLength = airportTagRawValue(info.runwayLength);
  if (runwayLength) {
    push(`跑道 ${runwayLength}m`, "attribute", "runway");
  }
  if (!missingValue(info.elevation) || !missingValue(airport?.elevationMeters)) {
    push(`海拔 ${formatAirportElevation(airport)}`, "attribute", "elevation");
  }
  if (!missingValue(weather.weather)) {
    push(weather.weather, "weather", "weather");
  }
  return tags;
}

function renderAirportTagRail(id, tags, options = {}) {
  const container = document.getElementById(id);
  if (!container) {
    return;
  }
  if (!tags.length) {
    container.innerHTML = options.empty ? `<span class="airport-info-tag" data-tone="unknown">${escapeHtml(options.empty)}</span>` : "";
    return;
  }
  container.innerHTML = tags.map((tag) => `
    <button type="button" class="airport-info-tag" data-tone="${escapeHtml(tag.tone)}" data-source="${escapeHtml(tag.source || "")}" ${tag.tone === "restriction" ? `data-approval-label="${escapeHtml(tag.label)}"` : ""}>
      ${escapeHtml(tag.label)}
    </button>`).join("");
}

function sanitizeAirportContentHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowedTags = new Set(["P", "BR", "UL", "OL", "LI", "STRONG", "EM", "A"]);
  const cleanNode = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent || ""));
        return;
      }
      Array.from(child.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (child.tagName === "A" && name === "href" && /^https?:\/\//i.test(attribute.value)) {
          return;
        }
        child.removeAttribute(attribute.name);
      });
      if (child.tagName === "A") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener");
      }
      cleanNode(child);
    });
  };
  cleanNode(template.content);
  return template.innerHTML;
}

function airportApprovalRules(airport) {
  return [
    airport?.apiDynamic?.approvalRules,
    airport?.apiDynamic?.raw?.approvalRules,
    airport?.apiDynamic?.airportInfo?.approvalRules,
    airport?.apiDetail?.airportInfo?.approvalRules,
    airport?.apiDetail?.raw?.approvalRules
  ].find(Array.isArray) || [];
}

function renderAirportApprovalRules(airport) {
  const container = document.getElementById("airportApprovalRules");
  if (!container) {
    return;
  }
  const rules = airportApprovalRules(airport);
  if (!rules.length) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.innerHTML = rules.slice(0, 4).map((item) => {
    const title = firstMatchedValue(item.label, item.title, "报批政策");
    const subtitle = firstMatchedValue(item.subtitle, item.content, "");
    const content = item.contentHtml ? sanitizeAirportContentHtml(item.contentHtml) : escapeHtml(subtitle);
    return `
      <article class="airport-notice-item airport-approval-item" data-approval-title="${escapeHtml(title)}">
        <strong>${escapeHtml(title)}</strong>
        ${subtitle !== NA_TEXT ? `<small>${escapeHtml(subtitle)}</small>` : ""}
        ${content ? `<div class="airport-approval-content">${content}</div>` : ""}
      </article>`;
  }).join("");
}

function airportDetailNoticeItems(airport, key) {
  const detail = airport?.apiDetail || {};
  const dynamic = airport?.apiDynamic || {};
  return [
    detail[key],
    detail.raw?.[key],
    dynamic[key],
    dynamic.raw?.[key]
  ].find(Array.isArray) || [];
}

function renderAirportHeaderExtras(airport, info, weather, tags) {
  renderAirportTagRail("airportTagRail", tags.slice(0, 5));
  const restrictions = tags.filter((tag) => tag.tone === "restriction");
  const banner = document.getElementById("airportConstraintBanner");
  if (banner) {
    banner.hidden = !restrictions.length;
    banner.innerHTML = restrictions.length
      ? `<strong>运行限制</strong><span>${escapeHtml(restrictions.map((tag) => tag.label).join(" · "))}</span>`
      : "";
  }
  const heroNotices = document.getElementById("airportHeroNotices");
  if (heroNotices) {
    const notices = [
      ...airportDetailNoticeItems(airport, "weatherNotices"),
      ...airportDetailNoticeItems(airport, "airportNotices")
    ].slice(0, 2);
    heroNotices.innerHTML = notices.map((item) => `
      <span>${escapeHtml(firstMatchedValue(item.title, item.weather, item.label, "提示"))}</span>`).join("");
    heroNotices.hidden = !notices.length;
  }
}

function renderAirportInfoPanel(airport) {
  const detail = airport.apiDetail || {};
  const dynamic = airport.apiDynamic || {};
  const ground = airport.apiGround || {};
  const info = mergePresentFields(detail.airportInfo, dynamic.airportInfo, ground.airportInfo);
  const weather = mergePresentFields(detail.weatherInfo, dynamic.weatherInfo);
  const tags = airportOperationalTags(airport, info, weather);
  renderAirportTagRail("airportInfoTags", tags, { empty: "暂无特殊运行标签" });
  renderAirportApprovalRules(airport);
  renderAirportNoticeList("airportWeatherNotices", airportDetailNoticeItems(airport, "weatherNotices"), { fallbackTitle: "天气预警", limit: 3 });
  renderAirportNoticeList("airportNotices", airportDetailNoticeItems(airport, "airportNotices"), { fallbackTitle: "机场公告", limit: 4, dateAirport: airport });
}

function renderAirportDetailPanel(airport) {
  const detail = airport.apiDetail || {};
  const dynamic = airport.apiDynamic || {};
  const groundDetail = airport.apiGround || {};
  const info = mergePresentFields(detail.airportInfo, dynamic.airportInfo, groundDetail.airportInfo);
  const weather = mergePresentFields(detail.weatherInfo, dynamic.weatherInfo);
  const flights = mergePresentFields(detail.flightsInfo, dynamic.flightsInfo);
  const ground = mergePresentFields(detail.groundInfo, groundDetail.groundInfo);
  const inbound = firstMatchedValue(flights.inboundActually, flights.inboundPlan, airport.arrivals);
  const outbound = firstMatchedValue(flights.outboundActually, flights.outboundPlan, airport.departures);
  const groundCount = airportReportedGroundCount(airport, airportGroundData(airport).parked.length);
  const countedSorties = [inbound, outbound, groundCount]
    .map((value) => Number(value))
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
  const labelParts = airportHoverLabelParts(airport);
  const iata = labelParts.iata;
  const icao = labelParts.icao;
  const city = firstMatchedValue(info.cityName, airport.city, airport.raw?.cityName);
  const country = firstMatchedValue(info.countryName, airport.country);

  setText("airportPanelStatus", firstMatchedValue(info.type, "公务机场"));
  setText("airportCode", icao);
  setText("airportIataBadge", iata);
  setText("airportWeatherBadge", firstMatchedValue(weather.weather, airport.weather, "天气 —"));
  setText("airportName", [
    firstMatchedValue(labelParts.nameCn, labelParts.nameEn),
    [country, city].filter((item) => item !== NA_TEXT).join(" ")
  ].filter((item) => item !== NA_TEXT).join(" · ") || NA_TEXT);
  setText("airportSorties", firstMatchedValue(flights.sortiesEstimate, countedSorties || ""));
  setText("airportInbound", inbound);
  setText("airportOutbound", outbound);
  setText("airportGround", `${formatNumber(groundCount)} 架`);

  setText("airportNameCn", labelParts.nameCn);
  setText("airportNameEn", firstMatchedValue(
    info.airportNameEn,
    detail.airportInfo?.airportNameEn,
    groundDetail.airportInfo?.airportNameEn,
    dynamic.airportInfo?.airportNameEn,
    airport.nameEn,
    airport.raw?.airportNameEn,
    labelParts.nameEn
  ));
  setText("airportIata", iata);
  setText("airportIcao", icao);
  setText("airportCity", city);
  setText("airportTimeZoneUtc", formatAirportTimeZone(airport));
  setText("airportCoordinates", formatCoordinates([airport.lat, airport.lng]));
  setText("airportElevation", formatAirportElevation(airport));
  setText("airportGrade", firstMatchedValue(info.grade, airport.grade));
  setText("airportType", firstMatchedValue(info.type, airport.airportType));
  setText("airportPlateau", firstMatchedValue(info.plateau, airport.plateau));
  setText("airportOpenState", firstMatchedValue(info.openState, airport.openState));

  setText("airportRunways", firstMatchedValue(info.runwayCount, airport.runways));
  setText("airportRunwayLength", firstMatchedValue(info.runwayLength ? `${info.runwayLength} m` : "", airport.runwayLength));
  setText("airportWeather", firstMatchedValue(weather.weather, airport.weather));
  setText("airportTemperature", firstMatchedValue(weather.tmp, weather.tmpHigh && weather.tmpLow ? `${weather.tmpLow} - ${weather.tmpHigh}` : ""));
  setText("airportWind", firstMatchedValue(weather.wind));
  setText("airportVisibility", firstMatchedValue(weather.visib));
  setText("airportAqi", firstMatchedValue(weather.aqi, weather.aqigrad));
  setText("airportWeatherReportTime", formatAirportEventTime(airport, weather.reportTime, { seconds: true }));

  const tags = airportOperationalTags(airport, info, weather);
  renderAirportHeaderExtras(airport, info, weather, tags);
  if (state.airportSegment === "dynamic") {
    renderAirportDynamicPanel(airport);
  } else if (state.airportSegment === "operations") {
    renderAirportOperationsPanel(airport);
  } else if (state.airportSegment === "airport") {
    renderAirportInfoPanel(airport);
  } else {
    renderAirportGroundPanel(airport);
  }
  syncSelectionDomState();
}

function selectAirportFromCode(code) {
  const airport = airportByCode(code);
  if (!airport) {
    return false;
  }
  selectAirport(airport.id);
  return true;
}

function updateFollowButton() {
  const button = document.getElementById("followAircraftButton");
  if (!button) {
    return;
  }
  const active = Boolean(selectedAircraft()) && state.followSelectedAircraft && !routeFocusActive();
  button.disabled = !selectedAircraft();
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", active ? "true" : "false");
}

function setAircraftMapMode(mode) {
  const jet = selectedAircraft();
  if (!jet) {
    return;
  }
  if (mode === "route") {
    if (!state.trails) {
      return;
    }
    if (routeFocusActive()) {
      clearRouteFocus({ restore: false });
      state.followSelectedAircraft = false;
      updateFollowButton();
      updateRouteFocusButton();
      return;
    }
    state.followSelectedAircraft = false;
    updateFollowButton();
    setRouteFocus(true);
    return;
  }
  if (state.followSelectedAircraft && !routeFocusActive()) {
    state.followSelectedAircraft = false;
    updateFollowButton();
    updateRouteFocusButton();
    return;
  }
  clearRouteFocus({ restore: false });
  state.followSelectedAircraft = true;
  updateFollowButton();
  updateRouteFocusButton();
  state.map?.panTo?.(currentPosition(jet));
}

function selectAircraft(id, shouldPan = true, options = {}) {
  if (typeof shouldPan === "object" && shouldPan !== null) {
    options = shouldPan;
    shouldPan = options.pan !== false;
  }
  const jet = aircraftById.get(normalizedLookupKey(id));
  if (!jet) {
    return;
  }
  const previousSelectedKind = state.selectedKind;
  const selectingDifferentAircraft = state.selectedKind !== "aircraft" || state.selectedId !== id;
  const previousAircraftId = state.selectedKind === "aircraft" && state.selectedId !== id
    ? state.selectedId
    : "";
  const preserveReducedIconState = options.preserveReducedIconState === true;
  if (!preserveReducedIconState) {
    state.routeFocusAircraftId = null;
    state.routeFocusPreviousView = null;
    state.map?.clearRouteEndpoints?.();
    state.hideOtherAircraft = false;
    state.followSelectedAircraft = false;
  } else if (state.routeFocusAircraftId && state.routeFocusAircraftId !== id) {
    state.routeFocusAircraftId = null;
    state.routeFocusPreviousView = null;
    state.map?.clearRouteEndpoints?.();
  }
  const preservedAirportHoverId = preserveReducedIconState ? airportHoverId(state.hoveredAirportId) : "";

  const position = currentPosition(jet);
  state.lastTargetSelectAt = performance.now();
  if (previousAircraftId) {
    rememberRecentlySelectedAircraft(previousAircraftId);
  }
  state.selectedKind = "aircraft";
  state.selectedId = id;
  state.hoveredAirportId = preservedAirportHoverId || null;
  refreshSelectedRouteEndpointCache(jet);
  const explicitSegment = aircraftDetailSegments.includes(options.segment) ? options.segment : "";
  const preservedSegment = aircraftDetailSegments.includes(state.aircraftSegment) ? state.aircraftSegment : "overview";
  const nextSegment = explicitSegment
    || (previousSelectedKind === "aircraft"
      ? preservedSegment
      : state.aircraftSegmentById.get(id) || preservedSegment);
  ensureSelectedTrackStore(jet, { reset: selectingDifferentAircraft });
  appendSelectedRealtimeTrackPoint(jet);
  loadAircraftDetails(jet);
  openAircraftView(nextSegment, { resetHistoryScroll: selectingDifferentAircraft && nextSegment === "journey" });
  updateRouteFocusButton();
  renderAircraftDetailPanel(jet);
  updateFollowButton();
  syncAirportHoverMarkers(preservedAirportHoverId);
  if (shouldPan || state.followSelectedAircraft) {
    panSelectedTarget(position);
  }
  renderViewport();
  scheduleNextRealtimeRefresh();
}

function selectAirport(id, shouldPan = true) {
  const airport = airportById(id);
  if (!airport) {
    return;
  }
  const selectingDifferentAirport = state.selectedKind !== "airport" || state.selectedId !== id;
  if (state.selectedKind === "aircraft" && state.selectedId) {
    rememberRecentlySelectedAircraft(state.selectedId);
  }
  clearRouteFocus({ restore: false });
  state.selectedTrackStore = null;
  state.followSelectedAircraft = false;
  state.hideOtherAircraft = false;
  state.airportTab = selectingDifferentAirport ? "all" : (state.airportTab || "all");
  state.airportSegment = selectingDifferentAirport ? "ground" : (state.airportSegment || "ground");
  if (selectingDifferentAirport) {
    state.airportDynamicFilter = "all";
    state.airportGroundFilter = "all";
    state.airportGroundSearch = "";
    state.airportGroundSort = "duration-asc";
    state.airportGroundView = "list";
    state.airportOpsRange = "today";
  }
  updateFollowButton();
  state.lastTargetSelectAt = performance.now();
  state.selectedKind = "airport";
  state.selectedId = id;
  refreshSelectedRouteEndpointCache(null);
  state.hoveredAirportId = null;
  openAirportView(state.airportSegment);
  document.querySelectorAll("[data-airport-tab]").forEach((button) => {
    const isActive = button.dataset.airportTab === state.airportTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  updateRouteFocusButton();
  renderAirportDetailPanel(airport);
  syncAirportHoverMarkers(id);
  if (shouldPan) {
    panSelectedTarget([airport.lat, airport.lng]);
  }
  renderViewport();
  loadAirportDetail(airport);
  loadAirportGround(airport);
  maybeLoadApiDebugSelectionDetails();
  renderApiDebugConsole();
  scheduleNextRealtimeRefresh();
}

function updateRail() {
  const jets = state.renderedAircraft.length ? state.renderedAircraft : aircraftForCurrentView();
  const airportList = state.renderedAirports.length ? state.renderedAirports : airportsForCurrentView();
  const altitudeValues = jets.map((jet) => Number(jet.altitude)).filter(Number.isFinite);
  const avg = altitudeValues.reduce((sum, altitude) => sum + altitude, 0) / Math.max(altitudeValues.length, 1);
  document.getElementById("railVisibleJets").textContent = jets.length;
  document.getElementById("railVisibleAirports").textContent = airportList.length;
  document.getElementById("railAvgAltitude").textContent = altitudeValues.length ? `FL${Math.round(avg / 100)}` : "-";
  document.getElementById("railAircraftList").innerHTML = jets.slice(0, 7).map((jet) => `
    <button type="button" class="rail-item" data-kind="aircraft" data-id="${jet.id}">
      <span><strong>${displayOrDash(aircraftCallsignLabel(jet, aircraftMapRegistrationLabel(jet)))}</strong><small>${displayOrDash(jet.from)} - ${displayOrDash(jet.to)} | ${displayOrDash(jet.model)}</small></span>
      <span>${formatFlightLevel(jet.altitude)}</span>
    </button>
  `).join("") || `<div class="rail-item"><span><strong>No aircraft in view</strong><small>Waiting for live database</small></span></div>`;
  document.getElementById("railAirportList").innerHTML = airportList.slice(0, 7).map((airport) => `
    <button type="button" class="rail-item" data-kind="airport" data-id="${airport.id}">
      <span><strong>${displayOrDash(airport.id)}</strong><small>${displayOrDash(airport.name)}</small></span>
      <span>${Number(airport.departures || 0) + Number(airport.arrivals || 0)}</span>
    </button>
  `).join("") || `<div class="rail-item"><span><strong>No airports in view</strong><small>Enable airport layer or zoom out</small></span></div>`;
  document.querySelectorAll(".rail-item[data-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.kind === "airport") {
        selectAirport(button.dataset.id);
      } else {
        selectAircraft(button.dataset.id);
      }
    });
  });
  updateDataSourceLabels();
}

function showFilterSheet(show) {
  const sheet = document.getElementById("filterSheet");
  sheet.hidden = typeof show === "boolean" ? !show : !sheet.hidden;
}

function showWeatherLayer(show) {
  state.weather = show;
  document.getElementById("weatherButton").classList.toggle("active", show);
  state.map.setWeather(show);
}

const searchGroupLimit = 10;
const searchPanelMaxItems = 120;
let searchInputRenderTimer = null;

const searchShortcutConfig = [
  {
    key: "route",
    label: "Flight by route",
    description: "Search by DEP-ARR, IATA or ICAO."
  },
  {
    key: "operator",
    label: "Live aircraft by operator",
    description: "Find live business jets by operator or fleet."
  },
  {
    key: "country",
    label: "Airports by country",
    description: "Browse airports by country or region."
  },
  {
    key: "nearby",
    label: "Nearby",
    description: "Use current map center as estimated origin."
  }
];

function searchInputElement() {
  return document.getElementById("searchInput");
}

function searchPanelElement() {
  return document.getElementById("searchResults");
}

function searchPanelIsOpen() {
  const panel = searchPanelElement();
  return Boolean(panel && !panel.hidden);
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeSearchCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function compactSearchText(value) {
  return normalizeSearchText(value).replace(/[\s/|_-]+/g, "");
}

function normalizeSearchFields(fields) {
  return fields
    .filter((field) => !missingValue(field))
    .map((field) => String(field).trim())
    .filter(Boolean);
}

function searchMatchScore(query, fields) {
  const q = normalizeSearchText(query);
  if (!q) {
    return Number.POSITIVE_INFINITY;
  }
  const values = normalizeSearchFields(fields).map((field) => field.toLowerCase());
  if (values.some((field) => field === q)) return 0;
  if (values.some((field) => field.startsWith(q))) return 1;
  const tokens = values.flatMap((field) => field.split(/[\s/|(),.-]+/).filter(Boolean));
  if (tokens.some((token) => token === q)) return 1.1;
  if (tokens.some((token) => token.startsWith(q))) return 1.4;
  if (values.some((field) => field.includes(q))) return 2;
  const compact = compactSearchText(query);
  if (compact && values.some((field) => compactSearchText(field).includes(compact))) return 2.5;
  return Number.POSITIVE_INFINITY;
}

function compareSearchItems(a, b) {
  return (a.sortScore - b.sortScore)
    || ((a.priority || 0) - (b.priority || 0))
    || String(a.title).localeCompare(String(b.title), "en", { sensitivity: "base" });
}

function aircraftSearchData() {
  return businessJets.filter((jet) => aircraftPassesLockedFilter(jet));
}

function airportIcaoCode(airport) {
  return airport.icaoCode || airport.icao || airport.id || "";
}

function airportSearchCodes(airport) {
  return [
    airport.id,
    airport.iata,
    airport.icao,
    airport.icaoCode,
    airport.airportCode
  ].filter((code, index, list) => code && list.indexOf(code) === index);
}

function airportSearchLabel(airport) {
  return [airport.iata, airportIcaoCode(airport)].filter(Boolean).join(" / ") || airport.id || NA_TEXT;
}

function comparableAircraftIdentity(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function valueMatchesAircraftIdentity(value, identities) {
  const comparable = comparableAircraftIdentity(value);
  return Boolean(comparable && identities.includes(comparable));
}

function aircraftRegistrationIdentities(jet) {
  const detail = jet?.flightDetail || {};
  const profile = jet?.planeDetail || {};
  const raw = detail.raw || {};
  const values = [
    jet?.registration,
    jet?.tailNoClear,
    jet?.tailNoDisplay,
    jet?.tailNumber,
    jet?.raw?.tailNoClear,
    jet?.raw?.registrationClear,
    jet?.raw?.tailNoDisplay,
    jet?.raw?.registrationDisplay,
    jet?.raw?.registration,
    detail.planeInfo?.tailNoClear,
    detail.planeInfo?.registrationClear,
    detail.planeInfo?.tailNoDisplay,
    detail.planeInfo?.registration,
    profile.planeInfo?.tailNoClear,
    profile.planeInfo?.registrationClear,
    profile.planeInfo?.tailNoDisplay,
    profile.planeInfo?.registration,
    raw.planeInfo?.tailNoClear,
    raw.planeInfo?.registrationClear,
    raw.planeInfo?.tailNoDisplay,
    raw.planeInfo?.registration
  ];
  return values
    .filter((value) => !missingValue(value))
    .map(comparableAircraftIdentity)
    .filter((value, index, list) => value && list.indexOf(value) === index);
}

function aircraftCallsignLabel(jet, fallback = NA_TEXT) {
  const detail = jet?.flightDetail || {};
  const base = detail.flightBaseInfo || {};
  const summary = detail.summaryInfo || {};
  const raw = detail.raw || {};
  const rawBase = raw.flightBaseInfo || {};
  const registrationIdentities = aircraftRegistrationIdentities(jet);
  const candidates = [
    jet?.apiCallsign,
    jet?.flightNo,
    jet?.flightNumber,
    jet?.raw?.callSign,
    jet?.raw?.callsign,
    jet?.raw?.flightNo,
    base.callSign,
    base.callsign,
    base.flightNo,
    base.flightNumber,
    base.flight,
    summary.callSign,
    summary.callsign,
    raw.callSign,
    raw.callsign,
    raw.flightNo,
    rawBase.callSign,
    rawBase.callsign,
    rawBase.flightNo
  ];
  let registrationLikeFallback = "";
  const callsign = candidates.find((value) => {
    if (missingValue(value)) {
      return false;
    }
    if (valueMatchesAircraftIdentity(value, registrationIdentities)) {
      registrationLikeFallback ||= value;
      return false;
    }
    return true;
  });
  return callsign ?? (registrationLikeFallback || displayOrDash(fallback));
}

function aircraftDisplayIdentifier(jet) {
  return firstMatchedValue(aircraftCallsignLabel(jet), jet.tripNo, jet.registration, jet.tailNoClear, jet.id);
}

function aircraftRegistrationLabel(jet) {
  return firstMatchedValue(jet.registration, jet.tailNoClear, jet.tailNumber, jet.id);
}

function aircraftRouteLabel(jet) {
  const from = firstMatchedValue(jet.from, jet.depAirportCode);
  const to = firstMatchedValue(jet.to, jet.arrAirportCode);
  return missingValue(from) && missingValue(to) ? NA_TEXT : `${displayOrDash(from)}-${displayOrDash(to)}`;
}

function aircraftSearchStatus(jet) {
  const freshness = aircraftFreshnessState(jet);
  if (aircraftIsOnGround(jet)) return { label: "ON GROUND", className: "ground" };
  if (freshness === "expired") return { label: "EXPIRED", className: "stale" };
  if (freshness === "stale") return { label: "STALE", className: "stale" };
  if (freshness === "aging") return { label: "AGING", className: "aging" };
  return { label: "LIVE", className: "live" };
}

function distanceKmBetweenPositions(start, end) {
  if (
    !Array.isArray(start)
      || !Array.isArray(end)
      || start.length !== 2
      || end.length !== 2
      || !finiteNumber(start[0])
      || !finiteNumber(start[1])
      || !finiteNumber(end[0])
      || !finiteNumber(end[1])
  ) {
    return null;
  }
  return greatCircleDistanceNm(
    { lat: Number(start[0]), lng: Number(start[1]) },
    { lat: Number(end[0]), lng: Number(end[1]) }
  ) * 1.852;
}

function searchDistanceLabel(distanceKm, estimated = false) {
  if (!Number.isFinite(Number(distanceKm))) {
    return "";
  }
  const value = Number(distanceKm);
  const label = value < 1 ? `${Math.max(1, Math.round(value * 1000))} m` : `${Math.round(value)} km`;
  return estimated ? `${label} estimated` : `${label} away`;
}

function searchMapOrigin() {
  const view = state.map?.getView?.();
  const center = Array.isArray(view?.center) && view.center.length === 2 ? view.center : defaultMapCenter();
  return {
    center,
    source: state.map ? "current map center" : "default map center",
    estimated: true
  };
}

function parseRouteSearchQuery(query) {
  const upper = normalizeSearchCode(query).replace(/\s+/g, " ");
  const dashMatch = upper.match(/^([A-Z0-9]{3,4})\s*[-–]\s*([A-Z0-9]{3,4})$/);
  const spaceMatch = upper.match(/^([A-Z0-9]{3,4})\s+([A-Z0-9]{3,4})$/);
  const match = dashMatch || spaceMatch;
  if (!match) {
    return null;
  }
  const fromCode = match[1];
  const toCode = match[2];
  return {
    direct: Boolean(dashMatch),
    spaced: Boolean(spaceMatch),
    fromCode,
    toCode,
    fromAirport: airportByCode(fromCode),
    toAirport: airportByCode(toCode),
    suggestion: `${fromCode}-${toCode}`
  };
}

function airportMatchesRouteToken(routeCode, airport) {
  if (!airport || missingValue(routeCode)) {
    return false;
  }
  const knownAirport = airportByCode(routeCode);
  if (knownAirport) {
    return knownAirport.id === airport.id;
  }
  const code = normalizeSearchCode(routeCode);
  return airportSearchCodes(airport).some((airportCode) => normalizeSearchCode(airportCode) === code);
}

function jetMatchesRoute(jet, fromAirport, toAirport) {
  return airportMatchesRouteToken(jet.from || jet.depAirportCode, fromAirport)
    && airportMatchesRouteToken(jet.to || jet.arrAirportCode, toAirport);
}

function routeSearchTitle(fromAirport, toAirport, fallback = {}) {
  const from = fromAirport?.iata || fromAirport?.id || fallback.fromCode || "DEP";
  const to = toAirport?.iata || toAirport?.id || fallback.toCode || "ARR";
  return `${from}-${to}`;
}

function makeLiveAircraftSearchItem(jet, options = {}) {
  const status = aircraftSearchStatus(jet);
  const distanceText = options.distanceKm === null || options.distanceKm === undefined
    ? ""
    : searchDistanceLabel(options.distanceKm, options.distanceEstimated);
  const callsign = aircraftCallsignLabel(jet);
  const title = aircraftDisplayIdentifier(jet);
  const metaFields = [
    aircraftRegistrationLabel(jet),
    firstMatchedValue(jet.aircraftTypeCode, jet.model),
    aircraftRouteLabel(jet),
    firstMatchedValue(jet.operator, jet.owner)
  ].filter((value) => !missingValue(value));
  return {
    key: `live:${jet.id}`,
    type: "liveAircraft",
    id: jet.id,
    title,
    meta: metaFields.join(" | "),
    badge: status.label,
    badgeClass: status.className,
    distanceText,
    sortScore: options.sortScore ?? searchMatchScore(options.query, [
      callsign,
      jet.callsign,
      jet.flightNo,
      jet.tripNo,
      jet.registration,
      jet.tailNoClear,
      jet.aircraftTypeCode,
      jet.model,
      jet.operator,
      jet.owner,
      jet.from,
      jet.to,
      aircraftRouteLabel(jet)
    ]),
    priority: aircraftPriority(jet),
    entity: jet,
    actions: ["show-aircraft", "aircraft-info", "route-focus"]
  };
}

function makeTripSearchItem(jet, options = {}) {
  const live = aircraftFreshnessState(jet) !== "expired";
  const depZone = selectedRouteSide(jet, "dep").zone;
  const callsign = aircraftCallsignLabel(jet);
  const scheduleTime = firstMatchedValue(
    jet.flightDetail?.timeRefs?.scheduledDeparture,
    jet.scheduledDeparture,
    jet.estimatedDeparture,
    jet.actualDeparture,
    jet.departureTime,
    jet.flightDetail?.flightBaseInfo?.depPlanTime
  );
  return {
    key: `trip:${jet.id}`,
    type: "trip",
    id: jet.id,
    title: firstMatchedValue(jet.tripNo, jet.flightNo, callsign, aircraftDisplayIdentifier(jet)),
    meta: [aircraftRouteLabel(jet), firstMatchedValue(jet.model, jet.aircraftTypeCode), formatPanelTime(scheduleTime, { date: true, timeZone: depZone === NA_TEXT ? "UTC" : depZone })]
      .filter((value) => !missingValue(value))
      .join(" | "),
    badge: live ? "LIVE" : "SCHEDULED",
    badgeClass: live ? "live" : "scheduled",
    sortScore: options.sortScore ?? searchMatchScore(options.query, [
      jet.tripNo,
      jet.flightNo,
      callsign,
      jet.callsign,
      jet.registration,
      aircraftRouteLabel(jet),
      jet.from,
      jet.to,
      jet.fromName,
      jet.toName
    ]),
    priority: live ? aircraftPriority(jet) : 5000,
    entity: jet,
    actions: live ? ["show-aircraft", "route-focus"] : ["trip-detail"]
  };
}

function makeAircraftProfileSearchItem(jet, options = {}) {
  return {
    key: `profile:${jet.id}`,
    type: "aircraftProfile",
    id: jet.id,
    title: aircraftRegistrationLabel(jet),
    meta: [firstMatchedValue(jet.model, jet.aircraftTypeCode), firstMatchedValue(jet.operator, jet.owner)]
      .filter((value) => !missingValue(value))
      .join(" | "),
    badge: "AIRCRAFT",
    badgeClass: "profile",
    sortScore: options.sortScore ?? searchMatchScore(options.query, [
      jet.registration,
      jet.tailNoClear,
      jet.model,
      jet.aircraftTypeCode,
      jet.operator,
      jet.owner
    ]),
    priority: aircraftPriority(jet) + 1000,
    entity: jet,
    actions: ["aircraft-info", "show-aircraft"]
  };
}

function makeAirportSearchItem(airport, options = {}) {
  const distanceText = options.distanceKm === null || options.distanceKm === undefined
    ? ""
    : searchDistanceLabel(options.distanceKm, options.distanceEstimated);
  return {
    key: `airport:${airport.id}`,
    type: "airport",
    id: airport.id,
    title: firstMatchedValue(airport.name, airport.id),
    meta: [airportSearchLabel(airport), airport.city, airport.country].filter((value) => !missingValue(value)).join(" | "),
    badge: "AIRPORT",
    badgeClass: "airport",
    distanceText,
    sortScore: options.sortScore ?? searchMatchScore(options.query, [
      airport.id,
      airport.iata,
      airport.icao,
      airport.icaoCode,
      airport.airportCode,
      airport.name,
      airport.city,
      airport.country
    ]),
    priority: airportPriorityLevel(airport) * 1000 - airportTrafficScore(airport),
    entity: airport,
    actions: ["show-airport", "airport-arrivals", "airport-departures", "airport-ground"]
  };
}

function makeRouteSearchItem(fromAirport, toAirport, matchingJets = [], options = {}) {
  const title = routeSearchTitle(fromAirport, toAirport, options);
  return {
    key: `route:${fromAirport?.id || options.fromCode || "DEP"}-${toAirport?.id || options.toCode || "ARR"}`,
    type: "route",
    id: title,
    title,
    meta: [
      fromAirport ? airportDisplayName(fromAirport) : options.fromCode,
      toAirport ? airportDisplayName(toAirport) : options.toCode
    ].filter(Boolean).join(" | "),
    badge: matchingJets.length ? `${matchingJets.length} LIVE` : "ROUTE",
    badgeClass: matchingJets.length ? "live" : "route",
    sortScore: options.sortScore ?? 0,
    priority: -matchingJets.length,
    entity: {
      fromAirport,
      toAirport,
      fromCode: options.fromCode,
      toCode: options.toCode,
      matchingJets
    },
    actions: ["route-active", "fit-route", "route-departures", "route-arrivals"]
  };
}

function makeOperatorSearchItem(operator, jets, options = {}) {
  const liveCount = jets.filter((jet) => aircraftFreshnessState(jet) !== "expired").length;
  const typeCount = new Set(jets.map((jet) => firstMatchedValue(jet.aircraftTypeCode, jet.model)).filter((value) => !missingValue(value))).size;
  return {
    key: `operator:${operator}`,
    type: "operator",
    id: operator,
    title: operator,
    meta: `${liveCount} live aircraft | ${typeCount || jets.length} type${typeCount === 1 ? "" : "s"}`,
    badge: "OPERATOR",
    badgeClass: "operator",
    sortScore: options.sortScore ?? searchMatchScore(options.query, [operator]),
    priority: -liveCount,
    entity: { operator, jets },
    actions: ["operator-live"]
  };
}

function makeCountrySearchItem(country, airportList, options = {}) {
  const majorCount = airportList.filter((airport) => airportPriorityLevel(airport) <= 2).length;
  return {
    key: `country:${country}`,
    type: "country",
    id: country,
    title: country,
    meta: `${airportList.length} airports | ${majorCount} major business airports`,
    badge: "COUNTRY",
    badgeClass: "country",
    sortScore: options.sortScore ?? searchMatchScore(options.query, [country]),
    priority: -airportList.length,
    entity: { country, airports: airportList },
    actions: ["country-airports"]
  };
}

function buildSearchGroup(type, label, items) {
  const sorted = items
    .filter((item) => item && Number.isFinite(Number(item.sortScore)))
    .sort(compareSearchItems);
  const total = sorted.length;
  const showAll = state.search.showAllGroups.has(type);
  const visibleLimit = showAll ? searchPanelMaxItems : searchGroupLimit;
  const visibleItems = sorted.slice(0, visibleLimit);
  visibleItems.forEach((item) => state.search.itemMap.set(item.key, item));
  return {
    type,
    label,
    total,
    visibleCount: visibleItems.length,
    showAll,
    items: visibleItems
  };
}

function buildRouteSearchGroups(routeMatch) {
  const groups = [];
  const airportsForRoute = [routeMatch.fromAirport, routeMatch.toAirport].filter(Boolean);
  const matchingJets = routeMatch.fromAirport && routeMatch.toAirport
    ? aircraftSearchData().filter((jet) => jetMatchesRoute(jet, routeMatch.fromAirport, routeMatch.toAirport))
    : [];
  const endpointGroup = buildSearchGroup(
    "airports",
    "Airports",
    airportsForRoute.map((airport, index) => makeAirportSearchItem(airport, {
      query: index === 0 ? routeMatch.fromCode : routeMatch.toCode,
      sortScore: index
    }))
  );
  if (endpointGroup.total) groups.push(endpointGroup);

  if (routeMatch.fromAirport && routeMatch.toAirport) {
    groups.push(buildSearchGroup("routes", "Routes", [
      makeRouteSearchItem(routeMatch.fromAirport, routeMatch.toAirport, matchingJets, {
        fromCode: routeMatch.fromCode,
        toCode: routeMatch.toCode,
        sortScore: 0
      })
    ]));
  }

  const liveGroup = buildSearchGroup(
    "liveAircraft",
    "Live aircraft",
    matchingJets.map((jet) => makeLiveAircraftSearchItem(jet, { query: routeMatch.suggestion, sortScore: 0 }))
  );
  if (liveGroup.total) groups.push(liveGroup);

  const tripGroup = buildSearchGroup(
    "trips",
    "Trips",
    matchingJets.map((jet) => makeTripSearchItem(jet, { query: routeMatch.suggestion, sortScore: 0 }))
  );
  if (tripGroup.total) groups.push(tripGroup);
  return groups;
}

function buildRouteCandidateItems(query) {
  const routeItems = new Map();
  const parsed = parseRouteSearchQuery(query);
  if (parsed?.fromAirport && parsed?.toAirport) {
    const matchingJets = aircraftSearchData().filter((jet) => jetMatchesRoute(jet, parsed.fromAirport, parsed.toAirport));
    const item = makeRouteSearchItem(parsed.fromAirport, parsed.toAirport, matchingJets, {
      fromCode: parsed.fromCode,
      toCode: parsed.toCode,
      sortScore: parsed.direct ? 0 : 1
    });
    routeItems.set(item.key, item);
  }
  aircraftSearchData().forEach((jet) => {
    const fromAirport = airportByCode(jet.from || jet.depAirportCode);
    const toAirport = airportByCode(jet.to || jet.arrAirportCode);
    if (!fromAirport || !toAirport) {
      return;
    }
    const title = routeSearchTitle(fromAirport, toAirport);
    const score = searchMatchScore(query, [
      title,
      `${fromAirport.id}-${toAirport.id}`,
      `${fromAirport.iata || fromAirport.id}-${toAirport.iata || toAirport.id}`,
      fromAirport.name,
      toAirport.name,
      jet.from,
      jet.to
    ]);
    if (!Number.isFinite(score)) {
      return;
    }
    const key = `route:${fromAirport.id}-${toAirport.id}`;
    const existing = routeItems.get(key);
    if (existing) {
      existing.entity.matchingJets.push(jet);
      existing.badge = `${existing.entity.matchingJets.length} LIVE`;
      existing.badgeClass = "live";
      existing.priority = -existing.entity.matchingJets.length;
      existing.sortScore = Math.min(existing.sortScore, score);
      return;
    }
    routeItems.set(key, makeRouteSearchItem(fromAirport, toAirport, [jet], { sortScore: score }));
  });
  return [...routeItems.values()];
}

function buildOperatorGroups(query) {
  const operators = new Map();
  aircraftSearchData().forEach((jet) => {
    const operator = firstMatchedValue(jet.operator, jet.owner, jet.company);
    if (missingValue(operator)) {
      return;
    }
    if (!operators.has(operator)) {
      operators.set(operator, []);
    }
    operators.get(operator).push(jet);
  });
  return [...operators.entries()]
    .map(([operator, jets]) => makeOperatorSearchItem(operator, jets, { query }))
    .filter((item) => Number.isFinite(item.sortScore));
}

function buildCountryItems(query) {
  const countries = new Map();
  airports.forEach((airport) => {
    if (missingValue(airport.country)) {
      return;
    }
    const country = String(airport.country);
    if (!countries.has(country)) {
      countries.set(country, []);
    }
    countries.get(country).push(airport);
  });
  return [...countries.entries()]
    .map(([country, airportList]) => makeCountrySearchItem(country, airportList, { query }))
    .filter((item) => Number.isFinite(item.sortScore));
}

function buildGeneralSearchGroups(query) {
  const routeMatch = parseRouteSearchQuery(query);
  if (routeMatch?.direct && routeMatch.fromAirport && routeMatch.toAirport) {
    return buildRouteSearchGroups(routeMatch);
  }

  const aircraftItems = aircraftSearchData()
    .map((jet) => makeLiveAircraftSearchItem(jet, { query }))
    .filter((item) => Number.isFinite(item.sortScore));
  const tripItems = aircraftSearchData()
    .map((jet) => makeTripSearchItem(jet, { query }))
    .filter((item) => Number.isFinite(item.sortScore));
  const airportItems = airports
    .map((airport) => makeAirportSearchItem(airport, { query }))
    .filter((item) => Number.isFinite(item.sortScore));
  const routeItems = buildRouteCandidateItems(query);
  const operatorItems = buildOperatorGroups(query);
  const profileItems = aircraftSearchData()
    .map((jet) => makeAircraftProfileSearchItem(jet, { query }))
    .filter((item) => Number.isFinite(item.sortScore));
  const countryItems = buildCountryItems(query);

  return [
    buildSearchGroup("liveAircraft", "Live aircraft", aircraftItems),
    buildSearchGroup("trips", "Trips", tripItems),
    buildSearchGroup("airports", "Airports", airportItems),
    buildSearchGroup("routes", "Routes", routeItems),
    buildSearchGroup("operators", "Operators", operatorItems),
    buildSearchGroup("aircraftProfiles", "Aircraft profiles", profileItems),
    buildSearchGroup("countries", "Countries", countryItems)
  ].filter((group) => group.total);
}

function buildNearbySearchGroups() {
  const origin = searchMapOrigin();
  const airportItems = airports.map((airport) => makeAirportSearchItem(airport, {
    query: airport.id,
    distanceKm: distanceKmBetweenPositions(origin.center, [airport.lat, airport.lng]),
    distanceEstimated: origin.estimated,
    sortScore: distanceKmBetweenPositions(origin.center, [airport.lat, airport.lng]) ?? 999999
  }));
  const aircraftItems = aircraftSearchData().map((jet) => {
    const distanceKm = distanceKmBetweenPositions(origin.center, currentPosition(jet));
    return makeLiveAircraftSearchItem(jet, {
      query: aircraftDisplayIdentifier(jet),
      distanceKm,
      distanceEstimated: origin.estimated,
      sortScore: distanceKm ?? 999999
    });
  });
  return [
    buildSearchGroup("nearbyAirports", "Nearby airports", airportItems),
    buildSearchGroup("nearbyAircraft", "Nearby live aircraft", aircraftItems)
  ].filter((group) => group.total);
}

function renderSearchPanelHead(title, note = "") {
  return `
    <div class="search-panel-head">
      <strong class="search-panel-title">${escapeHtml(title)}</strong>
      ${note ? `<small class="search-panel-note">${escapeHtml(note)}</small>` : ""}
    </div>
  `;
}

function renderSearchCount(group) {
  return `${group.visibleCount} of ${group.total}`;
}

function searchActionLabel(action) {
  return {
    "show-aircraft": "Show on map",
    "aircraft-info": "Aircraft info",
    "route-focus": "Show route",
    "trip-detail": "Trip detail",
    "show-airport": "Show on map",
    "airport-arrivals": "Arrival board",
    "airport-departures": "Departure board",
    "airport-ground": "Aircraft on ground",
    "route-active": "Show active flights",
    "fit-route": "Fit route",
    "route-departures": "Departures from origin",
    "route-arrivals": "Arrivals to destination",
    "operator-live": "Show live aircraft",
    "country-airports": "Show airports"
  }[action] || action;
}

function renderSearchExpandedFacts(item) {
  if (item.type === "liveAircraft" || item.type === "trip" || item.type === "aircraftProfile") {
    const jet = item.entity;
    const updatedAt = aircraftLastUpdatedAt(jet);
    return `
      <div class="search-expanded-grid">
        <span><small>Altitude</small><strong>${escapeHtml(formatFlightLevel(jet.altitude))}</strong></span>
        <span><small>Speed</small><strong>${escapeHtml(formatSpeed(jet.speed))}</strong></span>
        <span><small>Route</small><strong>${escapeHtml(aircraftRouteLabel(jet))}</strong></span>
        <span><small>Updated</small><strong title="${escapeHtml(formatUtcTime(updatedAt, { date: true, seconds: true }))}">${escapeHtml(formatRelativeUpdatedTime(updatedAt))}</strong></span>
      </div>
    `;
  }
  if (item.type === "airport") {
    const airport = item.entity;
    return `
      <div class="search-expanded-grid">
        <span><small>Code</small><strong>${escapeHtml(airportSearchLabel(airport))}</strong></span>
        <span><small>Arrivals</small><strong>${escapeHtml(displayOrDash(airport.arrivals))}</strong></span>
        <span><small>Departures</small><strong>${escapeHtml(displayOrDash(airport.departures))}</strong></span>
        <span><small>Weather</small><strong>${escapeHtml(displayOrDash(airport.weather))}</strong></span>
      </div>
    `;
  }
  if (item.type === "route") {
    return `
      <div class="search-expanded-grid">
        <span><small>Origin</small><strong>${escapeHtml(item.entity.fromAirport ? airportSearchLabel(item.entity.fromAirport) : item.entity.fromCode)}</strong></span>
        <span><small>Destination</small><strong>${escapeHtml(item.entity.toAirport ? airportSearchLabel(item.entity.toAirport) : item.entity.toCode)}</strong></span>
        <span><small>Live aircraft</small><strong>${escapeHtml(item.entity.matchingJets.length)}</strong></span>
        <span><small>Status</small><strong>${item.entity.matchingJets.length ? "Active" : "No live match"}</strong></span>
      </div>
    `;
  }
  if (item.type === "operator") {
    return `
      <div class="search-expanded-grid">
        <span><small>Live aircraft</small><strong>${escapeHtml(item.entity.jets.length)}</strong></span>
        <span><small>Business jet filter</small><strong>On</strong></span>
      </div>
    `;
  }
  if (item.type === "country") {
    return `
      <div class="search-expanded-grid">
        <span><small>Airports</small><strong>${escapeHtml(item.entity.airports.length)}</strong></span>
        <span><small>Layer</small><strong>Airport index</strong></span>
      </div>
    `;
  }
  return "";
}

function renderSearchExpandedCard(item) {
  return `
    <div class="search-expanded-card">
      ${renderSearchExpandedFacts(item)}
      <div class="search-action-row">
        ${item.actions.map((action) => `
          <button type="button" class="search-action-button" data-search-key="${escapeHtml(item.key)}" data-search-action="${escapeHtml(action)}">
            ${escapeHtml(searchActionLabel(action))}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSearchResultRow(item) {
  const expanded = state.search.expandedKey === item.key;
  return `
    <div class="search-result-wrap">
      <button type="button" class="search-result search-result-row" data-search-key="${escapeHtml(item.key)}" aria-expanded="${expanded ? "true" : "false"}">
        <span class="search-result-main">
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.meta || "")}</small>
        </span>
        <span class="search-result-side">
          <span class="search-badge search-badge-${escapeHtml(item.badgeClass || item.type)}">${escapeHtml(item.badge || "")}</span>
          ${item.distanceText ? `<small>${escapeHtml(item.distanceText)}</small>` : ""}
        </span>
      </button>
      ${expanded ? renderSearchExpandedCard(item) : ""}
    </div>
  `;
}

function renderSearchGroups(groups, options = {}) {
  const groupHtml = groups.map((group) => `
    <section class="search-group" data-search-group="${escapeHtml(group.type)}">
      <div class="search-group-head">
        <span>${escapeHtml(group.label)}</span>
        <small>${escapeHtml(renderSearchCount(group))}</small>
      </div>
      ${group.items.map(renderSearchResultRow).join("")}
      ${group.total > group.visibleCount ? `
        <button type="button" class="search-show-all" data-search-show-group="${escapeHtml(group.type)}">
          Show all ${escapeHtml(group.total)} results
        </button>
      ` : ""}
    </section>
  `).join("");
  const footer = options.shortcuts === false ? "" : renderSearchShortcuts(options.query || "");
  return `${options.head || ""}${groupHtml}${footer}`;
}

function renderSearchShortcuts(query = "", routeMatch = parseRouteSearchQuery(query)) {
  return `
    <div class="search-shortcuts">
      <div class="search-group-head">
        <span>Shortcuts to find</span>
      </div>
      ${searchShortcutConfig.map((shortcut) => `
        <button type="button" class="search-shortcut" data-search-shortcut="${escapeHtml(shortcut.key)}"
          ${shortcut.key === "route" && routeMatch ? `data-route-from="${escapeHtml(routeMatch.fromCode)}" data-route-to="${escapeHtml(routeMatch.toCode)}"` : ""}>
          <strong>${escapeHtml(shortcut.label)}</strong>
          <small>${escapeHtml(shortcut.key === "route" && routeMatch?.spaced ? `Try ${routeMatch.suggestion}` : shortcut.description)}</small>
        </button>
      `).join("")}
    </div>
  `;
}

function renderNoMatchSearch(query) {
  const routeMatch = parseRouteSearchQuery(query);
  return `
    ${renderSearchPanelHead("No matches found", "Try an airport code, registration, operator, or DEP-ARR route.")}
    <div class="search-empty">
      <strong>${escapeHtml(query.trim())}</strong>
      <small>Live database and local cache records only.</small>
    </div>
    ${renderSearchShortcuts(query, routeMatch)}
    <div class="search-help">Use IATA/ICAO for airports, partial registrations for aircraft, or DEP-ARR for route search.</div>
  `;
}

function renderRouteSearchPanel() {
  const fromAirport = airportByCode(state.search.routeFrom);
  const toAirport = airportByCode(state.search.routeTo);
  const canSearch = Boolean(fromAirport && toAirport && fromAirport.id !== toAirport.id);
  const routeHint = canSearch
    ? `${routeSearchTitle(fromAirport, toAirport)} ready`
    : "Enter two valid IATA or ICAO airport codes.";
  return `
    ${renderSearchPanelHead("Flight by route", "Search by airport name, IATA or ICAO. You can also type DEP-ARR in the main field.")}
    <div class="search-inline-form">
      <label class="search-inline-field">
        <span>From</span>
        <input class="search-inline-input" data-search-field="route-from" value="${escapeHtml(state.search.routeFrom)}" placeholder="LHR or EGLL" autocomplete="off">
      </label>
      <label class="search-inline-field">
        <span>To</span>
        <input class="search-inline-input" data-search-field="route-to" value="${escapeHtml(state.search.routeTo)}" placeholder="JFK or KJFK" autocomplete="off">
      </label>
      <button type="button" class="search-action-button search-route-submit" data-search-action="run-route-panel" ${canSearch ? "" : "disabled"}>
        Search
      </button>
    </div>
    <div id="searchRouteHint" class="search-help">${escapeHtml(routeHint)}</div>
    ${renderSearchShortcuts(state.search.query)}
  `;
}

function buildOperatorPanelGroups() {
  const query = state.search.operatorQuery || "";
  const items = buildOperatorGroups(query || " ");
  if (query) {
    return [buildSearchGroup("operators", "Operators", items)];
  }
  const allItems = new Map();
  aircraftSearchData().forEach((jet) => {
    const operator = firstMatchedValue(jet.operator, jet.owner, jet.company);
    if (missingValue(operator)) {
      return;
    }
    if (!allItems.has(operator)) {
      allItems.set(operator, []);
    }
    allItems.get(operator).push(jet);
  });
  return [buildSearchGroup("operators", "Operators", [...allItems.entries()].map(([operator, jets]) => makeOperatorSearchItem(operator, jets, { sortScore: 0 })))];
}

function renderOperatorSearchPanel() {
  const groups = buildOperatorPanelGroups();
  const hasResults = groups.some((group) => group.total);
  return `
    ${renderSearchPanelHead("Live aircraft by operator", "Business jet operators and fleets from the current data cache.")}
    <label class="search-inline-field search-inline-field-full">
      <span>Operator name or code</span>
      <input class="search-inline-input" data-search-field="operator-query" value="${escapeHtml(state.search.operatorQuery)}" placeholder="Operator or fleet" autocomplete="off">
    </label>
    ${hasResults ? renderSearchGroups(groups, { shortcuts: false }) : `<div class="search-empty"><strong>No operators found</strong><small>Waiting for live aircraft data.</small></div>`}
  `;
}

function buildCountryPanelGroups() {
  if (state.search.selectedCountry) {
    const country = state.search.selectedCountry;
    const airportItems = airports
      .filter((airport) => String(airport.country) === country)
      .map((airport) => makeAirportSearchItem(airport, { sortScore: airportPriorityLevel(airport) }));
    return [buildSearchGroup("countryAirports", `${country} airports`, airportItems)];
  }
  const query = state.search.countryQuery || "";
  if (query) {
    return [buildSearchGroup("countries", "Countries", buildCountryItems(query))];
  }
  const countries = new Map();
  airports.forEach((airport) => {
    const country = airport.country;
    if (missingValue(country)) {
      return;
    }
    if (!countries.has(country)) {
      countries.set(country, []);
    }
    countries.get(country).push(airport);
  });
  return [buildSearchGroup("countries", "Countries", [...countries.entries()].map(([country, airportList]) => makeCountrySearchItem(country, airportList, { sortScore: 0 })))];
}

function renderCountrySearchPanel() {
  const groups = buildCountryPanelGroups();
  const selected = state.search.selectedCountry;
  return `
    ${renderSearchPanelHead(selected ? `${selected} airports` : "Airports by country", selected ? "Airport list sorted by business aviation relevance." : "Search country or region, then choose an airport list.")}
    ${selected ? `
      <button type="button" class="search-show-all search-back-button" data-search-action="country-back">Back to countries</button>
    ` : `
      <label class="search-inline-field search-inline-field-full">
        <span>Country name</span>
        <input class="search-inline-input" data-search-field="country-query" value="${escapeHtml(state.search.countryQuery)}" placeholder="Country or region" autocomplete="off">
      </label>
    `}
    ${renderSearchGroups(groups, { shortcuts: false })}
  `;
}

function renderNearbySearchPanel() {
  const origin = searchMapOrigin();
  const groups = buildNearbySearchGroups();
  return `
    ${renderSearchPanelHead("Nearby", `Distances are estimated from ${origin.source}.`)}
    ${renderSearchGroups(groups, { shortcuts: false })}
  `;
}

function updateSearchActiveRow() {
  const elements = searchSelectableElements();
  elements.forEach((element, index) => {
    element.classList.toggle("active", index === state.search.activeIndex);
  });
}

function renderSearchPanel() {
  const panel = searchPanelElement();
  if (!panel) {
    return;
  }
  state.search.itemMap = new Map();

  if (state.search.mode === "route") {
    panel.innerHTML = renderRouteSearchPanel();
    panel.hidden = false;
    updateRouteShortcutControls();
    return;
  }
  if (state.search.mode === "operator") {
    panel.innerHTML = renderOperatorSearchPanel();
    panel.hidden = false;
    updateSearchActiveRow();
    return;
  }
  if (state.search.mode === "country") {
    panel.innerHTML = renderCountrySearchPanel();
    panel.hidden = false;
    updateSearchActiveRow();
    return;
  }
  if (state.search.mode === "nearby" || ["nearby", "near me"].includes(normalizeSearchText(state.search.query))) {
    state.search.mode = "nearby";
    panel.innerHTML = renderNearbySearchPanel();
    panel.hidden = false;
    updateSearchActiveRow();
    return;
  }

  const query = state.search.query || "";
  if (!query.trim()) {
    panel.hidden = true;
    panel.innerHTML = "";
    state.search.expandedKey = "";
    state.search.activeIndex = -1;
    return;
  }

  const routeMatch = parseRouteSearchQuery(query);
  const groups = routeMatch?.direct && routeMatch.fromAirport && routeMatch.toAirport
    ? buildRouteSearchGroups(routeMatch)
    : buildGeneralSearchGroups(query);
  panel.innerHTML = groups.length
    ? renderSearchGroups(groups, { query })
    : renderNoMatchSearch(query);
  panel.hidden = false;
  const selectableCount = searchSelectableElements().length;
  if (selectableCount && state.search.activeIndex >= selectableCount) {
    state.search.activeIndex = selectableCount - 1;
  }
  updateSearchActiveRow();
}

function renderSearch(query) {
  state.search.mode = "results";
  state.search.query = query;
  state.search.activeIndex = -1;
  state.search.expandedKey = "";
  state.search.showAllGroups.clear();
  renderSearchPanel();
}

function closeSearchPanel(options = {}) {
  const panel = searchPanelElement();
  const input = searchInputElement();
  if (options.clearInput !== false && input) {
    input.value = "";
    state.search.query = "";
  }
  state.search.mode = "results";
  state.search.activeIndex = -1;
  state.search.expandedKey = "";
  state.search.itemMap = new Map();
  state.search.showAllGroups.clear();
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = "";
  }
}

function toggleSearchItem(key) {
  if (!state.search.itemMap.has(key)) {
    return;
  }
  state.search.expandedKey = state.search.expandedKey === key ? "" : key;
  renderSearchPanel();
}

function setAirportPanelTab(tab) {
  state.airportTab = tab || "all";
  document.querySelectorAll("[data-airport-tab]").forEach((button) => {
    const isActive = button.dataset.airportTab === state.airportTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  const airport = selectedAirport();
  if (airport) {
    if (state.airportTab === "ground") {
      loadAirportGround(airport);
      setAirportSegment("ground");
      return;
    }
    if (state.airportTab === "arrivals" || state.airportTab === "departures") {
      setAirportSegment("dynamic");
      state.airportDynamicFilter = state.airportTab;
      renderAirportDynamicPanel(airport);
      return;
    }
    setAirportSegment("ground");
  }
}

function selectSearchAircraft(id, options = {}) {
  const jet = businessJets.find((item) => item.id === id);
  if (!jet) {
    return;
  }
  selectAircraft(id, options.pan !== false);
  if (options.routeFocus) {
    setRouteFocus(true);
  } else if (options.fitRoute) {
    fitSelectedRouteBounds(jet);
  }
  closeSearchPanel();
}

function selectSearchAirport(id, tab = "all") {
  const airport = airportById(id);
  if (!airport) {
    return;
  }
  selectAirport(id);
  setAirportPanelTab(tab);
  state.map?.setView?.([airport.lat, airport.lng], Math.max(currentZoom(), 7));
  closeSearchPanel();
}

function fitSearchRoute(item) {
  const route = item?.entity;
  const points = [
    route?.fromAirport ? [route.fromAirport.lat, route.fromAirport.lng] : null,
    route?.toAirport ? [route.toAirport.lat, route.toAirport.lng] : null,
    ...(route?.matchingJets || []).map((jet) => currentPosition(jet))
  ].filter(Boolean);
  state.map?.fitRouteBounds?.(points, effectiveRouteFocusPadding());
}

function executeSearchAction(key, action) {
  if (action === "run-route-panel") {
    const fromAirport = airportByCode(state.search.routeFrom);
    const toAirport = airportByCode(state.search.routeTo);
    if (!fromAirport || !toAirport || fromAirport.id === toAirport.id) {
      updateRouteShortcutControls();
      return;
    }
    const query = routeSearchTitle(fromAirport, toAirport);
    state.search.query = query;
    state.search.mode = "results";
    state.search.expandedKey = "";
    const input = searchInputElement();
    if (input) {
      input.value = query;
      input.focus();
    }
    renderSearchPanel();
    return;
  }

  if (action === "country-back") {
    state.search.selectedCountry = "";
    state.search.expandedKey = "";
    renderSearchPanel();
    return;
  }

  const item = state.search.itemMap.get(key);
  if (!item) {
    return;
  }

  if (action === "show-aircraft" || action === "aircraft-info") {
    selectSearchAircraft(item.id, { pan: action === "show-aircraft" });
    return;
  }
  if (action === "route-focus") {
    selectSearchAircraft(item.id, { routeFocus: true });
    return;
  }
  if (action === "show-airport") {
    selectSearchAirport(item.id, "all");
    return;
  }
  if (action === "airport-arrivals") {
    selectSearchAirport(item.id, "arrivals");
    return;
  }
  if (action === "airport-departures") {
    selectSearchAirport(item.id, "departures");
    return;
  }
  if (action === "airport-ground") {
    selectSearchAirport(item.id, "ground");
    return;
  }
  if (action === "fit-route") {
    fitSearchRoute(item);
    return;
  }
  if (action === "route-active") {
    state.search.query = item.title;
    state.search.mode = "results";
    state.search.expandedKey = "";
    const input = searchInputElement();
    if (input) {
      input.value = item.title;
    }
    renderSearchPanel();
    return;
  }
  if (action === "route-departures") {
    const airport = item.entity?.fromAirport;
    if (airport) {
      selectSearchAirport(airport.id, "departures");
    }
    return;
  }
  if (action === "route-arrivals") {
    const airport = item.entity?.toAirport;
    if (airport) {
      selectSearchAirport(airport.id, "arrivals");
    }
    return;
  }
  if (action === "operator-live") {
    state.search.query = item.title;
    state.search.mode = "results";
    state.search.expandedKey = "";
    const input = searchInputElement();
    if (input) {
      input.value = item.title;
    }
    renderSearchPanel();
    return;
  }
  if (action === "country-airports") {
    state.search.mode = "country";
    state.search.selectedCountry = item.title;
    state.search.expandedKey = "";
    renderSearchPanel();
  }
}

function handleSearchShortcut(shortcut, trigger = {}) {
  state.search.expandedKey = "";
  state.search.activeIndex = -1;
  if (shortcut === "route") {
    state.search.mode = "route";
    state.search.routeFrom = normalizeSearchCode(trigger.dataset?.routeFrom || state.search.routeFrom);
    state.search.routeTo = normalizeSearchCode(trigger.dataset?.routeTo || state.search.routeTo);
  } else if (shortcut === "operator") {
    state.search.mode = "operator";
    state.search.operatorQuery = "";
  } else if (shortcut === "country") {
    state.search.mode = "country";
    state.search.countryQuery = "";
    state.search.selectedCountry = "";
  } else if (shortcut === "nearby") {
    state.search.mode = "nearby";
  }
  renderSearchPanel();
  requestAnimationFrame(() => {
    const target = searchPanelElement()?.querySelector(".search-inline-input");
    target?.focus();
  });
}

function updateRouteShortcutControls() {
  const fromAirport = airportByCode(state.search.routeFrom);
  const toAirport = airportByCode(state.search.routeTo);
  const submit = searchPanelElement()?.querySelector("[data-search-action='run-route-panel']");
  const hint = document.getElementById("searchRouteHint");
  const canSearch = Boolean(fromAirport && toAirport && fromAirport.id !== toAirport.id);
  if (submit) {
    submit.disabled = !canSearch;
  }
  if (hint) {
    if (canSearch) {
      hint.textContent = `${routeSearchTitle(fromAirport, toAirport)} ready`;
    } else if (fromAirport && toAirport && fromAirport.id === toAirport.id) {
      hint.textContent = "Choose two different airports.";
    } else {
      hint.textContent = "Enter two valid IATA or ICAO airport codes.";
    }
  }
}

function searchSelectableElements() {
  return [...(searchPanelElement()?.querySelectorAll([
    ".search-result-row[data-search-key]",
    ".search-shortcut[data-search-shortcut]",
    ".search-show-all[data-search-show-group]",
    ".search-action-button[data-search-action]:not(:disabled)"
  ].join(",")) || [])];
}

function moveSearchActive(delta) {
  const elements = searchSelectableElements();
  if (!elements.length) {
    state.search.activeIndex = -1;
    return;
  }
  state.search.activeIndex = (state.search.activeIndex + delta + elements.length) % elements.length;
  updateSearchActiveRow();
  elements[state.search.activeIndex]?.scrollIntoView({ block: "nearest" });
}

function activateSearchActive() {
  const element = searchSelectableElements()[state.search.activeIndex];
  element?.click();
}

function handleSearchInputKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    event.stopPropagation();
    moveSearchActive(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    moveSearchActive(-1);
    return;
  }
  if (event.key === "Enter") {
    if (state.search.activeIndex >= 0) {
      event.preventDefault();
      event.stopPropagation();
      activateSearchActive();
    }
    return;
  }
  if (event.key === "Escape" && searchPanelIsOpen()) {
    event.preventDefault();
    event.stopPropagation();
    closeSearchPanel();
  }
}

function handleSearchPanelClick(event) {
  event.stopPropagation();
  const actionButton = event.target.closest("[data-search-action]");
  if (actionButton) {
    event.preventDefault();
    executeSearchAction(actionButton.dataset.searchKey || "", actionButton.dataset.searchAction);
    return;
  }
  const showAllButton = event.target.closest("[data-search-show-group]");
  if (showAllButton) {
    event.preventDefault();
    state.search.showAllGroups.add(showAllButton.dataset.searchShowGroup);
    renderSearchPanel();
    return;
  }
  const shortcut = event.target.closest("[data-search-shortcut]");
  if (shortcut) {
    event.preventDefault();
    handleSearchShortcut(shortcut.dataset.searchShortcut, shortcut);
    return;
  }
  const row = event.target.closest("[data-search-key]");
  if (row) {
    event.preventDefault();
    toggleSearchItem(row.dataset.searchKey);
  }
}

function handleSearchPanelInput(event) {
  const field = event.target.dataset.searchField;
  if (!field) {
    return;
  }
  if (field === "route-from") {
    state.search.routeFrom = normalizeSearchCode(event.target.value);
    updateRouteShortcutControls();
    return;
  }
  if (field === "route-to") {
    state.search.routeTo = normalizeSearchCode(event.target.value);
    updateRouteShortcutControls();
    return;
  }
  if (field === "operator-query") {
    state.search.operatorQuery = event.target.value;
    state.search.expandedKey = "";
    renderSearchPanel();
    requestAnimationFrame(() => searchPanelElement()?.querySelector("[data-search-field='operator-query']")?.focus());
    return;
  }
  if (field === "country-query") {
    state.search.countryQuery = event.target.value;
    state.search.expandedKey = "";
    renderSearchPanel();
    requestAnimationFrame(() => searchPanelElement()?.querySelector("[data-search-field='country-query']")?.focus());
  }
}

function scheduleSearchRender(value) {
  window.clearTimeout(searchInputRenderTimer);
  searchInputRenderTimer = window.setTimeout(() => renderSearch(value), 180);
}

function updateMapModeClass() {
  const shell = document.querySelector(".fr-shell");
  shell.classList.toggle("google-map-mode", state.mapProvider === "google");
  shell.classList.toggle("leaflet-map-mode", state.mapProvider === "leaflet");
}

function clearNativeMapContainer() {
  const mapElement = document.getElementById("map");
  if (mapElement) {
    mapElement.replaceChildren();
    mapElement.removeAttribute("style");
    mapElement.className = "map";
  }
  document.getElementById("aircraftLayer").innerHTML = "";
  document.getElementById("airportLayer").innerHTML = "";
  state.tracks.clear();
  state.weatherLayer = null;
}

async function fallbackToLeafletMap(reason = "Google Maps unavailable") {
  if (state.mapFallbackInProgress || state.mapProvider === "leaflet" || state.map?.type === "leaflet") {
    return;
  }
  state.mapFallbackInProgress = true;
  state.mapFallbackReason = reason;
  const previousView = state.map?.getView?.() || {
    center: state.initialMapCenter,
    zoom: defaultZoom()
  };
  try {
    state.map?.destroy?.();
    clearNativeMapContainer();
    state.map = new LeafletMapEngine();
    await state.map.ready();
    state.mapProvider = state.map.type;
    updateMapModeClass();
    state.map.setView(previousView.center || state.initialMapCenter, previousView.zoom || defaultZoom());
    bindMapViewportEvents();
    renderViewport();
    refreshAirportData("map-fallback");
    refreshRealtimeData("map-fallback");
  } finally {
    state.mapFallbackInProgress = false;
  }
}

function scheduleGoogleMapsFallback(reason) {
  window.setTimeout(() => {
    fallbackToLeafletMap(reason);
  }, 0);
}

function bindMapViewportEvents() {
  const refreshViewportData = debounce(() => {
    state.isInteractingWithMap = false;
    setMapInteractionPhase("idle");
    renderViewport();
    refreshRealtimeData("viewport");
  }, mapLoadingConfig.viewportDebounceMs);
  state.map.onViewportChange({
    onInteractionStart: () => {
      state.isInteractingWithMap = true;
      setMapInteractionPhase("active");
    },
    onVisualChange: () => {
      renderViewportForMapVisualChange();
    },
    onIdle: refreshViewportData
  });
  state.map.onMapClick?.(() => {
    if (performance.now() - state.lastTargetSelectAt < 180) {
      return;
    }
    if (state.selectedKind || state.selectedId) {
      clearSelection();
    }
  });
}

function updateRouteLegend() {
  const legend = document.getElementById("routeLegend");
  const title = document.getElementById("routeLegendTitle");
  const gradient = document.getElementById("routeGradient");
  const scale = document.getElementById("routeLegendScale");
  if (!legend || !title || !gradient || !scale) {
    return;
  }

  legend.hidden = !state.trails || state.selectedKind !== "aircraft" || !selectedAircraft();
  const isSpeed = state.routeColorMode === "speed";
  title.textContent = isSpeed ? "Ground speed trail" : "Altitude trail";
  gradient.classList.toggle("route-gradient-speed", isSpeed);
  gradient.classList.toggle("route-gradient-altitude", !isSpeed);
  scale.innerHTML = isSpeed
    ? "<span>40kt</span><span>360</span><span>520+</span>"
    : "<span>300ft</span><span>20k</span><span>43k+</span>";
  document.querySelectorAll("[data-route-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.routeMode === state.routeColorMode);
  });
}

function setRouteColorMode(mode) {
  if (!["altitude", "speed"].includes(mode) || state.routeColorMode === mode) {
    return;
  }
  state.routeColorMode = mode;
  updateRouteLegend();
  renderAircraft();
}

function syncSpeedAltitudeUnitButtons() {
  document.querySelectorAll("[data-chart-unit]").forEach((button) => {
    const isActive = button.dataset.chartUnit === chartUnitMode();
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function setSpeedAltitudeUnit(unit) {
  if (!["imperial", "metric"].includes(unit) || chartUnitMode() === unit) {
    return;
  }
  state.speedAltitudeUnit = unit;
  syncSpeedAltitudeUnitButtons();
  const jet = selectedAircraft();
  if (jet) {
    renderSpeedAltitudeChart(jet);
  }
}

function handleDetailSegmentKeydown(event, selector) {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
    return;
  }
  const buttons = [...document.querySelectorAll(selector)].filter((button) => !button.hidden);
  const index = buttons.indexOf(event.currentTarget);
  if (index === -1) {
    return;
  }
  event.preventDefault();
  const offset = event.key === "ArrowRight" ? 1 : -1;
  const next = buttons[(index + offset + buttons.length) % buttons.length];
  next.focus();
  next.click();
}

function fieldToastElement() {
  return document.getElementById("fieldToast");
}

function moveFieldToast(event) {
  const toast = fieldToastElement();
  if (!toast || toast.hidden) {
    return;
  }
  const padding = 14;
  const x = Math.min(window.innerWidth - toast.offsetWidth - padding, Math.max(padding, event.clientX + 14));
  const y = Math.min(window.innerHeight - toast.offsetHeight - padding, Math.max(padding, event.clientY + 16));
  toast.style.left = `${x}px`;
  toast.style.top = `${y}px`;
}

function showFieldToast(target, event) {
  const toast = fieldToastElement();
  const text = target?.dataset?.toastText || "";
  if (!toast || !text) {
    return;
  }
  const overflowing = target.scrollWidth > target.clientWidth + 1 || target.scrollHeight > target.clientHeight + 1;
  if (!overflowing && text.length < 18) {
    return;
  }
  toast.textContent = text;
  toast.hidden = false;
  moveFieldToast(event);
}

function hideFieldToast() {
  const toast = fieldToastElement();
  if (toast) {
    toast.hidden = true;
  }
}

function handleFieldToastPointerOver(event) {
  const target = event.target.closest("[data-toast-text]");
  if (target) {
    showFieldToast(target, event);
  }
}

function handleFieldToastPointerMove(event) {
  moveFieldToast(event);
}

function handleFieldToastPointerOut(event) {
  if (event.target.closest("[data-toast-text]")) {
    hideFieldToast();
  }
}

function historyActivityTooltipElement() {
  let tooltip = document.getElementById("historyActivityTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "historyActivityTooltip";
    tooltip.className = "history-activity-tooltip-floating";
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function historyActivityTooltipTarget(event) {
  return event.target?.closest?.("[data-history-activity-tooltip]") || null;
}

function moveHistoryActivityTooltip(target) {
  const tooltip = historyActivityTooltipElement();
  if (!target || !tooltip || tooltip.hidden) {
    return;
  }
  const margin = 10;
  const gap = 9;
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const width = tooltipRect.width || 160;
  const height = tooltipRect.height || 32;
  let left = targetRect.left + targetRect.width / 2 - width / 2;
  left = Math.min(window.innerWidth - width - margin, Math.max(margin, left));
  let top = targetRect.top - height - gap;
  if (top < margin) {
    top = Math.min(window.innerHeight - height - margin, targetRect.bottom + gap);
  }
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(Math.max(margin, top))}px`;
}

function showHistoryActivityTooltip(target) {
  const text = target?.dataset?.historyActivityTooltip || "";
  const tooltip = historyActivityTooltipElement();
  if (!text || !tooltip) {
    return;
  }
  tooltip.textContent = text;
  tooltip.hidden = false;
  moveHistoryActivityTooltip(target);
}

function hideHistoryActivityTooltip() {
  const tooltip = document.getElementById("historyActivityTooltip");
  if (tooltip) {
    tooltip.hidden = true;
  }
}

function handleHistoryActivityTooltipPointerOver(event) {
  const target = historyActivityTooltipTarget(event);
  if (target) {
    showHistoryActivityTooltip(target);
  }
}

function handleHistoryActivityTooltipPointerMove(event) {
  const target = historyActivityTooltipTarget(event);
  if (target) {
    moveHistoryActivityTooltip(target);
  }
}

function handleHistoryActivityTooltipPointerOut(event) {
  const target = historyActivityTooltipTarget(event);
  if (target && !target.contains(event.relatedTarget)) {
    hideHistoryActivityTooltip();
  }
}

function handleHistoryActivityTooltipFocusIn(event) {
  const target = historyActivityTooltipTarget(event);
  if (target) {
    showHistoryActivityTooltip(target);
  }
}

function handleHistoryActivityTooltipFocusOut(event) {
  if (historyActivityTooltipTarget(event)) {
    hideHistoryActivityTooltip();
  }
}

function bindEvents() {
  updateLayoutProfile();
  const airportLayerSelect = document.getElementById("airportLayerMode");
  airportLayerSelect.value = state.airportLayerMode;
  state.airports = state.airportLayerMode !== "off";
  document.addEventListener("pointermove", updateAirportHoverPointer, { passive: true });
  document.getElementById("filtersButton").addEventListener("click", () => showFilterSheet());
  document.getElementById("closeFilters").addEventListener("click", () => showFilterSheet(false));
  document.getElementById("labelToggle").addEventListener("change", (event) => {
    state.labels = event.target.checked;
    renderAircraft();
    renderAirports();
  });
  document.getElementById("trailToggle").addEventListener("change", (event) => {
    state.trails = event.target.checked;
    updateRouteLegend();
    if (!state.trails && routeFocusActive()) {
      setAircraftMapMode("follow");
    } else {
      renderAircraft();
      syncSelectedRouteVisuals();
    }
  });
  airportLayerSelect.addEventListener("change", (event) => {
    state.airportLayerMode = event.target.value;
    state.airports = event.target.value !== "off";
    renderAirports();
    updateRail();
  });
  document.getElementById("weatherButton").addEventListener("click", () => showWeatherLayer(!state.weather));
  document.getElementById("settingsButton").addEventListener("click", () => {
    state.map.setView(defaultMapCenter(), defaultZoom());
  });
  document.getElementById("locateButton").addEventListener("click", async (event) => {
    await setMapToUserLocation(event.currentTarget);
  });
  document.getElementById("closeDetailPanel").addEventListener("click", () => clearSelection());
  document.querySelector(".rail-close").addEventListener("click", () => {
    document.querySelector(".right-rail").hidden = true;
    document.querySelector(".fr-shell").classList.remove("rail-open");
    if (routeFocusActive()) {
      requestAnimationFrame(() => fitSelectedRouteBounds());
    }
  });
  document.querySelector(".menu-button").addEventListener("click", () => {
    const rail = document.querySelector(".right-rail");
    rail.hidden = !rail.hidden;
    document.querySelector(".fr-shell").classList.toggle("rail-open", !rail.hidden);
    updateRail();
    if (routeFocusActive()) {
      requestAnimationFrame(() => fitSelectedRouteBounds());
    }
  });
  document.getElementById("routeFocusButton")?.addEventListener("click", () => {
    setAircraftMapMode("route");
  });
  document.getElementById("routeFromButton")?.addEventListener("click", (event) => {
    selectAirportFromCode(event.currentTarget.dataset.airportCode);
  });
  document.getElementById("routeToButton")?.addEventListener("click", (event) => {
    selectAirportFromCode(event.currentTarget.dataset.airportCode);
  });
  document.getElementById("followAircraftButton")?.addEventListener("click", () => {
    setAircraftMapMode("follow");
  });
  document.querySelectorAll("[data-aircraft-segment]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSegment = button.dataset.aircraftSegment;
      setAircraftSegment(nextSegment, { resetScroll: nextSegment === "journey" && state.aircraftSegment !== "journey" });
    });
    button.addEventListener("keydown", (event) => handleDetailSegmentKeydown(event, "[data-aircraft-segment]"));
  });
  document.querySelectorAll("[data-airport-segment]").forEach((button) => {
    button.addEventListener("click", () => {
      state.airportTab = "all";
      setAirportSegment(button.dataset.airportSegment);
    });
    button.addEventListener("keydown", (event) => handleDetailSegmentKeydown(event, "[data-airport-segment]"));
  });
  document.getElementById("airportGroundLayerBar")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-airport-ground-filter]");
    if (!button) {
      return;
    }
    state.airportGroundFilter = button.dataset.airportGroundFilter || "all";
    const airport = selectedAirport();
    if (airport) {
      renderAirportGroundPanel(airport);
    }
  });
  document.getElementById("airportGroundSearch")?.addEventListener("input", (event) => {
    state.airportGroundSearch = event.target.value || "";
    const airport = selectedAirport();
    if (airport) {
      renderAirportGroundPanel(airport);
    }
  });
  document.getElementById("airportGroundSort")?.addEventListener("change", (event) => {
    state.airportGroundSort = event.target.value || "duration-asc";
    const airport = selectedAirport();
    if (airport) {
      renderAirportGroundPanel(airport);
    }
  });
  document.querySelectorAll("[data-airport-ground-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.airportGroundView = button.dataset.airportGroundView || "list";
      const airport = selectedAirport();
      if (airport) {
        renderAirportGroundPanel(airport);
      }
    });
  });
  document.getElementById("airportDynamicFilterBar")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-airport-dynamic-filter]");
    if (!button) {
      return;
    }
    state.airportDynamicFilter = button.dataset.airportDynamicFilter || "all";
    const airport = selectedAirport();
    if (airport) {
      renderAirportDynamicPanel(airport);
    }
  });
  document.getElementById("airportOpsRangeToggle")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-airport-ops-range]");
    if (!button) {
      return;
    }
    state.airportOpsRange = button.dataset.airportOpsRange || "today";
    const airport = selectedAirport();
    if (airport) {
      renderAirportOperationsPanel(airport);
    }
  });
  document.getElementById("airportOriginDest")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-airport-code]");
    if (button) {
      selectAirportFromCode(button.dataset.airportCode);
    }
  });
  document.getElementById("airportInfoTags")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-approval-label]");
    if (!button) {
      return;
    }
    document.querySelector(".airport-approval-item")?.scrollIntoView({ block: "nearest" });
  });
  document.querySelectorAll("[data-airport-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setAirportPanelTab(button.dataset.airportTab || "all");
    });
  });
  document.querySelectorAll("[data-route-mode]").forEach((button) => {
    button.addEventListener("click", () => setRouteColorMode(button.dataset.routeMode));
  });
  document.querySelectorAll("[data-chart-unit]").forEach((button) => {
    button.addEventListener("click", () => setSpeedAltitudeUnit(button.dataset.chartUnit));
  });
  const historyPanel = document.querySelector('[data-aircraft-panel="journey"]');
  historyPanel?.addEventListener("click", handleHistoryTimelineClick);
  const aircraftDetailScroller = document.querySelector("#aircraftDetailView .detail-scroll-body");
  aircraftDetailScroller?.addEventListener("scroll", handleHistoryTimelineScroll);
  aircraftDetailScroller?.addEventListener("wheel", handleHistoryScrollIntent, { passive: true });
  aircraftDetailScroller?.addEventListener("touchstart", handleHistoryScrollIntent, { passive: true });
  aircraftDetailScroller?.addEventListener("touchmove", handleHistoryScrollIntent, { passive: true });
  aircraftDetailScroller?.addEventListener("keydown", handleHistoryScrollIntent);
  const searchInput = searchInputElement();
  const searchPanel = searchPanelElement();
  searchInput?.addEventListener("input", (event) => {
    scheduleSearchRender(event.target.value);
  });
  searchInput?.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
      renderSearch(searchInput.value);
    }
  });
  searchInput?.addEventListener("keydown", handleSearchInputKeydown);
  searchPanel?.addEventListener("click", handleSearchPanelClick);
  searchPanel?.addEventListener("input", handleSearchPanelInput);
  document.addEventListener("pointerover", handleFieldToastPointerOver);
  document.addEventListener("pointermove", handleFieldToastPointerMove);
  document.addEventListener("pointerout", handleFieldToastPointerOut);
  document.addEventListener("pointerover", handleHistoryActivityTooltipPointerOver);
  document.addEventListener("pointermove", handleHistoryActivityTooltipPointerMove);
  document.addEventListener("pointerout", handleHistoryActivityTooltipPointerOut);
  document.addEventListener("focusin", handleHistoryActivityTooltipFocusIn);
  document.addEventListener("focusout", handleHistoryActivityTooltipFocusOut);
  window.addEventListener("scroll", hideHistoryActivityTooltip, true);
  window.addEventListener("resize", hideHistoryActivityTooltip);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-card")) {
      closeSearchPanel({ clearInput: false });
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    const target = event.target;
    const isEditable = target?.matches?.("input, textarea, select, [contenteditable='true']");
    if ((event.key === "/" && !isEditable) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
      event.preventDefault();
      searchInput?.focus();
      searchInput?.select();
      if (searchInput?.value.trim()) {
        renderSearch(searchInput.value);
      }
      return;
    }
    if (event.key === "Escape") {
      if (searchPanelIsOpen()) {
        closeSearchPanel();
        return;
      }
      showFilterSheet(false);
      if (state.selectedKind || state.selectedId) {
        clearSelection();
        return;
      }
      if (routeFocusActive()) {
        setRouteFocus(false);
      }
    }
  });
  const refreshResponsiveLayout = debounce(() => {
    const previousProfile = state.layoutProfile;
    updateLayoutProfile();
    if (state.map && previousProfile !== state.layoutProfile) {
      renderViewport();
      syncSelectionDomState();
    }
    if (routeFocusActive()) {
      fitSelectedRouteBounds();
    }
  }, 180);
  window.addEventListener("resize", refreshResponsiveLayout);
  window.addEventListener("orientationchange", refreshResponsiveLayout);
}

window.BIZJET_RESPONSIVE_LAYOUT_STANDARD = Object.freeze({
  version: "1.20",
  profiles: ["desktop", "desktop-compact", "tablet-landscape", "tablet-portrait", "mobile"],
  resolveLayoutProfile,
  currentProfile() {
    return state.layoutProfile;
  },
  currentInteractionPhase() {
    return state.mapInteractionPhase;
  },
  hoverAirportPopupEnabled() {
    return airportHoverInteractionsEnabled();
  },
  config() {
    return { ...responsivePerformanceConfig };
  }
});

window.BIZJET_TRACK_STYLE_STANDARD = Object.freeze({
  version: "1.15",
  styleForZoom(options = {}) {
    return { ...trackStyleForZoom(options) };
  },
  continuityConfig() {
    return {
      coverageGapMs: routeStyle.maxGapMs,
      hardBreakGapMs: routeStyle.hardBreakGapMs,
      duplicateDistanceNm: mapLoadingConfig.trackContinuity.duplicateDistanceNm,
      duplicateTimeToleranceMs: mapLoadingConfig.trackContinuity.duplicateTimeToleranceMs,
      liveTailMaxPoints: mapLoadingConfig.trackContinuity.liveTailMaxPoints
    };
  },
  selectedTrackSummary() {
    const store = state.selectedTrackStore;
    if (!store) {
      return null;
    }
    return {
      uniqueKey: store.uniqueKey,
      aircraftId: store.aircraftId,
      historyPoints: store.historyPoints.length,
      liveTailPoints: store.liveTailPoints.length,
      mergedPoints: store.mergedPoints.length,
      lastConfirmedTimestamp: store.lastConfirmedTimestamp,
      lastRealtimeTimestamp: store.lastRealtimeTimestamp,
      routeVersion: store.routeVersion,
      revision: store.revision,
      latestEndpointGap: selectedLatestEndpointDiagnostics()
    };
  },
  speedAltitudeChartDiagnostics(jet) {
    return speedAltitudeChartDiagnostics(jet);
  },
  segmentSummary(points = [], options = {}) {
    return trackSegments(points, options.selected !== false, options.colorMode || "altitude").map((segment) => ({
      id: segment.id,
      path: segment.path,
      pathBreakBefore: segment.pathBreakBefore,
      color: segment.color,
      semantic: segment.invalid ? "invalid" : segment.estimated ? "estimated" : "actual",
      estimated: segment.estimated,
      estimatedReason: segment.estimatedReason,
      invalid: segment.invalid,
      invalidReason: segment.invalidReason
    }));
  },
  selectedPointLimitForZoom(zoom) {
    return Math.min(
      mapLoadingConfig.selectedTrackMaxPoints,
      steppedValue(mapLoadingConfig.selectedTrackLimitByZoom, zoom, "limit")
    );
  }
});

window.BIZJET_SEARCH_STANDARD = Object.freeze({
  version: "1.10",
  groupOrder: [
    "Live aircraft",
    "Trips",
    "Airports",
    "Routes",
    "Operators",
    "Aircraft profiles",
    "Countries"
  ],
  shortcuts: searchShortcutConfig.map((shortcut) => shortcut.label),
  limitPerGroup: searchGroupLimit,
  parseRoute(query) {
    const parsed = parseRouteSearchQuery(query);
    return parsed ? {
      direct: parsed.direct,
      spaced: parsed.spaced,
      fromCode: parsed.fromCode,
      toCode: parsed.toCode,
      suggestion: parsed.suggestion,
      fromKnown: Boolean(parsed.fromAirport),
      toKnown: Boolean(parsed.toAirport)
    } : null;
  }
});

window.BIZJET_AIRCRAFT_ICON_VISIBILITY_STANDARD = Object.freeze({
  version: "1.11",
  showAllAircraftIconsAtAllZooms: mapLoadingConfig.showAllAircraftIconsAtAllZooms,
  allAircraftIconRequestLimit: mapLoadingConfig.allAircraftIconRequestLimit,
  renderLimitForZoom() {
    return aircraftRenderLimit();
  },
  requestLimit() {
    return aircraftRequestLimit();
  },
  scope() {
    return aircraftIconVisibilityUsesGlobalScope() ? "global" : "viewport";
  },
  requestBounds() {
    return { ...aircraftRequestBounds() };
  },
  includesGroundAircraft() {
    return mapLoadingConfig.showAllAircraftIconsAtAllZooms || currentZoom() >= 8.5;
  }
});

window.BIZJET_HISTORY_TIMELINE_STANDARD = Object.freeze({
  version: historyTimelineConfig.version,
  config() {
    return { ...historyTimelineConfig };
  },
  state() {
    return { ...state.historyTimeline };
  },
  selectedSummary() {
    const jet = selectedAircraft();
    const detail = jet?.flightHistoryDetail || cachedAircraftHistoryDetail(jet);
    if (!detail) {
      return null;
    }
    const flights = historyFlightsForTimeline(detail);
    const summary = historySummary(detail, flights);
    return {
      selectedAircraftId: jet.id,
      registration: aircraftRegistrationLabel(jet),
      source: detail.source || detail.raw?.source || "513013",
      totalCount: summary.totalCount,
      renderedWindowCount: Math.min(flights.length, state.historyTimeline.visibleCount),
      rangeDays: state.historyTimeline.rangeDays,
      status: state.historyTimeline.status,
      airportQuery: state.historyTimeline.airportQuery
    };
  }
});

window.BIZJET_MAP_RUNTIME = Object.freeze({
  provider() {
    return state.mapProvider;
  },
  fallbackReason() {
    return state.mapFallbackReason || googleMapsAuthFailureReason || "";
  },
  googleRenderedErrorVisible() {
    return googleMapRenderedErrorVisible();
  },
  forceFallback(reason = "manual map fallback test") {
    return fallbackToLeafletMap(reason);
  }
});

async function init() {
  bindEvents();
  initApiDebugConsole();
  updateRouteLegend();
  state.initialMapCenter = await resolveInitialMapCenter();
  try {
    state.map = await createMapEngine();
    await state.map.ready();
  } catch (error) {
    state.map = new LeafletMapEngine();
    await state.map.ready();
  }
  state.mapProvider = state.map.type;
  updateMapModeClass();
  bindMapViewportEvents();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      scheduleNextRealtimeRefresh();
      scheduleNextAirportRefresh();
      return;
    }
    refreshAirportData("visible");
    refreshRealtimeData("visible");
  });
  renderViewport();
  refreshAirportData("init");
  refreshRealtimeData("init");
  setInterval(() => {
    state.tick += 1;
    const now = Date.now();
    businessJets.forEach((jet) => {
      if (jet.isLocalSample) {
        jet.updatedAtEpochMs = now;
        jet.viewportSeenAtEpochMs = now;
      }
    });
    if (state.selectedKind === "aircraft" && state.selectedId) {
      if (journeyHistoryPanelIsOpen()) {
        return;
      }
      const selected = state.selectedId;
      selectAircraft(selected, false, { preserveReducedIconState: true });
    } else {
      renderAircraft();
      updateRail();
    }
  }, 3500);
}

init();
