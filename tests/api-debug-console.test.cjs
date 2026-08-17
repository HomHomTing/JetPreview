const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function readProjectFile(filename) {
  return fs.readFileSync(path.join(rootDir, filename), "utf8");
}

const appSource = readProjectFile("app.js");
const dataServiceSource = readProjectFile("data-service.js");
const configSource = readProjectFile("config.js");
const exampleConfigSource = readProjectFile("config.example.js");

assert.match(configSource, /apiDebugConsole:\s*{[\s\S]*?enabled:\s*true[\s\S]*?allowedHlUserIds:\s*\["96168449584896"\]/, "private config enables the debug console only for the owner's hlUserId");
assert.match(exampleConfigSource, /apiDebugConsole:\s*{[\s\S]*?enabled:\s*false[\s\S]*?allowedHlUserIds:\s*\[\][\s\S]*?allowPublicHost:\s*false/, "example config keeps the debug console disabled on public hosts by default");
assert.match(appSource, /function\s+apiDebugConsoleHostAllowed\(\)[\s\S]*?allowPublicHost\s*===\s*true[\s\S]*?192\\.168\\\./, "debug console is limited to local file, localhost, and LAN hosts unless explicitly overridden");
assert.match(appSource, /function\s+apiDebugConsoleAuthorized\(\)[\s\S]*?config\.enabled\s*===\s*true[\s\S]*?apiDebugConsoleHostAllowed\(\)[\s\S]*?apiDebugAllowedUserIds\(\)\.includes\(userId\)/, "debug console requires explicit enablement, allowed runtime host, and allowed hlUserId match");
assert.match(appSource, /function\s+createApiDebugConsole\(\)[\s\S]*?id="apiDebugToggle"[\s\S]*?id="apiDebugConsole"/, "debug console UI is created dynamically only after authorization");
assert.match(dataServiceSource, /new\s+CustomEvent\("bizjet:api-debug"[\s\S]*?detail/, "data service emits local debug events for API request observation");
assert.match(appSource, /selectedApiDebugSections\(\)[\s\S]*?pid:\s*"513008"[\s\S]*?pid:\s*"513009"[\s\S]*?pid:\s*"513011"[\s\S]*?pid:\s*"513013"/, "aircraft debug view covers realtime, track, aircraft base info, and flight history APIs");
assert.match(appSource, /selectedApiDebugSections\(\)[\s\S]*?pid:\s*"513010"[\s\S]*?pid:\s*"513014"[\s\S]*?pid:\s*"513015"/, "airport debug view covers airport base, ground, and dynamic APIs");
assert.match(appSource, /function\s+maybeLoadApiDebugSelectionDetails\([\s\S]*?state\.apiDebug\.open[\s\S]*?loadAircraftHistory\(jet\)[\s\S]*?loadAirportGround\(airport\)/, "debug console only auto-loads extra associated APIs while the owner's console is open");
assert.match(appSource, /const\s+API_DEBUG_REQUESTS_STORAGE_KEY\s*=\s*"bizjet-api-debug-requests:v1"/, "debug console request logs have a persistent storage key");
assert.match(appSource, /function\s+hydrateApiDebugPersistentState\(\)[\s\S]*?API_DEBUG_REQUESTS_STORAGE_KEY[\s\S]*?lastSelectionSnapshot/, "debug console hydrates request logs and retained selection data after refresh");
assert.match(appSource, /function\s+persistApiDebugRequests\(\)[\s\S]*?apiDebugPersistableRequest[\s\S]*?apiDebugWriteStorage\(API_DEBUG_REQUESTS_STORAGE_KEY/, "debug console persists request logs instead of resetting on page refresh");
assert.match(appSource, /const\s+API_DEBUG_WINDOW_NAME_PREFIX\s*=\s*"BIZJET_API_DEBUG:"[\s\S]*?function\s+apiDebugReadWindowNameStore\(\)/, "debug console falls back to window.name when localStorage is unavailable");
assert.match(appSource, /function\s+apiDebugCallsignReport\(raw,\s*adapted\s*=\s*null\)[\s\S]*?const\s+adaptedCallsignValue[\s\S]*?hasDisplayValue[\s\S]*?航班号已返回/, "debug console treats adapted callsign values as returned flight numbers");
assert.match(appSource, /function\s+renderApiDebugCallsignReport\(report\)[\s\S]*?航班号返回状态[\s\S]*?当前展示值/, "debug console renders flight number return status and value in the UI");
assert.match(appSource, /function\s+apiDebugSectionCallsignReport\(section\)[\s\S]*?apiDebugCallsignReport\(section\.raw,\s*section\.adapted\)/, "debug console recomputes retained selection callsign status from saved raw and adapted data");

console.log("api debug console: ok");
