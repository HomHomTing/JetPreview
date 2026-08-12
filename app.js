const appConfig = window.APP_CONFIG || {};
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
const AIRPORT_MARKER_BASE_Z_INDEX = 300;
const AIRPORT_MARKER_SELECTED_Z_INDEX = 340;
const AIRPORT_MARKER_SELECTED_POPUP_Z_INDEX = 345;
const AIRPORT_MARKER_HOVER_Z_INDEX = 350;
const AIRCRAFT_MARKER_BASE_Z_INDEX = 1000;
const AIRCRAFT_MARKER_SELECTED_Z_INDEX = 1120;
const AIRPORT_HOVER_CLEAR_DELAY_MS = 120;
const AIRPORT_POPUP_GAP_PX = 14;
const defaultCenter = [22, 18];
const initialMapUseUserLocation = appConfig.initialMapUseUserLocation !== false;
const initialMapLocationTimeoutMs = appConfig.initialMapLocationTimeoutMs ?? 6000;
const googleMarkerMapId = appConfig.googleMapId || "DEMO_MAP_ID";
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
  airportLimitByZoom: appConfig.performance?.airportLimitByZoom || [
    { zoom: 3.5, limit: 50 },
    { zoom: 5.5, limit: 120 },
    { zoom: 6.5, limit: 350 },
    { zoom: 7, limit: 650 },
    { zoom: 8.5, limit: 900 },
    { zoom: 9.5, limit: 1200 },
    { zoom: 10.5, limit: 1600 },
    { zoom: 11.5, limit: 2200 },
    { zoom: 12, limit: 3000 }
  ],
  airportLevelByZoom: appConfig.performance?.airportLevelByZoom || [
    { zoom: 3.5, level: 0 },
    { zoom: 5.5, level: 1 },
    { zoom: 6.5, level: 2 },
    { zoom: 7, level: 3 },
    { zoom: 9.5, level: 4 },
    { zoom: 12, level: 5 }
  ],
  airportShowAllZoom: appConfig.performance?.airportShowAllZoom ?? 7,
  airportShowAllRequestLimit: appConfig.performance?.airportShowAllRequestLimit ?? 50000,
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
  return center || defaultCenter;
}

async function setMapToUserLocation() {
  const center = await getUserLocationCenter(10000);
  if (!center) {
    return false;
  }
  state.initialMapCenter = center;
  state.map?.setView?.(center, defaultZoom());
  return true;
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

function effectiveRouteFocusPadding() {
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
  if (airportShowsAllInCurrentViewport()) {
    return Number.POSITIVE_INFINITY;
  }
  return steppedValue(mapLoadingConfig.airportLimitByZoom, currentZoom(), "limit");
}

function airportLevelLimit() {
  if (airportShowsAllInCurrentViewport()) {
    return 5;
  }
  return steppedValue(mapLoadingConfig.airportLevelByZoom, currentZoom(), "level");
}

function airportShowsAllInCurrentViewport(zoom = currentZoom()) {
  const threshold = Number(mapLoadingConfig.airportShowAllZoom);
  return Number.isFinite(threshold) && clampZoom(zoom) >= threshold;
}

function airportRequestLimit() {
  return airportShowsAllInCurrentViewport()
    ? mapLoadingConfig.airportShowAllRequestLimit
    : airportRenderLimit();
}

function airportRequestLevelLimit() {
  return airportShowsAllInCurrentViewport() || airportLayerMode() === "on"
    ? 5
    : airportLevelLimit();
}

function airportPriorityLevel(airport) {
  const explicitLevel = Number(airport.displayLevel ?? airport.level);
  if (Number.isFinite(explicitLevel)) {
    return Math.max(1, Math.min(5, explicitLevel));
  }
  const ground = Number(airport.ground);
  const movements = Number(airport.departures || 0) + Number(airport.arrivals || 0);
  const score = airportTrafficScore(airport);
  if (score >= 130 || ground >= 30 || movements >= 60) return 1;
  if (ground >= 30) return 1;
  if (score >= 90 || ground >= 18 || movements >= 36) return 2;
  if (score >= 55 || ground >= 10 || movements >= 22) return 3;
  if (score >= 25 || ground >= 4 || movements >= 8) return 4;
  return 5;
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
  const level = airportPriorityLevel(airport);
  airport.displayLevel = level;
  airport.level = level;
  airport.trafficScore = airportTrafficScore(airport);
  airport.businessJetScore = airportBusinessJetScore(airport);
  airport.markerSize = airport.markerSize || airportMarkerSizeClass(airport);
  airport.labelMode = airport.labelMode || "auto";
  return airport;
}

function airportMarkerSizeClass(airport) {
  const explicit = String(airport.markerSize || "").toLowerCase();
  if (["major", "medium", "small"].includes(explicit)) {
    return explicit;
  }
  const level = airportPriorityLevel(airport);
  if (level <= 2) return "major";
  if (level <= 4) return "medium";
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

function airportLayerMode() {
  return state.airportLayerMode || "auto";
}

function airportLayerIsOff() {
  return !state.airports || airportLayerMode() === "off";
}

function airportMarkerZIndex(airport, options = {}) {
  if (options.currentHover === true) {
    return AIRPORT_MARKER_HOVER_Z_INDEX;
  }
  if (options.hovered === true) {
    return airportIsSelected(airport)
      ? AIRPORT_MARKER_SELECTED_POPUP_Z_INDEX
      : AIRPORT_MARKER_HOVER_Z_INDEX;
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
  if (!airport) {
    return false;
  }
  return !airportHoverNeedsDetail(airport) || !dataService?.isEnabled();
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

function pointerStillInsideAirportMarker(id, event) {
  const point = state.airportHoverPointer || airportPointerFromEvent(event);
  if (!point) {
    return false;
  }
  return airportMarkerElementsForId(id).some((element) => pointInsideElementRect(element, point));
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
  if (airportIsSelected(airport)) {
    return "none";
  }
  if (!state.labels) {
    return "none";
  }
  const zoom = currentZoom();
  const level = airportPriorityLevel(airport);
  if (zoom < 8.5) {
    return "none";
  }
  if (zoom < 9.5) {
    return airportLayerMode() === "on" && level <= 1 ? "code" : "none";
  }
  if (zoom < 10.5) {
    return level <= 2 ? "code" : "none";
  }
  if (zoom < 11.5) {
    if (level <= 2) return "full";
    return level <= 4 ? "code" : "none";
  }
  if (level <= 4) return "full";
  return "code";
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
    if (airportIsSelected(airport)) {
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
  const selected = airportIsSelected(airport);
  const rawSizeClass = airportMarkerSizeClass(airport);
  const sizeClass = selected && rawSizeClass === "small" ? "major" : rawSizeClass;
  let base = airportSizeForZoom(sizeClass);
  if (selected && (!base.width || !base.height)) {
    base = { width: 24, height: 31, hitWidth: 40, hitHeight: 44 };
  }
  const selectedScale = selected ? 1.1 : 1;
  const mobileScale = window.matchMedia("(max-width: 640px)").matches && !selected ? 0.9 : 1;
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

function airportMarkerCssVars(airport) {
  const metrics = airportMarkerMetrics(airport);
  return {
    metrics,
    cssText: `--airport-icon-width:${metrics.visualWidth}px; --airport-icon-height:${metrics.visualHeight}px; --airport-hit-width:${metrics.hitWidth}px; --airport-hit-height:${metrics.hitHeight}px;`
  };
}

function airportMarkerClass(airport, metrics = airportMarkerMetrics(airport)) {
  const labelMode = airport.renderLabelMode || desiredAirportLabelMode(airport);
  return [
    "airport-pin",
    `airport-size-${metrics.sizeClass}`,
    airportIsSelected(airport) ? "is-selected" : "",
    `label-${labelMode}`
  ].filter(Boolean).join(" ");
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
  selectedKind: null,
  selectedId: null,
  aircraftSegment: "overview",
  aircraftSegmentById: new Map(),
  airportSegment: "dynamic",
  airportTab: "all",
  lastTargetSelectAt: 0,
  followSelectedAircraft: false,
  hideOtherAircraft: false,
  mapProvider: "loading",
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
  hoveredAirportId: null,
  airportHoverClearTimer: null,
  airportHoverPointer: null,
  detailLoads: new Set(),
  aircraftProfileDetails: new Map(),
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
  renderedAircraft: [],
  renderedAirports: [],
  groundProjectionSyncTimer: null,
  lastRenderCostMs: 0,
  routeFocusAircraftId: null,
  routeFocusPreviousView: null,
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
    const size = this.map.getSize();
    const targetPoint = this.map.latLngToContainerPoint(target);
    const desiredPoint = L.point(size.x * 0.62, size.y * 0.5);
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
    const targetPoint = projection.fromLatLngToContainerPixel(new google.maps.LatLng(target.lat, target.lng));
    const desiredPoint = {
      x: mapDiv.clientWidth * 0.62,
      y: mapDiv.clientHeight * 0.5
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
        <span class="aircraft-label"></span>
      `;
      content.dataset.ready = "true";
    }
    const icon = content.querySelector(".aircraft-icon");
    const label = content.querySelector(".aircraft-label");
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
    label.textContent = aircraftMapLabelText(jet);
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
          <svg class="airport-pin-icon" viewBox="0 0 28 36" aria-hidden="true">
            <path class="airport-pin-body" d="M14 1.8C7.1 1.8 2.3 6.8 2.3 13.2c0 7.8 9.2 19 11 21a.95.95 0 0 0 1.4 0c1.8-2 11-13.2 11-21C25.7 6.8 20.9 1.8 14 1.8Z"></path>
            <path class="airport-pin-tower" d="M12.4 8.5h3.2l.8 4.1h2.1v2.2h-1.7l.9 4.8h1.5v2.2H8.8v-2.2h1.5l.9-4.8H9.5v-2.2h2.1l.8-4.1Zm.5 11.1h2.2l-.8-4.8h-.6l-.8 4.8Zm.2-7h1.8l-.3-1.8h-1.2l-.3 1.8Z"></path>
          </svg>
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
    if (!appConfig.googleMapsApiKey) {
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
      if (typeof previousAuthFailure === "function") {
        previousAuthFailure();
      }
      finish(reject, new Error("Google Maps API authorization failed"));
    };
    window.__initBizJetGoogleMap = () => finish(resolve);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: appConfig.googleMapsApiKey,
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
  if ((appConfig.defaultMapProvider || "google") === "google" && appConfig.googleMapsApiKey) {
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
  return airports.find((airport) => airport.id === id);
}

function airportByCode(code) {
  const value = String(code || "").trim().toUpperCase();
  if (!value) {
    return null;
  }
  return airports.find((airport) => [
    airport.id,
    airport.iata,
    airport.icao,
    airport.icaoCode,
    airport.airportCode
  ].filter(Boolean).some((item) => String(item).trim().toUpperCase() === value)) || null;
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
  if (!state.trails || !jet) {
    state.map.clearRouteEndpoints();
    return;
  }
  state.map.setRouteEndpoints(selectedRouteEndpoints(jet));
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
    renderViewport();
    fitSelectedRouteBounds(jet);
    return;
  }

  const previousView = state.routeFocusPreviousView;
  state.routeFocusAircraftId = null;
  state.routeFocusPreviousView = null;
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
  if (jet.id === state.selectedId || jet.isLocalSample) {
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
  return state.selectedKind === "aircraft"
    ? businessJets.find((jet) => jet.id === state.selectedId)
    : null;
}

function selectedAirport() {
  return state.selectedKind === "airport"
    ? airports.find((airport) => airport.id === state.selectedId)
    : null;
}

function aircraftIsSelected(jet) {
  return state.selectedKind === "aircraft" && jet.id === state.selectedId;
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
    return selected ? applyAircraftLabelCollision([selected]) : [];
  }
  if (!state.map) {
    const cachedAircraft = businessJets.filter((jet) => aircraftPassesLockedFilter(jet) && !aircraftIsExpired(jet));
    return applyAircraftLabelCollision(aircraftRenderIsLimited()
      ? cachedAircraft.slice(0, aircraftRenderLimit())
      : cachedAircraft);
  }
  const bounds = aircraftIconVisibilityUsesGlobalScope()
    ? null
    : currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const limit = aircraftRenderLimit();
  const selected = selectedAircraft();
  const inView = [];

  businessJets.forEach((jet) => {
    if (!aircraftPassesLockedFilter(jet)) {
      return;
    }
    const position = currentPosition(jet);
    if (aircraftIsExpired(jet)) {
      return;
    }
    if (!bounds || positionInBounds(position, bounds) || jet.id === selected?.id) {
      inView.push(jet);
    }
  });

  inView.sort((a, b) => aircraftPriority(a) - aircraftPriority(b));
  const rendered = aircraftRenderIsLimited() ? inView.slice(0, limit) : inView;
  if (selected && !rendered.some((jet) => jet.id === selected.id)) {
    rendered.unshift(selected);
  }
  return applyAircraftLabelCollision(rendered);
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
      <span class="aircraft-label">${escapeHtml(labelText)}</span>
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
  if (!state.trails || state.selectedKind !== "aircraft" || !jet) {
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
  if (!state.airports && !selectedAirport()) {
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
    const popupVars = airportPopupPlacementVars(airport, activeIds);
    const popupCssText = `--airport-popup-left:${popupVars.left}; --airport-popup-top:${popupVars.top}; --airport-popup-transform:${popupVars.transform};`;
    return `
      <button type="button" class="${airportMarkerClass(airport, metrics)}${hoveredClass}${popupReadyClass}${currentHoverClass}" data-id="${airport.id}" data-level="${airportPriorityLevel(airport)}" data-popup-placement="${popupVars.placement}"${currentHoverAttr} style="left:${point.x}px; top:${point.y}px; ${cssText} ${popupCssText}" aria-label="${escapeHtml(airportFullLabel(airport))}">
        <span class="airport-marker-hit">
          <span class="marker-map-shadow airport-map-shadow" aria-hidden="true"></span>
          <svg class="airport-pin-icon" viewBox="0 0 28 36" aria-hidden="true">
            <path class="airport-pin-body" d="M14 1.8C7.1 1.8 2.3 6.8 2.3 13.2c0 7.8 9.2 19 11 21a.95.95 0 0 0 1.4 0c1.8-2 11-13.2 11-21C25.7 6.8 20.9 1.8 14 1.8Z"></path>
            <path class="airport-pin-tower" d="M12.4 8.5h3.2l.8 4.1h2.1v2.2h-1.7l.9 4.8h1.5v2.2H8.8v-2.2h1.5l.9-4.8H9.5v-2.2h2.1l.8-4.1Zm.5 11.1h2.2l-.8-4.8h-.6l-.8 4.8Zm.2-7h1.8l-.3-1.8h-1.2l-.3 1.8Z"></path>
          </svg>
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
  if (routeFocusActive()) {
    return [];
  }
  if (!state.map) {
    return applyAirportLabelCollision(airports.slice(0, airportRenderLimit()).map(normalizeAirportRecord));
  }
  const selected = selectedAirport();
  if (airportLayerIsOff()) {
    return selected ? applyAirportLabelCollision([{ ...normalizeAirportRecord(selected) }]) : [];
  }
  const bounds = currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const maxLevel = airportLayerMode() === "on" ? 5 : airportLevelLimit();
  const maxMarkers = airportLayerMode() === "on" ? Math.max(airportRenderLimit(), 3000) : airportRenderLimit();
  const inView = airports.filter((airport) => (
    positionInBounds([airport.lat, airport.lng], bounds)
      && (airportPriorityLevel(airport) <= maxLevel || airport.id === selected?.id)
  ));
  const rendered = inView
    .map((airport) => normalizeAirportRecord(airport))
    .sort((a, b) => airportPriorityLevel(a) - airportPriorityLevel(b)
      || airportTrafficScore(b) - airportTrafficScore(a)
      || airportBusinessJetScore(b) - airportBusinessJetScore(a))
    .slice(0, maxMarkers);
  if (selected && !rendered.some((airport) => airport.id === selected.id)) {
    rendered.unshift(normalizeAirportRecord(selected));
  }
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
    if (existing?.trackRoute && !jet.trackRoute) {
      jet.trackRoute = existing.trackRoute;
    }
    applyCachedAircraftProfile(jet);
    return applyAircraftTypeMetadata(jet);
  });
  businessJets.splice(0, businessJets.length, ...merged);
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
    if (value !== null && value !== undefined && value !== "") {
      airport[key] = value;
    }
  });
}

function replaceAirportData(nextAirports) {
  if (!Array.isArray(nextAirports)) {
    return;
  }
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
    return normalizeAirportRecord(airport);
  });
  airports.splice(0, airports.length, ...merged);
}

function clearSelectionIfMissing() {
  const missingAircraft = state.selectedKind === "aircraft" && !businessJets.some((jet) => jet.id === state.selectedId);
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
  return {
    north: roundedCoordinate(bounds.north),
    south: roundedCoordinate(bounds.south),
    west: roundedCoordinate(bounds.west),
    east: roundedCoordinate(bounds.east),
    zoom: Math.round(currentZoom() * 100) / 100,
    viewportPaddingRatio: mapLoadingConfig.viewportPaddingRatio,
    airportScope: "viewport",
    airportLayerMode: airportLayerMode(),
    maxAirports: airportRequestLimit(),
    displayLevelMax: airportRequestLevelLimit(),
    includeLabels: currentZoom() >= 8.5,
    selectedAirportCode: selected?.icaoCode || selected?.id || selected?.iata || "",
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
    includeLabels: request.includeLabels,
    selectedAirportCode: request.selectedAirportCode,
    businessJetOnly: request.businessJetOnly
  };
}

function buildAircraftViewportRequest(reason = "timer") {
  const bounds = aircraftRequestBounds();
  const selected = selectedAircraft();
  return {
    north: roundedCoordinate(bounds.north),
    south: roundedCoordinate(bounds.south),
    west: roundedCoordinate(bounds.west),
    east: roundedCoordinate(bounds.east),
    zoom: Math.round(currentZoom() * 100) / 100,
    viewportPaddingRatio: aircraftIconVisibilityUsesGlobalScope() ? 0 : mapLoadingConfig.viewportPaddingRatio,
    aircraftScope: aircraftIconVisibilityUsesGlobalScope() ? "global" : "viewport",
    aircraftLimit: aircraftRequestLimit(),
    aircraftCategory: "business_jet",
    categories: "J",
    includeAircraft: true,
    includeAirports: true,
    ...buildAirportViewportRequestMetadata(),
    includeGround: mapLoadingConfig.showAllAircraftIconsAtAllZooms || currentZoom() >= 8.5,
    sinceVersion: state.aircraftViewportVersion || "",
    selectedUniqueKey: selected?.uniqueKey || selected?.id || "",
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
    if (existing?.trackRoute && !next.trackRoute) {
      next.trackRoute = existing.trackRoute;
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
    if (aircraftIsSelected(jet)) {
      jet.quality = "stale";
      jet.status = "Stale";
      jet.viewportSeenAtEpochMs = now;
      return;
    }
    businessJets.splice(index, 1);
  });

  for (let index = businessJets.length - 1; index >= 0; index -= 1) {
    if (aircraftIsExpired(businessJets[index])) {
      businessJets.splice(index, 1);
    }
  }
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
  if (!dataService?.isEnabled()) {
    return;
  }
  state.refreshTimer = window.setTimeout(() => refreshRealtimeData("timer"), aircraftRefreshIntervalMs());
}

function scheduleNextAirportRefresh() {
  window.clearTimeout(state.airportRefreshTimer);
  state.airportRefreshTimer = null;
  if (!dataService?.isEnabled() || !airportSnapshotRefreshMs) {
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
  if (state.airportLoading) {
    return;
  }
  state.airportLoading = true;
  updateDataSourceLabels();
  try {
    const snapshot = await dataService.getRealtimeSnapshot(buildAirportViewportRequest(`airport-${reason}`));
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
      refreshRealtimeData(nextReason);
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

async function loadAircraftDetails(jet) {
  if (!dataService?.isEnabled() || !jet) {
    return;
  }
  const loadKey = `aircraft:${jet.id}`;
  if (state.detailLoads.has(loadKey)) {
    return;
  }
  const needsTrack = jet.uniqueKey && !jet.flightDetail;
  const needsProfile = jet.tailNoEncrypted && !jet.planeDetail;
  if (!needsTrack && !needsProfile) {
    return;
  }

  state.detailLoads.add(loadKey);
  try {
    const [trackResult, profileResult] = await Promise.allSettled([
      needsTrack ? dataService.getFlightTrack(jet.uniqueKey) : Promise.resolve(null),
      needsProfile ? dataService.getPlaneDetail(jet.tailNoEncrypted) : Promise.resolve(null)
    ]);
    const currentJet = businessJets.find((item) => item.id === jet.id || aircraftProfileKeysOverlap(item, jet));
    if (!currentJet) {
      return;
    }
    if (trackResult.status === "fulfilled") {
      applyFlightTrackDetail(currentJet, trackResult.value);
    }
    if (profileResult.status === "fulfilled") {
      applyPlaneDetailToMatchingAircraft(currentJet, profileResult.value);
    }
    if (state.selectedKind === "aircraft" && state.selectedId === currentJet.id) {
      selectAircraft(currentJet.id, false, { preserveReducedIconState: true });
      if (routeFocusIsActiveFor(currentJet.id)) {
        requestAnimationFrame(() => fitSelectedRouteBounds(currentJet));
      }
    } else {
      renderAircraft();
      syncSelectedRouteVisuals();
      updateRail();
    }
  } finally {
    state.detailLoads.delete(loadKey);
  }
}

async function loadAirportDetail(airport) {
  if (!dataService?.isEnabled() || !airport || airport.apiDetail) {
    return;
  }
  const airportCode = airport.airportCode || airport.iata;
  if (!airportCode) {
    return;
  }
  const loadKey = `airport:${airportCode}`;
  if (state.detailLoads.has(loadKey)) {
    return;
  }
  state.detailLoads.add(loadKey);
  try {
    const detail = await dataService.getAirportDetail(airportCode);
    const currentAirport = airportById(airport.id);
    if (!currentAirport) {
      return;
    }
    applyAirportDetail(currentAirport, detail);
    if (state.selectedKind === "airport" && state.selectedId === currentAirport.id) {
      selectAirport(currentAirport.id, false);
    } else {
      renderAirports();
      updateRail();
    }
  } finally {
    state.detailLoads.delete(loadKey);
  }
}

const aircraftDetailSegments = ["overview", "track", "airframe", "journey"];
const airportDetailSegments = ["dynamic", "airport", "weather", "fbo"];

function syncSelectionDomState() {
  const panel = document.getElementById("leftDetailPanel");
  if (panel) {
    panel.dataset.detailKind = state.selectedKind || "";
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
}

function setAirportSegment(segment) {
  state.airportSegment = setDetailSegment(
    "[data-airport-segment]",
    "[data-airport-panel]",
    segment,
    airportDetailSegments
  );
}

function openAircraftView(segment = state.aircraftSegment) {
  const panel = document.getElementById("leftDetailPanel");
  panel.hidden = false;
  document.getElementById("aircraftDetailView").hidden = false;
  document.getElementById("airportDetailView").hidden = true;
  setAircraftSegment(segment, { remember: false });
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
  clearRouteFocus({ restore: false });
  document.getElementById("leftDetailPanel").hidden = true;
  state.selectedId = null;
  state.selectedKind = null;
  state.hoveredAirportId = null;
  state.selectedTrackStore = null;
  state.followSelectedAircraft = false;
  state.hideOtherAircraft = false;
  showAircraftMoreMenu(false);
  updateFollowButton();
  syncAirportHoverMarkers("");
  syncSelectionDomState();
  if (hadSelection && options.render !== false) {
    renderViewport();
    scheduleNextRealtimeRefresh();
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

function renderRecentFlights(jet) {
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
      flight: firstMatchedValue(item.flightNo, item.callsign, item.flight, item.taskNo),
      dep: firstMatchedValue(item.depAirport, item.originAirportCode, item.from, item.depIcaoCode),
      arr: firstMatchedValue(item.arrAirport, item.destinationAirportCode, item.to, item.arrIcaoCode),
      state: firstMatchedValue(item.flightStateStr, item.status)
    }))
    .filter((item) => [item.date, item.flight, item.dep, item.arr].some((value) => value !== NA_TEXT))
    .slice(0, 6);

  if (!flights.length) {
    setHtml("recentFlightsList", `<p class="empty-related">暂无近期航班记录</p>`);
    return;
  }

  setHtml("recentFlightsList", flights.map((item) => `
    <button type="button" class="related-flight" data-id="${escapeHtml(item.uniqueKey === NA_TEXT ? "" : item.uniqueKey)}">
      <span>
        <strong>${escapeHtml(firstMatchedValue(item.flight, item.date))}</strong>
        <small>${escapeHtml(item.dep)} - ${escapeHtml(item.arr)} | ${escapeHtml(item.state)}</small>
      </span>
      <svg><use href="#icon-chevron"></use></svg>
    </button>
  `).join(""));
}

async function copyPanelText(value, trigger) {
  const text = String(displayOrDash(value));
  if (text === NA_TEXT) {
    return;
  }
  try {
    await navigator.clipboard?.writeText(text);
    trigger?.classList.add("copied");
    window.setTimeout(() => trigger?.classList.remove("copied"), 1000);
  } catch (error) {
    window.prompt("Copy", text);
  }
}

function renderAircraftMoreMenu(jet) {
  const menu = document.getElementById("aircraftMoreMenu");
  if (!menu) {
    return;
  }
  const copyCallsign = firstMatchedValue(jet.apiCallsign, jet.raw?.callsign, jet.flightDetail?.raw?.callsign);
  const copyRegistration = firstMatchedValue(jet.registration, jet.tailNoClear);
  menu.innerHTML = `
    <button type="button" class="more-row" data-more-action="hide-other">
      <span>隐藏其他飞机</span><strong>${state.hideOtherAircraft ? "ON" : "OFF"}</strong>
    </button>
    <button type="button" class="more-row" data-copy-value="${escapeHtml(copyCallsign === NA_TEXT ? "" : copyCallsign)}">
      <span>复制呼号</span><strong>${escapeHtml(copyCallsign)}</strong>
    </button>
    <button type="button" class="more-row" data-copy-value="${escapeHtml(copyRegistration === NA_TEXT ? "" : copyRegistration)}">
      <span>复制注册号</span><strong>${escapeHtml(copyRegistration)}</strong>
    </button>
    <button type="button" class="more-row" data-more-action="playback" disabled>
      <span>回放</span><strong>暂未开放</strong>
    </button>
    <button type="button" class="more-row" data-more-action="3d" disabled>
      <span>3D 视图</span><strong>暂未开放</strong>
    </button>
  `;
  menu.querySelector('[data-more-action="hide-other"]')?.addEventListener("click", () => {
    state.hideOtherAircraft = !state.hideOtherAircraft;
    renderAircraftMoreMenu(jet);
    renderViewport();
  });
  menu.querySelectorAll("[data-copy-value]").forEach((button) => {
    button.addEventListener("click", () => copyPanelText(button.dataset.copyValue, button));
  });
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

  setText("aircraftStatus", status.text);
  statusElement?.setAttribute("data-tone", status.tone);
  setText("aircraftCallsign", firstMatchedValue(jet.apiCallsign, jet.raw?.callsign, jet.flightDetail?.raw?.callsign, "暂无呼号"));
  setText("aircraftRegistrationHero", firstMatchedValue(jet.registration, plane.tailNoDisplay, jet.tailNoClear));
  setTextWithToast("aircraftTypeNameHero", typeName);
  setText("aircraftTypeIcaoHero", firstMatchedValue(typeCode, "ICAO待确认"));
  setText("aircraftOperatorHero", firstMatchedValue(operatorName, "运营商待确认"));
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

  setText("aircraftModel", firstMatchedValue(plane.modelNameEn, plane.modelName, jet.model));
  setText("aircraftTypeCode", typeCode);
  setText("aircraftTypeCodeOverview", typeCode);
  setText("aircraftRegistration", firstMatchedValue(jet.registration, plane.tailNoDisplay, jet.tailNoClear));
  setText("aircraftCountry", firstMatchedValue(plane.registrationPlace));
  setText("aircraftSerial", firstMatchedValue(plane.planeMsn));
  setText("aircraftAge", calculateAircraftAge(plane.deliveryDate));
  setText("aircraftCategory", firstMatchedValue(plane.planeSize, jet.planeSize, jet.family));
  setText("aircraftOperator", operatorName);
  setText("aircraftTrustee", firstMatchedValue(plane.trusteeship));
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
  renderRecentFlights(jet);
  renderAircraftMoreMenu(jet);
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

function renderAirportTabList(airport) {
  const list = document.getElementById("airportRelatedFlights");
  if (!list) {
    return;
  }
  const tab = state.airportTab || "all";
  const related = businessJets
    .filter((jet) => {
      if (tab === "all") {
        return jetMatchesAirport(jet, airport, "arrivals")
          || jetMatchesAirport(jet, airport, "departures")
          || jetMatchesAirport(jet, airport, "ground");
      }
      if (tab === "ground" && !jet.onGround && !jet.groundAirport && !jet.currentAirport) {
        return false;
      }
      return jetMatchesAirport(jet, airport, tab);
    })
    .slice(0, 12);

  if (!related.length) {
    const emptyText = tab === "ground"
      ? "当前无地面停场公务机"
      : tab === "departures"
        ? "当前无离港公务机"
        : tab === "arrivals"
          ? "当前无进港公务机"
          : "当前无相关公务机动态";
    list.innerHTML = `<p class="empty-related">${escapeHtml(emptyText)}</p>`;
    return;
  }

  list.innerHTML = related.map((jet) => `
    <button type="button" class="related-flight" data-id="${escapeHtml(jet.id)}">
      <span>
        <strong>${escapeHtml(displayOrDash(firstMatchedValue(jet.callsign, jet.registration)))}</strong>
        <small>${escapeHtml(displayOrDash(jet.from))} - ${escapeHtml(displayOrDash(jet.to))} | ${escapeHtml(displayOrDash(firstMatchedValue(jet.aircraftTypeCode, jet.model)))}</small>
      </span>
      <span class="related-flight-meta">${escapeHtml(formatFlightLevel(jet.altitude))}</span>
    </button>
  `).join("");
  list.querySelectorAll(".related-flight").forEach((button) => {
    button.addEventListener("click", () => selectAircraft(button.dataset.id));
  });
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
  const info = airport.apiDetail?.airportInfo || {};
  const zone = firstMatchedValue(info.zoneId, airport.zoneId, info.timeZone, airport.timeZone);
  if (zone === NA_TEXT) {
    return NA_TEXT;
  }
  return timeUtils.zoneLabel ? timeUtils.zoneLabel(zone) : zone;
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

function renderAirportTerminals(airport) {
  const terminals = Array.isArray(airport.apiDetail?.airportTerminals) ? airport.apiDetail.airportTerminals : [];
  if (!terminals.length) {
    setHtml("airportTerminals", `<p class="empty-related">该机场暂无 FBO 记录</p>`);
    return;
  }
  setHtml("airportTerminals", terminals.map((terminal) => `
    <div class="terminal-row">
      <strong>${escapeHtml(displayOrDash(terminal.terminalName))}</strong>
      <small>${escapeHtml(displayOrDash(terminal.terminalAddr))}</small>
      <span>${escapeHtml(displayOrDash(terminal.phone))}</span>
    </div>
  `).join(""));
}

function renderAirportDetailPanel(airport) {
  const detail = airport.apiDetail || {};
  const info = detail.airportInfo || {};
  const weather = detail.weatherInfo || {};
  const flights = detail.flightsInfo || {};
  const ground = detail.groundInfo || {};
  const inbound = firstMatchedValue(flights.inboundActually, flights.inboundPlan, airport.arrivals);
  const outbound = firstMatchedValue(flights.outboundActually, flights.outboundPlan, airport.departures);
  const groundCount = firstMatchedValue(ground.groundNum, airport.ground);
  const countedSorties = [inbound, outbound, groundCount]
    .map((value) => Number(value))
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
  const iata = firstMatchedValue(info.airportCode, airport.iata, airport.airportCode);
  const icao = firstMatchedValue(info.icaoCode, airportIcaoCode(airport));
  const city = firstMatchedValue(airport.city, info.cityName, info.airportFourName);
  const country = firstMatchedValue(info.countryName, airport.country);

  setText("airportPanelStatus", firstMatchedValue(info.type, "公务机场"));
  setText("airportCode", icao);
  setText("airportIataBadge", iata);
  setText("airportWeatherBadge", firstMatchedValue(weather.weather, airport.weather, "天气 —"));
  setText("airportName", [
    firstMatchedValue(info.airportNameEn, info.airportName, airport.name),
    [country, city].filter((item) => item !== NA_TEXT).join(" ")
  ].filter((item) => item !== NA_TEXT).join(" · ") || NA_TEXT);
  setText("airportSorties", firstMatchedValue(flights.sortiesEstimate, countedSorties || ""));
  setText("airportInbound", inbound);
  setText("airportOutbound", outbound);
  setText("airportGround", groundCount);

  setText("airportCity", city);
  setText("airportCountry", country);
  setText("airportIata", iata);
  setText("airportIcao", icao);
  setText("airportLocalTime", formatAirportLocalTime(airport));
  setText("airportTimeZone", formatAirportTimeZone(airport));
  setText("airportCoordinates", formatCoordinates([airport.lat, airport.lng]));
  setText("airportElevation", formatAirportElevation(airport));
  setText("airportGrade", firstMatchedValue(info.grade, airport.grade));
  setText("airportType", firstMatchedValue(info.type, airport.airportType));

  setText("airportRunways", firstMatchedValue(info.runwayCount, airport.runways));
  setText("airportRunwayLength", firstMatchedValue(info.runwayLength ? `${info.runwayLength} m` : "", airport.runwayLength));
  setText("airportTrafficDate", firstMatchedValue(detail.date));

  setText("airportWeather", firstMatchedValue(weather.weather, airport.weather));
  setText("airportTemperature", firstMatchedValue(weather.tmp, weather.tmpHigh && weather.tmpLow ? `${weather.tmpLow} - ${weather.tmpHigh}` : ""));
  setText("airportWind", firstMatchedValue(weather.wind));
  setText("airportVisibility", firstMatchedValue(weather.visib));
  setText("airportAqi", firstMatchedValue(weather.aqi, weather.aqigrad));
  setText("airportWeatherReportTime", formatAirportEventTime(airport, weather.reportTime, { seconds: true }));

  renderAirportTabList(airport);
  renderAirportTerminals(airport);
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

function showAircraftMoreMenu(show) {
  const menu = document.getElementById("aircraftMoreMenu");
  const button = document.getElementById("moreAircraftButton");
  if (!menu) {
    return;
  }
  const nextHidden = typeof show === "boolean" ? !show : !menu.hidden;
  menu.hidden = nextHidden;
  button?.classList.toggle("active", !nextHidden);
}

function updateFollowButton() {
  const button = document.getElementById("followAircraftButton");
  if (!button) {
    return;
  }
  button.classList.toggle("active", state.followSelectedAircraft);
  button.setAttribute("aria-pressed", state.followSelectedAircraft ? "true" : "false");
}

function selectAircraft(id, shouldPan = true, options = {}) {
  if (typeof shouldPan === "object" && shouldPan !== null) {
    options = shouldPan;
    shouldPan = options.pan !== false;
  }
  const jet = businessJets.find((item) => item.id === id);
  if (!jet) {
    return;
  }
  const selectingDifferentAircraft = state.selectedKind !== "aircraft" || state.selectedId !== id;
  const preserveReducedIconState = options.preserveReducedIconState === true;
  if (!preserveReducedIconState) {
    state.routeFocusAircraftId = null;
    state.routeFocusPreviousView = null;
    state.map?.clearRouteEndpoints?.();
    state.hideOtherAircraft = false;
  } else if (state.routeFocusAircraftId && state.routeFocusAircraftId !== id) {
    state.routeFocusAircraftId = null;
    state.routeFocusPreviousView = null;
    state.map?.clearRouteEndpoints?.();
  }
  const keepMoreMenuOpen = !selectingDifferentAircraft && !document.getElementById("aircraftMoreMenu")?.hidden;

  const position = currentPosition(jet);
  state.lastTargetSelectAt = performance.now();
  state.selectedKind = "aircraft";
  state.selectedId = id;
  state.hoveredAirportId = null;
  const nextSegment = selectingDifferentAircraft
    ? "overview"
    : state.aircraftSegmentById.get(id) || state.aircraftSegment || "overview";
  ensureSelectedTrackStore(jet, { reset: selectingDifferentAircraft });
  appendSelectedRealtimeTrackPoint(jet);
  openAircraftView(nextSegment);
  updateRouteFocusButton();
  renderAircraftDetailPanel(jet);
  updateFollowButton();
  showAircraftMoreMenu(keepMoreMenuOpen);
  syncAirportHoverMarkers("");
  if (shouldPan || state.followSelectedAircraft) {
    panSelectedTarget(position);
  }
  renderViewport();
  loadAircraftDetails(jet);
  scheduleNextRealtimeRefresh();
}

function selectAirport(id, shouldPan = true) {
  const airport = airportById(id);
  if (!airport) {
    return;
  }
  const selectingDifferentAirport = state.selectedKind !== "airport" || state.selectedId !== id;
  clearRouteFocus({ restore: false });
  state.selectedTrackStore = null;
  state.followSelectedAircraft = false;
  state.hideOtherAircraft = false;
  state.airportTab = selectingDifferentAirport ? "all" : (state.airportTab || "all");
  state.airportSegment = selectingDifferentAirport ? "dynamic" : (state.airportSegment || "dynamic");
  updateFollowButton();
  showAircraftMoreMenu(false);
  state.lastTargetSelectAt = performance.now();
  state.selectedKind = "airport";
  state.selectedId = id;
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
      <span><strong>${displayOrDash(jet.callsign)}</strong><small>${displayOrDash(jet.from)} - ${displayOrDash(jet.to)} | ${displayOrDash(jet.model)}</small></span>
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

function aircraftDisplayIdentifier(jet) {
  return firstMatchedValue(jet.callsign, jet.flightNo, jet.tripNo, jet.registration, jet.tailNoClear, jet.id);
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
    title: firstMatchedValue(jet.tripNo, jet.flightNo, jet.callsign, aircraftDisplayIdentifier(jet)),
    meta: [aircraftRouteLabel(jet), firstMatchedValue(jet.model, jet.aircraftTypeCode), formatPanelTime(scheduleTime, { date: true, timeZone: depZone === NA_TEXT ? "UTC" : depZone })]
      .filter((value) => !missingValue(value))
      .join(" | "),
    badge: live ? "LIVE" : "SCHEDULED",
    badgeClass: live ? "live" : "scheduled",
    sortScore: options.sortScore ?? searchMatchScore(options.query, [
      jet.tripNo,
      jet.flightNo,
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
    renderAirportTabList(airport);
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

function bindEvents() {
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
      setRouteFocus(false);
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
  document.getElementById("locateButton").addEventListener("click", async () => {
    await setMapToUserLocation();
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
  document.getElementById("routeFocusButton").addEventListener("click", () => {
    setRouteFocus(!routeFocusActive());
  });
  document.getElementById("routeFromButton")?.addEventListener("click", (event) => {
    selectAirportFromCode(event.currentTarget.dataset.airportCode);
  });
  document.getElementById("routeToButton")?.addEventListener("click", (event) => {
    selectAirportFromCode(event.currentTarget.dataset.airportCode);
  });
  document.getElementById("followAircraftButton")?.addEventListener("click", () => {
    state.followSelectedAircraft = !state.followSelectedAircraft;
    updateFollowButton();
    const jet = selectedAircraft();
    if (state.followSelectedAircraft && jet) {
      state.map.panTo(currentPosition(jet));
    }
  });
  document.getElementById("shareAircraftButton")?.addEventListener("click", async (event) => {
    const jet = selectedAircraft();
    if (!jet) {
      return;
    }
    const url = new URL(window.location.href);
    url.hash = `aircraft=${encodeURIComponent(jet.id)}`;
    try {
      await navigator.clipboard?.writeText(url.toString());
      event.currentTarget.classList.add("active");
      window.setTimeout(() => event.currentTarget.classList.remove("active"), 1200);
    } catch (error) {
      window.location.hash = url.hash;
    }
  });
  document.getElementById("moreAircraftButton")?.addEventListener("click", () => {
    const jet = selectedAircraft();
    if (jet) {
      renderAircraftMoreMenu(jet);
      showAircraftMoreMenu();
    }
  });
  document.querySelectorAll("[data-aircraft-segment]").forEach((button) => {
    button.addEventListener("click", () => setAircraftSegment(button.dataset.aircraftSegment));
    button.addEventListener("keydown", (event) => handleDetailSegmentKeydown(event, "[data-aircraft-segment]"));
  });
  document.querySelectorAll("[data-airport-segment]").forEach((button) => {
    button.addEventListener("click", () => setAirportSegment(button.dataset.airportSegment));
    button.addEventListener("keydown", (event) => handleDetailSegmentKeydown(event, "[data-airport-segment]"));
  });
  document.querySelectorAll("[data-airport-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.airportTab = button.dataset.airportTab || "all";
      document.querySelectorAll("[data-airport-tab]").forEach((tabButton) => {
        const isActive = tabButton.dataset.airportTab === state.airportTab;
        tabButton.classList.toggle("active", isActive);
        tabButton.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      const airport = selectedAirport();
      if (airport) {
        renderAirportTabList(airport);
      }
    });
  });
  document.querySelectorAll("[data-route-mode]").forEach((button) => {
    button.addEventListener("click", () => setRouteColorMode(button.dataset.routeMode));
  });
  document.querySelectorAll("[data-chart-unit]").forEach((button) => {
    button.addEventListener("click", () => setSpeedAltitudeUnit(button.dataset.chartUnit));
  });
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
  window.addEventListener("resize", debounce(() => {
    if (routeFocusActive()) {
      fitSelectedRouteBounds();
    }
  }, 180));
}

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

async function init() {
  bindEvents();
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
  const refreshViewportData = debounce(() => {
    state.isInteractingWithMap = false;
    renderViewport();
    refreshRealtimeData("viewport");
  }, mapLoadingConfig.viewportDebounceMs);
  state.map.onViewportChange({
    onInteractionStart: () => {
      state.isInteractingWithMap = true;
      if (state.followSelectedAircraft) {
        state.followSelectedAircraft = false;
        updateFollowButton();
      }
    },
    onVisualChange: () => {
      renderViewport();
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
      const selected = state.selectedId;
      selectAircraft(selected, false, { preserveReducedIconState: true });
    } else {
      renderAircraft();
      updateRail();
    }
  }, 3500);
}

init();
