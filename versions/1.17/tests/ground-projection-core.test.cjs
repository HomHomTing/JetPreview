const assert = require("node:assert/strict");
const projection = require("../ground-projection-core.js");

const london = [51.5074, -0.1278];
const summerNoon = Date.parse("2026-06-21T12:00:00Z");
const summerNight = Date.parse("2026-06-21T00:00:00Z");

const noonSun = projection.solarPositionAt(london[0], london[1], summerNoon);
assert.ok(noonSun.elevationDeg > 60 && noonSun.elevationDeg < 63, "London summer-noon solar elevation");
assert.ok(noonSun.azimuthDeg > 175 && noonSun.azimuthDeg < 185, "London summer-noon solar azimuth");

const nightProjection = projection.calculateGroundProjection({
  position: london,
  altitudeAglM: 120,
  timestamp: summerNight
});
assert.equal(nightProjection.visible, false);
assert.equal(nightProjection.hiddenReason, "night");

const cruiseProjection = projection.calculateGroundProjection({
  position: london,
  altitudeAglM: 501,
  timestamp: summerNoon
});
assert.equal(cruiseProjection.visible, false);
assert.equal(cruiseProjection.hiddenReason, "above-threshold");

const lowAltitudeProjection = projection.calculateGroundProjection({
  position: london,
  altitudeAglM: 120,
  timestamp: summerNoon
});
assert.equal(lowAltitudeProjection.visible, true);
assert.ok(lowAltitudeProjection.shadowDistanceM > 60 && lowAltitudeProjection.shadowDistanceM < 80);
assert.ok(Math.abs(((lowAltitudeProjection.shadowBearingDeg - noonSun.azimuthDeg + 360) % 360) - 180) < 0.000001);
assert.ok(projection.distanceMetersBetween(london, lowAltitudeProjection.projectionPosition) > 60);

const oneKilometerEast = projection.destinationCoordinate([0, 0], 90, 1000);
assert.ok(Math.abs(oneKilometerEast[0]) < 0.000001);
assert.ok(Math.abs(oneKilometerEast[1] - 0.0089932) < 0.00001);
assert.ok(Math.abs(projection.distanceMetersBetween([0, 0], oneKilometerEast) - 1000) < 0.5);

const visualAtGlobalZoom = projection.visualProjectionDestination({
  position: london,
  zoom: 3,
  offsetPx: 10,
  bearingDeg: 135
});
assert.equal(visualAtGlobalZoom.offsetPx, 10);
assert.ok(visualAtGlobalZoom.distanceM > 100000, "global visual projection remains visibly separated");
assert.ok(Math.abs(
  projection.distanceMetersBetween(london, visualAtGlobalZoom.projectionPosition) - visualAtGlobalZoom.distanceM
) < 2);

const visualAtAirportZoom = projection.visualProjectionDestination({
  position: london,
  zoom: 10,
  offsetPx: 10,
  bearingDeg: 135
});
assert.ok(visualAtAirportZoom.distanceM < visualAtGlobalZoom.distanceM / 100);

const onGroundProjection = projection.calculateGroundProjection({
  position: london,
  altitudeAglM: 0,
  timestamp: summerNoon
});
assert.equal(onGroundProjection.hiddenReason, "on-ground");

console.log("ground projection core: ok");
