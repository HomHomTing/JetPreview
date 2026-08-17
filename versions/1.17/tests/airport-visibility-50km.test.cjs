const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const dataServiceSource = fs.readFileSync(path.join(rootDir, "data-service.js"), "utf8");
const configContext = { window: {} };

vm.runInNewContext(fs.readFileSync(path.join(rootDir, "config.example.js"), "utf8"), configContext);
const performanceConfig = configContext.window.APP_CONFIG.performance;

assert.equal(performanceConfig.airportFarScaleKm, 300);
assert.equal(performanceConfig.airportNearScaleKm, 110);
assert.equal(performanceConfig.airportCodeLabelScaleKm, 65);
assert.equal(performanceConfig.airportNearFallbackZoom, 8);
assert.equal(performanceConfig.airportDetailLabelScaleKm, 20);
assert.equal(performanceConfig.airportViewportRequestLimit, 50000);

assert.match(
  appSource,
  /function\s+airportScaleBand\(scaleKm\s*=\s*effectiveScaleKm\(\),\s*zoom\s*=\s*currentZoom\(\)\)\s*{[\s\S]*?return\s+"far"[\s\S]*?return\s+"mid"[\s\S]*?return\s+"near"/,
  "airport visibility uses the simplified far/mid/near scale bands"
);
assert.match(
  appSource,
  /function\s+airportLevelForRecord\(airport\)\s*{[\s\S]*?Math\.min\(4,[\s\S]*?return\s+4;/,
  "airport records are normalized to four tiers"
);
assert.match(
  appSource,
  /function\s+airportLevelLimit\(\)\s*{[\s\S]*?airportLayerMode\(\)\s*===\s*"on"[\s\S]*?band\s*===\s*"far"\s*\?\s*1[\s\S]*?band\s*===\s*"mid"\s*\?\s*3[\s\S]*?return\s+band\s*===\s*"far"\s*\?\s*0[\s\S]*?band\s*===\s*"mid"\s*\?\s*1[\s\S]*?:\s*4/,
  "auto 模式远景不显示普通机场，中景显示 L1，近景显示 L1-L4"
);
assert.match(
  appSource,
  /function\s+airportsForCurrentView\(\)[\s\S]*?\.filter\(\(airport\)\s*=>\s*airportPriorityLevel\(airport\)\s*<=\s*maxLevel\)/,
  "默认机场渲染仍经过层级上限过滤"
);
assert.match(
  appSource,
  /function\s+airportRenderLimit\(\)\s*{[\s\S]*?return\s+Number\.POSITIVE_INFINITY;/,
  "airport rendering has no client-side count truncation"
);
assert.doesNotMatch(appSource, /airportDensityGridAllows|densityBand\.cellPx/);
assert.match(
  appSource,
  /function\s+airportsForCurrentView\(\)\s*{[\s\S]*?positionInBounds[\s\S]*?item\.level\s*<=\s*maxLevel[\s\S]*?addProtectedAirports\(rendered,\s*protectedIds\);/,
  "airport rendering filters by viewport and simple tier threshold"
);
assert.match(
  appSource,
  /function\s+desiredAirportLabelMode\(airport\)\s*{[\s\S]*?airportDetailLabelScaleKm[\s\S]*?return\s+"full"[\s\S]*?airportCodeLabelScaleKm[\s\S]*?return\s+"code"/,
  "airport labels follow FR24 full, code and pin scale thresholds"
);
assert.match(
  appSource,
  /function\s+replaceAirportData\(nextAirports\)\s*{[\s\S]*?const\s+mergedById\s*=\s*new\s+Map\(airports\.map[\s\S]*?AIRPORT_VIEWPORT_CACHE_TTL_MS[\s\S]*?airports\.splice\(0,\s*airports\.length/,
  "airport responses merge into a viewport cache instead of replacing all records"
);
assert.match(
  appSource,
  /function\s+buildAirportViewportRequest\(reason\s*=\s*"timer"\)\s*{[\s\S]*?scaleBand,[\s\S]*?maxAirports:\s*airportRequestLimit\(\),[\s\S]*?displayLevelMax:\s*airportRequestLevelLimit\(\),[\s\S]*?includeAllAirports:\s*airportShowsAllInCurrentViewport\(\),/,
  "airport requests send the simplified scale band and tier ceiling"
);
assert.match(
  dataServiceSource,
  /function\s+normalizeAirportLevel\(value,\s*ground\s*=\s*0\)\s*{[\s\S]*?Math\.min\(4,[\s\S]*?return\s+4;/,
  "API airport levels are normalized to L1-L4"
);

console.log("airport FR24 loading rules: ok");
