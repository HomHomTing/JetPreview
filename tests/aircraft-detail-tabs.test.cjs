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
const statusToolsIndex = indexSource.indexOf('class="aircraft-status-tools"');
const followButtonIndex = indexSource.indexOf('id="followAircraftButton"');
const routeFocusButtonIndex = indexSource.indexOf('id="routeFocusButton"');
const aircraftIdentIndex = indexSource.indexOf('class="aircraft-ident-grid"');
const aircraftBottomBarIndex = indexSource.indexOf('class="detail-bottom-bar"');
const aircraftBottomSegmentsIndex = indexSource.indexOf('data-aircraft-segment="overview"');
const aircraftScrollBodyIndex = indexSource.indexOf('<div class="detail-scroll-body">');
const aircraftMetaTypeIndex = indexSource.indexOf('class="aircraft-meta-block aircraft-meta-block-type"');
const aircraftMetaOperatorIndex = indexSource.indexOf('class="aircraft-meta-block aircraft-meta-block-operator"');

assert.ok(infoTabIndex > -1 && journeyTabIndex > infoTabIndex, "journey tab is placed immediately to the right of information in the tab order");
assert.ok(trackPanelIndex > -1, "track panel still exists");
assert.ok(infoPanelIndex > -1, "information panel still exists");
assert.ok(journeyPanelIndex > infoPanelIndex, "journey panel is placed after the information panel");
assert.ok(journeyHeadingIndex > journeyPanelIndex, "recent flights block is headed by standalone 行程 panel");
assert.ok(recentFlightsIndex > journeyHeadingIndex, "recent flights list is rendered under 行程");
assert.ok(aircraftInfoHeadingIndex > infoPanelIndex && aircraftInfoHeadingIndex < journeyPanelIndex, "aircraft information remains inside the information panel only");
assert.ok(trackPanelIndex < infoPanelIndex && recentFlightsIndex > infoPanelIndex, "recent flights list moved out of the track panel");
assert.ok(statusToolsIndex > -1 && statusToolsIndex < aircraftIdentIndex, "follow and route mode controls are placed beside the aircraft status row");
assert.ok(followButtonIndex > statusToolsIndex && routeFocusButtonIndex > followButtonIndex, "follow and route buttons are grouped in status tools");
assert.match(indexSource, /<symbol id="icon-follow-aircraft"[\s\S]*?<symbol id="icon-route"/, "follow and route status tools have dedicated icons");
assert.match(indexSource, /id="followAircraftButton"[\s\S]*<svg aria-hidden="true"><use href="#icon-follow-aircraft"><\/use><\/svg>[\s\S]*<span>跟随<\/span>/, "follow action renders an icon before the Chinese label");
assert.match(indexSource, /id="routeFocusButton"[\s\S]*<svg aria-hidden="true"><use href="#icon-route"><\/use><\/svg>[\s\S]*<span>航线<\/span>/, "route action renders an icon before the Chinese label");
assert.doesNotMatch(indexSource, /<small>\s*(?:FOLLOW|ROUTE)\s*<\/small>/, "follow and route actions do not show English sublabels");
assert.ok(aircraftBottomBarIndex > recentFlightsIndex, "aircraft segment navigation is moved to the bottom bar");
assert.ok(aircraftBottomSegmentsIndex > aircraftBottomBarIndex && aircraftBottomSegmentsIndex > aircraftScrollBodyIndex, "aircraft tabs render below the scrollable content");
assert.ok(aircraftMetaTypeIndex > -1 && aircraftMetaOperatorIndex > aircraftMetaTypeIndex, "aircraft type and operator are consolidated into one compact meta row");
assert.doesNotMatch(
  indexSource.slice(infoPanelIndex, journeyPanelIndex),
  /id="recentFlightsList"|<h2>行程<\/h2>/,
  "journey content is not embedded inside the information tab"
);
assert.doesNotMatch(indexSource, /id="shareAircraftButton"|id="moreAircraftButton"|id="aircraftMoreMenu"|class="aircraft-utility-tools"/, "share and more aircraft utility entries are removed from the bottom bar");
assert.doesNotMatch(appSource, /showAircraftMoreMenu|renderAircraftMoreMenu|copyPanelText|moreAircraftButton|aircraftMoreMenu/, "share and more aircraft menu logic is removed from aircraft interactions");
assert.doesNotMatch(stylesSource, /aircraft-more-menu|\.more-row/, "share and more aircraft menu styling is removed");

assert.match(
  appSource,
  /const\s+aircraftDetailSegments\s*=\s*\["overview",\s*"track",\s*"airframe",\s*"journey"\];/,
  "aircraft segment whitelist includes the standalone journey tab"
);
assert.match(appSource, /function\s+setAircraftMapMode\(mode\)\s*{[\s\S]*?if\s*\(mode\s*===\s*"route"\)\s*{[\s\S]*?state\.followSelectedAircraft\s*=\s*false;[\s\S]*?setRouteFocus\(true\);[\s\S]*?clearRouteFocus\(\{\s*restore:\s*false\s*\}\);[\s\S]*?state\.followSelectedAircraft\s*=\s*true;/, "follow and route quick actions are mutually exclusive map modes");
assert.match(appSource, /function\s+selectAircraft\(id,[\s\S]*?state\.hideOtherAircraft\s*=\s*false;[\s\S]*?state\.followSelectedAircraft\s*=\s*false;/, "selecting an aircraft leaves follow and route controls unselected by default");
assert.match(appSource, /function\s+selectGroundPlaneFromAirport\(airport,[\s\S]*?clearRouteFocus\(\{\s*restore:\s*false\s*\}\);[\s\S]*?state\.selectedTrackStore\s*=\s*null;[\s\S]*?state\.followSelectedAircraft\s*=\s*false;/, "opening a ground aircraft also starts with follow unselected");
assert.match(appSource, /if\s*\(routeFocusActive\(\)\)\s*{[\s\S]*?clearRouteFocus\(\{\s*restore:\s*false\s*\}\);[\s\S]*?state\.followSelectedAircraft\s*=\s*false;/, "route quick action toggles off when already selected");
assert.match(appSource, /if\s*\(state\.followSelectedAircraft\s*&&\s*!routeFocusActive\(\)\)\s*{[\s\S]*?state\.followSelectedAircraft\s*=\s*false;/, "follow quick action toggles off when already selected");
assert.match(appSource, /document\.getElementById\("routeFocusButton"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*{[\s\S]*?setAircraftMapMode\("route"\);/, "route quick action switches to route mode instead of toggling independently");
assert.match(appSource, /document\.getElementById\("followAircraftButton"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*{[\s\S]*?setAircraftMapMode\("follow"\);/, "follow quick action switches back to follow mode");
assert.match(stylesSource, /\.selected-panel-v114\s+\.aircraft-status-tools\s*{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;/, "follow and route controls are aligned as compact status-row quick actions");
assert.match(stylesSource, /\.selected-panel-v114\s+\.aircraft-status-tools\s+button\s*{[\s\S]*?min-height:\s*32px;[\s\S]*?border-radius:\s*999px;/, "follow and route quick actions visually align with the status label");
assert.match(stylesSource, /\.selected-panel-v114\s+\.aircraft-status-tools\s+svg\s*{[\s\S]*?width:\s*15px;[\s\S]*?stroke:\s*currentColor;/, "follow and route quick actions use compact leading icons");
assert.match(stylesSource, /\.selected-panel-v114\s+\.flight-hero\s+\.aircraft-status-tools\s+span\s*{[\s\S]*?line-height:\s*16px;[\s\S]*?transform:\s*translateY\(1px\);/, "follow and route labels are optically centered in the pill buttons");
assert.match(stylesSource, /\.selected-panel-v114\s+\.aircraft-status-tools\s+button\.active\s*{[\s\S]*?color:\s*var\(--graphite-mint\);[\s\S]*?box-shadow:/, "selected follow and route actions have a distinct active visual state");
assert.match(stylesSource, /\.selected-panel-v114\s+\.aircraft-status-tools\s+button:disabled\s*{[\s\S]*?color:\s*rgba\(154,\s*163,\s*175,\s*0\.38\);/, "disabled route action has a clear inactive visual state");
assert.match(stylesSource, /\.selected-panel-v114\s+\.detail-bottom-bar\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*?min-height:\s*84px;[\s\S]*?background:\s*linear-gradient/, "bottom aircraft controls use a taller visually distinct tab bar");
assert.match(stylesSource, /\.selected-panel-v114\s+\.detail-bottom-bar\s+\.detail-segments\s*{[\s\S]*?min-height:\s*62px;/, "bottom aircraft tabs have a larger touch target");
assert.match(stylesSource, /\.selected-panel-v114\s+\.detail-bottom-bar\s+\.detail-segments\s+button:hover/, "bottom aircraft tabs expose hover styling to reinforce clickability");
assert.match(stylesSource, /\.selected-panel-v114\s+\.detail-bottom-bar\s+\.detail-segments\s+button:active\s*{[\s\S]*?transform:\s*translateY\(1px\);/, "bottom aircraft tabs expose an active press hint");
assert.match(stylesSource, /\.selected-panel-v114\s+\.aircraft-meta-card-type\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s+auto\s+minmax\(0,\s*0\.9fr\);/, "aircraft type code and operator share a compact one-row meta layout");
assert.doesNotMatch(stylesSource, /aircraft-info-layout/, "information panel no longer uses the old two-column journey layout");
assert.doesNotMatch(stylesSource, /\.selected-panel-v114\s+\.aircraft-journey-section\s*{[\s\S]*?border-left:/, "journey tab does not retain the embedded right-column border");

console.log("aircraft detail tabs: ok");
