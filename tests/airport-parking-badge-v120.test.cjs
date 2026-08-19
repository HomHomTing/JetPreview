const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function readProjectFile(filename) {
  return fs.readFileSync(path.join(rootDir, filename), "utf8");
}

const appSource = readProjectFile("app.js");
const stylesSource = readProjectFile("styles.css");
const indexSource = readProjectFile("index.html");

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
  adaptRealtimeSnapshot,
  adaptAirportDetail,
  adaptAirportGround
} = context.window.BIZJET_DATA_SERVICE.adapters;

const snapshot = adaptRealtimeSnapshot({
  airportList: [
    {
      airportCode: "pek",
      icaoCode: "zbaa",
      airportName: "北京首都国际机场",
      airportNameEn: "Beijing Capital International Airport",
      lat: "40.07889701",
      lon: "116.596282",
      groundNum: "0",
      level: 1
    },
    {
      airportCode: "sha",
      icaoCode: "zsss",
      airportName: "上海虹桥国际机场",
      airportNameEn: "Shanghai Hongqiao International Airport",
      lat: "31.1981",
      lon: "121.3363",
      level: 2
    }
  ],
  flyingPlanes: []
}, {}, {}, "513008");

assert.equal(snapshot.airports[0].ground, 0, "513008 groundNum 0 is retained as a real count");
assert.equal(snapshot.airports[0].groundCount, 0, "513008 ground count metadata keeps zero");
assert.equal(snapshot.airports[0].groundCountAvailable, true, "513008 zero count remains badge-eligible");
assert.equal(snapshot.airports[0].groundCountSource, "513008", "513008 airport badge count records its source");
assert.equal(snapshot.airports[1].ground, 0, "missing 513008 groundNum keeps legacy ground fallback at zero");
assert.equal(snapshot.airports[1].groundCount, null, "missing 513008 groundNum is not converted into a badge value");
assert.equal(snapshot.airports[1].groundCountAvailable, false, "missing 513008 groundNum hides the badge");

const airportDetail = adaptAirportDetail({
  airportInfo: {
    airportCode: "pek",
    icaoCode: "zbaa",
    airportName: "北京首都国际机场",
    airportNameEn: "Beijing Capital International Airport"
  },
  groundInfo: {
    groundNum: "38"
  }
});

assert.equal(airportDetail.updates.groundCount, 38, "513010 detail can locally refresh the airport badge count");
assert.equal(airportDetail.updates.groundCountSource, "513010", "513010 badge count records its source");

const airportGround = adaptAirportGround({
  airportInfo: {
    airportCode: "pek",
    icaoCode: "zbaa"
  },
  groundInfo: {
    groundPlanes: [
      { tailNoClear: "B-1001", modelCode: "GLF6" },
      { tailNoClear: "B-1002", modelCode: "GLF5" }
    ]
  }
});

assert.equal(airportGround.updates.groundCount, 2, "513014 can use returned ground aircraft rows as selected-airport badge fallback");
assert.equal(airportGround.updates.groundCountSource, "513014", "513014 badge count records its source");

assert.match(
  appSource,
  /function\s+airportParkingBadgeHtml\(airport\)[\s\S]*?class="airport-parking-badge"[\s\S]*?当前停场公务机[\s\S]*?airport-parking-badge-value/,
  "airport badge HTML is generated from the airport render model"
);
assert.match(
  appSource,
  /updateAirportContent\(content,\s*airport\)[\s\S]*?syncAirportParkingBadgeDataset\(content,\s*airport\)[\s\S]*?syncAirportParkingBadgeElement\(content,\s*airport\)/,
  "Google airport markers update parking badges without recreating markers"
);
assert.match(
  appSource,
  /class="airport-pin-symbol"[\s\S]*?class="airport-pin-icon"[\s\S]*?airportParkingBadgeHtml\(airport\)/,
  "airport icon and parking badge share one visual container"
);
assert.match(
  appSource,
  /function\s+airportMarkerIsVisible\(airport\)[\s\S]*?metrics\.visualWidth\s*>\s*0[\s\S]*?metrics\.visualHeight\s*>\s*0[\s\S]*?function\s+airportsForCurrentView\(\)[\s\S]*?filter\(airportMarkerIsVisible\)[\s\S]*?airportMarkerIsVisible\(item\.airport\)/,
  "zero-size airport icons and their badges are removed from the render queue together"
);
assert.match(
  appSource,
  /renderAirports\(\)[\s\S]*?airportParkingBadgeDataAttributes\(airport\)[\s\S]*?airportParkingBadgeHtml\(airport\)/,
  "fallback airport marker rendering includes parking badge attributes and markup"
);
assert.match(
  appSource,
  /function\s+renderAirports\(\)[\s\S]*?const\s+airportMarkers\s*=\s*airportsForCurrentView\(\);[\s\S]*?state\.map\.renderAirportMarkers\(airportMarkers\)[\s\S]*?airportLayer\.innerHTML\s*=\s*airportMarkers\.map\(\(airport\)\s*=>[\s\S]*?airportParkingBadgeHtml\(airport\)/,
  "airport badges are rendered only inside the currently visible airport marker queue"
);
assert.doesNotMatch(
  `${appSource}\n${indexSource}`,
  /airport(?:Parking|Ground)?BadgeLayer|parkingBadgeLayer|groundCountLayer|airport-count-layer/i,
  "airport badges do not use an independent map layer that could remain visible after the airport icon is hidden"
);
assert.match(
  appSource,
  /function\s+applyAirportPanelUpdates\(airport,\s*detail\)[\s\S]*?key\s*===\s*"groundCountAvailable"\s*&&\s*value\s*===\s*false[\s\S]*?return;/,
  "missing selected-airport detail counts do not wipe a cached 513008 badge count"
);
assert.doesNotMatch(
  appSource.match(/function\s+renderAirports\(\)\s*{[\s\S]*?function\s+airportDistanceSortScore/)?.[0] || "",
  /getAirportDetail|getAirportGround|getAirportDynamic|513010|513014|513015/,
  "map airport rendering does not add detail API requests for parking badges"
);

assert.match(
  stylesSource,
  /\.airport-parking-badge\s*{[\s\S]*?pointer-events:\s*none;[\s\S]*?}/,
  "airport badge never steals airport marker clicks or hover"
);
assert.match(
  stylesSource,
  /\.airport-pin\s*{[\s\S]*?--airport-badge-x-factor:\s*0\.28;[\s\S]*?--airport-badge-shift-x:\s*-42%;[\s\S]*?}/,
  "airport badge overlaps the pin at its top-right edge"
);
assert.match(
  stylesSource,
  /\.airport-pin\.airport-size-small\s*{[\s\S]*?--airport-badge-x-factor:\s*0\.24;[\s\S]*?--airport-badge-shift-x:\s*-46%;[\s\S]*?}/,
  "small airport badges tuck closer to the pin so dense airports remain attributable"
);
assert.match(
  stylesSource,
  /\.airport-parking-badge\s*{[\s\S]*?z-index:\s*3;[\s\S]*?left:\s*calc\(50% \+ var\(--airport-icon-width, 22px\) \* var\(--airport-badge-x-factor, 0\.28\)\);[\s\S]*?bottom:\s*calc\(var\(--airport-icon-height, 28px\) \* var\(--airport-badge-y-factor, 0\.54\)\);[\s\S]*?}/,
  "airport badge position is controlled by the airport marker size instead of a detached fixed offset"
);
assert.match(
  stylesSource,
  /\.airport-pin-symbol\s*{[\s\S]*?width:\s*var\(--airport-icon-width, 22px\);[\s\S]*?height:\s*var\(--airport-icon-height, 28px\);[\s\S]*?}[\s\S]*?\.airport-pin\[data-marker-visible="false"\]\s+\.airport-pin-symbol\s*{[\s\S]*?display:\s*none;/,
  "airport icon and badge inherit one size and one visibility state"
);
assert.match(
  stylesSource,
  /\.airport-parking-badge\[data-count-tier="single"\][\s\S]*?--airport-badge-width:\s*18px;[\s\S]*?--airport-badge-height:\s*18px;/,
  "single-digit badge uses a pin-attached visible size"
);
assert.match(
  stylesSource,
  /\.airport-parking-badge\[data-count-tier="compact"\]\s*{[\s\S]*?--airport-badge-width:\s*42px;[\s\S]*?--airport-badge-height:\s*21px;/,
  "large airport counts use the compact pin-attached wide badge tier"
);
assert.doesNotMatch(stylesSource, /\.airport-parking-badge::before/, "airport badge does not add an extra connector block that can cover the count");
assert.match(
  stylesSource,
  /\.airport-parking-badge-value\s*{[\s\S]*?z-index:\s*2;[\s\S]*?}/,
  "airport badge value stays above the airport icon"
);
assert.match(
  stylesSource,
  /\.airport-detail-v120\s+\.airport-ground-head\s*>\s*strong\s*{[\s\S]*?font-size:\s*16px;/,
  "ground fleet count uses a restrained auxiliary text size"
);

console.log("airport parking badge v1.20: ok");
