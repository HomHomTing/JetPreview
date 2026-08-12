const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

const selectAircraftBlock = appSource.match(/function\s+selectAircraft\(id,\s*shouldPan\s*=\s*true,\s*options\s*=\s*{}\)\s*{[\s\S]*?function\s+selectAirport/)?.[0] || "";
const selectSearchAircraftBlock = appSource.match(/function\s+selectSearchAircraft\(id,\s*options\s*=\s*{}\)\s*{[\s\S]*?function\s+selectSearchAirport/)?.[0] || "";

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
  /function\s+renderAfterAircraftDetailUpdate\(currentJet,[\s\S]*?refreshSelectedRouteEndpointCache\(currentJet\);[\s\S]*?renderAircraftDetailPanel\(currentJet\);[\s\S]*?renderViewport\(\);/,
  "aircraft detail refresh updates the selected view without clearing reduced-icon state"
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

console.log("map selection icon visibility: ok");
