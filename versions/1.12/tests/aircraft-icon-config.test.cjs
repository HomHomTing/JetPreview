const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadBrowserScript(fileName) {
  const filePath = path.join(__dirname, "..", fileName);
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(filePath, "utf8"), sandbox, { filename: filePath });
  return sandbox.window;
}

const iconWindow = loadBrowserScript("aircraft-icon-config.js");
const config = iconWindow.AIRCRAFT_ICON_CONFIG;

assert.equal(config.schemaVersion, "1.12.0");
assert.equal(config.icaoCodeIconMap.GL7T, "GL7T");
assert.equal(config.icaoCodeIconMap.GL8T, "GL8T");
assert.equal(config.icaoCodeIconMap.GA7C, "GA7C");
assert.equal(config.typeCodeIconMap.GL7T, config.icaoCodeIconMap.GL7T);
assert.equal(config.sampleTypeCatalog["Bombardier Global 7500"].aircraftTypeCode, "GL7T");
assert.equal(config.sampleTypeCatalog["Bombardier Global 8000"].fr24IconKey, "GL8T");
assert.equal(config.sampleTypeCatalog["Gulfstream G700"].fr24IconKey, "GA7C");
assert.ok(config.icaoCodeMappings.length > 400, "ICAO Code mapping table should be fully populated");
assert.ok(config.icaoCodeMappings.every((item) => item.icaoCode && item.aircraftTypeCode === item.icaoCode));

const runtimeWindow = loadBrowserScript("aircraft-icon-runtime-config.js");
const runtimeConfig = runtimeWindow.AIRCRAFT_ICON_RUNTIME_CONFIG;

assert.equal(runtimeConfig.schemaVersion, "1.12.0");
assert.equal(runtimeConfig.defaultIconKey, "LJ60");
assert.equal(Object.keys(runtimeConfig.icaoCodeIconMap).length, 0);

console.log("aircraft icon config: ok");
