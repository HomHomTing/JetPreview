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
  /const\s+left\s*=\s*point\.x\s*-\s*metrics\.hitSize\s*\/\s*2\s*\+\s*metrics\.labelLeft;/,
  "label collision estimates use the same dynamic hit geometry as the marker"
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
