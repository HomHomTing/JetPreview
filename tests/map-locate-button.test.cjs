const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
const indexSource = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

assert.match(
  indexSource,
  /<button class="locate-button" id="locateButton" type="button"/,
  "map locate button is present in the map controls"
);

assert.match(
  appSource,
  /function\s+fallbackUserLocationCenter\(\)\s*{[\s\S]*state\?\.userLocationCenter[\s\S]*defaultMapCenter\(\);[\s\S]*}/,
  "locate fallback reuses the last known user center before falling back to the configured map center"
);

assert.match(
  appSource,
  /async\s+function\s+setMapToUserLocation\(trigger\s*=\s*document\.getElementById\("locateButton"\)\)[\s\S]*setLocateButtonState\(button,\s*"locating"\);[\s\S]*const\s+center\s*=\s*await\s+getUserLocationCenter\(10000\);[\s\S]*const\s+targetCenter\s*=\s*center\s*\|\|\s*fallbackUserLocationCenter\(\);[\s\S]*state\.map\.setView\(targetCenter,\s*defaultZoom\(\)\);[\s\S]*setLocateButtonState\(button,\s*center\s*\?\s*"success"\s*:\s*"fallback"\);/,
  "locate click always moves the map to a resolved center and reports success or fallback state"
);

assert.match(
  appSource,
  /document\.getElementById\("locateButton"\)\.addEventListener\("click",\s*async\s*\(event\)\s*=>\s*{[\s\S]*setMapToUserLocation\(event\.currentTarget\);/,
  "locate button passes the clicked control into the locate flow for visual feedback"
);

assert.match(
  stylesSource,
  /\.locate-button\.is-locating\s*{[\s\S]*animation:\s*locate-button-pulse[\s\S]*\.locate-button\.location-fallback\s*{[\s\S]*color:\s*#f6bd16;/,
  "locate button exposes visible locating and fallback states"
);

console.log("map locate button: ok");
