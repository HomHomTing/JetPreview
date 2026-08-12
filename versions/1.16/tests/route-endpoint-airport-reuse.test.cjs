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
assert.match(
  appSource,
  /if\s*\(routeFocusActive\(\)\)\s*{[\s\S]*?return\s+\[\];[\s\S]*?}/,
  "route focus preserves the previous airport visibility rule and hides the airport layer"
);
assert.match(
  appSource,
  /if\s*\(airportLayerIsOff\(\)\)\s*{[\s\S]*?return\s+selected\s*\?\s*applyAirportLabelCollision\(\[\{\s*\.\.\.normalizeAirportRecord\(selected\)\s*\}\]\)\s*:\s*\[\];[\s\S]*?}/,
  "endpoint airports no longer bypass the previous airport-layer-off visibility rule"
);
assert.doesNotMatch(
  appSource,
  /routeEndpointIds|routeEndpointAirports\.forEach[\s\S]*?rendered\.unshift\(airport\)|airport\.id\s*===\s*selected\?\.id\s*\|\|\s*routeEndpointIds\.has\(airport\.id\)/,
  "route endpoint airports do not override zoom, level, or layer visibility filters"
);
assert.match(
  appSource,
  /routeEndpointRole\s*\?\s*"is-route-endpoint"\s*:\s*""[\s\S]*?routeEndpointRole\s*===\s*"departure"\s*\?\s*"is-route-origin"[\s\S]*?routeEndpointRole\s*===\s*"arrival"\s*\?\s*"is-route-destination"/,
  "origin and destination endpoint airports receive dedicated marker classes"
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
  /\.airport-pin\.is-route-endpoint\.is-hovered\s+\.airport-code-label\s*{[\s\S]*?opacity:\s*1;[\s\S]*?visibility:\s*visible;/,
  "route endpoint airports keep their code label visible instead of showing a hover popup"
);

console.log("route endpoint airport reuse: ok");
