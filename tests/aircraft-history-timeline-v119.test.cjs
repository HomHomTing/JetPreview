const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const dataSource = fs.readFileSync(path.join(rootDir, "data-service.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
const indexSource = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} source is present`);
  const signatureEnd = source.indexOf(") {", start);
  assert.notEqual(signatureEnd, -1, `${name} function signature closes before body`);
  const braceStart = source.indexOf("{", signatureEnd);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${name} source could not be extracted`);
}

function runHistoryScrollHarness({ userScrollAgeMs }) {
  const timeline = {
    scrollResetTopLocked: false,
    scrollResetToken: 0,
    scrollRestoreSeq: 0,
    pendingScrollRestoreSeq: 0,
    applyingScrollRestore: false,
    programmaticScrollSeq: 0,
    lastUserScrollAt: 100000 - userScrollAgeMs,
    recentFlightsHtml: "old",
    pendingRecentFlightsHtml: null,
    pendingRecentFlightsOptions: null,
    pendingRecentFlightsTimer: 0
  };
  let scrollWrites = 0;
  let scrollValue = 320;
  let timeoutId = 0;
  const timers = new Map();
  const scroller = {
    get scrollTop() {
      return scrollValue;
    },
    set scrollTop(value) {
      scrollWrites += 1;
      scrollValue = value;
    },
    scrollHeight: 1200,
    clientHeight: 420,
    getBoundingClientRect: () => ({ top: 0, bottom: 420 }),
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const element = { innerHTML: "old" };
  const sandbox = {
    NA_TEXT: "—",
    state: { aircraftSegment: "journey", historyTimeline: timeline },
    Date: class extends Date {
      static now() {
        return 100000;
      }
    },
    window: {
      requestAnimationFrame(callback) {
        callback();
      },
      setTimeout(callback) {
        timeoutId += 1;
        timers.set(timeoutId, callback);
        return timeoutId;
      },
      clearTimeout(id) {
        timers.delete(id);
      }
    },
    document: {
      getElementById(id) {
        return id === "recentFlightsList" ? element : null;
      }
    },
    historyTimelineState: () => timeline,
    historyDetailScroller: () => scroller,
    captureHistoryScrollAnchor: () => null,
    syncHistoryCollapsedState: () => {}
  };
  vm.runInNewContext(`
    const HISTORY_USER_SCROLL_SETTLE_MS = 6500;
    ${extractFunctionSource(appSource, "nextHistoryScrollRestoreSeq")}
    ${extractFunctionSource(appSource, "currentHistoryScrollRestoreSeq")}
    ${extractFunctionSource(appSource, "historyUserScrollIsSettling")}
    ${extractFunctionSource(appSource, "historyScrollResetIsActive")}
    ${extractFunctionSource(appSource, "beginHistoryProgrammaticScroll")}
    ${extractFunctionSource(appSource, "captureHistoryScrollState")}
    ${extractFunctionSource(appSource, "restoreHistoryScrollState")}
    ${extractFunctionSource(appSource, "clearPendingRecentFlightsHtml")}
    ${extractFunctionSource(appSource, "flushPendingRecentFlightsHtml")}
    ${extractFunctionSource(appSource, "schedulePendingRecentFlightsHtmlFlush")}
    ${extractFunctionSource(appSource, "setRecentFlightsHtml")}
  `, sandbox);
  sandbox.setRecentFlightsHtml("new", { preserveScroll: true });
  return {
    html: element.innerHTML,
    pendingScrollRestoreSeq: timeline.pendingScrollRestoreSeq,
    pendingRecentFlightsHtml: timeline.pendingRecentFlightsHtml,
    pendingRecentFlightsTimer: timeline.pendingRecentFlightsTimer,
    scrollWrites,
    scrollTop: scroller.scrollTop
  };
}

assert.match(
  appSource,
  /const\s+historyTimelineConfig\s*=\s*{[\s\S]*version:\s*"1\.24"[\s\S]*defaultRangeDays:\s*365[\s\S]*mountLimit:\s*40[\s\S]*pageSize:\s*120[\s\S]*maxPages:\s*5[\s\S]*sampleRegistration:\s*"B-8202"/,
  "history timeline config is sealed as the v1.24 historical-flight redesign"
);

assert.match(
  appSource,
  /window\.BIZJET_HISTORY_TIMELINE_STANDARD\s*=\s*Object\.freeze\({[\s\S]*version:\s*historyTimelineConfig\.version[\s\S]*selectedSummary\(\)/,
  "history timeline standard remains exposed for runtime acceptance checks"
);

assert.match(
  indexSource,
  /styles\.css\?v=1\.20-release[\s\S]*app\.js\?v=1\.20-release/,
  "release busts cached app and style assets"
);

assert.match(
  dataSource,
  /async\s+getFlightHistory\(tailNo,\s*options\s*=\s*{}\)[\s\S]*normalizeFlightHistoryRequestOptions\(options\)[\s\S]*request\("513013",\s*{\s*tailNo,\s*\.\.\.requestOptions\s*}\)/,
  "513013 history requests still support range, page, status, and airport query options"
);

assert.match(
  appSource,
  /function\s+historyRequestOptions\(page\s*=\s*1\)[\s\S]*rangeDays:\s*historyTimelineConfig\.defaultRangeDays/,
  "history data loading keeps a stable one-year record window while statistics range is filtered locally"
);

assert.match(
  appSource,
  /function\s+renderFlightHistoryTimeline\(detail\)[\s\S]*const\s+statsFlights\s*=\s*historyFlightsForTimeline\(detail\);[\s\S]*const\s+recordFlights\s*=\s*historyFlightsForRecords\(detail\);[\s\S]*const\s+summary\s*=\s*historySummary\(detail,\s*statsFlights\);[\s\S]*renderHistoryCurrentStatus\(detail,\s*recordFlights,\s*selectedAircraft\(\),\s*historyNow\)[\s\S]*renderHistoryStatsModule\(summary,\s*statsFlights,\s*historyNow\)[\s\S]*renderHistoryRecordsModule\(recordFlights,\s*loading\)/,
  "journey tab renders current status, running statistics, and running records as three independent modules"
);

assert.match(
  appSource,
  /function\s+historyCountedDurationMinutes\(item\)[\s\S]*historyStatus\(item\)\.key\s*===\s*"cancelled"\s*\?\s*0[\s\S]*historyDurationMinutes\(item\)/,
  "cancelled flights are counted as segments but excluded from duration totals"
);

assert.match(
  appSource,
  /function\s+historyPeriodSummary\(flights\)[\s\S]*totalCount\s*=\s*Array\.isArray\(flights\)\s*\?\s*flights\.length\s*:\s*0[\s\S]*historyCountedDurationMinutes\(item\)/,
  "period summary follows the filtered list for segment count while using v1.24 duration rules"
);

assert.match(
  appSource,
  /function\s+renderHistoryControls\(summary\s*=\s*historyPeriodSummary\(\[\]\)\)[\s\S]*const\s+rangeButtons\s*=\s*\[7,\s*30,\s*365\][\s\S]*<div class="history-range"[\s\S]*<dl class="history-period-summary"[\s\S]*航段数[\s\S]*飞行总时长/,
  "period controls are limited to 7d, 30d, and 1y with the two moving metrics directly below"
);

assert.match(
  appSource,
  /function\s+renderHistoryStatsModule\(summary,\s*flights,\s*historyNow\)[\s\S]*history-module history-stats-module[\s\S]*运行统计[\s\S]*renderHistoryControls\(summary\)[\s\S]*renderHistoryActivityBar\(flights,\s*historyNow\)/,
  "running statistics module combines range controls, summary metrics, and the activity chart under one title"
);

assert.doesNotMatch(
  appSource,
  /data-history-range="90"|>90d<|最近飞行日期|常飞机场|年度活动|近 30 天|history-filter-row|data-history-status|historyAirportFilter|data-history-month=/,
  "removed timeline labels, the 90d period, and the old inline filters are not rendered"
);

assert.match(
  appSource,
  /function\s+historyActivityBuckets\(flights,\s*anchorEpochMs\s*=\s*Date\.now\(\)\)[\s\S]*const\s+isYear\s*=\s*rangeDays\s*>=\s*365[\s\S]*for\s*\(let index = 11;[\s\S]*date\.toLocaleString\("en-US",\s*{\s*month:\s*"short",\s*timeZone:\s*"UTC"\s*}\)[\s\S]*const\s+dayCount\s*=\s*rangeDays\s*<=\s*7\s*\?\s*7\s*:\s*30/,
  "activity buckets switch between twelve UTC months, seven UTC days, and thirty UTC days"
);

assert.match(
  appSource,
  /bucket\.count\s*\+=\s*1;[\s\S]*historyStatus\(item\)\.key\s*!==\s*"cancelled"[\s\S]*bucket\.activeCount[\s\S]*historyCountedDurationMinutes\(item\)[\s\S]*const\s+peak\s*=\s*Math\.max\(1,\s*\.\.\.buckets\.map\(\(item\)\s*=>\s*item\.activeCount\s*\|\|\s*0\)\)/,
  "activity bars keep total segment counts but use non-cancelled activity for bar height"
);

assert.match(
  appSource,
  /label:\s*rangeDays\s*<=\s*7\s*\?\s*`\$\{monthNumber\}-\$\{day\}`\s*:\s*""[\s\S]*secondaryLabel:\s*rangeDays\s*<=\s*7\s*\?\s*""\s*:\s*\(!previousMonth\s*\|\|\s*isMonthBoundary\s*\?\s*monthShort\s*:\s*""\)[\s\S]*monthBoundary:\s*rangeDays\s*>\s*7/,
  "7d labels use mm-dd while 30d suppresses dates and retains month boundaries"
);

assert.match(
  appSource,
  /function\s+historyMonthKey\(item\)[\s\S]*const\s+epoch\s*=\s*historyComparableEpoch\(item\);[\s\S]*historyUtcMonthKeyFromDate\(new Date\(Number\(epoch\)\)\)/,
  "history record month groups use UTC departure epochs so January rolls back into the prior December correctly"
);
const monthKeySandbox = {
  Date,
  Number,
  historyComparableEpoch: (item) => item.epochMs
};
vm.runInNewContext(`
  ${extractFunctionSource(appSource, "historyUtcMonthKeyFromDate")}
  ${extractFunctionSource(appSource, "historyMonthKey")}
`, monthKeySandbox);
assert.equal(monthKeySandbox.historyMonthKey({ epochMs: Date.UTC(2025, 11, 31, 23, 30, 0) }), "2025-12", "UTC month keys preserve the prior December at cross-year boundaries");

assert.match(
  dataSource,
  /function\s+historyTimeRef\(item,\s*fields,\s*options\s*=\s*\{\}\)[\s\S]*const\s+refs\s*=\s*candidates\.map[\s\S]*refs\.find\(\(ref\)\s*=>\s*ref\.epochMs\s*!==\s*null\)\s*\|\|\s*refs\[0\]/,
  "513013 time references prefer the first parseable timestamp before falling back to raw-only values"
);

assert.match(
  appSource,
  /function\s+renderHistoryCurrentStatus\(detail,\s*flights,\s*jet,\s*historyNow\)[\s\S]*historyCurrentLiveFlight\(detail,\s*flights\)[\s\S]*renderHistoryLiveStatusCard\(liveFlight,\s*jet,\s*historyNow\)[\s\S]*detail\?\.groundAirportInfo[\s\S]*renderHistoryGroundStatusCard\(ground,\s*historyPreviousCompletedFlight\(detail,\s*flights\)\)/,
  "current status prioritizes the live card and falls back to the ground card"
);

assert.match(
  appSource,
  /function\s+renderHistoryLiveStatusCard\(item,\s*jet,\s*nowEpochMs\)[\s\S]*historyAirportDisplay\(item,\s*"dep"\)[\s\S]*historyAirportDisplay\(item,\s*"arr"\)[\s\S]*当前在途[\s\S]*history-live-airport[\s\S]*historyAirportCodePair[\s\S]*history-live-progress[\s\S]*高度[\s\S]*地速[\s\S]*升降率/,
  "live status card renders Chinese airport names with IATA and ICAO code pairs"
);

assert.match(
  appSource,
  /function\s+renderHistoryGroundStatusCard\(ground,\s*previousFlight\)[\s\S]*当前停场[\s\S]*data-history-airport[\s\S]*history-ground-visual[\s\S]*入场时间[\s\S]*上一段航线[\s\S]*上一段时长/,
  "ground status card follows the v1.24 ground-duration and previous-flight structure"
);

assert.match(
  appSource,
  /function\s+renderHistoryFlightTableRow\(item,\s*options\s*=\s*{}\)[\s\S]*history-flight-row-main[\s\S]*history-flight-date-cell[\s\S]*history-flight-route-cell[\s\S]*history-flight-duration-cell/,
  "history rows use the v1.24 table row structure with date, route, and duration columns"
);

assert.match(
  appSource,
  /function\s+historyAirportDisplay\(item,\s*side\)[\s\S]*item\?\.\[`\$\{prefix\}AirportName`\][\s\S]*firstAirportCodeByLength\(\s*3,[\s\S]*firstAirportCodeByLength\(\s*4,[\s\S]*codes:\s*codes\s*\|\|\s*historyAirportCodeLabel\(code\)/,
  "history airport display prioritizes Chinese airport names and combines IATA / ICAO codes"
);

assert.match(
  appSource,
  /function\s+historyLocalTimeLabel\(timeRef\)[\s\S]*`\$\{label\} LT`/,
  "history row times are explicitly labelled as local time"
);

assert.match(
  appSource,
  /function\s+historyStatus\(item\)[\s\S]*return\s+{\s*key:\s*"landed",\s*label:\s*"到达",\s*tone:\s*"landed"\s*};[\s\S]*function\s+historyStatusActionLabel\(status\)[\s\S]*return\s+"到达";/,
  "landed history state is displayed as 到达"
);

assert.match(
  appSource,
  /function\s+renderHistoryFlightTableRow\(item,\s*options\s*=\s*{}\)[\s\S]*const\s+depAirport\s*=\s*historyAirportDisplay\(item,\s*"dep"\);[\s\S]*const\s+arrAirport\s*=\s*historyAirportDisplay\(item,\s*"arr"\);[\s\S]*history-flight-airport-names[\s\S]*history-flight-airport-codes[\s\S]*history-flight-local-times/,
  "history rows render airport names first, IATA / ICAO codes second, and LT times third"
);

assert.match(
  appSource,
  /function\s+renderHistoryFlightTableRow\(item,\s*options\s*=\s*{}\)[\s\S]*historyDayOffsetLabel\(depRef,\s*arrRef\)[\s\S]*history-flight-local-times/,
  "history rows render cross-day labels next to the local arrival time"
);

assert.match(
  appSource,
  /function\s+renderHistoryTimelineGroups\(flights\)[\s\S]*const\s+currentFlightKey\s*=\s*historyFlightKey\(historyCurrentLiveFlight\(null,\s*flights\)\);[\s\S]*history-flight-table[\s\S]*history-month-table-group[\s\S]*group\.flights\.map\(\(item\)\s*=>\s*renderHistoryFlightTableRow\(item,\s*\{\s*current:/,
  "history list renders records grouped by month without the old date, route, and duration table header"
);

assert.doesNotMatch(
  appSource,
  /history-list-head[\s\S]*日期[\s\S]*航线[\s\S]*时长/,
  "running records no longer render the date, route, and duration table header"
);

assert.match(
  appSource,
  /function\s+renderHistoryRecordsModule\(flights,\s*loading\)[\s\S]*history-module history-records-module[\s\S]*运行记录[\s\S]*history-timeline-scroll[\s\S]*renderHistoryTimelineGroups\(flights\)/,
  "running records module places the title above the record list"
);

assert.match(
  appSource,
  /function\s+handleHistoryTimelineClick\(event\)[\s\S]*data-history-airport[\s\S]*selectAirportFromCode\(code\)[\s\S]*data-history-range[\s\S]*rerenderSelectedHistoryTimeline\(\{\s*preserveScroll:\s*true,\s*deferDuringUserScroll:\s*false\s*\}\);[\s\S]*data-history-flight-card[\s\S]*rerenderSelectedHistoryTimeline\(\{\s*preserveScroll:\s*true,\s*deferDuringUserScroll:\s*false\s*\}\);[\s\S]*action\s*===\s*"live"[\s\S]*setAircraftMapMode\("follow"\)/,
  "history interactions keep statistics range changes and card expansion independent from deferred automatic record refreshes"
);

assert.match(
  appSource,
  /function\s+resetHistoryScrollTop\(options\s*=\s*{}\)[\s\S]*scrollHistoryToListTop\(scroller\);[\s\S]*window\.requestAnimationFrame\(\(\)\s*=>\s*{[\s\S]*window\.requestAnimationFrame\(\(\)\s*=>\s*{[\s\S]*scrollTop\(\);[\s\S]*window\.setTimeout\(scrollTop,\s*80\);[\s\S]*window\.setTimeout\(scrollTop,\s*180\);[\s\S]*window\.setTimeout\(scrollTop,\s*360\);[\s\S]*window\.setTimeout\(scrollTop,\s*720\);/,
  "journey tab initial reset forcefully pins the detail scroller to the top of the journey list across late layout shifts"
);

assert.match(
  appSource,
  /function\s+finishHistoryScrollReset\(token\)[\s\S]*historyScrollResetShouldPin\(token\)[\s\S]*resetHistoryScrollTop\(\{\s*resetToken:\s*token\s*\}\);[\s\S]*window\.setTimeout\(\(\)\s*=>\s*releaseHistoryScrollReset\(token\),\s*760\);/,
  "journey top reset lock releases after the final delayed top correction"
);

assert.match(
  appSource,
  /function\s+historyJourneyListTopScrollTop\(scroller\s*=\s*historyDetailScroller\(\)\)\s*{[\s\S]*return\s+0;[\s\S]*}\s*function\s+scrollHistoryToListTop\(scroller\s*=\s*historyDetailScroller\(\)\)[\s\S]*scroller\.scrollTop\s*=\s*historyJourneyListTopScrollTop\(scroller\);/,
  "journey reset anchors to the top of the journey list, not the current status card or any record row"
);

assert.match(
  appSource,
  /function\s+restoreHistoryScrollState\(snapshot\)[\s\S]*const\s+restoreTop\s*=\s*\(nextTop\)\s*=>[\s\S]*snapshot\.forceTop[\s\S]*restoreTop\(historyJourneyListTopScrollTop\(scroller\)\)[\s\S]*if\s*\(historyScrollResetIsActive\(\)\)\s*{[\s\S]*restoreTop\(historyJourneyListTopScrollTop\(scroller\)\);/,
  "all rerenders during the initial journey reset ignore captured bottom offsets and return to the journey list top"
);

assert.match(
  appSource,
  /scrollResetHardUntil:\s*0[\s\S]*scrollRestoreSeq:\s*0[\s\S]*function\s+beginHistoryScrollReset\(\)[\s\S]*nextHistoryScrollRestoreSeq\(\);[\s\S]*timeline\.scrollResetHardUntil\s*=\s*Date\.now\(\)\s*\+\s*220;[\s\S]*function\s+nextHistoryScrollRestoreSeq\(\)[\s\S]*timeline\.scrollRestoreSeq\s*=[\s\S]*function\s+currentHistoryScrollRestoreSeq\(\)/,
  "journey scroll resets invalidate pending bottom-position restores"
);

assert.match(
  appSource,
  /pendingScrollRestoreSeq:\s*0[\s\S]*applyingScrollRestore:\s*false[\s\S]*programmaticScrollSeq:\s*0[\s\S]*lastUserScrollAt:\s*0[\s\S]*recentFlightsHtml:\s*""/,
  "journey scroll state tracks pending programmatic restores and last rendered HTML"
);

assert.match(
  appSource,
  /function\s+journeyHistoryPanelIsOpen\(\)[\s\S]*state\.selectedKind\s*!==\s*"aircraft"[\s\S]*state\.aircraftSegment\s*!==\s*"journey"[\s\S]*leftDetailPanel[\s\S]*aircraftDetailView[\s\S]*!panel\.hidden[\s\S]*!aircraftView\.hidden/,
  "journey history panel has a dedicated open-state guard before page data refreshes are paused"
);

assert.match(
  appSource,
  /function\s+pausePageDataRefreshForJourneyHistory\(\)[\s\S]*window\.clearTimeout\(state\.refreshTimer\);[\s\S]*window\.clearTimeout\(state\.airportRefreshTimer\);[\s\S]*state\.refreshTimer\s*=\s*null;[\s\S]*state\.airportRefreshTimer\s*=\s*null;[\s\S]*state\.pendingViewportReason\s*=\s*"";/,
  "opening the journey history panel clears aircraft, airport, and pending viewport refresh work"
);

assert.match(
  appSource,
  /function\s+aircraftHistoryRequestTailNo\(jet\)[\s\S]*jet\?\.tailNoEncrypted[\s\S]*jet\?\.tailNo[\s\S]*raw\.tailNo[\s\S]*flightRaw\.tailNo[\s\S]*flight\.tailNoEncrypted[\s\S]*flight\.tailNo[\s\S]*plane\.tailNoEncrypted[\s\S]*plane\.tailNo[\s\S]*rawPlane\.tailNo/,
  "aircraft history requests resolve the encrypted tail number from live, raw, flight-track, and loaded detail fields"
);

assert.match(
  appSource,
  /async\s+function\s+loadAircraftHistory\(jet,\s*options\s*=\s*\{\}\)[\s\S]*const\s+historyTailNo\s*=\s*aircraftHistoryRequestTailNo\(jet\);[\s\S]*!historyTailNo[\s\S]*const\s+loadKey\s*=\s*aircraftHistoryLoadKey\(jet\);[\s\S]*fetchAircraftHistoryDetail\(historyTailNo\)[\s\S]*aircraftHistoryLoadTarget\(jet,\s*historyTailNo\)[\s\S]*applyAircraftHistory\(currentJet,\s*detail\s*\|\|\s*createEmptyAircraftHistoryDetail\(\)\)[\s\S]*state\.detailLoads\.delete\(loadKey\);[\s\S]*renderAircraftDetailPanel\(currentJet\)/,
  "aircraft history loading uses the resolved tail number and does not mark missing request params as a completed fetch"
);

assert.match(
  appSource,
  /function\s+aircraftHistoryLoadTarget\(seedJet,\s*historyTailNo\)[\s\S]*aircraftByDetailSeed\(seedJet\)[\s\S]*const\s+selected\s*=\s*selectedAircraft\(\);[\s\S]*selectedTailNo\s*&&\s*selectedTailNo\s*===\s*historyTailNo[\s\S]*aircraftProfileKeysOverlap\(selected,\s*seedJet\)/,
  "aircraft history completion can still target the currently selected aircraft after the live snapshot replaces the original object"
);

assert.match(
  appSource,
  /function\s+createEmptyAircraftHistoryDetail\(\)[\s\S]*source:\s*"513013"[\s\S]*totalCount:\s*0[\s\S]*flights:\s*\[\][\s\S]*groundAirportInfo:\s*null/,
  "empty 513013 responses are cached as a loaded empty history so they do not loop forever"
);

assert.match(
  appSource,
  /function\s+scheduleNextRealtimeRefresh\(\)[\s\S]*journeyHistoryPanelIsOpen\(\)[\s\S]*return;[\s\S]*refreshRealtimeData\("timer"\)/,
  "aircraft realtime polling is not rescheduled while the journey history panel is open"
);

assert.match(
  appSource,
  /function\s+scheduleNextAirportRefresh\(\)[\s\S]*journeyHistoryPanelIsOpen\(\)[\s\S]*return;[\s\S]*refreshAirportData\("timer"\)/,
  "airport snapshot polling is not rescheduled while the journey history panel is open"
);

assert.match(
  appSource,
  /async\s+function\s+refreshRealtimeData\(reason\s*=\s*"timer"\)[\s\S]*journeyHistoryPanelIsOpen\(\)[\s\S]*pausePageDataRefreshForJourneyHistory\(\);[\s\S]*const\s+snapshot\s*=\s*await\s+dataService\.getRealtimeSnapshot[\s\S]*journeyHistoryPanelIsOpen\(\)[\s\S]*pausePageDataRefreshForJourneyHistory\(\);[\s\S]*return;[\s\S]*if\s*\(!journeyHistoryPanelIsOpen\(\)\)\s*{[\s\S]*refreshRealtimeData\(nextReason\);/,
  "aircraft realtime responses that finish after the journey history panel opens are ignored instead of repainting the page"
);

assert.match(
  appSource,
  /async\s+function\s+refreshAirportData\(reason\s*=\s*"timer"\)[\s\S]*journeyHistoryPanelIsOpen\(\)[\s\S]*pausePageDataRefreshForJourneyHistory\(\);[\s\S]*const\s+snapshot\s*=\s*await\s+dataService\.getRealtimeSnapshot[\s\S]*journeyHistoryPanelIsOpen\(\)[\s\S]*pausePageDataRefreshForJourneyHistory\(\);[\s\S]*return;/,
  "airport snapshot responses that finish after the journey history panel opens are ignored instead of repainting the page"
);

assert.match(
  appSource,
  /function\s+releaseHistoryScrollReset\(token\)[\s\S]*timeline\.scrollResetTopLocked\s*=\s*false;[\s\S]*timeline\.scrollResetHardUntil\s*=\s*0;/,
  "releasing the journey top reset also clears the short hard-lock window"
);

assert.match(
  appSource,
  /function\s+historyScrollResetShouldPin\(token\)[\s\S]*historyScrollResetIsActive\(token\)[\s\S]*expectedScrollTop\s*=\s*historyJourneyListTopScrollTop\(scroller\);[\s\S]*hasMovedAwayFromListTop\s*=\s*Math\.abs\(Number\(scroller\?\.scrollTop\s*\|\|\s*0\)\s*-\s*expectedScrollTop\)\s*>\s*4;[\s\S]*releaseHistoryScrollReset\(token\);[\s\S]*return\s+false;/,
  "late reset calls are cancelled when the user has already moved the journey list away from the top"
);

assert.match(
  appSource,
  /function\s+beginHistoryProgrammaticScroll\(timeline\s*=\s*historyTimelineState\(\)\)[\s\S]*timeline\.applyingScrollRestore\s*=\s*true;[\s\S]*timeline\.programmaticScrollSeq[\s\S]*requestAnimationFrame[\s\S]*timeline\.applyingScrollRestore\s*=\s*false;/,
  "programmatic history scroll writes are isolated from user scroll events"
);

assert.match(
  appSource,
  /function\s+setRecentFlightsHtml\(html,\s*options\s*=\s*{}\)[\s\S]*const\s+staleResetScroll\s*=\s*options\.resetScroll\s*===\s*true[\s\S]*!historyScrollResetShouldPin\(options\.resetToken\);[\s\S]*const\s+effectiveOptions\s*=\s*staleResetScroll[\s\S]*preserveScroll:\s*true[\s\S]*const\s+htmlChanged\s*=[\s\S]*deferDuringUserScroll\s*===\s*false[\s\S]*clearPendingRecentFlightsHtml\(timeline\);[\s\S]*shouldDeferHtmlWrite[\s\S]*return;[\s\S]*const\s+restoreSeq\s*=\s*nextHistoryScrollRestoreSeq\(\);[\s\S]*captureHistoryScrollState\(effectiveOptions,\s*restoreSeq\)/,
  "each non-deferred history rerender receives a fresh scroll restore sequence"
);

assert.match(
  appSource,
  /function\s+setRecentFlightsHtml\(html,\s*options\s*=\s*{}\)[\s\S]*if\s*\(effectiveOptions\.resetScroll\s*===\s*true\)\s*{[\s\S]*resetHistoryScrollTop\(\{\s*resetToken\s*\}\);/,
  "late async history responses with stale reset tokens preserve user scroll instead of forcing the list upward"
);

assert.match(
  appSource,
  /function\s+renderRecentFlights\(jet,\s*options\s*=\s*\{\}\)[\s\S]*historyDetail\s*&&\s*\(!historyDetail\.isStaticSample\s*\|\|\s*historyDetail\?\.flights\?\.length\s*\|\|\s*historyDetail\?\.groundAirportInfo\)[\s\S]*const\s+historyLoadKey\s*=\s*aircraftHistoryLoadKey\(jet\);[\s\S]*state\.aircraftSegment\s*===\s*"journey"[\s\S]*dataService\?\.isEnabled\(\)[\s\S]*if\s*\(historyLoadKey\)\s*{[\s\S]*loadAircraftHistory\(jet\);[\s\S]*行程记录加载中[\s\S]*if\s*\(aircraftDetailIsLoading\(jet\)\s*\|\|\s*aircraftNeedsDetailLoad\(jet\)\)\s*{[\s\S]*loadAircraftDetails\(jet\);[\s\S]*行程记录等待飞机信息同步/,
  "journey tab triggers the first 513013 load once, and waits for aircraft detail fields when the tail number is not ready yet"
);

assert.match(
  appSource,
  /function\s+setRecentFlightsHtml\(html,\s*options\s*=\s*{}\)[\s\S]*const\s+htmlChanged\s*=\s*timeline\.recentFlightsHtml\s*!==\s*nextHtml[\s\S]*const\s+shouldRestoreScroll\s*=\s*Boolean\(snapshot\s*&&\s*!snapshot\.skipScrollRestore\);[\s\S]*if\s*\(htmlChanged\)\s*{[\s\S]*element\.innerHTML\s*=\s*nextHtml[\s\S]*timeline\.recentFlightsHtml\s*=\s*nextHtml[\s\S]*if\s*\(htmlChanged\)\s*{[\s\S]*if\s*\(shouldRestoreScroll\)\s*{[\s\S]*restoreHistoryScrollState\(snapshot\);/,
  "history list skips identical HTML rerenders and only restores scroll after real DOM changes outside active user scrolling"
);

assert.match(
  appSource,
  /function\s+captureHistoryScrollAnchor\(scroller\)[\s\S]*querySelectorAll\("\[data-history-flight-card\],\s*\[data-history-month-group\]"\)[\s\S]*offsetTop:[\s\S]*selected\.rect\.top\s*-\s*scrollerRect\.top[\s\S]*function\s+captureHistoryScrollState/,
  "history scroll capture stores the first visible flight/month anchor instead of relying on document edges"
);

assert.match(
  appSource,
  /function\s+restoreHistoryScrollState\(snapshot\)[\s\S]*Number\(snapshot\.restoreSeq\)\s*!==\s*currentHistoryScrollRestoreSeq\(\)[\s\S]*if\s*\(Number\.isFinite\(Number\(snapshot\.scrollTop\)\)\)\s*{[\s\S]*restoreTop\(snapshot\.scrollTop\);[\s\S]*const\s+anchorElement\s*=\s*historyScrollAnchorElement\(snapshot\.anchor,\s*scroller\)[\s\S]*restoreTop\(scroller\.scrollTop\s*\+\s*\(anchorRect\.top\s*-\s*scrollerRect\.top\)\s*-\s*Number\(snapshot\.anchor\.offsetTop\s*\|\|\s*0\)\);/,
  "stale history rerender snapshots are ignored and normal rerenders restore the exact scroll offset before using anchor fallback"
);

assert.match(
  appSource,
  /const\s+HISTORY_USER_SCROLL_SETTLE_MS\s*=\s*6500;[\s\S]*function\s+historyUserScrollIsSettling\(timeline\s*=\s*historyTimelineState\(\)\)[\s\S]*HISTORY_USER_SCROLL_SETTLE_MS[\s\S]*activeUserScroll,[\s\S]*skipScrollRestore:\s*activeUserScroll/,
  "history scroll snapshots identify recent user scrolling as a protected settle window"
);

assert.match(
  appSource,
  /function\s+flushPendingRecentFlightsHtml\(\)[\s\S]*historyUserScrollIsSettling\(timeline\)[\s\S]*window\.setTimeout\(flushPendingRecentFlightsHtml,[\s\S]*function\s+setRecentFlightsHtml\(html,\s*options\s*=\s*\{\}\)[\s\S]*shouldDeferHtmlWrite[\s\S]*pendingRecentFlightsHtml\s*=\s*nextHtml[\s\S]*schedulePendingRecentFlightsHtmlFlush\(timeline\);/,
  "history rerenders defer DOM replacement while recent user scrolling is settling, then preserve scroll after the guard window"
);

const activeScrollHarness = runHistoryScrollHarness({ userScrollAgeMs: 3000 });
assert.equal(activeScrollHarness.html, "old", "history refresh does not replace DOM while the user-scroll guard is active");
assert.equal(activeScrollHarness.pendingRecentFlightsHtml, "new", "history refresh keeps the latest pending HTML for after scroll settles");
assert.ok(activeScrollHarness.pendingRecentFlightsTimer > 0, "history refresh schedules a deferred flush after active user scroll");
assert.equal(activeScrollHarness.scrollWrites, 0, "history refresh does not write scrollTop during the user-scroll guard window");
assert.equal(activeScrollHarness.pendingScrollRestoreSeq, 0, "history refresh does not leave a pending scroll restore while DOM replacement is deferred");

const settledScrollHarness = runHistoryScrollHarness({ userScrollAgeMs: 8000 });
assert.equal(settledScrollHarness.html, "new", "history refresh updates content after the user-scroll guard window");
assert.equal(settledScrollHarness.scrollWrites, 1, "history refresh restores scrollTop only after user scrolling has settled");
assert.equal(settledScrollHarness.scrollTop, 320, "history refresh restores the previously captured scroll position after settling");

assert.doesNotMatch(
  appSource,
  /bottomPinned|bottomOffset/,
  "history scroll restoration no longer sticks to the bottom after loading more records"
);

assert.match(
  appSource,
  /openAircraftView\(nextSegment,\s*{\s*resetHistoryScroll:\s*selectingDifferentAircraft\s*&&\s*nextSegment\s*===\s*"journey"\s*}\);/,
  "switching aircraft while the journey tab is active opens the next aircraft at the journey list top without resetting realtime refreshes of the same aircraft"
);

assert.match(
  appSource,
  /function\s+setAircraftSegment\(segment,\s*options\s*=\s*\{\}\)[\s\S]*if\s*\(nextSegment\s*===\s*"journey"\)\s*{[\s\S]*pausePageDataRefreshForJourneyHistory\(\);[\s\S]*const\s+jet\s*=\s*selectedAircraft\(\);[\s\S]*loadAircraftHistory\(jet,\s*\{\s*resetScroll:\s*shouldResetHistoryScroll,\s*resetToken\s*}\);[\s\S]*}\s*else\s+if\s*\(previousSegment\s*===\s*"journey"\)\s*{[\s\S]*releaseHistoryScrollReset\(\);[\s\S]*scheduleNextRealtimeRefresh\(\);[\s\S]*scheduleNextAirportRefresh\(\);/,
  "entering the journey tab freezes page data refreshes but still allows one aircraft history load before normal refresh resumes on exit"
);

assert.doesNotMatch(
  appSource,
  /setAircraftSegment\(segment,[\s\S]*loadAircraftHistory\(jet,\s*\{\s*force:\s*true/,
  "opening the journey tab does not force reload aircraft history after it has already been cached once"
);

assert.match(
  appSource,
  /setInterval\(\(\)\s*=>\s*{[\s\S]*if\s*\(state\.selectedKind\s*===\s*"aircraft"\s*&&\s*state\.selectedId\)\s*{[\s\S]*journeyHistoryPanelIsOpen\(\)[\s\S]*return;[\s\S]*selectAircraft\(selected,\s*false,\s*\{\s*preserveReducedIconState:\s*true\s*}\);/,
  "the local selected-aircraft refresh loop does not rerender the journey history panel every few seconds"
);

assert.match(
  appSource,
  /function\s+handleHistoryTimelineScroll\(event\)[\s\S]*if\s*\(historyScrollResetIsActive\(\)\)\s*{[\s\S]*expectedScrollTop\s*=\s*historyJourneyListTopScrollTop\(scroller\);[\s\S]*hasMovedAwayFromListTop[\s\S]*const\s+hardLocked\s*=\s*Date\.now\(\)\s*<\s*Number\(timeline\.scrollResetHardUntil\s*\|\|\s*0\);[\s\S]*timeline\.applyingScrollRestore\s*\|\|\s*hardLocked[\s\S]*scrollHistoryToListTop\(scroller\);[\s\S]*else\s*{[\s\S]*timeline\.lastUserScrollAt\s*=\s*Date\.now\(\);[\s\S]*nextHistoryScrollRestoreSeq\(\);[\s\S]*releaseHistoryScrollReset\(\);[\s\S]*return;[\s\S]*!timeline\.applyingScrollRestore\s*&&\s*!historyScrollRestoreIsPending\(\)[\s\S]*timeline\.lastUserScrollAt\s*=\s*Date\.now\(\);[\s\S]*nextHistoryScrollRestoreSeq\(\);[\s\S]*syncHistoryCollapsedState\(scroller\);/,
  "scroll events during the short initial reset window are corrected, while later real scroll cancels the list-top reset lock"
);

assert.match(
  appSource,
  /function\s+handleHistoryScrollIntent\(\)[\s\S]*state\.aircraftSegment\s*!==\s*"journey"[\s\S]*const\s+hardLocked\s*=\s*Date\.now\(\)\s*<\s*Number\(timeline\.scrollResetHardUntil\s*\|\|\s*0\);[\s\S]*historyScrollResetIsActive\(\)\s*&&\s*hardLocked[\s\S]*return;[\s\S]*timeline\.lastUserScrollAt\s*=\s*Date\.now\(\);[\s\S]*nextHistoryScrollRestoreSeq\(\);[\s\S]*historyScrollResetIsActive\(\)[\s\S]*releaseHistoryScrollReset\(\);/,
  "explicit user scroll intent cancels pending restores after the initial hard-lock window"
);

assert.match(
  appSource,
  /aircraftDetailScroller\?\.addEventListener\("scroll",\s*handleHistoryTimelineScroll\);[\s\S]*aircraftDetailScroller\?\.addEventListener\("wheel",\s*handleHistoryScrollIntent,\s*{\s*passive:\s*true\s*}\);[\s\S]*aircraftDetailScroller\?\.addEventListener\("touchstart",\s*handleHistoryScrollIntent,\s*{\s*passive:\s*true\s*}\);[\s\S]*aircraftDetailScroller\?\.addEventListener\("touchmove",\s*handleHistoryScrollIntent,\s*{\s*passive:\s*true\s*}\);[\s\S]*aircraftDetailScroller\?\.addEventListener\("keydown",\s*handleHistoryScrollIntent\);/,
  "detail scroller listens for wheel, touch start, touch move, and keyboard intent before allowing manual scroll"
);

assert.match(
  appSource,
  /const\s+nextSegment\s*=\s*button\.dataset\.aircraftSegment;[\s\S]*setAircraftSegment\(nextSegment,\s*\{\s*resetScroll:\s*nextSegment\s*===\s*"journey"\s*&&\s*state\.aircraftSegment\s*!==\s*"journey"\s*\}\);/,
  "clicking the already active journey tab does not reset the history list to the top"
);

assert.doesNotMatch(
  appSource,
  /aircraftDetailScroller\?\.addEventListener\("pointerdown",\s*handleHistoryScrollIntent/,
  "pointerdown does not prematurely release the journey top reset lock before layout settles"
);

assert.match(
  appSource,
  /function\s+b8202SampleFlightDefs\(\)[\s\S]*2026-08-17[\s\S]*status:\s*"live"[\s\S]*2026-07-24[\s\S]*status:\s*"cancelled"[\s\S]*return\s+\[\.\.\.fixed,\s*\.\.\.generated\];/,
  "B-8202 sample history covers live, cancelled, delayed, scheduled, and generated annual records"
);

assert.match(
  appSource,
  /source:\s*"static-v1\.24"/,
  "static history sample is labelled with the v1.24 redesign source"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-status-card\s*{[\s\S]*display:\s*grid;[\s\S]*border-radius:\s*8px;[\s\S]*\.selected-panel-v114\s+\.history-status-card\s+header/,
  "current status cards use a compact v1.24 card shell"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-live-route\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(34px,\s*0\.42fr\)\s+minmax\(0,\s*1fr\);[\s\S]*\.selected-panel-v114\s+\.history-live-airport\s*{[\s\S]*\.selected-panel-v114\s+\.history-live-progress\s*{/,
  "live card balances Chinese airport names and code rows around the route line"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-ground-visual\s*{[\s\S]*grid-template-columns:\s*max-content\s+minmax\(0,\s*1fr\);[\s\S]*font-size:\s*30px;/,
  "ground card emphasizes ground duration as the primary visual"
);

assert.doesNotMatch(
  stylesSource,
  /\.selected-panel-v114\s+\.history-list-head\s*{/,
  "running records has no date, route, and duration header styling"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-timeline-root\s*{[\s\S]*gap:\s*28px;[\s\S]*\.selected-panel-v114\s+\.history-fixed-region\s*{[\s\S]*gap:\s*28px;[\s\S]*\.selected-panel-v114\s+\.history-module-title\s*{[\s\S]*font-size:\s*15px;/,
  "current status, running statistics, and running records are separated as titled modules"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-module-panel\s*{[\s\S]*border-radius:\s*8px;[\s\S]*\.selected-panel-v114\s+\.history-stats-panel\s+\.history-controls\s*{[\s\S]*background:\s*transparent;[\s\S]*\.selected-panel-v114\s+\.history-stats-panel\s+\.history-activity\s*{[\s\S]*border-top:/,
  "running statistics uses one integrated module shell instead of floating separate blocks"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-flight-table\s*{[\s\S]*gap:\s*18px;[\s\S]*margin-top:\s*0;[\s\S]*overflow-anchor:\s*none;[\s\S]*\.selected-panel-v114\s+\.history-records-module\s+\.history-month-table-group\s*{[\s\S]*gap:\s*12px;[\s\S]*overflow:\s*visible;[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;[\s\S]*\.selected-panel-v114\s+\.history-records-module\s+\.history-month-table-group\s+>\s+header\s*{[\s\S]*min-height:\s*36px;[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/,
  "running records removes the table header shell, prevents month clipping, and adds spacing before record rows"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-flight-row-main\s*{[\s\S]*grid-template-columns:\s*56px\s+minmax\(0,\s*1fr\)\s+80px;[\s\S]*column-gap:\s*14px;[\s\S]*min-height:\s*84px;[\s\S]*padding:\s*12px\s+12px\s+12px\s+13px;/,
  "history rows use a taller relaxed card rhythm with larger date-route spacing"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-flight-airport-names\s*{[\s\S]*font-size:\s*12\.5px;[\s\S]*line-height:\s*1\.32;[\s\S]*\.selected-panel-v114\s+\.history-flight-times,[\s\S]*font-size:\s*11\.5px;[\s\S]*line-height:\s*1\.35;/,
  "history rows reduce Chinese airport names while enlarging code and time metadata"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-flight-date-cell\s+strong\s*{[\s\S]*font-size:\s*15px;[\s\S]*\.selected-panel-v114\s+\.history-flight-duration-cell\s+strong\s*{[\s\S]*font-size:\s*13px;[\s\S]*\.selected-panel-v114\s+\.history-flight-expanded\s*{[\s\S]*padding:\s*0\s+12px\s+13px\s+83px;/,
  "history row date, duration, and expanded details are scaled up with the taller cards"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-flight-row::before\s*{[\s\S]*width:\s*3px;[\s\S]*\.selected-panel-v114\s+\.history-flight-row\[data-status="live"\]::before[\s\S]*var\(--graphite-mint\);[\s\S]*\.selected-panel-v114\s+\.history-flight-row\[data-status="cancelled"\]/,
  "history rows expose left status color bars with restrained landed treatment"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-activity-bars\.is-week\s*{[\s\S]*repeat\(7,[\s\S]*\.history-activity-bars\.is-month\s*{[\s\S]*repeat\(30,[\s\S]*\.history-activity-bars\.is-year\s*{[\s\S]*repeat\(12,/,
  "activity chart supports 7-day, 30-day, and 12-month layouts"
);

assert.match(
  appSource,
  /const\s+isMonth\s*=\s*!isYear\s*&&\s*rangeDays\s*>\s*7;[\s\S]*aria-label="\$\{escapeHtml\(tooltip\)\}"[\s\S]*history-activity-axis-dot[\s\S]*bucket\.secondaryLabel/,
  "30d activity chart renders day dots and month boundary labels without date text"
);

assert.match(
  stylesSource,
  /\.history-activity-bars\s*{[\s\S]*align-items:\s*stretch;[\s\S]*\.history-activity-bars button\s*{[\s\S]*grid-template-rows:\s*42px\s+15px;[\s\S]*\.history-activity-bars span\s*{[\s\S]*grid-row:\s*1;[\s\S]*align-self:\s*end;/,
  "all activity bars share a fixed plot row and bottom baseline"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-activity-bars\.is-month\s*{[\s\S]*grid-template-columns:\s*repeat\(30,\s*minmax\(0,\s*1fr\)\);[\s\S]*gap:\s*0;[\s\S]*\.selected-panel-v114\s+\.history-activity-bars button\s*{[\s\S]*padding:\s*0;[\s\S]*appearance:\s*none;[\s\S]*overflow:\s*visible;[\s\S]*\.selected-panel-v114\s+\.history-activity-bars\.is-month span\s*{[\s\S]*width:\s*5px;[\s\S]*min-width:\s*5px;[\s\S]*max-width:\s*5px;[\s\S]*\.selected-panel-v114\s+\.history-activity-bars\.is-month\s+\.history-activity-axis-dot\s*{[\s\S]*width:\s*3px;[\s\S]*min-width:\s*3px;[\s\S]*max-width:\s*3px;/,
  "30d activity chart uses zero grid gaps plus fixed-width bars and axis dots"
);

assert.match(
  stylesSource,
  /\.history-activity-tooltip-floating\s*{[\s\S]*position:\s*fixed;[\s\S]*z-index:\s*2400;[\s\S]*max-width:\s*min\(260px,\s*calc\(100vw\s*-\s*20px\)\);/,
  "activity columns reveal complete concrete data in a viewport-level floating tooltip"
);

assert.match(
  appSource,
  /function\s+moveHistoryActivityTooltip\(target\)[\s\S]*Math\.min\(window\.innerWidth\s*-\s*width\s*-\s*margin,\s*Math\.max\(margin,\s*left\)\)[\s\S]*document\.addEventListener\("pointerover",\s*handleHistoryActivityTooltipPointerOver\)/,
  "activity tooltip positioning clamps horizontally inside the viewport"
);

assert.doesNotMatch(
  stylesSource,
  /history-activity-bars\.is-month button\.is-month-boundary::before|content:\s*attr\(data-history-activity-tooltip\)/,
  "30d activity chart removes month separator lines and no longer uses clipped pseudo-element tooltips"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.history-timeline-scroll\s*{[\s\S]*overflow:\s*visible;/,
  "journey history still flows inside the single outer detail scroller"
);

assert.match(
  stylesSource,
  /\.detail-scroll-body\s*{[\s\S]*overflow:\s*auto;[\s\S]*scrollbar-width:\s*none;[\s\S]*-ms-overflow-style:\s*none;[\s\S]*}\s*\.detail-scroll-body::-webkit-scrollbar\s*{[\s\S]*display:\s*none;[\s\S]*width:\s*0;[\s\S]*height:\s*0;/,
  "all detail tabs keep scrolling available while hiding the right-side scrollbar chrome"
);

assert.match(
  stylesSource,
  /\.selected-panel-v114\s+\.detail-scroll-body\s*{[\s\S]*overflow-anchor:\s*none;[\s\S]*scrollbar-width:\s*none;[\s\S]*-ms-overflow-style:\s*none;[\s\S]*}\s*\.selected-panel-v114\s+\.detail-scroll-body::-webkit-scrollbar\s*{[\s\S]*display:\s*none;[\s\S]*width:\s*0;[\s\S]*height:\s*0;/,
  "v1.14+ selected detail tabs use invisible scrollbars and disable browser scroll anchoring"
);

console.log("aircraft history timeline v1.24 redesign: ok");
