const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

assert.match(
  appSource,
  /function\s+airportHoverLabelParts\(airport\)\s*{[\s\S]*?const\s+nameCn\s*=[\s\S]*?const\s+nameEn\s*=[\s\S]*?return\s*{[\s\S]*?nameCn,[\s\S]*?nameEn,[\s\S]*?iata:\s*iata\s*\|\|\s*"N\/A"[\s\S]*?icao:\s*icao\s*\|\|\s*"N\/A"/,
  "airport hover formatter exposes Chinese name, English name, IATA and ICAO"
);
assert.match(
  appSource,
  /function\s+meaningfulAirportName\(value,\s*codeSet,[\s\S]*?codeSet\.has\(normalized\)[\s\S]*?\^\[A-Z0-9\]\{3,4\}\$/,
  "airport hover formatter does not treat airport codes as airport names"
);
assert.match(
  appSource,
  /options\.requiresChinese\s*&&\s*!\/\[\\u4e00-\\u9fff\]\/\.test\(text\)/,
  "airport hover Chinese-name line only uses real Chinese text"
);
assert.doesNotMatch(
  appSource.match(/function\s+airportHoverLabelParts\(airport\)\s*{[\s\S]*?function\s+airportDisplayCode/)?.[0] || "",
  /raw\.cityName|airport\.city/,
  "airport hover label does not use city names as airport names"
);
assert.match(
  appSource,
  /function\s+airportHoverCodeLine\(airport\)\s*{[\s\S]*?return\s+`\$\{iata\} \/ \$\{icao\}`;/,
  "airport hover code line uses PEK / ZBAA format"
);
assert.match(
  appSource,
  /function\s+airportDisplayCode\(airport\)\s*{[\s\S]*?return\s+`\$\{iata\} \/ \$\{icao\}`;/,
  "selected and persistent airport code labels also use PEK / ZBAA format"
);
assert.match(
  appSource,
  /function\s+airportHoverLabelHtml\(airport\)\s*{[\s\S]*?airport-hover-name-cn[\s\S]*?airport-hover-name-en[\s\S]*?airport-hover-code-line/,
  "airport hover label renders Chinese name, English name and airport codes as three lines"
);
assert.match(
  appSource,
  /nameCn\s*!==\s*"N\/A"[\s\S]*?nameEn\s*!==\s*"N\/A"[\s\S]*?\.filter\(Boolean\)\.join\(""\)/,
  "airport hover label hides missing lines instead of showing N/A rows"
);
assert.doesNotMatch(
  appSource,
  /airport-hover-label[\s\S]*?<em>IATA<\/em>|airport-hover-label[\s\S]*?<em>ICAO<\/em>/,
  "airport hover label does not render explanatory IATA/ICAO field labels"
);
assert.match(
  appSource,
  /function\s+handleAirportMarkerHover\(id\)\s*{[\s\S]*?airportHoverNeedsDetail\(airport\)[\s\S]*?loadAirportDetail\(airport\);/,
  "hovering an unselected airport can load detail data to complete the tooltip"
);
assert.match(
  appSource,
  /hoveredAirportId:\s*null/,
  "transient airport hover tooltip is controlled by a single active airport id"
);
assert.match(
  appSource,
  /function\s+selectedAirportPopupId\(\)\s*{[\s\S]*?state\.selectedKind\s*===\s*"airport"[\s\S]*?state\.selectedId/,
  "selected airport owns the persistent airport information tooltip"
);
assert.match(
  appSource,
  /function\s+activeAirportPopupIds\(fallbackId\s*=\s*state\.hoveredAirportId\)\s*{[\s\S]*?selectedAirportPopupId\(\),[\s\S]*?airportHoverId\(fallbackId\)[\s\S]*?new Set/,
  "selected airport tooltip can coexist with one transient airport hover tooltip"
);
assert.match(
  appSource,
  /function\s+airportPopupPlacement\(airport,\s*activeIds\s*=\s*activeAirportPopupIds\(\)\)\s*{[\s\S]*?selectedAirportPopupId\(\)[\s\S]*?airportPopupBoxForPlacement\(selected,\s*"bottom"\)[\s\S]*?airportPopupOverlapPenalty/,
  "airport hover tooltip placement avoids overlapping the selected airport tooltip"
);
assert.match(
  appSource,
  /function\s+airportPopupElementBox\(id\)\s*{[\s\S]*?querySelector\("\.airport-hover-label"\)[\s\S]*?getBoundingClientRect\(\)[\s\S]*?}/,
  "airport hover tooltip placement can use the actual rendered selected popup box"
);
assert.match(
  appSource,
  /function\s+preferredAirportPopupPlacements\(airport,\s*activeIds\s*=\s*activeAirportPopupIds\(\)\)\s*{[\s\S]*?currentId\s*!==\s*selectedId[\s\S]*?dx[\s\S]*?dy/,
  "airport hover tooltip placement prefers a side away from the selected airport"
);
assert.match(
  appSource,
  /function\s+applyAirportPopupPlacementVars\(element,\s*airport,\s*activeIds\s*=\s*activeAirportPopupIds\(\)\)\s*{[\s\S]*?--airport-popup-left[\s\S]*?--airport-popup-top[\s\S]*?--airport-popup-transform/,
  "airport tooltip placement writes CSS variables to each marker"
);
assert.match(
  appSource,
  /function\s+syncAirportHoverMarkers\(activeId\s*=\s*state\.hoveredAirportId\)\s*{[\s\S]*?const\s+activeIds\s*=\s*activeAirportPopupIds\(activeId\);[\s\S]*?const\s+currentHoverId\s*=\s*airportHoverId\(state\.hoveredAirportId\);[\s\S]*?const\s+markerAirportId\s*=\s*airportHoverId\(element\.dataset\.id\);[\s\S]*?const\s+currentHover\s*=\s*currentHoverId\s*===\s*markerAirportId;[\s\S]*?setAirportMarkerHoverClass\(element,\s*hovered,\s*hovered\s*&&\s*airportPopupCanShow\(airport\),\s*currentHover\)[\s\S]*?state\.map\?\.airportMarkers\s+instanceof\s+Map/,
  "airport hover sync clears non-active airport tooltip markers"
);
assert.match(
  appSource,
  /syncAirportHoverMarkers\(activeId\s*=\s*state\.hoveredAirportId\)\s*{[\s\S]*?applyAirportPopupPlacementVars\(element,\s*airport,\s*activeIds\);[\s\S]*?applyAirportPopupPlacementVars\(record\.content,\s*airport,\s*activeIds\);/,
  "airport hover sync updates popup placement for fallback and Google markers"
);
assert.match(
  appSource,
  /function\s+airportPopupCanShow\(airport\)\s*{[\s\S]*?return\s+!airportHoverNeedsDetail\(airport\)\s*\|\|\s*!dataService\?\.isEnabled\(\);/,
  "airport hover tooltip waits for complete detail data before rendering"
);
assert.match(
  appSource,
  /function\s+airportPopupIsReady\(id,\s*activeIds\s*=\s*activeAirportPopupIds\(\)\)\s*{[\s\S]*?activeIds\.has\(airportId\)[\s\S]*?airportPopupCanShow\(airportById\(airportId\)\)/,
  "airport hover tooltip readiness is separated from active marker stacking"
);
assert.match(
  appSource,
  /function\s+setAirportMarkerHoverClass\(element,\s*hovered,\s*popupReady\s*=\s*false,\s*currentHover\s*=\s*false\)\s*{[\s\S]*?classList\.toggle\("is-hovered",\s*hovered\);[\s\S]*?classList\.toggle\("is-popup-ready",\s*popupReady\);/,
  "airport marker can be active for stacking without showing an incomplete tooltip"
);
assert.match(
  appSource,
  /function\s+setAirportMarkerHoverClass\(element,\s*hovered,\s*popupReady\s*=\s*false,\s*currentHover\s*=\s*false\)\s*{[\s\S]*?classList\.toggle\("is-current-hover",\s*currentHover\);/,
  "airport marker separates the current pointer hover from the selected persistent popup"
);
assert.match(
  appSource,
  /function\s+desiredAirportLabelMode\(airport\)\s*{[\s\S]*?if\s*\(airportIsSelected\(airport\)\)\s*{[\s\S]*?return\s+"none";/,
  "selected airports do not render the old red code label"
);
assert.match(
  appSource,
  /function\s+beginAirportMarkerHover\(id,\s*event\)\s*{[\s\S]*?updateAirportHoverPointer\(event\);[\s\S]*?state\.hoveredAirportId\s*=\s*active;[\s\S]*?syncAirportHoverMarkers\(active\);[\s\S]*?handleAirportMarkerHover\(active\);/,
  "entering an airport marker replaces the previously active hover tooltip"
);
assert.match(
  appSource,
  /function\s+beginAirportMarkerHover\(id,\s*event\)\s*{[\s\S]*?clearAirportHoverCloseTimer\(\);[\s\S]*?const\s+selectedPopup\s*=\s*selectedAirportPopupId\(\);[\s\S]*?if\s*\(active\s*!==\s*selectedPopup\)\s*{[\s\S]*?state\.hoveredAirportId\s*=\s*active;[\s\S]*?syncAirportHoverMarkers\(\);[\s\S]*?handleAirportMarkerHover\(active\);/,
  "hovering the selected airport does not cancel the second airport transient tooltip"
);
assert.match(
  appSource,
  /function\s+pointerStillInsideAirportMarker\(id,\s*event\)\s*{[\s\S]*?state\.airportHoverPointer\s*\|\|\s*airportPointerFromEvent\(event\)[\s\S]*?pointInsideElementRect/,
  "airport hover delayed cleanup uses the latest pointer position instead of a stale leave event"
);
assert.match(
  appSource,
  /document\.addEventListener\("pointermove",\s*updateAirportHoverPointer,\s*{\s*passive:\s*true\s*}\);/,
  "airport hover pointer position is tracked globally during map interactions"
);
assert.match(
  appSource,
  /function\s+scheduleAirportHoverEnd\(id,\s*event\)\s*{[\s\S]*?setTimeout\([\s\S]*?pointerStillInsideAirportMarker\(active,\s*event\)[\s\S]*?state\.hoveredAirportId\s*=\s*null;[\s\S]*?AIRPORT_HOVER_CLEAR_DELAY_MS/,
  "leaving the active airport marker closes the transient tooltip only after a stable pointer check"
);
assert.match(
  appSource,
  /const\s+AIRPORT_POPUP_GAP_PX\s*=\s*14;/,
  "airport popup placement leaves a visible gap between adjacent airport tooltips"
);
assert.match(
  appSource,
  /const\s+AIRPORT_MARKER_BASE_Z_INDEX\s*=\s*300;/,
  "airport markers stay in the airport marker layer"
);
assert.match(
  appSource,
  /const\s+AIRPORT_MARKER_HOVER_Z_INDEX\s*=\s*350;/,
  "airport hover marker stacking has a dedicated z-index below aircraft markers"
);
assert.match(
  appSource,
  /const\s+AIRPORT_MARKER_SELECTED_POPUP_Z_INDEX\s*=\s*345;/,
  "selected airport persistent popup has a lower z-index than the current pointer hover"
);
assert.match(
  appSource,
  /function\s+airportMarkerZIndex\(airport,\s*options\s*=\s*{}\)\s*{[\s\S]*?options\.currentHover\s*===\s*true[\s\S]*?AIRPORT_MARKER_HOVER_Z_INDEX[\s\S]*?options\.hovered\s*===\s*true[\s\S]*?AIRPORT_MARKER_SELECTED_POPUP_Z_INDEX/,
  "airport marker z-index keeps the current pointer hover above the selected airport popup"
);
assert.match(
  appSource,
  /content\.addEventListener\("mouseenter",\s*\(event\)\s*=>\s*beginAirportMarkerHover\(content\.dataset\.id,\s*event\)\);[\s\S]*?content\.addEventListener\("mousemove",\s*updateAirportHoverPointer\);[\s\S]*?content\.addEventListener\("mouseleave",\s*\(event\)\s*=>\s*endAirportMarkerHover\(content\.dataset\.id,\s*event\)\);/,
  "Google airport markers use delayed hover cleanup on pointer leave"
);
assert.match(
  appSource,
  /applyGoogleAirportMarkerStacking\(record\.marker,\s*airport,\s*{[\s\S]*?hovered:\s*airportHoverIsActive\(airport\.id\),[\s\S]*?currentHover:\s*airportHoverId\(state\.hoveredAirportId\)\s*===\s*airportHoverId\(airport\.id\)[\s\S]*?}\);/,
  "Google airport marker refresh preserves active and current-hover stacking"
);
assert.match(
  appSource,
  /function\s+selectAirport\(id,\s*shouldPan\s*=\s*true\)\s*{[\s\S]*?state\.selectedKind\s*=\s*"airport";[\s\S]*?state\.selectedId\s*=\s*id;[\s\S]*?state\.hoveredAirportId\s*=\s*null;[\s\S]*?syncAirportHoverMarkers\(id\);/,
  "selecting an airport pins its information tooltip immediately"
);
assert.match(
  appSource,
  /button\.addEventListener\("mouseenter",\s*\(event\)\s*=>\s*beginAirportMarkerHover\(button\.dataset\.id,\s*event\)\);[\s\S]*?button\.addEventListener\("mousemove",\s*updateAirportHoverPointer\);[\s\S]*?button\.addEventListener\("mouseleave",\s*\(event\)\s*=>\s*endAirportMarkerHover\(button\.dataset\.id,\s*event\)\);/,
  "fallback airport markers request detail data and use delayed cleanup on hover"
);
assert.match(
  appSource,
  /function\s+beginAirportMarkerHover\(id,\s*event\)\s*{[\s\S]*?handleAirportMarkerHover\(active\);/,
  "Google airport markers request detail data on hover"
);
assert.match(
  appSource,
  /content\.querySelector\("\.airport-hover-label"\)\.innerHTML\s*=\s*airportHoverLabelHtml\(airport\);/,
  "Google airport markers use the structured hover label"
);
assert.match(
  appSource,
  /const\s+popupReady\s*=\s*airportPopupIsReady\(airport\.id,\s*activeIds\);[\s\S]*?const\s+currentHover\s*=\s*airportHoverId\(state\.hoveredAirportId\)\s*===\s*airportHoverId\(airport\.id\);[\s\S]*?setAirportMarkerHoverClass\(content,\s*hovered,\s*popupReady,\s*currentHover\);/,
  "Google airport markers only expose the tooltip class after detail data is ready"
);
assert.match(
  appSource,
  /<span class="airport-hover-label">\$\{airportHoverLabelHtml\(airport\)\}<\/span>/,
  "fallback airport markers use the structured hover label"
);
assert.match(
  appSource,
  /const\s+popupReadyClass\s*=\s*airportPopupIsReady\(airport\.id,\s*activeIds\)\s*\?\s*" is-popup-ready"\s*:\s*"";[\s\S]*?const\s+currentHoverClass\s*=\s*currentHover\s*\?\s*" is-current-hover"\s*:\s*"";[\s\S]*?class="\$\{airportMarkerClass\(airport,\s*metrics\)\}\$\{hoveredClass\}\$\{popupReadyClass\}\$\{currentHoverClass\}"/,
  "fallback airport markers only expose the tooltip class after detail data is ready"
);
assert.doesNotMatch(
  appSource.match(/createAirportMarker\(airport\)\s*{[\s\S]*?updateAirportContent\(content,\s*airport\)\s*{/)?.[0] || "",
  /title:\s*`\$\{airport\.id\}|setAttribute\("title"/,
  "Google airport markers do not show a duplicate native title tooltip"
);
assert.doesNotMatch(
  appSource.match(/function\s+renderAirports\(\)\s*{[\s\S]*?airportLayer\.querySelectorAll/)?.[0] || "",
  /\stitle="\$\{escapeHtml\(airportFullLabel\(airport\)\)\}"/,
  "fallback airport markers do not show a duplicate native title tooltip"
);
assert.match(
  stylesSource,
  /\.airport-hover-label\s*{[\s\S]*?display:\s*grid;[\s\S]*?max-width:\s*min\(360px,\s*calc\(100vw - 32px\)\);[\s\S]*?white-space:\s*normal;/,
  "airport hover label allows complete multi-line display"
);
assert.match(
  stylesSource,
  /\.airport-hover-label\s*{[\s\S]*?top:\s*var\(--airport-popup-top,[\s\S]*?left:\s*var\(--airport-popup-left,[\s\S]*?transform:\s*var\(--airport-popup-transform,/,
  "airport hover label uses computed placement variables"
);
assert.match(
  stylesSource,
  /\.airport-hover-label\s*{[\s\S]*?pointer-events:\s*none;/,
  "airport hover label never steals marker hover and cannot flicker from pointer capture"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-hovered\s*{[\s\S]*?z-index:\s*350;[\s\S]*?\.airport-pin:hover:not\(\.is-selected\),\s*\.airport-pin\.is-current-hover\s*{[\s\S]*?z-index:\s*350;/,
  "airport hover stays within the airport layer instead of rising above aircraft markers"
);
assert.doesNotMatch(
  stylesSource,
  /\.airport-pin:hover\s+\.airport-hover-label|\.airport-pin:hover\s+[^{}]*\.airport-hover-label|\.airport-pin:hover\s+\.airport-code-label|\.airport-pin:hover\s+[^{}]*\.airport-code-label/,
  "airport tooltip visibility is not controlled by CSS :hover, so only one tooltip can be active"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-hovered\.is-popup-ready\s+\.airport-hover-label\s*{[\s\S]*?opacity:\s*1;[\s\S]*?visibility:\s*visible;/,
  "airport hover tooltip is hidden until the ready class is present"
);
assert.doesNotMatch(
  stylesSource,
  /\.airport-pin\.is-hovered\s+\.airport-hover-label\s*{[\s\S]*?opacity:\s*1;[\s\S]*?visibility:\s*visible;/,
  "airport hover active state alone does not show incomplete tooltip content"
);
assert.match(
  stylesSource,
  /\.airport-hover-name-cn,[\s\S]*?\.airport-hover-name-en,[\s\S]*?\.airport-hover-code-line\s*{[\s\S]*?overflow-wrap:\s*anywhere;/,
  "airport hover names wrap instead of truncating long names"
);
assert.match(
  stylesSource,
  /\.airport-hover-code-line\s*{[\s\S]*?font-family:\s*"SFMono-Regular"/,
  "airport hover code line is styled as a compact code row"
);
assert.doesNotMatch(stylesSource, /airport-hover-codes/, "old IATA/ICAO code card styles are removed");
assert.match(
  stylesSource,
  /\.airport-pin\.is-selected\.is-hovered\.is-popup-ready\s+\.airport-hover-label\s*{[\s\S]*?opacity:\s*1;[\s\S]*?visibility:\s*visible;/,
  "selected airport hover also shows the complete label"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-selected\s+\.airport-code-label\s*{[\s\S]*?opacity:\s*0;[\s\S]*?visibility:\s*hidden;/,
  "selected airport red code label is hidden in favor of the information tooltip"
);

console.log("airport hover label: ok");
