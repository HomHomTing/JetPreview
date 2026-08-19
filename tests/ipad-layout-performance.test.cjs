const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const styleSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

assert.match(
  appSource,
  /const\s+responsivePerformanceConfig\s*=\s*{[\s\S]*tabletLandscapePanelWidthPx[\s\S]*tabletPortraitDrawerMidDvh[\s\S]*tabletInteractionRenderFps/,
  "iPad performance knobs are configurable without changing desktop defaults"
);

assert.match(
  appSource,
  /function\s+resolveLayoutProfile\(\)\s*{[\s\S]*pointer:\s*coarse[\s\S]*hover:\s*none[\s\S]*tablet-portrait[\s\S]*tablet-landscape[\s\S]*desktop-compact[\s\S]*desktop/,
  "runtime layout profile uses pointer and orientation instead of width-only rules"
);

assert.match(
  appSource,
  /function\s+airportHoverInteractionsEnabled\(\)\s*{[\s\S]*return\s+!touchFirstLayoutProfile\(\);[\s\S]*}/,
  "touch-first layouts disable automatic airport hover popups"
);

assert.match(
  appSource,
  /function\s+airportPopupCanShow\(airport\)\s*{[\s\S]*!airportHoverInteractionsEnabled\(\)[\s\S]*return\s+false;/,
  "airport popup readiness is blocked on iPad and mobile touch profiles"
);

assert.match(
  appSource,
  /function\s+bindMapViewportEvents\(\)\s*{[\s\S]*setMapInteractionPhase\("idle"\);[\s\S]*setMapInteractionPhase\("active"\);[\s\S]*onVisualChange:\s*\(\)\s*=>\s*{[\s\S]*renderViewportForMapVisualChange\(\);/,
  "map active and idle phases route tablet visual changes through a light render path"
);

assert.match(
  appSource,
  /function\s+renderViewportLightDuringInteraction\(\)\s*{[\s\S]*renderAircraft\(\);[\s\S]*syncSelectedRouteVisuals\(\);[\s\S]*updateRouteLegend\(\);[\s\S]*}/,
  "tablet interaction rendering keeps aircraft and selected route responsive"
);

assert.doesNotMatch(
  appSource.match(/function\s+renderViewportLightDuringInteraction\(\)\s*{[\s\S]*?}/)?.[0] || "",
  /renderAirports\(\)|updateRail\(\)/,
  "tablet interaction rendering skips airport and rail work until map idle"
);

assert.match(
  appSource,
  /async\s+function\s+refreshAirportData\(reason\s*=\s*"timer"\)\s*{[\s\S]*tabletLayoutProfile\(\)\s*&&\s*state\.isInteractingWithMap\s*&&\s*reason\s*===\s*"timer"[\s\S]*scheduleNextAirportRefresh\(\);/,
  "iPad map gestures pause airport timer refreshes"
);

assert.match(
  appSource,
  /function\s+syncSelectionDomState\(\)\s*{[\s\S]*shell\.classList\.toggle\("detail-open",\s*hasDetail\);[\s\S]*panel\.dataset\.drawerState\s*=\s*state\.layoutProfile\s*===\s*"tablet-portrait"[\s\S]*\?\s*"mid"\s*:\s*"";/,
  "detail-open and tablet drawer state are synced for responsive panel styling"
);

assert.match(
  appSource,
  /window\.BIZJET_RESPONSIVE_LAYOUT_STANDARD\s*=\s*Object\.freeze\({[\s\S]*version:\s*"1\.20"[\s\S]*currentProfile\(\)[\s\S]*currentInteractionPhase\(\)/,
  "responsive layout standard is exposed for browser verification"
);

assert.match(
  styleSource,
  /@media\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)\s*and\s*\(min-width:\s*900px\)\s*and\s*\(max-width:\s*1366px\)\s*and\s*\(orientation:\s*landscape\)[\s\S]*layout-tablet-landscape[\s\S]*width:\s*min\(var\(--tablet-panel-width,\s*360px\),\s*var\(--tablet-panel-max-vw,\s*42vw\)\)/,
  "iPad landscape uses a light left panel sized to preserve map width"
);

assert.match(
  styleSource,
  /@media\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)\s*and\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*1024px\)\s*and\s*\(orientation:\s*portrait\)[\s\S]*layout-tablet-portrait[\s\S]*height:\s*min\(var\(--tablet-drawer-mid-height,\s*56dvh\),\s*calc\(100dvh\s*-\s*96px\)\)/,
  "iPad portrait uses the documented bottom drawer height"
);

assert.match(
  styleSource,
  /layout-tablet-portrait[\s\S]*\.detail-scroll-body\s*{[\s\S]*overscroll-behavior:\s*contain;[\s\S]*-webkit-overflow-scrolling:\s*touch;[\s\S]*touch-action:\s*pan-y;/,
  "iPad panel content is the only momentum scroll body"
);

assert.match(
  styleSource,
  /layout-tablet-portrait\s+\.map,[\s\S]*\.gm-style,[\s\S]*\.leaflet-container\s*{[\s\S]*touch-action:\s*pan-x\s+pan-y\s+pinch-zoom\s*!important;/,
  "iPad map containers keep drag and pinch gestures"
);

assert.match(
  styleSource,
  /\.fr-shell\.map-interaction-active\.layout-tablet-landscape\s+\.airport-code-label,[\s\S]*\.fr-shell\.map-interaction-active\.layout-tablet-portrait\s+\.airport-code-label\s*{[\s\S]*visibility:\s*hidden;/,
  "airport labels are suppressed during iPad map gestures"
);

assert.match(
  styleSource,
  /\.selected-panel-v114\s*{[\s\S]*top:\s*16px;[\s\S]*bottom:\s*18px;[\s\S]*width:\s*var\(--panel-width\);/,
  "base desktop selected panel placement is still unchanged"
);
