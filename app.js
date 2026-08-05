const appConfig = window.APP_CONFIG || {};
const aircraftIconConfig = window.AIRCRAFT_ICON_CONFIG || {};
const groundProjectionCore = window.AIRCRAFT_GROUND_PROJECTION;
const NA_TEXT = "N/A";
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
    { zoom: 7.5, limit: 650 },
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
    { zoom: 7.5, level: 3 },
    { zoom: 9.5, level: 4 },
    { zoom: 12, level: 5 }
  ],
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
  GL7T: "lj45",
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
const configuredAircraftIconKeyByTypeCode = aircraftIconConfig.typeCodeIconMap || Object.fromEntries(
  (aircraftIconConfig.typeMappings || []).map((item) => [item.aircraftTypeCode, item.fr24IconKey || item.iconKey])
);
const aircraftIconKeyByTypeCode = Object.keys(configuredAircraftIconKeyByTypeCode).length
  ? configuredAircraftIconKeyByTypeCode
  : fallbackAircraftIconKeyByTypeCode;
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
  return steppedValue(mapLoadingConfig.airportLimitByZoom, currentZoom(), "limit");
}

function airportLevelLimit() {
  return steppedValue(mapLoadingConfig.airportLevelByZoom, currentZoom(), "level");
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
  if (clamped < 7.5) {
    if (visibleClass === "small") {
      return { width: 0, height: 0, hitWidth: 0, hitHeight: 0 };
    }
    return visibleClass === "major"
      ? { width: 24, height: 31, hitWidth: 38, hitHeight: 42 }
      : { width: 18, height: 23, hitWidth: 34, hitHeight: 38 };
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

function airportDisplayCode(airport) {
  const iata = airport.iata && airport.iata !== airport.id ? airport.iata : "";
  const icao = airport.icaoCode || airport.id;
  return iata ? `${iata}/${icao}` : icao || airport.id || "-";
}

function airportFullLabel(airport) {
  const name = airport.name || airport.city || airport.id || "-";
  return `${name} ${airportDisplayCode(airport)}`;
}

function desiredAirportLabelMode(airport) {
  if (airportIsSelected(airport)) {
    return currentZoom() < 8.5 ? "code" : "full";
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
  "Bombardier Global 7500": { manufacturer: "Bombardier", aircraftTypeCode: "GL7T", sizeClass: "ultra-long", fr24IconKey: "lj45" },
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

function applyAircraftTypeMetadata(jet) {
  const type = aircraftTypeCatalog[jet.model] || {};
  jet.manufacturer = type.manufacturer || jet.family || "Unknown";
  jet.aircraftTypeCode = String(jet.aircraftTypeCode || jet.icaoCode || jet.modelSeries || type.aircraftTypeCode || "BIZ").toUpperCase();
  jet.fr24IconKey = jet.fr24IconKey || aircraftIconKeyByTypeCode[jet.aircraftTypeCode] || type.fr24IconKey || defaultBusinessJetIconKey;
  if (!aircraftIconPaths[jet.fr24IconKey] && !aircraftIconImagePaths[jet.fr24IconKey]) {
    jet.fr24IconKey = defaultBusinessJetIconKey;
  }
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
  airportTab: "arrivals",
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
  detailLoads: new Set(),
  routeColorMode: "altitude",
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
      ? [...record.cores.values(), ...(record.halos || []), record.planned]
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
    const record = state.tracks.get(id) || { cores: new Map(), halos: [], planned: null };
    if (!(record.cores instanceof Map)) {
      this.clearTrackRecord(record);
      record.cores = new Map();
      record.halos = [];
      record.planned = null;
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
    } else if (record.planned) {
      this.map.removeLayer(record.planned);
      record.planned = null;
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
    record.cores.forEach((core, segmentId) => {
      if (!activeSegmentIds.has(segmentId)) {
        this.map.removeLayer(core);
        record.cores.delete(segmentId);
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

  createAircraftMarker(jet, position, heading) {
    const content = document.createElement("div");
    this.updateAircraftContent(content, jet, heading);
    const marker = new this.AdvancedMarkerElement({
      map: this.map,
      position: { lat: position[0], lng: position[1] },
      content,
      title: `${jet.callsign} ${jet.model}`,
      zIndex: 200,
      anchorLeft: "-32px",
      anchorTop: "-32px",
      gmpClickable: true,
      collisionBehavior: google.maps.CollisionBehavior?.OPTIONAL_AND_HIDES_LOWER_PRIORITY
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
    content.setAttribute("aria-label", `${jet.callsign} ${jet.model}`);
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
    label.textContent = jet.callsign;
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
      this.updateAircraftContent(record.content, jet, heading);
      record.marker.position = { lat: position[0], lng: position[1] };
      record.marker.map = this.map;
      record.marker.zIndex = aircraftIsSelected(jet) ? 420 : 220 - Math.min(160, Math.round(aircraftPriority(jet) / 10000));
      if ("collisionBehavior" in record.marker && google.maps.CollisionBehavior) {
        record.marker.collisionBehavior = aircraftIsSelected(jet)
          ? google.maps.CollisionBehavior.REQUIRED
          : google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY;
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
      title: `${airport.id} ${airport.name}`,
      zIndex: 120,
      anchorLeft: "-50%",
      anchorTop: "-100%",
      gmpClickable: true,
      collisionBehavior: google.maps.CollisionBehavior?.OPTIONAL_AND_HIDES_LOWER_PRIORITY
    });
    marker.addEventListener("gmp-click", () => selectAirport(airport.id));
    return {
      content,
      marker
    };
  }

  updateAirportContent(content, airport) {
    const { metrics } = airportMarkerCssVars(airport);
    content.className = `native-map-marker ${airportMarkerClass(airport, metrics)}`;
    content.dataset.id = airport.id;
    content.dataset.level = String(airportPriorityLevel(airport));
    content.dataset.markerSize = metrics.sizeClass;
    content.setAttribute("aria-label", `${airport.id} ${airport.name}`);
    content.setAttribute("title", airportFullLabel(airport));
    content.style.setProperty("--airport-icon-width", `${metrics.visualWidth}px`);
    content.style.setProperty("--airport-icon-height", `${metrics.visualHeight}px`);
    content.style.setProperty("--airport-hit-width", `${metrics.hitWidth}px`);
    content.style.setProperty("--airport-hit-height", `${metrics.hitHeight}px`);
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
      content.dataset.ready = "true";
    }
    content.querySelector(".airport-code-label").textContent = airport.renderLabelMode === "full"
      ? airportFullLabel(airport)
      : airportDisplayCode(airport);
    content.querySelector(".airport-hover-label").textContent = airportFullLabel(airport);
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
      record.marker.zIndex = airportIsSelected(airport) ? 410 : 120 - airportPriorityLevel(airport);
      if ("collisionBehavior" in record.marker && google.maps.CollisionBehavior) {
        record.marker.collisionBehavior = airportIsSelected(airport)
          ? google.maps.CollisionBehavior.REQUIRED
          : google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY;
      }
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
      ? [...record.cores.values(), ...(record.halos || []), record.planned]
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
    const record = this.lines.get(id) || { cores: new Map(), halos: [], planned: null };
    if (!(record.cores instanceof Map)) {
      this.clearTrackRecord(record);
      record.cores = new Map();
      record.halos = [];
      record.planned = null;
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
    } else if (record.planned) {
      record.planned.setMap(null);
      record.planned = null;
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
    record.cores.forEach((core, segmentId) => {
      if (!activeSegmentIds.has(segmentId)) {
        core.setMap(null);
        record.cores.delete(segmentId);
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
  const text = jet.callsign || jet.registration || jet.id;
  const width = Math.min(112, Math.max(46, String(text).length * 7.2 + 14));
  const height = 20;
  const left = point.x + metrics.labelLeft - 32;
  const top = point.y - 9;
  return {
    left,
    right: left + width,
    top,
    bottom: top + height
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
  const iconKey = jet.fr24IconKey || aircraftIconKeyByTypeCode[jet.aircraftTypeCode] || defaultBusinessJetIconKey;
  return aircraftIconPaths[iconKey] || aircraftIconImagePaths[iconKey] ? iconKey : defaultBusinessJetIconKey;
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
  return {
    iconKey,
    iconStyle: aircraftIconStyle(jet),
    sizeClass,
    visualSize,
    labelLeft: Math.round(visualSize / 2 + 28),
    labelHidden: jet.renderLabelMode === "none" || (!jet.renderLabelMode && zoom < 5.5 && !selected)
  };
}

function aircraftMarkerCssVars(jet) {
  const metrics = aircraftMarkerMetrics(jet);
  const iconStyle = metrics.iconStyle;
  return {
    metrics,
    cssText: `--aircraft-icon-size:${metrics.visualSize}px; --aircraft-label-left:${metrics.labelLeft}px; --aircraft-fill:${iconStyle.fill}; --aircraft-stroke:${iconStyle.stroke};`
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
  element.style.setProperty("--aircraft-label-left", `${metrics.labelLeft}px`);
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
  return `
    <button type="button" class="${aircraftMarkerClass(jet, metrics)}" data-id="${jet.id}" data-icon-key="${metrics.iconKey}" style="left:${point.x}px; top:${point.y}px; ${cssText}" aria-label="${jet.callsign} ${jet.model}">
      ${aircraftSvg(jet, heading)}
      <span class="aircraft-label">${jet.callsign}</span>
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
  if (!value) {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10000000000 ? numeric : numeric * 1000;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function normalizeTrackPoint(point, jet, index, total) {
  const lat = Array.isArray(point) ? Number(point[0]) : Number(point?.lat ?? point?.latitude);
  const lng = Array.isArray(point) ? Number(point[1]) : Number(point?.lng ?? point?.lon ?? point?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) {
    return null;
  }
  const arrayPoint = Array.isArray(point);
  const pointAltitudeFt = trackNumericValue(point?.altitudeFt);
  const pointAltitudeM = trackNumericValue(point?.altitudeM);
  const pointSpeedKt = trackNumericValue(point?.groundSpeedKt ?? point?.speedKt);
  const pointSpeedKmh = trackNumericValue(point?.speedKmh);
  const altitudeFt = arrayPoint
    ? syntheticTrackValue(jet, index, total, "altitude")
    : pointAltitudeFt !== null
      ? pointAltitudeFt
      : pointAltitudeM !== null
        ? pointAltitudeM * 3.28084
        : normalizeAltitudeFeet(point.altitude, null);
  const groundSpeedKt = arrayPoint
    ? syntheticTrackValue(jet, index, total, "speed")
    : pointSpeedKt !== null
      ? pointSpeedKt
      : pointSpeedKmh !== null
        ? pointSpeedKmh * 0.539957
        : normalizeSpeedKnots(point.speed, null);
  const isEstimated = Boolean(point?.isEstimated || point?.estimated || point?.quality === "estimated");
  return {
    lat,
    lng: normalizeLongitude(lng),
    altitudeFt: trackNumericValue(altitudeFt),
    groundSpeedKt: trackNumericValue(groundSpeedKt),
    heading: Number(point?.heading ?? point?.course ?? jet.heading),
    timestamp: parseTrackTime(point?.timestamp ?? point?.createTime ?? point?.time),
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
  return [...requiredIndexes]
    .sort((a, b) => a - b)
    .map((index) => points[index]);
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
  if (state.map.renderAircraftMarkers) {
    state.map.renderAircraftMarkers(aircraftMarkers);
  } else {
    aircraftLayer.innerHTML = aircraftMarkers.map(markerHtml).join("");
    aircraftLayer.querySelectorAll(".aircraft-marker").forEach((button) => {
      button.addEventListener("click", () => selectAircraft(button.dataset.id));
    });
  }
  renderSelectedAircraftTrack();
  state.lastRenderCostMs = Math.round((performance.now() - start) * 10) / 10;
}

function renderAirports() {
  const airportLayer = document.getElementById("airportLayer");
  if (!state.airports && !selectedAirport()) {
    state.renderedAirports = [];
    if (state.map.renderAirportMarkers) {
      state.map.renderAirportMarkers([]);
    } else {
      airportLayer.innerHTML = "";
    }
    return;
  }
  const airportMarkers = airportsForCurrentView();
  state.renderedAirports = airportMarkers;
  if (state.map.renderAirportMarkers) {
    state.map.renderAirportMarkers(airportMarkers);
    return;
  }
  airportLayer.innerHTML = airportMarkers.map((airport) => {
    const point = state.map.project([airport.lat, airport.lng]);
    const { metrics, cssText } = airportMarkerCssVars(airport);
    return `
      <button type="button" class="${airportMarkerClass(airport, metrics)}" data-id="${airport.id}" data-level="${airportPriorityLevel(airport)}" style="left:${point.x}px; top:${point.y}px; ${cssText}" aria-label="${airport.id} ${airport.name}" title="${airportFullLabel(airport)}">
        <span class="airport-marker-hit">
          <span class="marker-map-shadow airport-map-shadow" aria-hidden="true"></span>
          <svg class="airport-pin-icon" viewBox="0 0 28 36" aria-hidden="true">
            <path class="airport-pin-body" d="M14 1.8C7.1 1.8 2.3 6.8 2.3 13.2c0 7.8 9.2 19 11 21a.95.95 0 0 0 1.4 0c1.8-2 11-13.2 11-21C25.7 6.8 20.9 1.8 14 1.8Z"></path>
            <path class="airport-pin-tower" d="M12.4 8.5h3.2l.8 4.1h2.1v2.2h-1.7l.9 4.8h1.5v2.2H8.8v-2.2h1.5l.9-4.8H9.5v-2.2h2.1l.8-4.1Zm.5 11.1h2.2l-.8-4.8h-.6l-.8 4.8Zm.2-7h1.8l-.3-1.8h-1.2l-.3 1.8Z"></path>
          </svg>
          <span class="airport-code-label">${airport.renderLabelMode === "full" ? airportFullLabel(airport) : airportDisplayCode(airport)}</span>
          <span class="airport-hover-label">${airportFullLabel(airport)}</span>
        </span>
      </button>
    `;
  }).join("");
  airportLayer.querySelectorAll(".airport-pin").forEach((button) => {
    button.addEventListener("click", () => selectAirport(button.dataset.id));
  });
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
  return !text || text === "-" || text.toUpperCase() === NA_TEXT;
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

function parsePanelEpoch(value) {
  if (!value) {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10000000000 ? numeric : numeric * 1000;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPanelTime(value, options = {}) {
  if (missingValue(value)) {
    return NA_TEXT;
  }
  const epoch = parsePanelEpoch(value);
  if (epoch) {
    const date = new Date(epoch);
    return options.date
      ? date.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return String(value).includes(" ") && !options.date
    ? String(value).split(" ").pop().slice(0, 5)
    : String(value);
}

function formatMetersDistance(value) {
  return finiteNumber(value) ? `${formatNumber(Math.round(Number(value) / 1000))} km` : NA_TEXT;
}

function formatDuration(valueMs) {
  if (!finiteNumber(valueMs) || Number(valueMs) < 0) {
    return NA_TEXT;
  }
  const totalMinutes = Math.round(Number(valueMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
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
  const formatted = formatPanelTime(time);
  const days = Number.parseInt(acrossDays, 10);
  return formatted !== NA_TEXT && Number.isFinite(days) && days > 0 ? `${formatted} +${days}` : formatted;
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
    ? new Date(state.realtimeLoadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
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
    ? new Date(state.airportLoadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
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

function generatedCallsignLike(value) {
  return /^JET[0-9A-Za-z]{4}$/.test(String(value || "").trim());
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
          if (generatedCallsignLike(jet.callsign)) {
            jet.callsign = value;
          }
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
  applyFlightTrackEndpoint(jet, detail);
  syncSelectedTrackHistoryFromDetail(jet, detail);
}

function applyPlaneDetail(jet, detail) {
  if (!detail) {
    return;
  }
  jet.planeDetail = detail;
  applyJetDetailUpdates(jet, detail.updates);
}

function replaceAircraftData(nextAircraft) {
  if (!Array.isArray(nextAircraft)) {
    return;
  }
  const existingById = new Map(businessJets.map((jet) => [jet.id, jet]));
  const merged = nextAircraft.map((incoming) => {
    const existing = existingById.get(incoming.id);
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
  document.getElementById("leftDetailPanel").hidden = true;
  state.selectedKind = null;
  state.selectedId = null;
  state.selectedTrackStore = null;
  state.followSelectedAircraft = false;
  state.hideOtherAircraft = false;
  showAircraftMoreMenu(false);
  updateFollowButton();
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

  const existingById = new Map(businessJets.map((jet) => [jet.id, jet]));
  snapshot.aircraft.forEach((incoming) => {
    const existing = existingById.get(incoming.id);
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
    const snapshot = await dataService.getRealtimeSnapshot({
      includeAirports: true,
      includeAircraft: false,
      reason: `airport-${reason}`
    });
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
      selectAircraft(state.selectedId, false);
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
    const currentJet = businessJets.find((item) => item.id === jet.id);
    if (!currentJet) {
      return;
    }
    if (trackResult.status === "fulfilled") {
      applyFlightTrackDetail(currentJet, trackResult.value);
    }
    if (profileResult.status === "fulfilled") {
      applyPlaneDetail(currentJet, profileResult.value);
    }
    if (state.selectedKind === "aircraft" && state.selectedId === currentJet.id) {
      selectAircraft(currentJet.id, false);
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

function openAircraftView() {
  document.getElementById("leftDetailPanel").hidden = false;
  document.getElementById("aircraftDetailView").hidden = false;
  document.getElementById("airportDetailView").hidden = true;
  document.getElementById("tabFlight").hidden = false;
  document.getElementById("tabAircraft").hidden = false;
  document.getElementById("tabFlight").classList.add("active");
  document.getElementById("tabAircraft").classList.remove("active");
}

function openAirportView() {
  document.getElementById("leftDetailPanel").hidden = false;
  document.getElementById("aircraftDetailView").hidden = true;
  document.getElementById("airportDetailView").hidden = false;
  document.getElementById("tabFlight").hidden = true;
  document.getElementById("tabAircraft").hidden = true;
}

function selectedRouteSide(jet, side) {
  const detail = jet.flightDetail || {};
  const base = detail.flightBaseInfo || {};
  const routeAirport = side === "dep" ? detail.airportInfo?.dep : detail.airportInfo?.arr;
  const knownAirport = side === "dep" ? airportByCode(jet.from) : airportByCode(jet.to);
  if (side === "dep") {
    return {
      code: firstMatchedValue(base.depAirport, routeAirport?.airportCode, base.depIcaoCode, routeAirport?.icaoCode, jet.from),
      icao: firstMatchedValue(base.depIcaoCode, routeAirport?.icaoCode, knownAirport?.icaoCode),
      name: firstMatchedValue(base.depAirportName, routeAirport?.airportNameEn, routeAirport?.airportName, routeAirport?.airportFourName, jet.fromName, airportDisplayName(knownAirport)),
      zone: firstMatchedValue(base.depZoneId, base.depTimeZone, routeAirport?.timeZone, knownAirport?.timeZone)
    };
  }
  return {
    code: firstMatchedValue(base.arrAirport, routeAirport?.airportCode, base.arrIcaoCode, routeAirport?.icaoCode, jet.to),
    icao: firstMatchedValue(base.arrIcaoCode, routeAirport?.icaoCode, knownAirport?.icaoCode),
    name: firstMatchedValue(base.arrAirportName, routeAirport?.airportNameEn, routeAirport?.airportName, routeAirport?.airportFourName, jet.toName, airportDisplayName(knownAirport)),
    zone: firstMatchedValue(base.arrZoneId, base.arrTimeZone, routeAirport?.timeZone, knownAirport?.timeZone)
  };
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

function renderSpeedAltitudeChart(jet) {
  const points = aircraftTrackPoints(jet)
    .filter((point) => finiteNumber(point.timestamp) && (finiteNumber(point.altitudeFt) || finiteNumber(point.groundSpeedKt)))
    .slice(-260);
  setText("flightTrackPointCount", points.length ? points.length : NA_TEXT);
  const last = points[points.length - 1];
  setText("flightLastPointTime", last?.timestamp ? formatPanelTime(last.timestamp) : NA_TEXT);

  if (points.length < 2) {
    setHtml("speedAltitudeChart", `<div class="chart-empty">N/A</div>`);
    return;
  }

  const width = 328;
  const height = 196;
  const pad = { left: 34, right: 18, top: 24, bottom: 30 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const times = points.map((point, index) => finiteNumber(point.timestamp) ? Number(point.timestamp) : index);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const altitudeValues = points.map((point) => Number(point.altitudeFt)).filter(Number.isFinite);
  const speedValues = points.map((point) => Number(point.groundSpeedKt)).filter(Number.isFinite);
  const minAltitude = altitudeValues.length ? Math.min(...altitudeValues) : 0;
  const maxAltitude = altitudeValues.length ? Math.max(...altitudeValues) : 1;
  const minSpeed = speedValues.length ? Math.min(...speedValues) : 0;
  const maxSpeed = speedValues.length ? Math.max(...speedValues) : 1;

  function xFor(index) {
    const span = Math.max(1, maxTime - minTime);
    return pad.left + ((times[index] - minTime) / span) * plotWidth;
  }

  function yFor(value, min, max) {
    const span = Math.max(1, max - min);
    return pad.top + plotHeight - ((Number(value) - min) / span) * plotHeight;
  }

  const altitudePolyline = points
    .map((point, index) => finiteNumber(point.altitudeFt) ? `${xFor(index).toFixed(1)},${yFor(point.altitudeFt, minAltitude, maxAltitude).toFixed(1)}` : "")
    .filter(Boolean)
    .join(" ");
  const speedPolyline = points
    .map((point, index) => finiteNumber(point.groundSpeedKt) ? `${xFor(index).toFixed(1)},${yFor(point.groundSpeedKt, minSpeed, maxSpeed).toFixed(1)}` : "")
    .filter(Boolean)
    .join(" ");
  const startLabel = formatPanelTime(minTime);
  const endLabel = formatPanelTime(maxTime);

  setHtml("speedAltitudeChart", `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Speed and altitude graph">
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
        <circle cx="38" cy="13" r="3" class="legend-alt"></circle><text x="46" y="17">BARO ALT</text>
        <circle cx="142" cy="13" r="3" class="legend-speed"></circle><text x="150" y="17">GROUND SPD</text>
      </g>
      <text x="${pad.left}" y="${height - 10}" class="chart-axis">${escapeHtml(startLabel)}</text>
      <text x="${width - pad.right}" y="${height - 10}" class="chart-axis chart-axis-end">${escapeHtml(endLabel)}</text>
      <text x="${pad.left}" y="${pad.top + 12}" class="chart-axis">${escapeHtml(formatAltitude(maxAltitude))}</text>
      <text x="${width - pad.right}" y="${pad.top + 12}" class="chart-axis chart-axis-end">${escapeHtml(formatSpeed(maxSpeed))}</text>
    </svg>
  `);
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
    setHtml("recentFlightsList", `<p class="empty-related">N/A</p>`);
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

function renderAircraftMoreMenu(jet) {
  const menu = document.getElementById("aircraftMoreMenu");
  if (!menu) {
    return;
  }
  const dep = selectedRouteSide(jet, "dep");
  const arr = selectedRouteSide(jet, "arr");
  menu.innerHTML = `
    <button type="button" class="more-row" data-more-action="aircraft">
      <span>Aircraft registration</span><strong>${escapeHtml(displayOrDash(jet.registration))}</strong>
    </button>
    <button type="button" class="more-row" data-more-action="operator">
      <span>Operator</span><strong>${escapeHtml(displayOrDash(jet.operator))}</strong>
    </button>
    <button type="button" class="more-row" data-airport-code="${escapeHtml(dep.code === NA_TEXT ? "" : dep.code)}">
      <span>Origin airport</span><strong>${escapeHtml(dep.code)}</strong>
    </button>
    <button type="button" class="more-row" data-airport-code="${escapeHtml(arr.code === NA_TEXT ? "" : arr.code)}">
      <span>Destination airport</span><strong>${escapeHtml(arr.code)}</strong>
    </button>
    <button type="button" class="more-row" data-more-action="playback" disabled>
      <span>Playback</span><strong>N/A</strong>
    </button>
    <button type="button" class="more-row" data-more-action="hide-other">
      <span>Hide other aircraft</span><strong>${state.hideOtherAircraft ? "On" : "Off"}</strong>
    </button>
  `;
  menu.querySelectorAll("[data-airport-code]").forEach((button) => {
    button.addEventListener("click", () => selectAirportFromCode(button.dataset.airportCode));
  });
  menu.querySelector('[data-more-action="hide-other"]')?.addEventListener("click", () => {
    state.hideOtherAircraft = !state.hideOtherAircraft;
    renderAircraftMoreMenu(jet);
    renderViewport();
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
  const scheduledDeparture = firstMatchedValue(base.depTime2, base.scheduledDepartureTime, base.depPlanTime);
  const actualDeparture = firstMatchedValue(base.depActualEpochMs, base.depTime1, jet.depart);
  const scheduledArrival = firstMatchedValue(base.arrTime2, base.scheduledArrivalTime, base.arrPlanTime);
  const estimatedArrival = firstMatchedValue(base.arrActualEpochMs, base.arrTime1, jet.arrive);
  const serverNow = parsePanelEpoch(base.serverNowEpochMs || jet.flightDetail?.serverNowEpochMs || base.currentTimeGmt8 || jet.updatedAtEpochMs || Date.now());
  const departedAt = parsePanelEpoch(base.depActualEpochMs || base.depTime1);
  const arrivalAt = parsePanelEpoch(base.arrActualEpochMs || base.arrTime1);
  const elapsed = serverNow && departedAt ? formatDuration(serverNow - departedAt) : NA_TEXT;
  const remaining = serverNow && arrivalAt && arrivalAt > serverNow ? formatDuration(arrivalAt - serverNow) : NA_TEXT;

  setText("aircraftStatus", firstMatchedValue(base.flightStateStr, summary.flightStateStr, jet.status));
  setText("aircraftCallsign", firstMatchedValue(jet.callsign, jet.registration, plane.tailNoDisplay));
  setText("aircraftSubhead", `${displayOrDash(jet.registration)} | ${displayOrDash(firstMatchedValue(plane.modelNameEn, jet.model))}`);
  setText("aircraftTypeBadge", firstMatchedValue(plane.icaoCode, plane.modelSeries, jet.aircraftTypeCode, jet.family, jet.planeSize));
  renderAircraftMedia(jet);

  setText("routeFrom", dep.code);
  setText("routeFromName", dep.name);
  setText("routeFromTimezone", dep.zone);
  setText("routeTo", arr.code);
  setText("routeToName", arr.name);
  setText("routeToTimezone", arr.zone);
  const fromButton = document.getElementById("routeFromButton");
  const toButton = document.getElementById("routeToButton");
  if (fromButton) fromButton.dataset.airportCode = dep.code === NA_TEXT ? "" : dep.code;
  if (toButton) toButton.dataset.airportCode = arr.code === NA_TEXT ? "" : arr.code;

  setText("scheduledDeparture", formatPanelTime(scheduledDeparture));
  setText("departedTime", formatPanelTime(actualDeparture));
  setText("scheduledArrival", maybeAppendAcrossDays(scheduledArrival, base.acrossDays));
  setText("arrivalTime", maybeAppendAcrossDays(estimatedArrival, base.acrossDays));
  setText("flightProgressLeft", `${formatMetersDistance(summary.distance)} | ${elapsed}`);
  setText("flightProgressRight", remaining);
  const progressBar = document.getElementById("flightProgress");
  if (progressBar) progressBar.style.width = `${formatProgressPercent(jet)}%`;

  setText("aircraftModel", firstMatchedValue(plane.modelNameEn, plane.modelName, jet.model));
  setText("aircraftTypeCode", firstMatchedValue(plane.icaoCode, plane.modelSeries, jet.aircraftTypeCode));
  setText("aircraftRegistration", firstMatchedValue(jet.registration, plane.tailNoDisplay));
  setText("aircraftCountry", firstMatchedValue(plane.registrationPlace));
  setText("aircraftSerial", firstMatchedValue(plane.planeMsn));
  setText("aircraftAge", calculateAircraftAge(plane.deliveryDate));
  setText("aircraftCategory", firstMatchedValue(plane.planeSize, jet.planeSize, jet.family));
  setText("aircraftOperator", firstMatchedValue(provider.companyNameShort, provider.companyName, jet.operator));
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
  setText("dataLastPositionTime", formatPanelTime(jet.positionTimestamp || jet.updatedAtEpochMs, { date: true }));
  setText("dataLatitude", finiteNumber(lat) ? Number(lat).toFixed(5) : NA_TEXT);
  setText("dataLongitude", finiteNumber(lng) ? Number(lng).toFixed(5) : NA_TEXT);
  setText("dataQuality", firstMatchedValue(jet.quality, aircraftFreshnessState(jet)));

  renderSpeedAltitudeChart(jet);
  renderRecentFlights(jet);
  renderAircraftMoreMenu(jet);
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
  const tab = state.airportTab || "arrivals";
  const related = businessJets
    .filter((jet) => {
      if (tab === "ground" && !jet.onGround && !jet.groundAirport && !jet.currentAirport) {
        return false;
      }
      return jetMatchesAirport(jet, airport, tab);
    })
    .slice(0, 12);

  if (!related.length) {
    list.innerHTML = `<p class="empty-related">N/A</p>`;
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
  const zone = firstMatchedValue(airport.apiDetail?.airportInfo?.zoneId, airport.zoneId, airport.timeZone);
  if (zone === NA_TEXT) {
    return NA_TEXT;
  }
  if (String(zone).includes("/")) {
    try {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: zone });
    } catch (error) {
      return NA_TEXT;
    }
  }
  return zone;
}

function renderAirportTerminals(airport) {
  const terminals = Array.isArray(airport.apiDetail?.airportTerminals) ? airport.apiDetail.airportTerminals : [];
  if (!terminals.length) {
    setHtml("airportTerminals", `<p class="empty-related">N/A</p>`);
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

  setText("airportPanelStatus", firstMatchedValue(info.type, "Airport"));
  setText("airportCode", airportDisplayCode(airport));
  setText("airportName", firstMatchedValue(info.airportNameEn, info.airportName, airport.name));
  setText("airportSorties", firstMatchedValue(flights.sortiesEstimate));
  setText("airportInbound", inbound);
  setText("airportOutbound", outbound);
  setText("airportGround", groundCount);

  setText("airportCity", firstMatchedValue(airport.city, info.cityName, info.airportFourName));
  setText("airportCountry", firstMatchedValue(info.countryName, airport.country));
  setText("airportIata", firstMatchedValue(info.airportCode, airport.iata, airport.airportCode));
  setText("airportIcao", firstMatchedValue(info.icaoCode, airport.icaoCode, airport.id));
  setText("airportLocalTime", formatAirportLocalTime(airport));
  setText("airportTimeZone", firstMatchedValue(info.timeZone, airport.timeZone));
  setText("airportCoordinates", formatCoordinates([airport.lat, airport.lng]));
  setText("airportElevation", formatAirportElevation(airport));
  setText("airportGrade", firstMatchedValue(info.grade, airport.grade));
  setText("airportType", firstMatchedValue(info.type, airport.airportType));

  setText("airportDepartures", outbound);
  setText("airportArrivals", inbound);
  setText("airportGroundDetail", groundCount);
  setText("airportRunways", firstMatchedValue(info.runwayCount, airport.runways));
  setText("airportRunwayLength", firstMatchedValue(info.runwayLength ? `${info.runwayLength} m` : "", airport.runwayLength));
  setText("airportTrafficDate", firstMatchedValue(detail.date));

  setText("airportWeather", firstMatchedValue(weather.weather, airport.weather));
  setText("airportTemperature", firstMatchedValue(weather.tmp, weather.tmpHigh && weather.tmpLow ? `${weather.tmpLow} - ${weather.tmpHigh}` : ""));
  setText("airportWind", firstMatchedValue(weather.wind));
  setText("airportVisibility", firstMatchedValue(weather.visib));
  setText("airportAqi", firstMatchedValue(weather.aqi, weather.aqigrad));
  setText("airportWeatherReportTime", firstMatchedValue(weather.reportTime));

  renderAirportTabList(airport);
  renderAirportTerminals(airport);
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

function selectAircraft(id, shouldPan = true) {
  const jet = businessJets.find((item) => item.id === id);
  if (!jet) {
    return;
  }
  const selectingDifferentAircraft = state.selectedKind !== "aircraft" || state.selectedId !== id;
  if (state.routeFocusAircraftId && state.routeFocusAircraftId !== id) {
    state.routeFocusAircraftId = null;
    state.routeFocusPreviousView = null;
    state.map?.clearRouteEndpoints?.();
  }
  const keepMoreMenuOpen = !selectingDifferentAircraft && !document.getElementById("aircraftMoreMenu")?.hidden;

  const position = currentPosition(jet);
  state.selectedKind = "aircraft";
  state.selectedId = id;
  ensureSelectedTrackStore(jet, { reset: selectingDifferentAircraft });
  appendSelectedRealtimeTrackPoint(jet);
  openAircraftView();
  updateRouteFocusButton();
  renderAircraftDetailPanel(jet);
  updateFollowButton();
  showAircraftMoreMenu(keepMoreMenuOpen);
  if (shouldPan || state.followSelectedAircraft) {
    state.map.panTo(position);
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
  clearRouteFocus({ restore: false });
  state.selectedTrackStore = null;
  state.followSelectedAircraft = false;
  state.hideOtherAircraft = false;
  state.airportTab = "arrivals";
  updateFollowButton();
  showAircraftMoreMenu(false);
  state.selectedKind = "airport";
  state.selectedId = id;
  openAirportView();
  document.querySelectorAll("[data-airport-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.airportTab === state.airportTab);
  });
  updateRouteFocusButton();
  renderAirportDetailPanel(airport);
  if (shouldPan) {
    state.map.panTo([airport.lat, airport.lng]);
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
  const scheduleTime = firstMatchedValue(
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
    meta: [aircraftRouteLabel(jet), firstMatchedValue(jet.model, jet.aircraftTypeCode), formatPanelTime(scheduleTime, { date: true })]
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
    return `
      <div class="search-expanded-grid">
        <span><small>Altitude</small><strong>${escapeHtml(formatFlightLevel(jet.altitude))}</strong></span>
        <span><small>Speed</small><strong>${escapeHtml(formatSpeed(jet.speed))}</strong></span>
        <span><small>Route</small><strong>${escapeHtml(aircraftRouteLabel(jet))}</strong></span>
        <span><small>Updated</small><strong>${escapeHtml(formatPanelTime(aircraftLastUpdatedAt(jet), { date: true }))}</strong></span>
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
  state.airportTab = tab || "arrivals";
  document.querySelectorAll("[data-airport-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.airportTab === state.airportTab);
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

function selectSearchAirport(id, tab = "arrivals") {
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
    selectSearchAirport(item.id, "arrivals");
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

function bindEvents() {
  const airportLayerSelect = document.getElementById("airportLayerMode");
  airportLayerSelect.value = state.airportLayerMode;
  state.airports = state.airportLayerMode !== "off";
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
  document.getElementById("closeDetailPanel").addEventListener("click", () => {
    clearRouteFocus({ restore: false });
    document.getElementById("leftDetailPanel").hidden = true;
    state.selectedId = null;
    state.selectedKind = null;
    state.selectedTrackStore = null;
    state.followSelectedAircraft = false;
    state.hideOtherAircraft = false;
    showAircraftMoreMenu(false);
    updateFollowButton();
    renderAircraft();
    renderAirports();
    scheduleNextRealtimeRefresh();
  });
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
  document.querySelectorAll("[data-airport-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.airportTab = button.dataset.airportTab || "arrivals";
      document.querySelectorAll("[data-airport-tab]").forEach((tabButton) => {
        tabButton.classList.toggle("active", tabButton.dataset.airportTab === state.airportTab);
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
  version: "1.11",
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
  segmentSummary(points = [], options = {}) {
    return trackSegments(points, options.selected !== false, options.colorMode || "altitude").map((segment) => ({
      id: segment.id,
      path: segment.path,
      pathBreakBefore: segment.pathBreakBefore,
      color: segment.color,
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
      selectAircraft(selected, false);
    } else {
      renderAircraft();
      updateRail();
    }
  }, 3500);
}

init();
