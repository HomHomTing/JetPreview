const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const dataServiceSource = fs.readFileSync(path.join(rootDir, "data-service.js"), "utf8");
const loadAircraftDetailsBlock = appSource.match(/async function loadAircraftDetails\(jet\)[\s\S]*?async function loadAirportDetail/)?.[0] || "";
const selectAircraftBlock = appSource.match(/function\s+selectAircraft\(id,\s*shouldPan\s*=\s*true,\s*options\s*=\s*{}\)\s*{[\s\S]*?^}/m)?.[0] || "";
const selectGroundPlaneBlock = appSource.match(/function\s+selectGroundPlaneFromAirport\(airport,\s*plane\s*=\s*{}\)\s*{[\s\S]*?^}/m)?.[0] || "";

assert.match(
  appSource,
  /const\s+airportsById\s*=\s*new Map\(\);[\s\S]*?const\s+airportsByCode\s*=\s*new Map\(\);[\s\S]*?const\s+aircraftById\s*=\s*new Map\(\);/,
  "airport and aircraft lookup indexes are initialized"
);
assert.match(
  appSource,
  /function\s+rebuildAirportIndexes\(\)\s*{[\s\S]*?airportsById\.clear\(\);[\s\S]*?airportsByCode\.clear\(\);[\s\S]*?airport\.icaoCode[\s\S]*?\.forEach\(\(code\)\s*=>\s*addLookupEntry\(airportsByCode,\s*code,\s*airport\)\)/,
  "airport id/code indexes are rebuilt from normalized airport records"
);
assert.match(
  appSource,
  /function\s+airportByCode\(code\)\s*{[\s\S]*?return\s+airportsByCode\.get\(normalizedLookupKey\(code\)\)\s*\|\|\s*null;/,
  "airport code lookup is O(1) instead of scanning all airports during marker render"
);
assert.match(
  appSource,
  /const\s+jet\s*=\s*aircraftById\.get\(normalizedLookupKey\(id\)\);/,
  "aircraft selection resolves the clicked aircraft through the id index"
);
assert.match(
  appSource,
  /function\s+rebuildAircraftIndexes\(\)\s*{[\s\S]*?aircraftById\.clear\(\);[\s\S]*?aircraftByUniqueKey\.clear\(\);[\s\S]*?aircraftByEncryptedTail\.clear\(\);/,
  "aircraft indexes are rebuilt for id, uniqueKey, encrypted tail, and registration"
);
assert.match(
  appSource,
  /function\s+renderAfterAircraftDetailUpdate\(currentJet,\s*{\s*routeChanged\s*=\s*false,\s*profileChanged\s*=\s*false\s*}\s*=\s*{}\)\s*{[\s\S]*?renderAircraftDetailPanel\(currentJet\);[\s\S]*?renderViewport\(\);/,
  "selected aircraft detail updates rerender immediately when each detail response arrives"
);
assert.doesNotMatch(
  loadAircraftDetailsBlock,
  /const\s+\[trackResult,\s*profileResult\]\s*=\s*await\s+Promise\.allSettled/,
  "aircraft detail loading no longer waits for both 513009 and 513011 before applying UI updates"
);
assert.match(
  appSource,
  /dataService\.getFlightTrack\(jet\.uniqueKey\)[\s\S]*?\.then\(\(detail\)\s*=>[\s\S]*?applyFlightTrackDetail\(currentJet,\s*detail\);[\s\S]*?renderAfterAircraftDetailUpdate\(currentJet,\s*{\s*routeChanged:\s*true\s*}\);/,
  "513009 track details are applied as soon as the track request resolves"
);
assert.match(
  appSource,
  /dataService\.getPlaneDetail\(jet\.tailNoEncrypted\)[\s\S]*?\.then\(\(detail\)\s*=>[\s\S]*?applyPlaneDetailToMatchingAircraft\(currentJet,\s*detail\);[\s\S]*?renderAfterAircraftDetailUpdate\(currentJet,\s*{\s*profileChanged:\s*true\s*}\);/,
  "513011 aircraft profile details are applied as soon as the profile request resolves"
);
assert.match(
  dataServiceSource,
  /if\s*\(cached\?\.pending\)\s*{[\s\S]*?return\s+cached\.pending;[\s\S]*?}/,
  "detail cache reuses in-flight requests for repeated aircraft clicks"
);
assert.match(
  dataServiceSource,
  /cache\.set\(key,\s*{\s*pending,\s*loadedAt:\s*Date\.now\(\)\s*}\);/,
  "detail cache stores pending requests before they resolve"
);
assert.match(
  selectAircraftBlock,
  /loadAircraftDetails\(jet\);[\s\S]*?openAircraftView\(nextSegment(?:,\s*{[\s\S]*?})?\);[\s\S]*?renderAircraftDetailPanel\(jet\);/,
  "aircraft selection starts detail loading before the first selected panel render"
);
assert.match(
  selectAircraftBlock,
  /const\s+previousSelectedKind\s*=\s*state\.selectedKind;[\s\S]*const\s+preservedSegment\s*=[\s\S]*state\.aircraftSegment[\s\S]*const\s+nextSegment\s*=\s*explicitSegment[\s\S]*previousSelectedKind\s*===\s*"aircraft"[\s\S]*\?\s*preservedSegment/,
  "switching between selected aircraft keeps the currently active aircraft detail tab"
);
assert.doesNotMatch(
  selectAircraftBlock,
  /selectingDifferentAircraft\s*\?\s*"overview"/,
  "aircraft-to-aircraft switching no longer forces the detail panel back to overview"
);
assert.match(
  selectGroundPlaneBlock,
  /loadAircraftDetails\(jet\);[\s\S]*?openAircraftView\("airframe"\);[\s\S]*?renderAircraftDetailPanel\(jet\);/,
  "ground aircraft selection starts detail loading before the first selected panel render"
);
assert.match(
  loadAircraftDetailsBlock,
  /state\.detailLoads\.delete\(loadKey\);[\s\S]*?renderAfterAircraftDetailUpdate\(currentJet\);/,
  "aircraft selection loading state clears only after pending detail requests settle"
);

console.log("aircraft selection performance: ok");
