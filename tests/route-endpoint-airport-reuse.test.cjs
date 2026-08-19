const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

assert.match(
  appSource,
  /function\s+selectedAircraftRouteEndpointMap\(jet\s*=\s*selectedAircraft\(\)\)\s*{[\s\S]*?selectedRouteEndpoints\(jet\)\.forEach[\s\S]*?airportByCode\(endpoint\.code\)[\s\S]*?map\.set\(airport\.id,\s*endpoint\.role\);/,
  "selected aircraft route endpoints are mapped back to original airport records"
);
assert.match(
  appSource,
  /function\s+selectedAircraftRouteEndpointAirports\(endpointMap\s*=\s*getSelectedAircraftRouteEndpointMap\(\)\)\s*{[\s\S]*?airportById\(id\)[\s\S]*?normalizeAirportRecord\(airport\)/,
  "selected route endpoint airports are reused through the normal airport renderer"
);
assert.match(
  appSource,
  /function\s+refreshSelectedRouteEndpointCache\(jet\s*=\s*selectedAircraft\(\)\)\s*{[\s\S]*?state\.selectedRouteEndpointMap\s*=[\s\S]*?selectedAircraftRouteEndpointMap\(jet\)[\s\S]*?new Map\(\);/,
  "selected route endpoint mapping is cached for the selected aircraft"
);
assert.match(
  appSource,
  /function\s+getSelectedAircraftRouteEndpointMap\(\)\s*{[\s\S]*?return\s+state\.selectedRouteEndpointMap\s*\|\|\s*selectedAircraftRouteEndpointMap\(\);/,
  "airport marker rendering reads the cached selected route endpoint map"
);
assert.match(
  appSource,
  /function\s+airportPopupCanShow\(airport\)\s*{[\s\S]*?airportIsSelectedAircraftRouteEndpoint\(airport\)[\s\S]*?return\s+false;[\s\S]*?airportHoverLabelParts\(airport\)[\s\S]*?hasName[\s\S]*?hasCodes/,
  "route endpoint airports suppress airport hover popups while an aircraft is selected"
);
assert.match(
  appSource,
  /function\s+syncSelectedRouteVisuals\(\)\s*{[\s\S]*?state\.map\.clearRouteEndpoints\(\);[\s\S]*?if\s*\(!state\.trails\s*\|\|\s*!jet\)\s*{[\s\S]*?return;[\s\S]*?}/,
  "selected aircraft no longer draws separate route endpoint markers"
);
assert.doesNotMatch(
  appSource.match(/function\s+syncSelectedRouteVisuals\(\)\s*{[\s\S]*?function\s+fitSelectedRouteBounds/)?.[0] || "",
  /setRouteEndpoints\(selectedRouteEndpoints\(jet\)\)/,
  "syncSelectedRouteVisuals does not add duplicate endpoint icons"
);
assert.doesNotMatch(
  appSource.match(/function\s+airportsForCurrentView\(\)[\s\S]*?function\s+finiteNumber/)?.[0] || "",
  /if\s*\(routeFocusActive\(\)\)\s*{\s*return\s+applyAirportLabelCollision\(selectedAircraftRouteEndpointAirports\(\)\)/,
  "route focus does not replace the normal airport viewport rules"
);
assert.match(
  appSource,
  /function\s+airportsForCurrentView\(\)[\s\S]*?positionInBounds[\s\S]*?addProtectedAirports\(rendered,\s*protectedIds\);/,
  "route focus keeps normal airport viewport rendering and protected endpoint backfill"
);
assert.match(
  appSource,
  /if\s*\(airportLayerIsOff\(\)\)\s*{[\s\S]*?return\s+applyAirportLabelCollision\(protectedAirportRecords\(protectedIds\)\);[\s\S]*?}/,
  "airport-layer-off mode hides ordinary airports but preserves selected airport and route endpoint airports"
);
assert.match(
  appSource,
  /function\s+protectedAirportIds\(\)\s*{[\s\S]*?getSelectedAircraftRouteEndpointMap\(\)\.forEach[\s\S]*?ids\.add\(id\);[\s\S]*?}/,
  "route endpoint airports are protected from density filtering without changing selectedKind"
);
assert.match(
  appSource,
  /function\s+airportHasSelectedVisualState\(airport\)\s*{[\s\S]*?airportIsSelected\(airport\)[\s\S]*?airportIsRouteEndpointSelected\(airport\)/,
  "route endpoint airports get selected visual state without opening the airport detail panel"
);
assert.match(
  appSource,
  /addProtectedAirports\(rendered,\s*protectedIds\);/,
  "route endpoint airports are reinserted after normal airport density filtering"
);
assert.match(
  appSource,
  /function\s+selectedRouteEndpointCodes\(jet\s*=\s*selectedAircraft\(\)\)\s*{[\s\S]*?selectedRouteEndpoints\(jet\)[\s\S]*?endpoint\.code[\s\S]*?endpoint\.id/,
  "raw selected route endpoint codes are available for protected airport backfill requests"
);
assert.match(
  appSource,
  /routeEndpointRole\s*\?\s*"is-route-endpoint"\s*:\s*""[\s\S]*?routeEndpointRole\s*\?\s*"is-route-selected"\s*:\s*""[\s\S]*?routeEndpointRole\s*===\s*"departure"\s*\?\s*"is-route-origin"[\s\S]*?routeEndpointRole\s*===\s*"arrival"\s*\?\s*"is-route-destination"/,
  "origin and destination endpoint airports receive route selected marker classes"
);
assert.match(
  appSource,
  /data-route-endpoint-role="\$\{routeEndpointRole\}"/,
  "fallback airport markers expose the selected aircraft endpoint role"
);
assert.match(
  appSource,
  /content\.dataset\.routeEndpointRole\s*=\s*routeEndpointRole;/,
  "Google airport markers expose the selected aircraft endpoint role"
);
assert.match(
  appSource,
  /const\s+AIRPORT_ROUTE_ENDPOINT_Z_INDEX\s*=\s*920;/,
  "route endpoint airports sit below airport popups and selected aircraft"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-route-endpoint\s*{[\s\S]*?z-index:\s*920;/,
  "route endpoint airport markers use the route endpoint layer"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-route-selected\s*{[\s\S]*?z-index:\s*920;/,
  "route endpoint selected visual state stays in the route endpoint layer"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-route-origin\s+\.airport-pin-body\s*{[\s\S]*?fill:\s*#f4c400;/,
  "departure airport reuses the airport icon with origin highlight"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-route-destination\s+\.airport-pin-body\s*{[\s\S]*?fill:\s*#ff8b26;/,
  "arrival airport reuses the airport icon with destination highlight"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-route-endpoint\.is-hovered\s+\.airport-code-label\s*{[\s\S]*?opacity:\s*0;[\s\S]*?visibility:\s*hidden;/,
  "route endpoint airports also suppress persistent code labels"
);

console.log("route endpoint airport reuse: ok");
