const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const indexSource = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

assert.match(
  indexSource,
  /data-aircraft-segment="airframe"[^>]*>信息<\/button>/,
  "airframe tab is labeled as 信息"
);
assert.match(
  indexSource,
  /data-aircraft-segment="journey"[^>]*>行程<\/button>/,
  "journey tab is present as a standalone aircraft segment"
);
assert.doesNotMatch(indexSource, /data-aircraft-segment="data"/, "data tab button is removed");
assert.doesNotMatch(indexSource, /data-aircraft-panel="data"/, "data panel is removed");
assert.doesNotMatch(indexSource, />机务<\/button>/, "old 机务 tab label is removed");

const infoTabIndex = indexSource.indexOf('data-aircraft-segment="airframe"');
const journeyTabIndex = indexSource.indexOf('data-aircraft-segment="journey"');
const trackPanelIndex = indexSource.indexOf('data-aircraft-panel="track"');
const infoPanelIndex = indexSource.indexOf('data-aircraft-panel="airframe"');
const journeyPanelIndex = indexSource.indexOf('data-aircraft-panel="journey"');
const aircraftInfoHeadingIndex = indexSource.indexOf("<h2>飞机信息</h2>");
const journeyHeadingIndex = indexSource.indexOf("<h2>行程</h2>");
const recentFlightsIndex = indexSource.indexOf('id="recentFlightsList"');

assert.ok(infoTabIndex > -1 && journeyTabIndex > infoTabIndex, "journey tab is placed immediately to the right of information in the tab order");
assert.ok(trackPanelIndex > -1, "track panel still exists");
assert.ok(infoPanelIndex > -1, "information panel still exists");
assert.ok(journeyPanelIndex > infoPanelIndex, "journey panel is placed after the information panel");
assert.ok(journeyHeadingIndex > journeyPanelIndex, "recent flights block is headed by standalone 行程 panel");
assert.ok(recentFlightsIndex > journeyHeadingIndex, "recent flights list is rendered under 行程");
assert.ok(aircraftInfoHeadingIndex > infoPanelIndex && aircraftInfoHeadingIndex < journeyPanelIndex, "aircraft information remains inside the information panel only");
assert.ok(trackPanelIndex < infoPanelIndex && recentFlightsIndex > infoPanelIndex, "recent flights list moved out of the track panel");
assert.doesNotMatch(
  indexSource.slice(infoPanelIndex, journeyPanelIndex),
  /id="recentFlightsList"|<h2>行程<\/h2>/,
  "journey content is not embedded inside the information tab"
);

assert.match(
  appSource,
  /const\s+aircraftDetailSegments\s*=\s*\["overview",\s*"track",\s*"airframe",\s*"journey"\];/,
  "aircraft segment whitelist includes the standalone journey tab"
);
assert.doesNotMatch(stylesSource, /aircraft-info-layout/, "information panel no longer uses the old two-column journey layout");
assert.doesNotMatch(stylesSource, /\.selected-panel-v114\s+\.aircraft-journey-section\s*{[\s\S]*?border-left:/, "journey tab does not retain the embedded right-column border");

console.log("aircraft detail tabs: ok");
