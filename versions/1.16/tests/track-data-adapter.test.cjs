const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const context = {
  console,
  URLSearchParams,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async () => {
    throw new Error("network disabled in adapter test");
  },
  window: {
    BIZJET_TIME: require("../time-utils.js")
  }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(rootDir, "data-service.js"), "utf8"), context);

const { adaptFlightTrack, adaptRealtimeSnapshot } = context.window.BIZJET_DATA_SERVICE.adapters;

const flightTrack = adaptFlightTrack({
  uniqueKey: "track-array",
  coordinates: [
    [31.2, 121.5, 3000, 210, 1800000000000, 85],
    [31.3, 121.7, 3600, 224, 1800000060000, 92]
  ],
  flightBaseInfo: {
    depTime1: 1800000000000,
    arrTime1: 1800003600000
  },
  planeInfo: {
    tailNo: "B-TEST",
    icaoCode: "GL7T"
  },
  summaryInfo: {}
}, {});

assert.equal(flightTrack.coordinates.length, 2, "array coordinates are retained in flight track detail");
assert.equal(flightTrack.coordinates[0].altitudeFt, 9843, "array altitude is retained and normalized to feet");
assert.equal(flightTrack.coordinates[0].groundSpeedKt, 210, "array speed is retained in knots");
assert.equal(flightTrack.coordinates[0].timestamp, 1800000000000, "array timestamp is retained as epoch ms");
assert.equal(flightTrack.coordinates[0].heading, 85, "array heading is retained");
assert.equal(flightTrack.route[0][0], 31.2, "flight route still derives latitude");
assert.equal(flightTrack.route[0][1], 121.5, "flight route still derives longitude");

const snapshot = adaptRealtimeSnapshot({
  flyingPlanes: [{
    uniqueKey: "snapshot-array",
    lat: 31.4,
    lon: 121.9,
    coordinate: { lat: 31.4, lng: 121.9, course: 96 },
    coordinates: [
      [31.2, 121.5, 2800, 205, 1800000000000],
      [31.4, 121.9, 3900, 232, 1800000060000]
    ],
    speed: 232,
    altitude: 3900,
    category: "J"
  }]
}, {}, {});

assert.equal(snapshot.aircraft[0].trackRoute[0].altitudeFt, 9186, "snapshot track keeps normalized altitude from array coordinates");
assert.equal(snapshot.aircraft[0].trackRoute[1].groundSpeedKt, 232, "snapshot track keeps speed from array coordinates");
assert.equal(snapshot.aircraft[0].trackRoute[1].timestamp, 1800000060000, "snapshot track keeps timestamp from array coordinates");

console.log("track data adapter: ok");
