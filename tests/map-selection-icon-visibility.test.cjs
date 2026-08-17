const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

const selectAircraftBlock = appSource.match(/function\s+selectAircraft\(id,\s*shouldPan\s*=\s*true,\s*options\s*=\s*{}\)\s*{[\s\S]*?function\s+selectAirport/)?.[0] || "";
const selectSearchAircraftBlock = appSource.match(/function\s+selectSearchAircraft\(id,\s*options\s*=\s*{}\)\s*{[\s\S]*?function\s+selectSearchAirport/)?.[0] || "";
const clearSelectionBlock = appSource.match(/function\s+clearSelection\(options\s*=\s*{}\)\s*{[\s\S]*?function\s+apiDebugConsoleConfig/)?.[0] || "";
const selectAirportBlock = appSource.match(/function\s+selectAirport\(id,\s*shouldPan\s*=\s*true\)\s*{[\s\S]*?function\s+updateRail/)?.[0] || "";

assert.match(
  selectAircraftBlock,
  /const\s+preserveReducedIconState\s*=\s*options\.preserveReducedIconState\s*===\s*true;/,
  "aircraft selection has an explicit preserve flag for internal refreshes"
);
assert.match(
  selectAircraftBlock,
  /const\s+previousAircraftId\s*=\s*state\.selectedKind\s*===\s*"aircraft"\s*&&\s*state\.selectedId\s*!==\s*id[\s\S]*?state\.selectedId[\s\S]*?rememberRecentlySelectedAircraft\(previousAircraftId\);/,
  "switching aircraft keeps the previously selected aircraft protected from immediate marker removal"
);
assert.match(
  appSource,
  /recentlySelectedAircraftAt:\s*new\s+Map\(\)/,
  "recently selected aircraft retention stores timestamps"
);
assert.match(
  appSource,
  /function\s+pruneRecentlySelectedAircraft\(now\s*=\s*Date\.now\(\)\)[\s\S]*?selectedRetentionMs[\s\S]*?state\.recentlySelectedAircraftAt\.delete\(key\);/,
  "recently selected aircraft protection expires by the configured retention window"
);
assert.match(
  appSource,
  /function\s+aircraftIsExpired\(jet\)\s*{[\s\S]*?aircraftWasRecentlySelected\(jet\)[\s\S]*?return\s+false;/,
  "recently selected aircraft are not treated as expired immediately after selection changes"
);
assert.match(
  appSource,
  /function\s+aircraftIsProtectedFromRemoval\(jet\)\s*{[\s\S]*?aircraftIsSelected\(jet\)\s*\|\|\s*aircraftWasRecentlySelected\(jet\)/,
  "selected and recently selected aircraft share one removal-protection rule"
);
assert.match(
  appSource,
  /function\s+aircraftBySelectionProtectionKey\(key\)[\s\S]*?aircraftById\.get\(normalized\)[\s\S]*?aircraftByUniqueKey\.get\(normalized\)[\s\S]*?aircraftByEncryptedTail\.get\(normalized\)[\s\S]*?aircraftByRegistration\.get\(normalized\)/,
  "recently selected aircraft can be restored from id, uniqueKey, encrypted tail, or registration indexes"
);
assert.match(
  appSource,
  /snapshot\.removedAircraftUniqueKeys[\s\S]*?if\s*\(aircraftIsProtectedFromRemoval\(jet\)\)\s*{[\s\S]*?jet\.quality\s*=\s*"stale";/,
  "removed aircraft snapshots keep recently selected aircraft as stale instead of deleting them"
);
assert.match(
  appSource,
  /if\s*\(!aircraftIsProtectedFromRemoval\(jet\)\s*&&\s*aircraftIsExpired\(jet\)\)\s*{[\s\S]*?businessJets\.splice\(index,\s*1\);/,
  "viewport expiry cleanup does not remove recently selected aircraft"
);
assert.match(
  clearSelectionBlock,
  /const\s+previousAircraftId\s*=\s*state\.selectedKind\s*===\s*"aircraft"\s*\?\s*state\.selectedId\s*:\s*"";[\s\S]*?rememberRecentlySelectedAircraft\(previousAircraftId\);/,
  "clearing an aircraft selection keeps that aircraft visible through recent-selection protection"
);
assert.doesNotMatch(
  clearSelectionBlock,
  /clearRecentlySelectedAircraft\(\)/,
  "clearing the detail panel no longer drops recently selected aircraft from map rendering"
);
assert.match(
  selectAirportBlock,
  /if\s*\(state\.selectedKind\s*===\s*"aircraft"\s*&&\s*state\.selectedId\)\s*{[\s\S]*?rememberRecentlySelectedAircraft\(state\.selectedId\);/,
  "switching from an aircraft to an airport keeps the previous aircraft protected"
);
assert.doesNotMatch(
  selectAirportBlock,
  /clearRecentlySelectedAircraft\(\)/,
  "airport selection does not clear recent aircraft marker protection"
);
assert.match(
  selectAircraftBlock,
  /if\s*\(!preserveReducedIconState\)\s*{[\s\S]*?state\.routeFocusAircraftId\s*=\s*null;[\s\S]*?state\.routeFocusPreviousView\s*=\s*null;[\s\S]*?state\.map\?\.clearRouteEndpoints\?\.\(\);[\s\S]*?state\.hideOtherAircraft\s*=\s*false;/,
  "ordinary aircraft selection clears route-focus and hide-other icon reduction"
);
assert.match(
  appSource,
  /selectAircraft\(state\.selectedId,\s*false,\s*{\s*preserveReducedIconState:\s*true\s*}\);/,
  "realtime refresh preserves explicit reduced-icon state"
);
assert.match(
  appSource,
  /function\s+renderAfterAircraftDetailUpdate\(currentJet,[\s\S]*?refreshSelectedRouteEndpointCache\(aircraftIsPanelOnly\(currentJet\)\s*\?\s*null\s*:\s*currentJet\);[\s\S]*?renderAircraftDetailPanel\(currentJet\);[\s\S]*?if\s*\(!aircraftIsPanelOnly\(currentJet\)\)\s*{[\s\S]*?renderViewport\(\);/,
  "aircraft detail refresh updates live selected map aircraft while excluding panel-only aircraft from map rendering"
);
assert.match(
  appSource,
  /function\s+aircraftForCurrentView\(\)\s*{[\s\S]*?const\s+protectedAircraft\s*=\s*protectedAircraftForRendering\(selected\);[\s\S]*?protectedIds\.has\(jet\.id\)[\s\S]*?mergeProtectedAircraft\(rendered,\s*protectedAircraft\)/,
  "aircraft rendering keeps selected and recently selected aircraft in the marker set"
);
assert.match(
  appSource,
  /pinnedAircraftKeys:\s*protectedAircraft[\s\S]*?\.map\(\(jet\)\s*=>\s*jet\.uniqueKey\s*\|\|\s*jet\.id\)[\s\S]*?\.join\(","\)/,
  "viewport requests include recently selected aircraft keys so data refreshes keep them available"
);
assert.doesNotMatch(
  appSource.match(/function\s+renderAfterAircraftDetailUpdate\(currentJet,[\s\S]*?async function loadAircraftDetails/)?.[0] || "",
  /state\.routeFocusAircraftId\s*=\s*null|state\.hideOtherAircraft\s*=\s*false/,
  "aircraft detail refresh does not clear route-focus or hide-other icon reduction"
);
assert.match(
  appSource,
  /selectAircraft\(selected,\s*false,\s*{\s*preserveReducedIconState:\s*true\s*}\);/,
  "local sample tick refresh preserves explicit reduced-icon state"
);
assert.match(
  selectSearchAircraftBlock,
  /selectAircraft\(id,\s*options\.pan\s*!==\s*false\);[\s\S]*?if\s*\(options\.routeFocus\)\s*{[\s\S]*?setRouteFocus\(true\);/,
  "search route focus is explicit and happens after normal selection restores icon visibility"
);
assert.match(
  appSource,
  /function\s+googleAirportCollisionBehavior\(airport,\s*options\s*=\s*{}\)\s*{[\s\S]*?return\s+collisionBehavior\.REQUIRED;/,
  "airport markers are required and cannot disappear due to map collision after selection"
);
assert.match(
  appSource,
  /function\s+configuredText\(value\)\s*{[\s\S]*?YOUR_[\s\S]*?return\s+"";[\s\S]*?}/,
  "placeholder runtime config values are treated as missing"
);
assert.match(
  appSource,
  /const\s+googleMarkerMapId\s*=\s*configuredText\(appConfig\.googleMapId\)\s*\|\|\s*"DEMO_MAP_ID";/,
  "Google map id ignores template placeholders before falling back to the demo id"
);
assert.match(
  appSource,
  /const\s+apiKey\s*=\s*googleMapsApiKey\(\);[\s\S]*?if\s*\(!apiKey\)\s*{[\s\S]*?Missing Google Maps API key/,
  "Google Maps loader validates the configured API key before injecting the script"
);
assert.match(
  appSource,
  /defaultMapProvider[\s\S]*?===\s*"google"[\s\S]*?&&\s*googleMapsApiKey\(\)/,
  "Google map engine is selected only when a real API key is configured"
);
assert.match(
  appSource,
  /window\.gm_authFailure\s*=\s*\(\)\s*=>\s*{[\s\S]*?scheduleGoogleMapsFallback\("Google Maps API authorization failed"\);[\s\S]*?};/,
  "Google Maps authorization failures trigger a runtime fallback instead of leaving a gray error map"
);
assert.match(
  appSource,
  /async\s+function\s+fallbackToLeafletMap\(reason\s*=\s*"Google Maps unavailable"\)[\s\S]*?state\.map\s*=\s*new LeafletMapEngine\(\);[\s\S]*?bindMapViewportEvents\(\);[\s\S]*?renderViewport\(\);/,
  "Google map fallback rebuilds the map engine and rebinds viewport rendering"
);
assert.match(
  appSource,
  /destroy\(\)\s*{[\s\S]*?this\.contrastOverlay\?\.setMap\(null\);[\s\S]*?google\.maps\.event\.clearInstanceListeners\(this\.map\);[\s\S]*?}/,
  "Google map engine cleans native overlays before fallback"
);
assert.match(
  appSource,
  /function\s+googleMapRenderedErrorVisible\(container\s*=\s*document\.getElementById\("map"\)\)/,
  "rendered Google Maps error screens are detected from the map container"
);
assert.match(
  appSource,
  /gm-err-container,\s*\.gm-err-content,\s*\.gm-err-title/,
  "Google rendered error DOM classes trigger the fallback detector"
);
assert.match(
  appSource,
  /此页面未能正确加载\\s\*Google\\s\*地图/,
  "localized Google rendered error copy triggers the fallback detector"
);
assert.match(
  appSource,
  /watchRenderedAuthErrors\(\)\s*{[\s\S]*?new MutationObserver\(\(\)\s*=>\s*detect\(\)\)[\s\S]*?setInterval/,
  "Google map engine watches for late rendered authorization errors"
);
assert.match(
  appSource,
  /Google Maps rendered an authorization error[\s\S]*?scheduleGoogleMapsFallback\("Google Maps rendered an authorization error"\)/,
  "late rendered Google authorization errors schedule fallback"
);
assert.match(
  appSource,
  /window\.BIZJET_MAP_RUNTIME\s*=\s*Object\.freeze\({[\s\S]*?provider\(\)[\s\S]*?forceFallback\(reason\s*=\s*"manual map fallback test"\)/,
  "map runtime exposes fallback diagnostics for browser verification"
);

console.log("map selection icon visibility: ok");
