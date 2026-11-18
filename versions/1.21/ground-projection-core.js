(function attachAircraftGroundProjection(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.AIRCRAFT_GROUND_PROJECTION = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function createAircraftGroundProjection() {
  const earthRadiusM = 6371008.8;
  const solarPositionCache = new Map();

  function normalizeLongitude(longitude) {
    let value = Number(longitude);
    while (value < -180) value += 360;
    while (value > 180) value -= 360;
    return value;
  }

  function distanceMetersBetween(start, end) {
    if (!Array.isArray(start) || !Array.isArray(end)) {
      return Infinity;
    }
    const radians = Math.PI / 180;
    const lat1 = Number(start[0]) * radians;
    const lat2 = Number(end[0]) * radians;
    const deltaLat = (Number(end[0]) - Number(start[0])) * radians;
    const deltaLng = (Number(end[1]) - Number(start[1])) * radians;
    const haversine = Math.sin(deltaLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return earthRadiusM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
  }

  function solarPositionAt(latitude, longitude, timestamp) {
    const time = Number(timestamp);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(time) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const cacheKey = `${Math.floor(time / 30000)}:${lat.toFixed(2)}:${lng.toFixed(2)}`;
    if (solarPositionCache.has(cacheKey)) {
      return solarPositionCache.get(cacheKey);
    }
    const radians = Math.PI / 180;
    const daysSinceJ2000 = time / 86400000 - 0.5 + 2440588 - 2451545;
    const meanAnomaly = radians * (357.5291 + 0.98560028 * daysSinceJ2000);
    const equationOfCenter = radians * (
      1.9148 * Math.sin(meanAnomaly)
      + 0.02 * Math.sin(2 * meanAnomaly)
      + 0.0003 * Math.sin(3 * meanAnomaly)
    );
    const eclipticLongitude = meanAnomaly + equationOfCenter + radians * 102.9372 + Math.PI;
    const obliquity = radians * 23.4397;
    const declination = Math.asin(Math.sin(eclipticLongitude) * Math.sin(obliquity));
    const rightAscension = Math.atan2(
      Math.sin(eclipticLongitude) * Math.cos(obliquity),
      Math.cos(eclipticLongitude)
    );
    const siderealTime = radians * (280.16 + 360.9856235 * daysSinceJ2000) + lng * radians;
    const hourAngle = siderealTime - rightAscension;
    const latitudeRad = lat * radians;
    const elevationRad = Math.asin(
      Math.sin(latitudeRad) * Math.sin(declination)
      + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle)
    );
    const azimuthFromSouth = Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(latitudeRad) - Math.tan(declination) * Math.cos(latitudeRad)
    );
    const result = Object.freeze({
      azimuthDeg: (azimuthFromSouth / radians + 180 + 360) % 360,
      elevationDeg: elevationRad / radians,
      calculatedAt: time,
      source: "client-solar-position"
    });
    if (solarPositionCache.size > 2000) {
      solarPositionCache.clear();
    }
    solarPositionCache.set(cacheKey, result);
    return result;
  }

  function destinationCoordinate(position, bearingDeg, distanceM) {
    const radians = Math.PI / 180;
    const angularDistance = Number(distanceM) / earthRadiusM;
    const bearing = Number(bearingDeg) * radians;
    const latitude = Number(position[0]) * radians;
    const longitude = Number(position[1]) * radians;
    const targetLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angularDistance)
      + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const targetLongitude = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(targetLatitude)
    );
    return [targetLatitude / radians, normalizeLongitude(targetLongitude / radians)];
  }

  function metersPerPixelAtLatitude(latitude, zoom) {
    const latitudeRad = Number(latitude) * Math.PI / 180;
    const clampedLatitudeFactor = Math.max(0.01, Math.abs(Math.cos(latitudeRad)));
    return 156543.03392 * clampedLatitudeFactor / (2 ** Number(zoom));
  }

  function visualProjectionDestination(options = {}) {
    const position = options.position;
    const offsetPx = Math.max(0, Number(options.offsetPx) || 0);
    const distanceM = metersPerPixelAtLatitude(position?.[0], options.zoom) * offsetPx;
    return {
      projectionPosition: destinationCoordinate(position, options.bearingDeg ?? 135, distanceM),
      distanceM,
      offsetPx
    };
  }

  function calculateGroundProjection(options = {}) {
    const position = options.position;
    const altitudeAglM = Number(options.altitudeAglM);
    const maxAglM = Number(options.maxAglM ?? 500);
    const minSunElevationDeg = Number(options.minSunElevationDeg ?? 5);
    const maxDistanceM = Number(options.maxDistanceM ?? 1500);
    if (!Array.isArray(position) || !Number.isFinite(Number(position[0])) || !Number.isFinite(Number(position[1]))) {
      return { visible: false, hiddenReason: "invalid-position" };
    }
    if (!Number.isFinite(altitudeAglM)) {
      return { visible: false, hiddenReason: "altitude-unavailable" };
    }
    if (altitudeAglM <= 0) {
      return { visible: false, hiddenReason: "on-ground" };
    }
    if (altitudeAglM > maxAglM) {
      return { visible: false, hiddenReason: "above-threshold" };
    }
    const sun = solarPositionAt(position[0], position[1], options.timestamp);
    if (!sun) {
      return { visible: false, hiddenReason: "invalid-position" };
    }
    if (sun.elevationDeg < 0) {
      return { visible: false, hiddenReason: "night", sun };
    }
    if (sun.elevationDeg < minSunElevationDeg) {
      return { visible: false, hiddenReason: "low-sun", sun };
    }
    const rawDistanceM = altitudeAglM / Math.tan(sun.elevationDeg * Math.PI / 180);
    const clamped = rawDistanceM > maxDistanceM;
    const shadowDistanceM = Math.max(0, Math.min(maxDistanceM, rawDistanceM));
    const shadowBearingDeg = (sun.azimuthDeg + 180) % 360;
    return {
      visible: true,
      hiddenReason: null,
      sun,
      shadowBearingDeg,
      shadowDistanceM,
      projectionPosition: destinationCoordinate(position, shadowBearingDeg, shadowDistanceM),
      clamped
    };
  }

  return Object.freeze({
    calculateGroundProjection,
    destinationCoordinate,
    distanceMetersBetween,
    metersPerPixelAtLatitude,
    solarPositionAt,
    visualProjectionDestination
  });
}));
