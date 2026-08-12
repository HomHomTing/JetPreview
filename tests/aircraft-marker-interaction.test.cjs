const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function readProjectFile(filename) {
  return fs.readFileSync(path.join(rootDir, filename), "utf8");
}

const appSource = readProjectFile("app.js");
const stylesSource = readProjectFile("styles.css");

const markerBlock = stylesSource.match(/(?:^|\n)\.aircraft-marker\s*{[\s\S]*?}\n/)?.[0] || "";
const shellBlock = stylesSource.match(/(?:^|\n)\.aircraft-marker-shell\s*{[\s\S]*?}\n/)?.[0] || "";
const iconBlock = stylesSource.match(/(?:^|\n)\.aircraft-icon\s*{[\s\S]*?}\n/)?.[0] || "";
const labelBlock = stylesSource.match(/(?:^|\n)\.aircraft-label\s*{[\s\S]*?}\n/)?.[0] || "";

assert.match(
  markerBlock,
  /width:\s*var\(--aircraft-hit-size,\s*36px\);[\s\S]*height:\s*var\(--aircraft-hit-size,\s*36px\);/,
  "aircraft marker hit area follows the dynamic icon hit size"
);
assert.equal(
  markerBlock.includes("132px"),
  false,
  "aircraft marker no longer uses the legacy wide label-sized hit box"
);
assert.match(
  labelBlock,
  /pointer-events:\s*none;/,
  "aircraft labels do not capture aircraft selection clicks"
);
assert.match(
  markerBlock,
  /isolation:\s*isolate;/,
  "aircraft marker creates a local stacking context"
);
assert.match(
  markerBlock,
  /z-index:\s*1000;/,
  "HTML fallback aircraft markers render above airport markers by default"
);
assert.match(
  stylesSource,
  /\.aircraft-marker\.is-selected\s*{[\s\S]*?z-index:\s*1120;/,
  "selected aircraft markers keep the highest aircraft marker layer"
);
assert.match(
  stylesSource,
  /\.airport-pin\.is-selected\.is-hovered\s*{[\s\S]*?z-index:\s*345;/,
  "airport hover popups stay below the aircraft marker layer"
);
assert.match(
  appSource,
  /const\s+AIRPORT_MARKER_SELECTED_POPUP_Z_INDEX\s*=\s*345;[\s\S]*?const\s+AIRCRAFT_MARKER_BASE_Z_INDEX\s*=\s*1000;[\s\S]*?const\s+AIRCRAFT_MARKER_SELECTED_Z_INDEX\s*=\s*1120;/,
  "Google marker z-index constants keep all aircraft markers above airport markers"
);
assert.match(
  appSource,
  /function\s+aircraftMarkerZIndex\(jet\)\s*{[\s\S]*?return\s+AIRCRAFT_MARKER_BASE_Z_INDEX/,
  "Google aircraft markers use the shared aircraft marker z-index helper"
);
assert.match(
  appSource,
  /zIndex:\s*aircraftMarkerZIndex\(jet\),[\s\S]*?record\.marker\.zIndex\s*=\s*aircraftMarkerZIndex\(jet\);/,
  "new and updated Google aircraft markers use the aircraft layer z-index helper"
);
assert.match(
  iconBlock,
  /z-index:\s*1;/,
  "aircraft icon stays below the registration label inside the marker"
);
assert.match(
  shellBlock,
  /position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*1;/,
  "aircraft icon shell is pinned below the registration label"
);
assert.match(
  labelBlock,
  /z-index:\s*30;/,
  "aircraft registration label is stacked above the aircraft icon"
);
assert.match(
  labelBlock,
  /bottom:\s*var\(--aircraft-label-bottom,\s*36px\);/,
  "aircraft registration label sits above the aircraft icon"
);
assert.match(
  labelBlock,
  /left:\s*50%;[\s\S]*?transform:\s*translateX\(-50%\)\s*translateZ\(0\);/,
  "aircraft registration label is centered above the marker"
);
assert.match(
  labelBlock,
  /border:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.24\);/,
  "aircraft registration label uses a compact outlined pill style"
);
assert.match(
  appSource,
  /anchorLeft:\s*`-\$\{metrics\.hitSize\s*\/\s*2}px`[\s\S]*anchorTop:\s*`-\$\{metrics\.hitSize\s*\/\s*2}px`/,
  "Google AdvancedMarker aircraft anchors are centered on the dynamic hit size"
);
assert.match(
  appSource,
  /record\.marker\.anchorLeft\s*=\s*`-\$\{metrics\.hitSize\s*\/\s*2}px`[\s\S]*record\.marker\.anchorTop\s*=\s*`-\$\{metrics\.hitSize\s*\/\s*2}px`/,
  "updated Google aircraft markers keep anchors aligned after size changes"
);
assert.match(
  appSource,
  /const\s+left\s*=\s*point\.x\s*-\s*width\s*\/\s*2;[\s\S]*?const\s+bottom\s*=\s*point\.y\s*-\s*metrics\.visualSize\s*\/\s*2\s*-\s*metrics\.labelGap;[\s\S]*?const\s+top\s*=\s*bottom\s*-\s*height;/,
  "label collision estimates keep the registration label above the aircraft icon"
);
assert.match(
  appSource,
  /labelBottom:\s*Math\.round\(\(\(hitSize\s*\+\s*visualSize\)\s*\/\s*2\s*\+\s*labelGap\)\s*\*\s*10\)\s*\/\s*10,/,
  "marker metrics precompute the label bottom offset for browser-safe CSS positioning"
);
assert.match(
  appSource,
  /function\s+aircraftMapLabelText\(jet\)\s*{[\s\S]*?if\s*\(aircraftIsInTransit\(jet\)\)\s*{[\s\S]*?return\s+registration;/,
  "in-transit aircraft map labels use registration"
);
assert.match(
  appSource,
  /label\.textContent\s*=\s*aircraftMapLabelText\(jet\);/,
  "Google aircraft marker labels render the shared map label text"
);
assert.match(
  appSource,
  /const\s+labelText\s*=\s*aircraftMapLabelText\(jet\);[\s\S]*?<span class="aircraft-label">\$\{escapeHtml\(labelText\)\}<\/span>/,
  "HTML aircraft marker labels render the shared map label text"
);
assert.match(
  appSource,
  /const\s+text\s*=\s*aircraftMapLabelText\(jet\);[\s\S]*?String\(text\)\.length\s*\*\s*7\.2/,
  "label collision estimates measure the registration-based map label"
);
assert.equal(
  stylesSource.includes(".aircraft-marker.is-aging .aircraft-icon,\n.aircraft-marker.is-aging .aircraft-label"),
  false,
  "aging aircraft do not make the aircraft body transparent"
);
assert.equal(
  stylesSource.includes(".aircraft-marker.is-stale .aircraft-icon,\n.aircraft-marker.is-stale .aircraft-label"),
  false,
  "stale aircraft do not make the aircraft body transparent"
);
assert.equal(
  stylesSource.includes(".aircraft-marker.is-expired .aircraft-icon,\n.aircraft-marker.is-expired .aircraft-label"),
  false,
  "expired aircraft do not make the aircraft body transparent"
);

console.log("aircraft marker interaction: ok");
