const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");

assert.match(indexSource, /Business Jet Radar 1\.20/, "page title is bumped for the 1.20 airport panel iteration");
assert.match(indexSource, /airport-detail-v120/, "airport detail panel carries the v1.20 scope class");
["ground", "dynamic", "operations", "airport"].forEach((segment) => {
  assert.match(indexSource, new RegExp(`data-airport-panel="${segment}"`), `${segment} airport panel exists`);
  assert.match(indexSource, new RegExp(`data-airport-segment="${segment}"`), `${segment} airport bottom tab exists`);
});
assert.doesNotMatch(indexSource, /data-airport-(?:panel|segment)="fbo"|airportHeroFbo|airportTerminals/, "FBO and terminal/contact content is removed from the airport panel");
assert.doesNotMatch(indexSource, /data-airport-segment="weather"|data-airport-panel="weather"/, "weather is folded into the airport tab instead of a separate tab");
assert.match(indexSource, /airport-bottom-bar[\s\S]*data-airport-segment="ground"[\s\S]*aria-current="true"/, "ground is the first selected airport tab");
assert.match(indexSource, /id="airportNameCn"[\s\S]*id="airportNameEn"[\s\S]*id="airportIata"[\s\S]*id="airportIcao"[\s\S]*id="airportCity"[\s\S]*id="airportTimeZoneUtc"/, "airport basics follow the required field priority");
assert.doesNotMatch(indexSource, /id="airportTrafficDate"|id="airportLocalTime"|id="airportTimeZone"/, "dynamic statistics date and local-time detail fields are removed");
assert.doesNotMatch(indexSource, /airportGroundSynopsis|停场总数.*已返回明细.*即将入场.*当前显示/, "ground summary sentence is removed");
assert.match(indexSource, /id="airportSorties">—<\/strong><span>今日架次<\/span>/, "dynamic total is labelled 今日架次");

assert.match(appSource, /airportSegment:\s*"ground"/, "airport selection defaults to the ground tab");
assert.match(appSource, /const\s+airportDetailSegments\s*=\s*\["ground",\s*"dynamic",\s*"operations",\s*"airport"\]/, "airport tab order follows the four-section IA");
assert.doesNotMatch(appSource, /airportGroundPageSize|airportGroundVisibleCount|airportGroundLoadMore/, "ground aircraft are no longer truncated by local pagination");
assert.doesNotMatch(appSource, /slice\(0,\s*18\)/, "legacy 18-row ground truncation is removed");
assert.match(appSource, /function\s+airportGroundPlaneIsInTransit\(plane\)[\s\S]*?plane\.flightState\s*===\s*30/, "flightState 30 is treated as in-transit");
assert.match(appSource, /function\s+groundTimeSeconds\(plane\)[\s\S]*?plane\?\.groundTime/, "numeric groundTime drives duration layers");
assert.match(appSource, /function\s+airportGroundDurationLabel\(plane\)[\s\S]*?seconds\s*<\s*86400[\s\S]*?return\s*"今日入场"/, "ground stays shorter than one day are labelled 今日入场");
assert.match(appSource, /停场 \$\{Math\.max\(1, Math\.floor\(seconds \/ 86400\)\)\} 天[\s\S]*?停场 \$\{Math\.max\(1, Math\.round\(seconds \/ 2592000\)\)\} 个月/, "ground day and month durations use Chinese units");
assert.match(appSource, /function\s+groundPlaneRegistrationState\(plane\s*=\s*\{\}\)[\s\S]*?registrationClear[\s\S]*?state:\s*"hidden"[\s\S]*?display:\s*NA_TEXT[\s\S]*?state:\s*"clear"/, "ground registrations use clear fields and fall back to N/A");
assert.doesNotMatch(appSource.match(/function\s+renderGroundPlaneRows[\s\S]*?^}/m)?.[0] || "", /已共享|已营运|部分公开|未公开/, "ground cards omit service/share and disclosure-state labels");
assert.doesNotMatch(appSource.match(/function\s+groundPlaneOperatorMeta[\s\S]*?^}/m)?.[0] || "", /托管|运营/, "ground cards show company names without 托管/运营 suffixes");
assert.match(appSource, /function\s+airportGroundCompositionFromPlanes\(airport, dimension\)[\s\S]*?airportGroundPlanes\(airport\)[\s\S]*?existing\.count \+= 1/, "model and brand composition is derived from returned aircraft rows");
assert.match(appSource, /function\s+airportReportedGroundCount\(airport,[\s\S]*?groundNum[\s\S]*?Math\.max/, "reported 513014 ground count is kept separate from returned detail rows");
assert.match(appSource, /airportGroundUnavailable[\s\S]*?missingDetailCount[\s\S]*?513014 当前未返回注册号、机型及停场时间明细/, "missing 513014 detail rows are explained without fabricated cards");
assert.match(appSource, /即将入场[\s\S]*?renderGroundPlaneRows\(airport,\s*data\.inTransit\)/, "all inbound aircraft cards are rendered as 即将入场");
assert.match(appSource, /function\s+renderDailyStatistics\(dynamic\)[\s\S]*?dailyStatistics/, "513015 dailyStatistics is rendered");
assert.match(appSource, /function\s+renderTotalStatistics\(dynamic,\s*range\)[\s\S]*?totalStatistics/, "513015 totalStatistics is rendered");
assert.match(appSource, /function\s+renderAirportOperationsPanel\(airport\)[\s\S]*?popularModels[\s\S]*?renderOriginDest\(dynamic,\s*range\)/, "513015 model and origin/destination datasets are rendered");
assert.match(appSource, /function\s+airportMovementLocalDepartureSortValue\(item, airport\)[\s\S]*?Number\.POSITIVE_INFINITY[\s\S]*?function\s+renderAirportDynamicPanel\(airport\)[\s\S]*?airportMovementLocalDepartureSortValue\(a, airport\)[\s\S]*?airport-timeline-axis[\s\S]*?airport-movement-registration[\s\S]*?airport-movement-route[\s\S]*?airport-movement-time-pair[\s\S]*?airport-timeline-time-depart[\s\S]*?<em>起飞<\/em>[\s\S]*?airport-timeline-time-arrive[\s\S]*?<em>到达<\/em>/, "dynamic tab renders a local-departure-time-sorted timeline with paired times below the route");
assert.match(appSource, /function\s+airportMovementActualTimeLabel\(ref, airport, fallback\s*=\s*""\)[\s\S]*?value === NA_TEXT \? "N\/A" : value/, "missing movement times consistently render as N/A");
assert.match(appSource, /function\s+airportMovementModelLabel\(source\s*=\s*\{\}\)[\s\S]*?groundPlaneDirectValue\(modelSource\.modelName[\s\S]*?return `\$\{brand\} \$\{model\}`/, "dynamic cards render the complete aircraft model while avoiding duplicate brand prefixes");
assert.match(appSource, /function\s+airportRelatedFlightItems\(airport\)[\s\S]*?airportLiveMovementItems\(airport\)[\s\S]*?airportDynamicInterfaceItems\(airport\)[\s\S]*?airportGroundFallbackMovementItems\(airport\)/, "dynamic rows prioritize live operations and merge today's ground arrivals");
assert.match(appSource, /function\s+discoverAirportMovementDetails\(airport\)[\s\S]*?getFlightTrack\(seed\.uniqueKey\)[\s\S]*?airportDirectionForJet/, "dynamic rows are discovered from 513009 live-operation details on demand");
assert.match(appSource, /function\s+discoverAirportMovementHistory\(airport\)[\s\S]*?getFlightHistory\(airportMovementHistoryRequestTailNo\(plane\)[\s\S]*?airportMovementHistoryMatch\(airport, plane, detail\)/, "missing ground-arrival origins are enriched from 513013 history records");
assert.match(appSource, /function\s+airportMovementHistoryMatch\(airport, plane, detail\)[\s\S]*?airportMovementHistoryArrivesAt\(flight, airport\)[\s\S]*?maxArrivalDeltaMs/, "history enrichment matches the selected arrival airport and guards the arrival-time delta");
assert.match(appSource, /function\s+historyAirportDisplay\(item, side\)[\s\S]*?const name = missingValue\(matchedName\) \? "未知机场" : matchedName/, "N/A airport names are correctly recognized as missing before enrichment");
assert.match(appSource, /function\s+airportGroundPlaneIsCurrentMovement\(airport, plane\)[\s\S]*?arrivalDate === airportBoardLocalDate\(airport\)[\s\S]*?function\s+airportGroundFallbackMovementItems\(airport\)[\s\S]*?airportGroundPlaneIsCurrentMovement\(airport, plane\)/, "old parked arrivals are excluded from today's dynamic board");
assert.doesNotMatch(appSource.match(/function\s+renderAirportDynamicPanel[\s\S]*?^}/m)?.[0] || "", /trusteeship|serviceProvider|托管/, "dynamic cards omit trustee/operator content");
assert.match(appSource, /label:\s*"到达"/, "arrival state is labelled 到达");
assert.match(appSource, /function\s+utcStandardOffsetLabelForZone\(zone,[\s\S]*?padStart\(2, "0"\)[\s\S]*?`UTC\$\{sign}\$\{hours}:\$\{minutes}`[\s\S]*?function\s+formatAirportTimeZone\(airport\)[\s\S]*?utcStandardOffsetLabelForZone\(zone, nowEpochMs\)/, "airport basic timezone uses UTC+HH:MM standard format");
assert.match(appSource, /function\s+sanitizeAirportContentHtml\(html\)[\s\S]*?allowedTags[\s\S]*?rel",\s*"noopener"/, "approval content is sanitized with a small HTML whitelist");
assert.match(appSource, /function\s+setAirportPanelTab\(tab\)[\s\S]*?state\.airportTab\s*===\s*"ground"[\s\S]*?loadAirportGround\(airport\);/, "legacy search ground tab still lazy-loads 513014");

assert.match(stylesSource, /\.airport-detail-v120\s*\{/, "v1.20 styles are scoped to the airport panel");
assert.match(stylesSource, /background:\s*#212630/, "airport bottom tab bar uses the required independent control background");
assert.match(stylesSource, /\.airport-detail-v120\s+\.airport-detail-segments\s*{[\s\S]*?repeat\(4,\s*minmax\(0,\s*1fr\)\)/, "airport bottom bar is laid out as four equal tabs");
assert.match(stylesSource, /\.airport-detail-v120\s+\.airport-dynamic-kpis\s*{[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/, "dynamic summary is laid out as three metrics");
assert.match(stylesSource, /\.airport-detail-v120\s+\.airport-primary-info\s+\.airport-info-wide/, "Chinese and English airport names span the basic-info grid");
assert.match(stylesSource, /\.airport-detail-v120\s+\.airport-movement-card\s*\{[\s\S]*?grid-template-columns:\s*14px minmax\(0, 1fr\)[\s\S]*?min-height:\s*152px/, "dynamic timeline gives the route the full card width");
assert.match(stylesSource, /\.airport-detail-v120\s+\.airport-movement-time-pair\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 0\.9fr\) 26px minmax\(0, 1\.1fr\)/, "departure and arrival times are paired beneath their airport columns");
assert.match(stylesSource, /\.airport-detail-v120\s+\.airport-timeline-axis::before\s*\{[\s\S]*?top:\s*-12px[\s\S]*?bottom:\s*-12px[\s\S]*?width:\s*1px/, "dynamic rows use a continuous vertical timeline");
assert.match(stylesSource, /\.airport-detail-v120\s+\.ground-plane-row-v120/, "ground row v1.20 styles exist");
assert.match(stylesSource, /\.airport-detail-v120\s+\.airport-info-tag\[data-tone="restriction"\]/, "restriction tags are visually distinguished");

console.log("airport selected panel v1.20: ok");
