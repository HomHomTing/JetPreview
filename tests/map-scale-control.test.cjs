const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
const indexSource = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

assert.match(
  indexSource,
  /<section class="map-scale-control" id="mapScaleControl" aria-label="Map scale">[\s\S]*id="mapScaleValue"[\s\S]*<i aria-hidden="true"><\/i>[\s\S]*<\/section>/,
  "map scale control is rendered as a dedicated bottom-right map overlay"
);

assert.match(
  appSource,
  /function\s+formatMapScaleDistance\(scaleKm\)[\s\S]*value\s*<\s*1[\s\S]*Math\.round\(value\s*\*\s*1000\)[\s\S]*return\s+`\$\{formatNumber\(Math\.round\(value\)\)\} km`;/,
  "map scale label switches between meters and kilometers"
);

assert.match(
  appSource,
  /function\s+updateMapScaleControl\(\)[\s\S]*document\.getElementById\("mapScaleControl"\)[\s\S]*effectiveScaleKm\(\)[\s\S]*formatMapScaleDistance\(scaleKm\)/,
  "map scale control derives its value from the current effective map scale"
);

assert.match(
  appSource,
  /function\s+renderViewport\(\)[\s\S]*updateRouteLegend\(\);[\s\S]*updateMapScaleControl\(\);[\s\S]*updateRail\(\);/,
  "map scale refreshes with the normal viewport render"
);

assert.match(
  appSource,
  /function\s+renderViewportLightDuringInteraction\(\)[\s\S]*updateRouteLegend\(\);[\s\S]*updateMapScaleControl\(\);/,
  "map scale refreshes during drag and zoom visual updates"
);

assert.match(
  appSource,
  /class\s+LeafletMapEngine[\s\S]*constructor\(\)[\s\S]*addLocalBasemap\(\);[\s\S]*}\s*ready\(\)/,
  "Leaflet fallback does not add a second native scale control"
);

assert.doesNotMatch(
  appSource,
  /L\.control\.scale/,
  "map scale is not duplicated by Leaflet native controls"
);

assert.match(
  stylesSource,
  /\.map-scale-control\s*{[\s\S]*position:\s*absolute;[\s\S]*right:\s*18px;[\s\S]*bottom:\s*22px;[\s\S]*pointer-events:\s*none;/,
  "map scale is positioned independently in the bottom-right corner"
);

assert.match(
  stylesSource,
  /\.map-scale-control\s+i\s*{[\s\S]*width:\s*100px;[\s\S]*border-bottom:\s*2px solid/,
  "map scale uses a fixed 100px ruler that matches effectiveScaleKm"
);

console.log("map scale control: ok");
