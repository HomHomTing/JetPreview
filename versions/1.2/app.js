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

const businessJets = [
  { id: "BJ001", callsign: "GLF650", registration: "N650QS", model: "Gulfstream G650ER", category: "ultra-long", family: "Gulfstream", operator: "NetJets", from: "KTEB", to: "EGGW", altitude: 43000, speed: 486, verticalSpeed: 0, squawk: "3452", progress: 0.58, status: "Cruise", source: "ADS-B sample", depart: "10:42", arrive: "16:58", route: [[40.8501, -74.0608], [48.4, -38.0], [51.8747, -0.3683]] },
  { id: "BJ002", callsign: "BJT889", registration: "M-VVPQ", model: "Bombardier Global 7500", category: "ultra-long", family: "Global", operator: "Private", from: "OMDB", to: "VHHH", altitude: 41000, speed: 472, verticalSpeed: 0, squawk: "6021", progress: 0.42, status: "Cruise", source: "ADS-B sample", depart: "07:15", arrive: "14:10", route: [[25.2532, 55.3657], [24.5, 78.0], [22.308, 113.9185]] },
  { id: "BJ003", callsign: "FLC8X", registration: "VP-CJL", model: "Dassault Falcon 8X", category: "long-range", family: "Falcon", operator: "Executive", from: "LFPB", to: "LSGG", altitude: 31000, speed: 404, verticalSpeed: -1200, squawk: "1147", progress: 0.64, status: "Descent", source: "ADS-B sample", depart: "12:05", arrive: "13:12", route: [[48.9694, 2.4414], [47.85, 4.4], [46.2381, 6.109]] },
  { id: "BJ004", callsign: "C56XJ", registration: "N900XB", model: "Cessna Citation Longitude", category: "midsize", family: "Citation", operator: "Charter", from: "KVNY", to: "KTEB", altitude: 37000, speed: 418, verticalSpeed: 0, squawk: "2371", progress: 0.47, status: "Cruise", source: "ADS-B sample", depart: "08:20", arrive: "15:44", route: [[34.2098, -118.489], [39.0, -96.0], [40.8501, -74.0608]] },
  { id: "BJ005", callsign: "GLEX6", registration: "B-8266", model: "Gulfstream G550", category: "long-range", family: "Gulfstream", operator: "Corporate", from: "VHHH", to: "WSSS", altitude: 40000, speed: 462, verticalSpeed: 0, squawk: "5510", progress: 0.36, status: "Cruise", source: "ADS-B sample", depart: "09:30", arrive: "13:40", route: [[22.308, 113.9185], [12.0, 109.0], [1.3644, 103.9915]] },
  { id: "BJ006", callsign: "LXJ78", registration: "N787QS", model: "Bombardier Global 6000", category: "long-range", family: "Global", operator: "NetJets", from: "EGGW", to: "OMDB", altitude: 45000, speed: 490, verticalSpeed: 0, squawk: "4230", progress: 0.51, status: "Cruise", source: "ADS-B sample", depart: "11:55", arrive: "20:15", route: [[51.8747, -0.3683], [42.0, 24.0], [25.2532, 55.3657]] },
  { id: "BJ007", callsign: "P600", registration: "D-APGS", model: "Embraer Praetor 600", category: "super-midsize", family: "Praetor", operator: "Air Hamburg", from: "LSGG", to: "LFPB", altitude: 24000, speed: 356, verticalSpeed: -800, squawk: "1002", progress: 0.74, status: "Approach", source: "ADS-B sample", depart: "14:00", arrive: "15:02", route: [[46.2381, 6.109], [47.3, 4.6], [48.9694, 2.4414]] },
  { id: "BJ008", callsign: "ACE45", registration: "T7-ACE", model: "Pilatus PC-24", category: "light", family: "PC-24", operator: "Private", from: "WSSS", to: "OMDB", altitude: 39000, speed: 430, verticalSpeed: 1300, squawk: "7624", progress: 0.28, status: "Climb", source: "ADS-B sample", depart: "06:50", arrive: "13:55", route: [[1.3644, 103.9915], [10.0, 82.0], [25.2532, 55.3657]] },
  { id: "BJ009", callsign: "SYD12", registration: "VH-LUX", model: "Bombardier Challenger 350", category: "super-midsize", family: "Challenger", operator: "Jet Charter", from: "YSSY", to: "WSSS", altitude: 41000, speed: 445, verticalSpeed: 0, squawk: "3301", progress: 0.33, status: "Cruise", source: "ADS-B sample", depart: "03:25", arrive: "11:20", route: [[-33.9399, 151.1753], [-18.0, 132.0], [1.3644, 103.9915]] },
  { id: "BJ010", callsign: "SAO7X", registration: "PR-BIZ", model: "Dassault Falcon 7X", category: "long-range", family: "Falcon", operator: "Corporate", from: "SBGR", to: "KTEB", altitude: 43000, speed: 468, verticalSpeed: 0, squawk: "2470", progress: 0.62, status: "Cruise", source: "ADS-B sample", depart: "01:45", arrive: "11:25", route: [[-23.4356, -46.4731], [8.0, -61.0], [40.8501, -74.0608]] },
  { id: "BJ011", callsign: "CPT9H", registration: "ZS-JET", model: "Gulfstream G500", category: "long-range", family: "Gulfstream", operator: "Executive", from: "FACT", to: "OMDB", altitude: 41000, speed: 458, verticalSpeed: 0, squawk: "6654", progress: 0.45, status: "Cruise", source: "ADS-B sample", depart: "04:10", arrive: "12:05", route: [[-33.9715, 18.6021], [-10.0, 34.0], [25.2532, 55.3657]] },
  { id: "BJ012", callsign: "TYO8X", registration: "JA88BJ", model: "Dassault Falcon 8X", category: "long-range", family: "Falcon", operator: "Private", from: "RJTT", to: "VHHH", altitude: 40000, speed: 452, verticalSpeed: 0, squawk: "2136", progress: 0.52, status: "Cruise", source: "ADS-B sample", depart: "08:35", arrive: "13:05", route: [[35.5494, 139.7798], [28.0, 128.0], [22.308, 113.9185]] },
  { id: "MX101", callsign: "A388LAB", registration: "F-WWOW", model: "Airbus A380-800", category: "ultra-long", family: "A388", operator: "Icon Lab", from: "EGGW", to: "OMDB", altitude: 39000, speed: 488, verticalSpeed: 0, squawk: "7001", progress: 0.34, status: "Cruise", source: "Icon sample", depart: "09:10", arrive: "17:40", route: [[51.8747, -0.3683], [43.2, 19.4], [25.2532, 55.3657]] },
  { id: "MX102", callsign: "B744LAB", registration: "N744GX", model: "Boeing 747-400", category: "ultra-long", family: "B744", operator: "Icon Lab", from: "KTEB", to: "RJTT", altitude: 36000, speed: 502, verticalSpeed: 0, squawk: "7002", progress: 0.26, status: "Cruise", source: "Icon sample", depart: "05:35", arrive: "19:20", route: [[40.8501, -74.0608], [56.0, -142.0], [35.5494, 139.7798]] },
  { id: "MX103", callsign: "B77WLAB", registration: "B-77WL", model: "Boeing 777-300ER", category: "ultra-long", family: "B77W", operator: "Icon Lab", from: "VHHH", to: "EGGW", altitude: 41000, speed: 494, verticalSpeed: 0, squawk: "7003", progress: 0.47, status: "Cruise", source: "Icon sample", depart: "00:45", arrive: "13:25", route: [[22.308, 113.9185], [42.5, 72.0], [51.8747, -0.3683]] },
  { id: "MX104", callsign: "B738LAB", registration: "D-AB38", model: "Boeing 737-800", category: "long-range", family: "B738", operator: "Icon Lab", from: "LFPB", to: "EGGW", altitude: 32000, speed: 438, verticalSpeed: 0, squawk: "7004", progress: 0.55, status: "Cruise", source: "Icon sample", depart: "13:05", arrive: "14:10", route: [[48.9694, 2.4414], [50.2, 0.6], [51.8747, -0.3683]] },
  { id: "MX105", callsign: "A20NLAB", registration: "HB-A20", model: "Airbus A320neo", category: "long-range", family: "A20N", operator: "Icon Lab", from: "LSGG", to: "LFPB", altitude: 30000, speed: 424, verticalSpeed: -400, squawk: "7005", progress: 0.44, status: "Descent", source: "Icon sample", depart: "12:40", arrive: "13:36", route: [[46.2381, 6.109], [47.4, 4.2], [48.9694, 2.4414]] },
  { id: "MX106", callsign: "E190LAB", registration: "PR-E90", model: "Embraer E190", category: "midsize", family: "E190", operator: "Icon Lab", from: "SBGR", to: "FACT", altitude: 35000, speed: 407, verticalSpeed: 0, squawk: "7006", progress: 0.37, status: "Cruise", source: "Icon sample", depart: "06:15", arrive: "14:25", route: [[-23.4356, -46.4731], [-28.0, -12.0], [-33.9715, 18.6021]] },
  { id: "MX107", callsign: "ATR72", registration: "9V-ATR", model: "ATR 72-600", category: "midsize", family: "AT76", operator: "Icon Lab", from: "WSSS", to: "VHHH", altitude: 21000, speed: 274, verticalSpeed: 600, squawk: "7007", progress: 0.31, status: "Climb", source: "Icon sample", depart: "15:10", arrive: "19:05", route: [[1.3644, 103.9915], [11.2, 109.4], [22.308, 113.9185]] },
  { id: "MX108", callsign: "C172VFR", registration: "N172VR", model: "Cessna 172", category: "light", family: "C172", operator: "Icon Lab", from: "KVNY", to: "KVNY", altitude: 4500, speed: 112, verticalSpeed: 100, squawk: "1200", progress: 0.62, status: "VFR", source: "Icon sample", depart: "16:00", arrive: "17:20", route: [[34.2098, -118.489], [35.1, -117.7], [34.35, -116.7], [34.2098, -118.489]] },
  { id: "MX109", callsign: "H135EMS", registration: "F-H135", model: "Airbus H135", category: "light", family: "H135", operator: "Icon Lab", from: "LFPB", to: "LFPB", altitude: 2200, speed: 132, verticalSpeed: 0, squawk: "7010", progress: 0.18, status: "Patrol", source: "Icon sample", depart: "10:15", arrive: "11:05", route: [[48.9694, 2.4414], [48.72, 2.07], [48.93, 2.75], [48.9694, 2.4414]] }
];
if (Array.isArray(aircraftIconConfig.demoAircraftSamples)) {
  businessJets.push(...aircraftIconConfig.demoAircraftSamples);
}

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

businessJets.forEach((jet) => {
  const type = aircraftTypeCatalog[jet.model] || {};
  jet.manufacturer = type.manufacturer || jet.family || "Unknown";
  jet.aircraftTypeCode = type.aircraftTypeCode || "BIZ";
  jet.fr24IconKey = type.fr24IconKey || aircraftIconKeyByTypeCode[jet.aircraftTypeCode] || defaultBusinessJetIconKey;
  jet.sizeClass = aircraftSizeClasses.includes(type.sizeClass) ? type.sizeClass : aircraftSizeClass(jet);
  jet.category = jet.sizeClass;
});

const state = {
  labels: true,
  trails: true,
  airports: true,
  weather: false,
  selectedKind: null,
  selectedId: null,
  mapProvider: "loading",
  map: null,
  tracks: new Map(),
  weatherLayer: null,
  tick: 0
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
    this.map.on("move zoom resize", callback);
  }

  setTrack(id, path, selected) {
    if (!state.tracks.has(id)) {
      state.tracks.set(id, L.polyline(path, { interactive: false }).addTo(this.map));
    }
    const track = state.tracks.get(id);
    track.setLatLngs(path);
    track.setStyle({
      color: selected ? "#ff4b32" : "#f6d029",
      weight: selected ? 3.2 : 2.2,
      opacity: selected ? 0.96 : 0.66,
      dashArray: selected ? null : "2 7"
    });
    if (state.trails && !this.map.hasLayer(track)) {
      track.addTo(this.map);
    }
    if (!state.trails && this.map.hasLayer(track)) {
      this.map.removeLayer(track);
    }
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
    this.map.addListener("idle", callback);
    this.map.addListener("zoom_changed", callback);
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
      const progress = liveProgress(jet);
      const heading = headingBetween(jet.route, progress);
      activeIds.add(jet.id);
      if (!this.aircraftMarkers.has(jet.id)) {
        this.aircraftMarkers.set(jet.id, this.createAircraftMarker(jet, position, heading));
      }
      const record = this.aircraftMarkers.get(jet.id);
      this.updateAircraftContent(record.content, jet, heading);
      record.marker.position = { lat: position[0], lng: position[1] };
      record.marker.map = this.contains(position) ? this.map : null;
      record.marker.zIndex = jet.id === state.selectedId ? 420 : 220;
    });

    this.aircraftMarkers.forEach((record, id) => {
      if (!activeIds.has(id)) {
        record.marker.map = null;
        this.aircraftMarkers.delete(id);
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
      anchorLeft: "-17px",
      anchorTop: "-17px",
      gmpClickable: true,
      collisionBehavior: google.maps.CollisionBehavior?.REQUIRED
    });
    marker.addEventListener("gmp-click", () => selectAirport(airport.id));
    return {
      content,
      marker
    };
  }

  updateAirportContent(content, airport) {
    content.className = `native-map-marker airport-pin${airport.id === state.selectedId ? " is-selected" : ""}`;
    content.dataset.id = airport.id;
    content.setAttribute("aria-label", `${airport.id} ${airport.name}`);
    if (!content.dataset.ready) {
      content.innerHTML = `<span class="airport-code-label"></span>`;
      content.dataset.ready = "true";
    }
    content.querySelector(".airport-code-label").textContent = airport.id;
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
      this.updateAirportContent(record.content, airport);
      record.marker.position = { lat: airport.lat, lng: airport.lng };
      record.marker.map = state.airports && this.contains([airport.lat, airport.lng]) ? this.map : null;
      record.marker.zIndex = airport.id === state.selectedId ? 410 : 120;
    });

    this.airportMarkers.forEach((record, id) => {
      if (!activeIds.has(id)) {
        record.marker.map = null;
        this.airportMarkers.delete(id);
      }
    });
  }

  setTrack(id, path, selected) {
    if (!this.lines.has(id)) {
      this.lines.set(id, new google.maps.Polyline({ map: this.map, clickable: false }));
    }
    const line = this.lines.get(id);
    line.setOptions({
      map: state.trails ? this.map : null,
      path: path.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: selected ? "#ff4b32" : "#f6d029",
      strokeOpacity: selected ? 0.96 : 0.66,
      strokeWeight: selected ? 3.2 : 2.2,
      icons: selected ? [] : [{
        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 },
        offset: "0",
        repeat: "12px"
      }]
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
  return airport.name.toLowerCase().startsWith(airport.city.toLowerCase())
    ? airport.name
    : `${airport.city} ${airport.name}`;
}

function interpolateRoute(route, progress) {
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
  return (jet.progress + state.tick * 0.002) % 1;
}

function currentPosition(jet) {
  return interpolateRoute(jet.route, liveProgress(jet));
}

function headingBetween(route, progress) {
  const ahead = interpolateRoute(route, (progress + 0.01) % 1);
  const here = interpolateRoute(route, progress);
  const dx = ahead[1] - here[1];
  const dy = ahead[0] - here[0];
  return Math.round((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

function visibleJets() {
  return businessJets.filter((jet) => state.map.contains(currentPosition(jet)));
}

function visibleAirports() {
  return airports.filter((airport) => state.map.contains([airport.lat, airport.lng]));
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
  const selected = jet.id === state.selectedId;
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
    labelHidden: zoom < 5 && !selected
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
    jet.id === state.selectedId ? "is-selected" : "",
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
  const progress = liveProgress(jet);
  const heading = headingBetween(jet.route, progress);
  const { metrics, cssText } = aircraftMarkerCssVars(jet);
  return `
    <button type="button" class="${aircraftMarkerClass(jet, metrics)}" data-id="${jet.id}" data-icon-key="${metrics.iconKey}" style="left:${point.x}px; top:${point.y}px; ${cssText}" aria-label="${jet.callsign} ${jet.model}">
      ${aircraftSvg(jet, heading)}
      <span class="aircraft-label">${jet.callsign}</span>
    </button>
  `;
}

function renderAircraft() {
  document.body.classList.toggle("labels-off", !state.labels);
  const aircraftLayer = document.getElementById("aircraftLayer");
  if (state.map.renderAircraftMarkers) {
    state.map.renderAircraftMarkers(businessJets);
  } else {
    aircraftLayer.innerHTML = businessJets.map(markerHtml).join("");
    aircraftLayer.querySelectorAll(".aircraft-marker").forEach((button) => {
      button.addEventListener("click", () => selectAircraft(button.dataset.id));
    });
  }

  businessJets.forEach((jet) => {
    const livePath = [...jet.route.slice(0, -1), currentPosition(jet)];
    state.map.setTrack(jet.id, livePath, jet.id === state.selectedId);
  });
}

function renderAirports() {
  const airportLayer = document.getElementById("airportLayer");
  if (state.map.renderAirportMarkers) {
    state.map.renderAirportMarkers(airports);
    return;
  }
  if (!state.airports) {
    airportLayer.innerHTML = "";
    return;
  }
  airportLayer.innerHTML = airports.map((airport) => {
    const point = state.map.project([airport.lat, airport.lng]);
    return `
      <button type="button" class="airport-pin${airport.id === state.selectedId ? " is-selected" : ""}" data-id="${airport.id}" style="left:${point.x}px; top:${point.y}px" aria-label="${airport.id} ${airport.name}">
        <span class="airport-code-label">${airport.id}</span>
      </button>
    `;
  }).join("");
  airportLayer.querySelectorAll(".airport-pin").forEach((button) => {
    button.addEventListener("click", () => selectAirport(button.dataset.id));
  });
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
  const heading = headingBetween(jet.route, liveProgress(jet));
  state.selectedKind = "aircraft";
  state.selectedId = id;
  openAircraftView();
  document.getElementById("aircraftStatus").textContent = jet.status;
  document.getElementById("aircraftCallsign").textContent = jet.callsign;
  document.getElementById("aircraftSubhead").textContent = `${jet.registration} | ${jet.model}`;
  document.getElementById("aircraftTypeBadge").textContent = jet.family;
  document.getElementById("routeFrom").textContent = jet.from;
  document.getElementById("routeFromName").textContent = airportDisplayName(from);
  document.getElementById("routeTo").textContent = jet.to;
  document.getElementById("routeToName").textContent = airportDisplayName(to);
  document.getElementById("departedTime").textContent = jet.depart;
  document.getElementById("arrivalTime").textContent = jet.arrive;
  document.getElementById("flightProgress").style.width = `${Math.round(liveProgress(jet) * 100)}%`;
  document.getElementById("flightAltitude").textContent = `${formatNumber(jet.altitude)} ft`;
  document.getElementById("flightSpeed").textContent = `${jet.speed} kt`;
  document.getElementById("flightVerticalSpeed").textContent = `${formatNumber(jet.verticalSpeed)} fpm`;
  document.getElementById("flightHeading").textContent = `${heading} deg`;
  document.getElementById("flightCoordinates").textContent = `${position[0].toFixed(3)}, ${position[1].toFixed(3)}`;
  document.getElementById("flightSquawk").textContent = jet.squawk;
  document.getElementById("aircraftModel").textContent = jet.model;
  document.getElementById("aircraftRegistration").textContent = jet.registration;
  document.getElementById("aircraftOperator").textContent = jet.operator;
  document.getElementById("aircraftSource").textContent = jet.source;
  if (shouldPan) {
    state.map.panTo(position);
  }
  renderAircraft();
  renderAirports();
  updateRail();
}

function selectAirport(id, shouldPan = true) {
  const airport = airportById(id);
  if (!airport) {
    return;
  }
  state.selectedKind = "airport";
  state.selectedId = id;
  openAirportView();
  document.getElementById("airportCode").textContent = `${airport.id} / ${airport.iata}`;
  document.getElementById("airportName").textContent = airport.name;
  document.getElementById("airportCity").textContent = airport.city;
  document.getElementById("airportCountry").textContent = airport.country;
  document.getElementById("airportCoordinates").textContent = `${airport.lat.toFixed(4)}, ${airport.lng.toFixed(4)}`;
  document.getElementById("airportElevation").textContent = `${formatNumber(airport.elevation)} ft`;
  document.getElementById("airportWeather").textContent = airport.weather;
  document.getElementById("airportDelay").textContent = airport.delay;
  document.getElementById("airportDepartures").textContent = airport.departures;
  document.getElementById("airportArrivals").textContent = airport.arrivals;
  document.getElementById("airportGround").textContent = airport.ground;
  document.getElementById("airportRunways").textContent = airport.runways;
  document.getElementById("airportRelatedFlights").innerHTML = businessJets
    .filter((jet) => jet.from === id || jet.to === id)
    .map((jet) => `
      <button type="button" class="related-flight" data-id="${jet.id}">
        <span><strong>${jet.callsign}</strong><small>${jet.from} - ${jet.to}</small></span>
        <svg><use href="#icon-chevron"></use></svg>
      </button>
    `).join("") || `<p class="empty-related">No active aircraft sample records.</p>`;
  document.querySelectorAll(".related-flight").forEach((button) => {
    button.addEventListener("click", () => selectAircraft(button.dataset.id));
  });
  if (shouldPan) {
    state.map.panTo([airport.lat, airport.lng]);
  }
  renderAircraft();
  renderAirports();
  updateRail();
}

function updateRail() {
  const jets = visibleJets();
  const airportList = visibleAirports();
  const avg = jets.reduce((sum, jet) => sum + jet.altitude, 0) / Math.max(jets.length, 1);
  document.getElementById("railVisibleJets").textContent = jets.length;
  document.getElementById("railVisibleAirports").textContent = airportList.length;
  document.getElementById("railAvgAltitude").textContent = `FL${Math.round(avg / 100)}`;
  document.getElementById("railAircraftList").innerHTML = jets.slice(0, 7).map((jet) => `
    <button type="button" class="rail-item" data-kind="aircraft" data-id="${jet.id}">
      <span><strong>${jet.callsign}</strong><small>${jet.from} - ${jet.to} | ${jet.model}</small></span>
      <span>FL${Math.round(jet.altitude / 100)}</span>
    </button>
  `).join("") || `<div class="rail-item"><span><strong>No aircraft in view</strong><small>Zoom out to global view</small></span></div>`;
  document.getElementById("railAirportList").innerHTML = airportList.slice(0, 7).map((airport) => `
    <button type="button" class="rail-item" data-kind="airport" data-id="${airport.id}">
      <span><strong>${airport.id}</strong><small>${airport.name}</small></span>
      <span>${airport.departures + airport.arrivals}</span>
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
    .filter((jet) => [jet.callsign, jet.registration, jet.model, jet.operator, jet.from, jet.to].join(" ").toLowerCase().includes(q))
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
        <span><strong>No match</strong><small>Aircraft samples and airport data only in V1.1</small></span>
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

function bindEvents() {
  document.getElementById("filtersButton").addEventListener("click", () => showFilterSheet());
  document.getElementById("closeFilters").addEventListener("click", () => showFilterSheet(false));
  document.getElementById("labelToggle").addEventListener("change", (event) => {
    state.labels = event.target.checked;
    renderAircraft();
  });
  document.getElementById("trailToggle").addEventListener("change", (event) => {
    state.trails = event.target.checked;
    renderAircraft();
  });
  document.getElementById("airportToggle").addEventListener("change", (event) => {
    state.airports = event.target.checked;
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
  try {
    state.map = await createMapEngine();
    await state.map.ready();
  } catch (error) {
    state.map = new LeafletMapEngine();
    await state.map.ready();
  }
  state.mapProvider = state.map.type;
  updateMapModeClass();
  const refreshViewportData = rafThrottle(() => {
    renderAirports();
    renderAircraft();
    updateRail();
  });
  state.map.onViewportChange(refreshViewportData);
  renderAirports();
  renderAircraft();
  updateRail();
  setInterval(() => {
    state.tick += 1;
    renderAircraft();
    if (state.selectedKind === "aircraft" && state.selectedId) {
      const selected = state.selectedId;
      selectAircraft(selected, false);
    } else {
      updateRail();
    }
  }, 3500);
}

init();
