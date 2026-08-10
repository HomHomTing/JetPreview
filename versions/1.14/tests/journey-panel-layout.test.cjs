const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function readProjectFile(filename) {
  return fs.readFileSync(path.join(rootDir, filename), "utf8");
}

const indexSource = readProjectFile("index.html");
const appSource = readProjectFile("app.js");
const stylesSource = readProjectFile("styles.css");

const progressIndex = indexSource.indexOf('class="journey-progress-card"');
const metricIndex = indexSource.indexOf('class="journey-distance-metric"');
const totalDurationIndex = indexSource.indexOf('id="flightTotalDurationRow"');
const distanceIndex = indexSource.indexOf('id="flightDistance"');

assert.ok(progressIndex > -1, "journey panel includes the flight progress card");
assert.ok(metricIndex > -1, "journey panel includes the distance metric group");
assert.ok(totalDurationIndex > -1, "journey panel includes total duration in the metric group");
assert.ok(progressIndex < metricIndex, "flight progress card is above the distance metric group");
assert.ok(totalDurationIndex < distanceIndex, "total duration appears above flown distance");
assert.match(
  appSource,
  /const\s+plannedDurationMs\s*=\s*departedAt\s*&&\s*arrivalAt\s*&&\s*arrivalAt\s*>\s*departedAt\s*\?\s*arrivalAt\s*-\s*departedAt\s*:\s*null;/,
  "total duration is computed from departure and estimated arrival first"
);
assert.match(
  appSource,
  /setText\("flightTotalDuration",\s*formatDuration\(journey\.totalDurationMs\)\);/,
  "flight total duration value is rendered into the panel"
);
assert.match(
  appSource,
  /totalDurationRow\.hidden\s*=\s*arrDisplay\.missing;/,
  "flight total duration is hidden when destination is unknown"
);
assert.ok(
  ["UNKNOWN DESTINATION", "IATA", "ICAO"].every((token) => appSource.includes(`"${token}"`)),
  "airport placeholder codes and unknown destination labels are treated as missing"
);
assert.match(
  appSource,
  /\^\(目的地\|到达机场\|机场\)\?\(未知\|待确认\|待定\|未确认\)\$/,
  "Chinese unknown-destination placeholders are treated as missing"
);
assert.match(
  appSource,
  /\["routeToIcao",\s*"routeToNameCn",\s*"routeToNameEn",\s*"routeToTimezone"\]\.forEach\(\(id\)\s*=>\s*{[\s\S]*?element\.hidden\s*=\s*arrDisplay\.missing;/,
  "destination secondary airport fields are explicitly hidden when destination is unknown"
);
assert.match(
  appSource,
  /arrivalTimeZoneElement\.hidden\s*=\s*arrDisplay\.missing;[\s\S]*?arrivalTimeZoneElement\.textContent\s*=\s*arrDisplay\.missing\s*\?\s*""\s*:\s*displayOrDash\(estimatedArrivalHighlight\.zone\);/,
  "estimated arrival UTC field is hidden when destination is unknown"
);
assert.match(
  appSource,
  /const\s+progressPercent\s*=\s*arrDisplay\.missing\s*\?\s*100\s*:\s*Math\.max\(0,\s*Math\.min\(100,\s*journey\.progressPercent\)\);/,
  "unknown destination moves the progress aircraft marker to the far right"
);
assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.journey-distance-metric\s+div\[hidden\]\s*{[\s\S]*?display:\s*none;/,
  "hidden total duration row stays visually hidden inside the metric group"
);
assert.ok(
  !stylesSource.includes(".route-airport-missing .route-card-label {\n  display: none;"),
  "unknown destination cards keep the route label visible"
);
assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.route-airport-missing\s*{[\s\S]*?grid-template-rows:\s*auto minmax\(0,\s*1fr\);[\s\S]*?align-content:\s*stretch;/,
  "unknown destination cards reserve centered body space for N/A"
);
assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.route-airport-missing\s+\.route-code-row\s*{[\s\S]*?align-self:\s*stretch;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center !important;/,
  "unknown destination N/A is vertically and horizontally centered in the card body"
);

console.log("journey panel layout: ok");
