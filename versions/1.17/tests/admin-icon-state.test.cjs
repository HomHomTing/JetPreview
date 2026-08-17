const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.join(__dirname, "..");
const iconConfigSource = fs.readFileSync(path.join(rootDir, "aircraft-icon-config.js"), "utf8");
const adminSource = fs.readFileSync(path.join(rootDir, "admin.js"), "utf8");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStorage(seed = {}) {
  const store = { ...seed };
  return {
    store,
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem(key, value) {
        store[key] = String(value);
      },
      removeItem(key) {
        delete store[key];
      }
    }
  };
}

function loadAdmin(seedStorage = {}) {
  const storage = createStorage(seedStorage);
  const sandbox = {
    console,
    document: { addEventListener() {} },
    window: { localStorage: storage.localStorage }
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(iconConfigSource, sandbox, { filename: "aircraft-icon-config.js" });
  vm.runInNewContext(`${adminSource}\nwindow.__adminTest = { state, STORAGE_KEY, LEGACY_STORAGE_KEYS, RUNTIME_CONFIG_STORAGE_KEY };`, sandbox, { filename: "admin.js" });
  return { state: sandbox.window.__adminTest.state, constants: sandbox.window.__adminTest, store: storage.store };
}

function mappingIcon(state, code) {
  return state.mappings.find((item) => item.icaoCode === code)?.fr24IconKey;
}

function withMappingIcon(state, code, iconKey) {
  return {
    ...state,
    mappings: state.mappings.map((item) => item.icaoCode === code ? { ...item, fr24IconKey: iconKey } : item),
    publishedMappings: state.publishedMappings.map((item) => item.icaoCode === code ? { ...item, fr24IconKey: iconKey } : item)
  };
}

const seedLoad = loadAdmin();
const { STORAGE_KEY, LEGACY_STORAGE_KEYS, RUNTIME_CONFIG_STORAGE_KEY } = seedLoad.constants;
const seedState = seedLoad.state;

const currentCustomState = {
  ...withMappingIcon(clone(seedState), "GL7T", "LJ60"),
  schemaVersion: "1.12.0",
  publishedVersion: "icon-map-current-custom"
};
const currentReload = loadAdmin({ [STORAGE_KEY]: JSON.stringify(currentCustomState) }).state;
assert.equal(mappingIcon(currentReload, "GL7T"), "LJ60", "current 1.12 local plan must not be overwritten by seed config");

const legacyCustomState = {
  ...withMappingIcon(clone(seedState), "GL7T", "LJ60"),
  schemaVersion: "1.7.0",
  publishedVersion: "icon-map-legacy-custom"
};
const legacyReload = loadAdmin({ [LEGACY_STORAGE_KEYS[0]]: JSON.stringify(legacyCustomState) }).state;
assert.equal(mappingIcon(legacyReload, "GL7T"), "GL7T", "legacy state should still receive forced GL7T seed fix");

const runtimeRecoverState = {
  ...withMappingIcon(clone(seedState), "GL7T", "LJ60"),
  schemaVersion: "1.12.0",
  publishedVersion: "icon-map-runtime-recover",
  publishedAt: "2026-08-06T00:00:00+08:00",
  mapRuntimePublishedAt: "2026-08-06T00:00:00+08:00"
};
const runtimeReload = loadAdmin({
  [STORAGE_KEY]: JSON.stringify(runtimeRecoverState),
  [RUNTIME_CONFIG_STORAGE_KEY]: JSON.stringify({
    schemaVersion: "1.12.0",
    mappingVersion: "icon-map-runtime-recover",
    publishedAt: "2026-08-06T09:00:00+08:00",
    defaultIconKey: "LJ60",
    icaoCodeIconMap: { GL7T: "GL7T" }
  })
}).state;
assert.equal(mappingIcon(runtimeReload, "GL7T"), "GL7T", "published map runtime should recover aligned icon state on refresh");

const draftState = {
  ...withMappingIcon(clone(seedState), "GL7T", "LJ60"),
  publishedMappings: seedState.publishedMappings,
  schemaVersion: "1.12.0",
  publishedVersion: "icon-map-draft-protected"
};
const draftReload = loadAdmin({
  [STORAGE_KEY]: JSON.stringify(draftState),
  [RUNTIME_CONFIG_STORAGE_KEY]: JSON.stringify({
    schemaVersion: "1.12.0",
    mappingVersion: "icon-map-draft-protected",
    publishedAt: "2026-08-06T09:00:00+08:00",
    defaultIconKey: "LJ60",
    icaoCodeIconMap: { GL7T: "GL7T" }
  })
}).state;
assert.equal(mappingIcon(draftReload, "GL7T"), "LJ60", "runtime recovery must not overwrite an unpublished local draft");

console.log("admin icon state: ok");
