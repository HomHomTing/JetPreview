const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function readProjectFile(filename) {
  return fs.readFileSync(path.join(rootDir, filename), "utf8");
}

const appSource = readProjectFile("app.js");
const configContext = { window: {} };
vm.runInNewContext(readProjectFile("config.example.js"), configContext);
const performanceConfig = configContext.window.APP_CONFIG.performance;

assert.equal(performanceConfig.aircraftViewportPaddingRatio, 0.15, "aircraft realtime requests use current-viewport padding");
assert.equal(performanceConfig.viewportRefreshMinShiftRatio, 0.18, "minor viewport shifts are ignored");
assert.equal(performanceConfig.viewportRefreshMinZoomDelta, 0.5, "minor zoom changes are ignored");
assert.equal(performanceConfig.aircraftRefresh.hiddenMs, 60000, "hidden pages refresh at a low frequency");
assert.equal(performanceConfig.aircraftRefresh.hiddenPauseAfterMs, 300000, "hidden pages stop high-frequency polling after five minutes");
assert.equal(performanceConfig.aircraftRefresh.resumeAirportDelayMs, 6000, "airport refresh is delayed after page resume");

assert.match(
  appSource,
  /function\s+aircraftViewportRefreshIsMeaningful\(reason,[\s\S]*?viewportRefreshMinZoomDelta[\s\S]*?viewportRefreshMinShiftRatio/,
  "viewport refreshes are skipped unless the map moved or zoomed meaningfully"
);
assert.match(
  appSource,
  /function\s+enterHiddenRefreshMode\(\)[\s\S]*?state\.pageHiddenAt[\s\S]*?state\.needsResumeRefresh\s*=\s*true[\s\S]*?invalidateRealtimeRequestQueue\(\)/,
  "entering hidden mode marks resume-needed and invalidates stale realtime requests"
);
assert.match(
  appSource,
  /function\s+scheduleNextRealtimeRefresh\(\)[\s\S]*?pageHiddenRefreshPaused\(\)[\s\S]*?state\.needsResumeRefresh\s*=\s*true[\s\S]*?return;/,
  "hidden pages stop scheduling realtime timers after the pause threshold"
);
assert.match(
  appSource,
  /function\s+scheduleNextAirportRefresh\(\)[\s\S]*?if\s*\(document\.hidden\)[\s\S]*?state\.needsResumeRefresh\s*=\s*true[\s\S]*?return;/,
  "hidden pages do not keep refreshing airport snapshots"
);
assert.match(
  appSource,
  /function\s+resumeVisibleRefresh\(\)[\s\S]*?refreshRealtimeData\(wasHidden\s*\?\s*"resume-visible"\s*:\s*"visible"\)[\s\S]*?window\.setTimeout\([\s\S]*?refreshAirportData\(wasHidden\s*\?\s*"resume-visible"\s*:\s*"visible"\)[\s\S]*?resumeAirportDelayMs/,
  "page resume prioritizes current aircraft viewport before delayed airport refresh"
);
assert.match(
  appSource,
  /document\.addEventListener\("visibilitychange"[\s\S]*?if\s*\(document\.hidden\)[\s\S]*?enterHiddenRefreshMode\(\)[\s\S]*?resumeVisibleRefresh\(\)/,
  "visibility changes use the traffic-aware hidden/resume strategy"
);
assert.match(
  appSource,
  /const\s+requestBounds\s*=\s*aircraftRequestBounds\(\);[\s\S]*?aircraftViewportRefreshIsMeaningful\(reason,\s*requestBounds\)[\s\S]*?rememberAircraftRealtimeRequestView\(requestBounds\)[\s\S]*?buildAircraftViewportRequest\(reason,\s*requestBounds\)/,
  "realtime refreshes reuse the measured viewport bounds for skip checks and requests"
);
assert.match(
  appSource,
  /function\s+aircraftSinceVersionForRequest\(reason\)\s*{\s*return\s+reason\s*===\s*"timer"\s*\?\s*state\.aircraftViewportVersion\s*\|\|\s*""\s*:\s*"";/,
  "viewport changes and page resumes request a fresh current-view snapshot instead of stale-view deltas"
);

console.log("network refresh strategy: ok");
