const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function readProjectFile(filename) {
  return fs.readFileSync(path.join(rootDir, filename), "utf8");
}

const context = {
  console,
  URLSearchParams,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async () => {
    throw new Error("network disabled in adapter test");
  },
  window: {
    BIZJET_TIME: require("../time-utils.js")
  }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(readProjectFile("data-service.js"), context);

const {
  adaptFlightHistory,
  adaptAirportGround,
  adaptAirportDynamic
} = context.window.BIZJET_DATA_SERVICE.adapters;

const flightHistory = adaptFlightHistory({
  currentPage: "2",
  hasNextPage: "1",
  groundAirportInfo: {
    airportCode: "pek",
    airportFourName: "北京首都国际机场",
    airportNameEn: "Beijing Capital International Airport",
    countryName: "中国"
  },
  data: [
    {
      flightId: "FH-1",
      uniqueKey: "TRACK-1",
      callSign: "B-655Z",
      flightNo: "JTL25C",
      tailNoDisplay: "B-655Z",
      depAirport: "pek",
      depAirportFourName: "北京首都国际机场",
      depAirportNameEn: "Beijing Capital International Airport",
      arrAirport: "sha",
      arrAirportFourName: "上海虹桥国际机场",
      arrAirportNameEn: "Shanghai Hongqiao International Airport",
      flightState: "30",
      flightStateStr: "途中",
      depActualEpochMs: 1800000000000,
      arrActualEpochMs: 1800007200000,
      depZoneId: "Asia/Shanghai",
      arrZoneId: "Asia/Shanghai",
      estimateTime: "120"
    },
    {
      flightId: "FH-2",
      uniqueKey: "TRACK-2",
      callSign: "B-8288",
      tailNoDisplay: "B-8288",
      depAirport: "pek",
      depAirportFourName: "北京首都国际机场",
      depAirportNameEn: "Beijing Capital International Airport",
      flightState: "30",
      flightStateStr: "途中",
      depActualEpochMs: 1800000000000,
      depZoneId: "Asia/Shanghai"
    }
  ]
});

assert.equal(flightHistory.currentPage, 2, "513013 current page is normalized");
assert.equal(flightHistory.hasNextPage, true, "513013 pagination flag is normalized");
assert.equal(flightHistory.groundAirportInfo.airportCode, "PEK", "513013 ground airport IATA is normalized");
assert.equal(flightHistory.flights.length, 2, "513013 history rows are retained");
assert.equal(flightHistory.flights[0].uniqueKey, "TRACK-1", "513013 uniqueKey is retained for future track linking");
assert.equal(flightHistory.flights[0].callSign, "JTL25C", "513013 skips registration-like callSign and retains the real trip callsign");
assert.equal(flightHistory.flights[0].flightNo, "JTL25C", "513013 exposes the corrected trip callsign as flightNo");
assert.equal(flightHistory.flights[1].callSign, "B-8288", "513013 keeps registration-like callSign when no better callsign value exists");
assert.equal(flightHistory.flights[1].flightNo, "B-8288", "513013 exposes registration-like callsign when it is the only callsign value");
assert.equal(flightHistory.flights[0].depAirport, "PEK", "513013 departure airport code is normalized");
assert.equal(flightHistory.flights[0].arrAirport, "SHA", "513013 arrival airport code is normalized");
assert.equal(flightHistory.flights[0].depActualEpochMs, 1800000000000, "513013 departure epoch is available");
assert.equal(flightHistory.flights[0].arrActualEpochMs, 1800007200000, "513013 arrival epoch is available");
assert.equal(flightHistory.flights[0].estimateTimeMinutes, 120, "513013 estimate time is normalized to minutes");

const airportGround = adaptAirportGround({
  airportInfo: {
    airportCode: "pek",
    icaoCode: "zbaa",
    airportNameEn: "Beijing Capital International Airport",
    countryName: "中国",
    timeZone: "UTC+8"
  },
  groundInfo: {
    groundNum: "7",
    groundPlanes: [{
      tailNo: "YWJjZGVmZ2hpamtsbW5vcA==",
      tailNoDisplay: "B-655Z",
      brandName: "Gulfstream",
      modelCode: "glf6",
      modelName: "G650ER",
      flightState: "30",
      trusteeship: "测试托管",
      groundTimeStr: "2h 10m",
      serviceStatus: "1",
      shareState: "0",
      serviceProvider: "测试运营商"
    }],
    groundModels: [{
      modelCode: "glf6",
      modelName: "Gulfstream G650ER",
      brandName: "Gulfstream",
      count: "3"
    }]
  }
});

assert.equal(airportGround.updates.airportCode, "PEK", "513014 airport IATA is normalized");
assert.equal(airportGround.updates.icaoCode, "ZBAA", "513014 airport ICAO is normalized");
assert.equal(airportGround.updates.ground, 7, "513014 ground count prefers groundNum");
assert.equal(airportGround.groundPlanes[0].tailNoEncrypted, "YWJjZGVmZ2hpamtsbW5vcA==", "513014 encrypted tail is retained only as an action key");
assert.equal(airportGround.groundPlanes[0].registration, "B-655Z", "513014 displayed registration uses clear display text");
assert.equal(airportGround.groundPlanes[0].modelCode, "GLF6", "513014 ground plane model code is normalized");
assert.equal(airportGround.groundPlanes[0].flightState, 30, "513014 flight state is numeric");
assert.equal(airportGround.groundModels[0].modelCode, "GLF6", "513014 ground model code is normalized");
assert.equal(airportGround.groundModels[0].count, 3, "513014 ground model count is numeric");

const airportDynamic = adaptAirportDynamic({
  date: "2026-08-17",
  airportInfo: {
    airportCode: "pek",
    icaoCode: "zbaa",
    airportNameEn: "Beijing Capital International Airport",
    lat: "40.0801",
    lon: "116.5846",
    elevation: "35",
    runwayCount: "3",
    runwayLength: "3800",
    plateau: "非高原",
    openState: "开放"
  },
  airportWeather: {
    weather: "晴",
    tmp: "27",
    wind: "NE 4m/s"
  },
  flightsInfo: {
    inboundActually: "6",
    outboundActually: "5",
    sortiesEstimate: "12"
  },
  dailyStatistics: { inbound: [1, 2, 3] },
  totalStatistics: { total: 100 },
  popularModels: { GLF6: 3 },
  originAndDest: { PEK: 4 }
});

assert.equal(airportDynamic.date, "2026-08-17", "513015 date is retained");
assert.equal(airportDynamic.weatherInfo.weather, "晴", "513015 airportWeather is adapted to weatherInfo");
assert.equal(airportDynamic.updates.departures, 5, "513015 departure count is normalized");
assert.equal(airportDynamic.updates.arrivals, 6, "513015 arrival count is normalized");
assert.equal(airportDynamic.updates.delay, "12 sorties", "513015 sorties summary is retained for dynamic panel");
assert.equal(airportDynamic.updates.openState, "开放", "513015 open state is retained");
assert.deepEqual(airportDynamic.dailyStatistics.inbound, [1, 2, 3], "513015 statistics buckets are retained");

const indexSource = readProjectFile("index.html");
const appSource = readProjectFile("app.js");
const dataSource = readProjectFile("data-service.js");

[
  "aircraftModelEn",
  "aircraftModelSeries",
  "aircraftTransponder",
  "aircraftServiceStatus",
  "aircraftMaxRange",
  "airportGroundModelsSection",
  "airportApprovalRules",
  "airportWeatherNotices"
].forEach((id) => {
  assert.match(indexSource, new RegExp(`id="${id}"`), `${id} is present in the v1.18 panel markup`);
});

assert.match(dataSource, /request\("513013",\s*{\s*tailNo\s*}\)/, "513013 is requested with encrypted tailNo only");
assert.match(dataSource, /request\("513014",\s*{\s*airportCode\s*}\)/, "513014 is requested with airportCode");
assert.match(dataSource, /request\("513015",\s*{\s*airportCode\s*}\)/, "513015 is requested with airportCode");
assert.doesNotMatch(dataSource, /request\("513012"/, "513012 remains stopped");

assert.match(
  appSource,
  /function\s+setAircraftSegment\(segment,[\s\S]*?if\s*\(nextSegment\s*===\s*"journey"\)\s*{[\s\S]*?loadAircraftHistory\(selectedAircraft\(\)\);/,
  "513013 history is lazy-loaded only when the aircraft journey tab is opened"
);
assert.match(
  appSource,
  /async\s+function\s+loadAirportDetail\(airport\)[\s\S]*?dataService\.getAirportDetail\(airportCode\)[\s\S]*?dataService\.getAirportDynamic\(airportCode\)[\s\S]*?Promise\.allSettled\(pending\)/,
  "airport selection requests 513010 and 513015 together"
);
assert.match(
  appSource,
  /function\s+setAirportPanelTab\(tab\)[\s\S]*?if\s*\(state\.airportTab\s*===\s*"ground"\)\s*{[\s\S]*?loadAirportGround\(airport\);/,
  "513014 ground aircraft are lazy-loaded from the ground tab"
);

const loadAirportGroundBlock = appSource.match(/async\s+function\s+loadAirportGround\(airport\)\s*{[\s\S]*?^}/m)?.[0] || "";
assert.match(loadAirportGroundBlock, /dataService\.getAirportGround\(airportCode\)/, "513014 is called from loadAirportGround");
assert.doesNotMatch(loadAirportGroundBlock, /businessJets|renderViewport|renderAircraft|renderAirports|marker/i, "513014 does not mutate map aircraft or icon rendering");

const groundRowsBlock = appSource.match(/function\s+renderGroundPlaneRows\(airport,\s*planes\)\s*{[\s\S]*?^}/m)?.[0] || "";
const airportTabListBlock = appSource.match(/function\s+renderAirportTabList\(airport\)\s*{[\s\S]*?^}/m)?.[0] || "";
const selectGroundPlaneBlock = appSource.match(/function\s+selectGroundPlaneFromAirport\(airport,\s*plane\s*=\s*{}\)\s*{[\s\S]*?^}/m)?.[0] || "";
assert.match(groundRowsBlock, /tailNoEncrypted/, "ground rows keep encrypted tail only in row data");
assert.match(airportTabListBlock, /selectGroundPlaneFromAirport\(airport,\s*plane\s*\|\|/, "ground row clicks use the panel-safe ground aircraft selector");
assert.match(selectGroundPlaneBlock, /aircraftByEncryptedTail\.get\(tail\)\s*\|\|\s*aircraftByRegistration\.get\(registration\)/, "ground aircraft selector reuses live aircraft when it already exists");
assert.match(selectGroundPlaneBlock, /createPanelAircraftFromGroundPlane\(airport,\s*plane\)/, "ground aircraft selector opens a panel-only aircraft when it is not on the live map");
assert.doesNotMatch(selectGroundPlaneBlock, /businessJets\.push|new\s+.*Marker|renderAircraftMarkers/i, "panel-only ground aircraft selection does not create map markers");
assert.doesNotMatch(`${groundRowsBlock}\n${airportTabListBlock}`, /businessJets\.push|new\s+.*Marker|renderViewport/, "ground row rendering does not create map markers");

assert.match(appSource, /function\s+mergePresentFields\(/, "panel merges keep non-empty interface fields stable");
assert.match(appSource, /function\s+aircraftCallsignLabel\(jet,\s*fallback\s*=\s*NA_TEXT\)[\s\S]*?base\.callSign[\s\S]*?rawBase\.callSign/, "aircraft callsign display reads flightBaseInfo.callSign from track details");
assert.match(appSource, /function\s+aircraftRegistrationIdentities\(jet\)[\s\S]*?tailNoDisplay[\s\S]*?registration[\s\S]*?comparableAircraftIdentity/, "aircraft callsign display can identify registration-equivalent values");
assert.match(appSource, /let\s+registrationLikeFallback\s*=\s*"";[\s\S]*?registrationLikeFallback\s*\|\|=\s*value;[\s\S]*?return\s+callsign\s*\?\?\s*\(registrationLikeFallback\s*\|\|\s*displayOrDash\(fallback\)\);/, "aircraft callsign display keeps registration-equivalent callsign as a fallback");
assert.match(appSource, /setText\("aircraftCallsign",\s*aircraftCallsignLabel\(jet,\s*"暂无航班号"\)\);/, "aircraft header uses the unified callsign display label");
assert.match(appSource, /const\s+copyCallsign\s*=\s*aircraftCallsignLabel\(jet\);/, "aircraft copy menu uses the unified callsign display label");
assert.match(appSource, /const\s+callSign\s*=\s*firstMatchedValue\(item\.callSign,\s*item\.flightNo\);[\s\S]*?<strong>\$\{escapeHtml\(firstMatchedValue\(callSign,\s*`\$\{dep\} - \$\{arr\}`\)\)\}<\/strong>/, "aircraft journey rows render corrected trip callsign before the route");
assert.match(appSource, /function\s+aircraftIsPanelOnly\(jet\)[\s\S]*?return\s+Boolean\(jet\?\.panelOnly\);/, "panel-only aircraft are explicitly marked");
assert.match(appSource, /function\s+protectedAircraftForRendering\(selected[\s\S]*?!aircraftIsPanelOnly\(selected\)[\s\S]*?!aircraftIsPanelOnly\(jet\)/, "panel-only aircraft are excluded from protected map rendering");
assert.match(appSource, /function\s+renderSelectedAircraftTrack\(\)[\s\S]*?aircraftIsPanelOnly\(jet\)[\s\S]*?clearAllRenderedTracks\(\);/, "panel-only aircraft do not draw selected map tracks");
assert.match(appSource, /const\s+selectedCandidate\s*=\s*selectedAircraft\(\);[\s\S]*?const\s+selected\s*=\s*aircraftIsPanelOnly\(selectedCandidate\)\s*\?\s*null\s*:\s*selectedCandidate;/, "panel-only aircraft are excluded from aircraft viewport request pins");

console.log("data interface v1.18: ok");
