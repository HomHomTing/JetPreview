const appConfig = window.APP_CONFIG || {};
const aircraftIconConfig = window.AIRCRAFT_ICON_CONFIG || {};
const defaultCenter = [22, 18];
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
  selectedTrackMaxPoints: appConfig.performance?.selectedTrackMaxPoints ?? 800,
  regularTrackMaxPoints: appConfig.performance?.regularTrackMaxPoints ?? 80,
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
  }
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
  fill: "#f8c400",
  stroke: "rgba(28, 25, 16, 0.92)",
  glow: "rgba(248, 196, 0, 0.18)",
  hoverGlow: "rgba(248, 196, 0, 0.34)"
};
const routeStyle = {
  altitudeStops: [
    { value: 0, color: "#ffffff" },
    { value: 300, color: "#fff200" },
    { value: 13100, color: "#b9e63a" },
    { value: 19700, color: "#25c9c7" },
    { value: 36100, color: "#2d46d0" },
    { value: 41000, color: "#8b2ab0" },
    { value: 42600, color: "#e53644" }
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
  regularWeight: 2.2,
  selectedWeight: 3.3,
  selectedHaloWeight: 6,
  selectedHaloOpacity: 0.4,
  estimatedOpacity: 0.68,
  estimatedDash: "2 8",
  estimatedDashRepeat: "12px",
  maxGapMs: 180000
};
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
  return window.matchMedia("(max-width: 640px)").matches ? 2 : 3;
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
  return steppedValue(mapLoadingConfig.aircraftLimitByZoom, currentZoom(), "limit");
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
  airports: true,
  airportLayerMode: appConfig.airportLayerMode || "auto",
  weather: false,
  selectedKind: null,
  selectedId: null,
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
  lastRenderCostMs: 0,
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
  liveAircraftActivated: liveDataOnly
};

class LeafletMapEngine {
  constructor() {
    this.type = "leaflet";
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
    }).setView(defaultCenter, defaultZoom());
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

  onViewportChange(callback) {
    if (typeof callback === "function") {
      this.map.on("move zoom resize", callback);
      return;
    }
    this.map.on("dragstart zoomstart", callback.onInteractionStart);
    this.map.on("move zoom resize", callback.onVisualChange);
    this.map.on("moveend zoomend resize", callback.onIdle);
  }

  clearTrackRecord(record) {
    if (!record) {
      return;
    }
    const layers = Array.isArray(record.layers) ? record.layers : [record];
    layers.forEach((layer) => {
      if (layer && this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
      }
    });
  }

  setTrack(id, points, selected) {
    this.clearTrackRecord(state.tracks.get(id));
    if (!state.trails || !Array.isArray(points) || points.length < 2) {
      state.tracks.delete(id);
      return;
    }

    const zoom = this.getZoom();
    if (!selected && zoom < 4) {
      state.tracks.delete(id);
      return;
    }

    const layers = [];
    trackSegments(points, selected).forEach((segment) => {
      if (selected && !segment.estimated) {
        layers.push(L.polyline(segment.path, {
          interactive: false,
          color: "#101010",
          weight: routeStyle.selectedHaloWeight,
          opacity: routeStyle.selectedHaloOpacity,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(this.map));
      }
      layers.push(L.polyline(segment.path, {
        interactive: selected,
        color: segment.color,
        weight: selected ? routeStyle.selectedWeight : routeStyle.regularWeight,
        opacity: selected ? routeStyle.selectedOpacity : routeStyle.regularOpacity,
        dashArray: segment.estimated ? routeStyle.estimatedDash : null,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(this.map));
    });
    state.tracks.set(id, { layers });
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

class GoogleMapEngine {
  constructor() {
    this.type = "google";
    this.lines = new Map();
    this.circles = [];
    this.aircraftMarkers = new Map();
    this.airportMarkers = new Map();
    this.markerLibraryPromise = google.maps.importLibrary
      ? google.maps.importLibrary("marker")
      : Promise.resolve(google.maps.marker);
    this.AdvancedMarkerElement = null;
    this.isClampingCenter = false;
    this.pendingWheelZoom = null;
    this.wheelFrame = null;
    const options = {
      center: { lat: 22, lng: 18 },
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

  clearTrackRecord(record) {
    if (!record) {
      return;
    }
    const lines = Array.isArray(record.lines) ? record.lines : [record];
    lines.forEach((line) => line?.setMap(null));
  }

  setTrack(id, points, selected) {
    this.clearTrackRecord(this.lines.get(id));
    if (!state.trails || !Array.isArray(points) || points.length < 2) {
      this.lines.delete(id);
      return;
    }

    const zoom = this.getZoom();
    if (!selected && zoom < 4) {
      this.lines.delete(id);
      return;
    }

    const lines = [];
    trackSegments(points, selected).forEach((segment) => {
      const path = segment.path.map(([lat, lng]) => ({ lat, lng }));
      if (selected && !segment.estimated) {
        lines.push(new google.maps.Polyline({
          map: this.map,
          clickable: false,
          path,
          strokeColor: "#101010",
          strokeOpacity: routeStyle.selectedHaloOpacity,
          strokeWeight: routeStyle.selectedHaloWeight
        }));
      }
      lines.push(new google.maps.Polyline({
        map: this.map,
        clickable: selected,
        path,
        strokeColor: segment.color,
        strokeOpacity: segment.estimated ? 0 : (selected ? routeStyle.selectedOpacity : routeStyle.regularOpacity),
        strokeWeight: selected ? routeStyle.selectedWeight : routeStyle.regularWeight,
        icons: segment.estimated ? [{
          icon: {
            path: "M 0,-1 0,1",
            strokeColor: routeStyle.estimatedColor,
            strokeOpacity: routeStyle.estimatedOpacity,
            scale: 2
          },
          offset: "0",
          repeat: routeStyle.estimatedDashRepeat
        }] : []
      }));
    });
    this.lines.set(id, { lines });
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

function airportById(id) {
  return airports.find((airport) => airport.id === id);
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
  if (!state.map) {
    return applyAircraftLabelCollision(
      businessJets
        .filter((jet) => aircraftPassesLockedFilter(jet) && !aircraftIsExpired(jet))
        .slice(0, aircraftRenderLimit())
    );
  }
  const bounds = currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
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
    if (positionInBounds(position, bounds) || jet.id === selected?.id) {
      inView.push(jet);
    }
  });

  inView.sort((a, b) => aircraftPriority(a) - aircraftPriority(b));
  const rendered = inView.slice(0, limit);
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
  const shadowSize = Math.max(14, Math.round(visualSize * 0.68));
  return {
    iconKey,
    iconStyle: aircraftIconStyle(jet),
    sizeClass,
    visualSize,
    labelLeft: Math.round(visualSize / 2 + 28),
    shadowSize,
    shadowHeight: Math.max(6, Math.round(shadowSize * 0.36)),
    labelHidden: jet.renderLabelMode === "none" || (!jet.renderLabelMode && zoom < 5.5 && !selected)
  };
}

function aircraftMarkerCssVars(jet) {
  const metrics = aircraftMarkerMetrics(jet);
  const iconStyle = metrics.iconStyle;
  return {
    metrics,
    cssText: `--aircraft-icon-size:${metrics.visualSize}px; --aircraft-shadow-size:${metrics.shadowSize}px; --aircraft-shadow-height:${metrics.shadowHeight}px; --aircraft-label-left:${metrics.labelLeft}px; --aircraft-fill:${iconStyle.fill}; --aircraft-stroke:${iconStyle.stroke}; --aircraft-glow:${iconStyle.glow}; --aircraft-hover-glow:${iconStyle.hoverGlow};`
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
  element.style.setProperty("--aircraft-shadow-size", `${metrics.shadowSize}px`);
  element.style.setProperty("--aircraft-shadow-height", `${metrics.shadowHeight}px`);
  element.style.setProperty("--aircraft-label-left", `${metrics.labelLeft}px`);
  element.style.setProperty("--aircraft-fill", metrics.iconStyle.fill);
  element.style.setProperty("--aircraft-stroke", metrics.iconStyle.stroke);
  element.style.setProperty("--aircraft-glow", metrics.iconStyle.glow);
  element.style.setProperty("--aircraft-hover-glow", metrics.iconStyle.hoverGlow);
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
      <span class="marker-map-shadow aircraft-map-shadow" aria-hidden="true"></span>
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
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 0 && numeric <= 15000 ? numeric * 3.28084 : numeric;
  }
  return Number.isFinite(Number(fallback)) ? Number(fallback) : null;
}

function normalizeSpeedKnots(value, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 650 ? numeric * 0.539957 : numeric;
  }
  return Number.isFinite(Number(fallback)) ? Number(fallback) : null;
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
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const altitudeSource = Array.isArray(point)
    ? syntheticTrackValue(jet, index, total, "altitude")
    : point.altitudeFt ?? point.altitude ?? point.altitudeM;
  const speedSource = Array.isArray(point)
    ? syntheticTrackValue(jet, index, total, "speed")
    : point.groundSpeedKt ?? point.speedKt ?? point.speed;
  return {
    lat,
    lng,
    altitudeFt: normalizeAltitudeFeet(altitudeSource, jet.altitude),
    groundSpeedKt: normalizeSpeedKnots(speedSource, jet.speed),
    heading: Number(point?.heading ?? point?.course ?? jet.heading),
    timestamp: parseTrackTime(point?.timestamp ?? point?.createTime ?? point?.time),
    isEstimated: Boolean(point?.isEstimated),
    quality: point?.quality || (point?.isEstimated ? "estimated" : "good")
  };
}

function aircraftTrackPoints(jet) {
  const source = Array.isArray(jet.flightDetail?.coordinates) && jet.flightDetail.coordinates.length >= 2
    ? jet.flightDetail.coordinates
    : aircraftTrackPath(jet);
  return source
    .map((point, index) => normalizeTrackPoint(point, jet, index, source.length))
    .filter(Boolean);
}

function sampledTrackPoints(points, maxPoints) {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return points;
  }
  const step = (points.length - 1) / Math.max(1, maxPoints - 1);
  const sampled = [];
  for (let index = 0; index < maxPoints; index += 1) {
    sampled.push(points[Math.round(index * step)]);
  }
  return sampled;
}

function trackPointsForRender(jet, selected) {
  const points = aircraftTrackPoints(jet);
  const maxPoints = selected ? mapLoadingConfig.selectedTrackMaxPoints : mapLoadingConfig.regularTrackMaxPoints;
  return sampledTrackPoints(points, maxPoints);
}

function averageMetric(startValue, endValue) {
  const values = [Number(startValue), Number(endValue)].filter(Number.isFinite);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function segmentColor(start, end, colorMode = state.routeColorMode) {
  if (colorMode === "speed") {
    return speedTrailColor(averageMetric(start.groundSpeedKt, end.groundSpeedKt));
  }
  return altitudeTrailColor(averageMetric(start.altitudeFt, end.altitudeFt));
}

function trackGapIsEstimated(start, end) {
  if (start.isEstimated || end.isEstimated || start.quality === "estimated" || end.quality === "estimated") {
    return true;
  }
  if (!start.timestamp || !end.timestamp) {
    return false;
  }
  return Math.abs(end.timestamp - start.timestamp) > routeStyle.maxGapMs;
}

function trackSegments(points, selected, colorMode = state.routeColorMode) {
  const segments = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const estimated = trackGapIsEstimated(start, end);
    segments.push({
      id: `${index}`,
      path: [[start.lat, start.lng], [end.lat, end.lng]],
      color: estimated ? routeStyle.estimatedColor : segmentColor(start, end, colorMode),
      estimated,
      selected,
      start,
      end
    });
  }
  return segments;
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

  const activeIds = new Set();
  const zoom = currentZoom();
  const renderRegularTracks = zoom >= mapLoadingConfig.regularTrackMinZoom
    && aircraftMarkers.length <= mapLoadingConfig.regularTrackMaxAircraft;
  aircraftMarkers.forEach((jet) => {
    const selected = aircraftIsSelected(jet);
    if (!selected && !renderRegularTracks) {
      return;
    }
    activeIds.add(jet.id);
    state.map.setTrack(jet.id, trackPointsForRender(jet, selected), selected);
  });
  state.map.removeInactiveTracks?.(activeIds);
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

function displayOrDash(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function formatAltitude(value) {
  return finiteNumber(value) ? `${formatNumber(Number(value))} ft` : "-";
}

function formatFlightLevel(value) {
  return finiteNumber(value) ? `FL${Math.round(Number(value) / 100)}` : "-";
}

function formatSpeed(value) {
  return finiteNumber(value) ? `${Math.round(Number(value))} kt` : "-";
}

function formatVerticalSpeed(value) {
  return finiteNumber(value) ? `${formatNumber(Number(value))} fpm` : "-";
}

function formatHeading(value) {
  return finiteNumber(value) ? `${Math.round(Number(value))} deg` : "-";
}

function formatCoordinates(position) {
  return Array.isArray(position) && position.length === 2 && finiteNumber(position[0]) && finiteNumber(position[1])
    ? `${Number(position[0]).toFixed(3)}, ${Number(position[1]).toFixed(3)}`
    : "-";
}

function formatProgressPercent(jet) {
  const progress = liveProgress(jet);
  return Number.isFinite(progress) ? Math.round(progress * 100) : 0;
}

function formatAirportElevation(airport) {
  if (airport.elevationMeters !== null && airport.elevationMeters !== undefined && airport.apiDetail) {
    return `${formatNumber(airport.elevationMeters)} m`;
  }
  return finiteNumber(airport.elevation) ? `${formatNumber(Number(airport.elevation))} ft` : "-";
}

function updateDataSourceLabels() {
  const aircraftLabel = document.getElementById("railAircraftSourceLabel");
  const airportLabel = document.getElementById("railAirportSourceLabel");
  if (!aircraftLabel || !airportLabel) {
    return;
  }
  const liveText = state.dataStatus === "live"
    ? "viewport live"
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
    "speed",
    "heading"
  ].forEach((key) => {
    const value = updates[key];
    if (value !== null && value !== undefined && value !== "") {
      jet[key] = value;
    }
  });
  applyAircraftTypeMetadata(jet);
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
}

function renderViewport() {
  updateAircraftViewportStatsFromCache();
  renderAirports();
  renderAircraft();
  updateRail();
}

function roundedCoordinate(value) {
  return Math.round(Number(value) * 1000000) / 1000000;
}

function buildAircraftViewportRequest(reason = "timer") {
  const bounds = currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const selected = selectedAircraft();
  return {
    north: roundedCoordinate(bounds.north),
    south: roundedCoordinate(bounds.south),
    west: roundedCoordinate(bounds.west),
    east: roundedCoordinate(bounds.east),
    zoom: Math.round(currentZoom() * 100) / 100,
    viewportPaddingRatio: mapLoadingConfig.viewportPaddingRatio,
    aircraftLimit: aircraftRenderLimit(),
    aircraftCategory: "business_jet",
    categories: "J",
    includeAircraft: true,
    includeAirports: true,
    includeGround: currentZoom() >= 8.5,
    sinceVersion: state.aircraftViewportVersion || "",
    selectedUniqueKey: selected?.uniqueKey || selected?.id || "",
    ttlMs: aircraftRefreshIntervalMs(false),
    reason
  };
}

function updateAircraftViewportStatsFromCache() {
  if (!state.map) {
    const matched = businessJets.filter(aircraftPassesLockedFilter).length;
    state.aircraftTotalMatched = matched;
    state.aircraftTruncated = matched > aircraftRenderLimit();
    return;
  }
  const bounds = currentViewportBounds(mapLoadingConfig.viewportPaddingRatio);
  const selected = selectedAircraft();
  const matched = businessJets.filter((jet) => {
    if (!aircraftPassesLockedFilter(jet) || aircraftIsExpired(jet)) {
      return false;
    }
    return positionInBounds(currentPosition(jet), bounds) || jet.id === selected?.id;
  }).length;
  state.aircraftTotalMatched = matched;
  state.aircraftTruncated = matched > aircraftRenderLimit();
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
    } else {
      renderAircraft();
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

function selectAircraft(id, shouldPan = true) {
  const jet = businessJets.find((item) => item.id === id);
  if (!jet) {
    return;
  }

  const from = airportById(jet.from);
  const to = airportById(jet.to);
  const position = currentPosition(jet);
  const heading = aircraftHeading(jet);
  state.selectedKind = "aircraft";
  state.selectedId = id;
  openAircraftView();
  document.getElementById("aircraftStatus").textContent = displayOrDash(jet.status);
  document.getElementById("aircraftCallsign").textContent = displayOrDash(jet.callsign);
  document.getElementById("aircraftSubhead").textContent = `${displayOrDash(jet.registration)} | ${displayOrDash(jet.model)}`;
  document.getElementById("aircraftTypeBadge").textContent = displayOrDash(jet.family || jet.planeSize || jet.aircraftTypeCode);
  document.getElementById("routeFrom").textContent = displayOrDash(jet.from);
  document.getElementById("routeFromName").textContent = displayOrDash(jet.fromName || airportDisplayName(from));
  document.getElementById("routeTo").textContent = displayOrDash(jet.to);
  document.getElementById("routeToName").textContent = displayOrDash(jet.toName || airportDisplayName(to));
  document.getElementById("departedTime").textContent = displayOrDash(jet.depart);
  document.getElementById("arrivalTime").textContent = displayOrDash(jet.arrive);
  document.getElementById("flightProgress").style.width = `${formatProgressPercent(jet)}%`;
  document.getElementById("flightAltitude").textContent = formatAltitude(jet.altitude);
  document.getElementById("flightSpeed").textContent = formatSpeed(jet.speed);
  document.getElementById("flightVerticalSpeed").textContent = formatVerticalSpeed(jet.verticalSpeed);
  document.getElementById("flightHeading").textContent = formatHeading(heading);
  document.getElementById("flightCoordinates").textContent = formatCoordinates(position);
  document.getElementById("flightSquawk").textContent = displayOrDash(jet.squawk);
  document.getElementById("aircraftModel").textContent = displayOrDash(jet.model);
  document.getElementById("aircraftRegistration").textContent = displayOrDash(jet.registration);
  document.getElementById("aircraftOperator").textContent = displayOrDash(jet.operator);
  document.getElementById("aircraftSource").textContent = displayOrDash(jet.source);
  if (shouldPan) {
    state.map.panTo(position);
  }
  renderAircraft();
  renderAirports();
  updateRail();
  loadAircraftDetails(jet);
  scheduleNextRealtimeRefresh();
}

function selectAirport(id, shouldPan = true) {
  const airport = airportById(id);
  if (!airport) {
    return;
  }
  state.selectedKind = "airport";
  state.selectedId = id;
  openAirportView();
  document.getElementById("airportCode").textContent = airportDisplayCode(airport);
  document.getElementById("airportName").textContent = displayOrDash(airport.name);
  document.getElementById("airportCity").textContent = displayOrDash(airport.city);
  document.getElementById("airportCountry").textContent = displayOrDash(airport.country);
  document.getElementById("airportCoordinates").textContent = formatCoordinates([airport.lat, airport.lng]);
  document.getElementById("airportElevation").textContent = formatAirportElevation(airport);
  document.getElementById("airportWeather").textContent = displayOrDash(airport.weather);
  document.getElementById("airportDelay").textContent = displayOrDash(airport.delay);
  document.getElementById("airportDepartures").textContent = displayOrDash(airport.departures);
  document.getElementById("airportArrivals").textContent = displayOrDash(airport.arrivals);
  document.getElementById("airportGround").textContent = displayOrDash(airport.ground);
  document.getElementById("airportRunways").textContent = displayOrDash(airport.runways);
  document.getElementById("airportRelatedFlights").innerHTML = businessJets
    .filter((jet) => jet.from === id || jet.to === id)
    .map((jet) => `
      <button type="button" class="related-flight" data-id="${jet.id}">
        <span><strong>${jet.callsign}</strong><small>${jet.from} - ${jet.to}</small></span>
        <svg><use href="#icon-chevron"></use></svg>
      </button>
    `).join("") || `<p class="empty-related">No active aircraft records.</p>`;
  document.querySelectorAll(".related-flight").forEach((button) => {
    button.addEventListener("click", () => selectAircraft(button.dataset.id));
  });
  if (shouldPan) {
    state.map.panTo([airport.lat, airport.lng]);
  }
  renderAircraft();
  renderAirports();
  updateRail();
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

function searchItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const aircraftMatches = businessJets
    .filter((jet) => aircraftPassesLockedFilter(jet)
      && [jet.callsign, jet.registration, jet.model, jet.operator, jet.from, jet.to].join(" ").toLowerCase().includes(q))
    .map((jet) => ({ kind: "aircraft", id: jet.id, title: jet.callsign, meta: `${jet.registration} | ${jet.model}` }));
  const airportMatches = airports
    .filter((airport) => [airport.id, airport.iata, airport.name, airport.city, airport.country].join(" ").toLowerCase().includes(q))
    .map((airport) => ({ kind: "airport", id: airport.id, title: `${airport.id} / ${airport.iata}`, meta: `${airport.name} | ${airport.city}` }));
  return [...aircraftMatches, ...airportMatches].slice(0, 8);
}

function updateMapModeClass() {
  const shell = document.querySelector(".fr-shell");
  shell.classList.toggle("google-map-mode", state.mapProvider === "google");
  shell.classList.toggle("leaflet-map-mode", state.mapProvider === "leaflet");
}

function renderSearch(query) {
  const box = document.getElementById("searchResults");
  const matches = searchItems(query);
  if (!query.trim()) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.innerHTML = matches.length
    ? matches.map((item) => `
        <button type="button" class="search-result" data-kind="${item.kind}" data-id="${item.id}">
          <span><strong>${item.title}</strong><small>${item.meta}</small></span>
          <span>${item.kind === "airport" ? "Airport" : "Jet"}</span>
        </button>
      `).join("")
    : `
      <button type="button" class="search-result">
        <span><strong>No match</strong><small>Live database records only</small></span>
      </button>
    `;

  box.hidden = false;
  box.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.kind === "airport") {
        const airport = airportById(button.dataset.id);
        selectAirport(button.dataset.id);
        state.map.setView([airport.lat, airport.lng], 7);
      } else {
        const jet = businessJets.find((item) => item.id === button.dataset.id);
        selectAircraft(button.dataset.id);
        state.map.setView(currentPosition(jet), Math.max(state.map.getZoom(), 5));
      }
      document.getElementById("searchInput").value = "";
      renderSearch("");
    });
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

  legend.hidden = !state.trails;
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
    renderAircraft();
  });
  airportLayerSelect.addEventListener("change", (event) => {
    state.airportLayerMode = event.target.value;
    state.airports = event.target.value !== "off";
    renderAirports();
    updateRail();
  });
  document.getElementById("weatherButton").addEventListener("click", () => showWeatherLayer(!state.weather));
  document.getElementById("settingsButton").addEventListener("click", () => {
    state.map.setView(defaultCenter, defaultZoom());
  });
  document.getElementById("locateButton").addEventListener("click", () => {
    state.map.setView(defaultCenter, defaultZoom());
  });
  document.getElementById("closeDetailPanel").addEventListener("click", () => {
    document.getElementById("leftDetailPanel").hidden = true;
    state.selectedId = null;
    state.selectedKind = null;
    renderAircraft();
    renderAirports();
    scheduleNextRealtimeRefresh();
  });
  document.querySelector(".rail-close").addEventListener("click", () => {
    document.querySelector(".right-rail").hidden = true;
    document.querySelector(".fr-shell").classList.remove("rail-open");
  });
  document.querySelector(".menu-button").addEventListener("click", () => {
    const rail = document.querySelector(".right-rail");
    rail.hidden = !rail.hidden;
    document.querySelector(".fr-shell").classList.toggle("rail-open", !rail.hidden);
    updateRail();
  });
  document.querySelectorAll("[data-route-mode]").forEach((button) => {
    button.addEventListener("click", () => setRouteColorMode(button.dataset.routeMode));
  });
  document.getElementById("searchInput").addEventListener("input", (event) => renderSearch(event.target.value));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      showFilterSheet(false);
      renderSearch("");
    }
  });
}

async function init() {
  bindEvents();
  updateRouteLegend();
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
