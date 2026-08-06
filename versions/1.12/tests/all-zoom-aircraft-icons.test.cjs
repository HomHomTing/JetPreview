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
  performanceConfig.showAllAircraftIconsAtAllZooms,
  true,
  "example config keeps all aircraft icons visible at every zoom level"
);
assert.ok(
  performanceConfig.allAircraftIconRequestLimit >= 50000,
  "all-zoom aircraft requests keep a high global request ceiling"
);

assert.match(
  appSource,
  /showAllAircraftIconsAtAllZooms:\s*appConfig\.performance\?\.showAllAircraftIconsAtAllZooms\s*\?\?\s*true/,
  "runtime defaults all-zoom aircraft icon visibility to enabled"
);
assert.match(
  appSource,
  /function\s+aircraftRenderLimit\(\)\s*{\s*if\s*\(\s*mapLoadingConfig\.showAllAircraftIconsAtAllZooms\s*\)\s*{\s*return\s+Number\.POSITIVE_INFINITY;/s,
  "aircraft render limit becomes unlimited when all-zoom icon visibility is enabled"
);
assert.match(
  appSource,
  /function\s+aircraftRenderIsLimited\(\)\s*{\s*return\s+Number\.isFinite\(aircraftRenderLimit\(\)\);/s,
  "aircraft rendering is treated as unlimited when the render limit is infinite"
);
assert.match(
  appSource,
  /const\s+bounds\s*=\s*aircraftIconVisibilityUsesGlobalScope\(\)\s*\?\s*null\s*:\s*currentViewportBounds\(mapLoadingConfig\.viewportPaddingRatio\);/s,
  "aircraft icons are not viewport-filtered when global all-zoom visibility is enabled"
);
assert.match(
  appSource,
  /const\s+rendered\s*=\s*aircraftRenderIsLimited\(\)\s*\?\s*inView\.slice\(0,\s*limit\)\s*:\s*inView;/,
  "aircraft icons are not sliced by zoom-tier limits when rendering is unlimited"
);
assert.match(
  appSource,
  /aircraftScope:\s*aircraftIconVisibilityUsesGlobalScope\(\)\s*\?\s*"global"\s*:\s*"viewport"/,
  "aircraft viewport requests switch to global scope for all-zoom icon visibility"
);
assert.match(
  appSource,
  /includeGround:\s*mapLoadingConfig\.showAllAircraftIconsAtAllZooms\s*\|\|\s*currentZoom\(\)\s*>=\s*8\.5/,
  "ground aircraft are requested regardless of zoom when all-zoom icon visibility is enabled"
);
assert.match(
  appSource,
  /window\.BIZJET_AIRCRAFT_ICON_VISIBILITY_STANDARD\s*=\s*Object\.freeze/,
  "the all-zoom icon visibility standard remains inspectable from the page"
);

const aircraftMarkerImplementation = appSource.match(/createAircraftMarker[\s\S]*?createAirportMarker/)?.[0] || "";
assert.ok(
  aircraftMarkerImplementation.includes("google.maps.CollisionBehavior?.REQUIRED"),
  "new Google aircraft markers are created with required collision behavior"
);
assert.ok(
  aircraftMarkerImplementation.includes("record.marker.collisionBehavior = google.maps.CollisionBehavior.REQUIRED"),
  "updated Google aircraft markers keep required collision behavior"
);
assert.equal(
  aircraftMarkerImplementation.includes("OPTIONAL_AND_HIDES_LOWER_PRIORITY"),
  false,
  "Google aircraft markers cannot be hidden by map collision priority"
);

console.log("all-zoom aircraft icons: ok");
