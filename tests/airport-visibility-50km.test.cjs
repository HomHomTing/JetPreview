const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function readProjectFile(filename) {
  return fs.readFileSync(path.join(rootDir, filename), "utf8");
}

const appSource = readProjectFile("app.js");
const configContext = { window: {} };

vm.runInNewContext(readProjectFile("config.example.js"), configContext);

const performanceConfig = configContext.window.APP_CONFIG.performance;

assert.equal(
  performanceConfig.airportShowAllZoom,
  7,
  "50km scale uses Google zoom 7 as the all-airport visibility threshold"
);
assert.ok(
  performanceConfig.airportShowAllRequestLimit >= 50000,
  "50km airport requests use a high enough ceiling to avoid client-side truncation"
);

assert.match(
  appSource,
  /airportShowAllZoom:\s*appConfig\.performance\?\.airportShowAllZoom\s*\?\?\s*7/,
  "runtime default exposes the 50km all-airport threshold"
);
assert.match(
  appSource,
  /function\s+airportShowsAllInCurrentViewport\(zoom\s*=\s*currentZoom\(\)\)\s*{[\s\S]*?clampZoom\(zoom\)\s*>=\s*threshold;/,
  "airport visibility switches to all-airport mode at the configured zoom threshold"
);
assert.match(
  appSource,
  /function\s+airportRenderLimit\(\)\s*{[\s\S]*?airportShowsAllInCurrentViewport\(\)[\s\S]*?Number\.POSITIVE_INFINITY;/,
  "50km all-airport mode does not slice rendered airport markers"
);
assert.match(
  appSource,
  /function\s+airportLevelLimit\(\)\s*{[\s\S]*?airportShowsAllInCurrentViewport\(\)[\s\S]*?return\s+5;/,
  "50km all-airport mode includes displayLevel 5 airports"
);
assert.match(
  appSource,
  /function\s+airportRequestLimit\(\)\s*{[\s\S]*?airportShowAllRequestLimit/,
  "airport requests use the dedicated all-airport request limit at 50km"
);
assert.match(
  appSource,
  /function\s+buildAirportViewportRequest\(reason\s*=\s*"timer"\)\s*{[\s\S]*?maxAirports:\s*airportRequestLimit\(\),[\s\S]*?displayLevelMax:\s*airportRequestLevelLimit\(\),/,
  "airport viewport requests send maxAirports and displayLevelMax to the API"
);
assert.match(
  appSource,
  /function\s+buildAirportViewportRequestMetadata\(\)\s*{[\s\S]*?airportNorth:[\s\S]*?airportEast:/,
  "aircraft viewport requests carry an independent airport viewport bbox"
);
assert.match(
  appSource,
  /if\s*\(clamped\s*<\s*7\)\s*{[\s\S]*?visibleClass\s*===\s*"small"[\s\S]*?width:\s*0,[\s\S]*?if\s*\(clamped\s*<\s*7\.5\)\s*{[\s\S]*?return\s*{\s*width:\s*14,\s*height:\s*18,/,
  "small airport pins become visible from zoom 7 instead of staying at 0px until zoom 7.5"
);
assert.match(
  appSource,
  /function\s+googleAirportCollisionBehavior\(airport,\s*options\s*=\s*{}\)\s*{[\s\S]*?return\s+collisionBehavior\.REQUIRED;[\s\S]*?}/,
  "new Google airport markers are always required so selection cannot hide them"
);
assert.equal(
  appSource.includes("OPTIONAL_AND_HIDES_LOWER_PRIORITY"),
  false,
  "Google airport markers cannot be hidden by collision priority"
);
assert.match(
  appSource,
  /applyGoogleAirportMarkerStacking\(record\.marker,\s*airport,\s*{[\s\S]*?hovered:\s*airportHoverIsActive\(airport\.id\),[\s\S]*?currentHover:\s*airportHoverId\(state\.hoveredAirportId\)\s*===\s*airportHoverId\(airport\.id\)[\s\S]*?}\);/,
  "updated Google airport markers stay required in 50km all-airport mode"
);

console.log("airport visibility 50km: ok");
