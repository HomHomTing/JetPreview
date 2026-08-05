(function () {
  const BLOCKED_PIDS = new Set(["513012"]);

  const DEFAULT_API = {
    enabled: false,
    baseUrl: "",
    accountType: "web_map",
    authorizedUser: {},
    requestTimeoutMs: 12000,
    refreshMs: 4200,
    detailCacheMs: 300000,
    snapshotPid: "513008",
    airportRefreshMs: 300000,
    requireLiveData: true,
    useMockOnError: false
  };

  const SIZE_CLASS_BY_PLANE_SIZE = {
    "民航型": "long-range",
    "超远程": "ultra-long",
    "大型": "long-range",
    "超中型": "super-midsize",
    "中型": "midsize",
    "轻型": "light",
    "超轻型": "light"
  };

  const FLIGHT_STATE_LABELS = {
    10: "Pending",
    20: "Scheduled",
    30: "Live",
    40: "Landed",
    50: "Cancelled"
  };

  function create(config, iconContext) {
    return new BizJetDataService(config, iconContext);
  }

  class BizJetDataService {
    constructor(config = {}, iconContext = {}) {
      this.config = normalizeApiConfig(config.api);
      this.iconContext = iconContext;
      this.cache = {
        flightTrack: new Map(),
        planeDetail: new Map(),
        airportDetail: new Map()
      };
    }

    isEnabled() {
      return Boolean(this.config.enabled && this.config.baseUrl);
    }

    refreshMs() {
      return this.config.refreshMs;
    }

    async getRealtimeSnapshot(params = {}) {
      const payload = await this.request(this.config.snapshotPid, params);
      if (!payloadHasSnapshotShape(payload)) {
        throw new Error(`API ${this.config.snapshotPid} returned no snapshot data`);
      }
      return adaptRealtimeSnapshot(payload, this.iconContext, params);
    }

    async getViewportSnapshot(params = {}) {
      return this.getRealtimeSnapshot(params);
    }

    async getFlightTrack(uniqueKey) {
      return this.cached("flightTrack", uniqueKey, async () => {
        const payload = await this.request("513009", { uniqueKey });
        return adaptFlightTrack(payload, this.iconContext);
      });
    }

    async getAirportDetail(airportCode) {
      return this.cached("airportDetail", airportCode, async () => {
        const payload = await this.request("513010", { airportCode });
        return adaptAirportDetail(payload);
      });
    }

    async getPlaneDetail(tailNo) {
      return this.cached("planeDetail", tailNo, async () => {
        const payload = await this.request("513011", { tailNo });
        return adaptPlaneDetail(payload, this.iconContext);
      });
    }

    async cached(type, key, loader) {
      if (!key) {
        return null;
      }
      const cache = this.cache[type];
      const cached = cache.get(key);
      if (cached && Date.now() - cached.loadedAt < this.config.detailCacheMs) {
        return cached.value;
      }
      const value = await loader();
      cache.set(key, { value, loadedAt: Date.now() });
      return value;
    }

    async request(pid, params = {}) {
      if (!this.isEnabled()) {
        throw new Error("API access is disabled");
      }

      const requestPid = String(pid || "").trim();
      if (BLOCKED_PIDS.has(requestPid)) {
        throw new Error(`API ${requestPid} requests are disabled`);
      }

      const body = new URLSearchParams({
        pid: requestPid,
        accountType: this.config.accountType,
        authorizedUser: JSON.stringify(this.config.authorizedUser || {}),
        ...serializeRequestParams(params)
      });

      const text = await postForm(this.config.baseUrl, body, this.config.requestTimeoutMs, requestPid);
      try {
        return unwrapPayload(JSON.parse(text));
      } catch (error) {
        throw new Error(`API ${requestPid} returned non-JSON data`);
      }
    }
  }

  async function postForm(url, body, timeoutMs, pid) {
    if (typeof fetch === "function") {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`API ${pid} returned ${response.status}`);
        }
        return response.text();
      } finally {
        window.clearTimeout(timeout);
      }
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
          return;
        }
        reject(new Error(`API ${pid} returned ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error(`API ${pid} network error`));
      xhr.ontimeout = () => reject(new Error(`API ${pid} timed out`));
      xhr.send(body.toString());
    });
  }

  function normalizeApiConfig(api = {}) {
    return {
      ...DEFAULT_API,
      ...api,
      authorizedUser: typeof api.authorizedUser === "string"
        ? parseAuthorizedUser(api.authorizedUser)
        : api.authorizedUser || DEFAULT_API.authorizedUser
    };
  }

  function parseAuthorizedUser(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return DEFAULT_API.authorizedUser;
    }
  }

  function serializeRequestParams(params = {}) {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => {
          if (typeof value === "boolean") {
            return [key, value ? "true" : "false"];
          }
          if (typeof value === "object") {
            return [key, JSON.stringify(value)];
          }
          return [key, String(value)];
        })
    );
  }

  function unwrapPayload(json) {
    if (!json || typeof json !== "object") {
      return {};
    }
    if (json.data && typeof json.data === "object") {
      return json.data;
    }
    if (typeof json.data === "string") {
      try {
        return JSON.parse(json.data);
      } catch (error) {
        return json;
      }
    }
    if (json.result && typeof json.result === "object") {
      return json.result;
    }
    if (typeof json.result === "string") {
      try {
        return JSON.parse(json.result);
      } catch (error) {
        return json;
      }
    }
    if (json.obj && typeof json.obj === "object") {
      return json.obj;
    }
    if (typeof json.obj === "string") {
      try {
        return JSON.parse(json.obj);
      } catch (error) {
        return json;
      }
    }
    return json;
  }

  function payloadHasSnapshotShape(payload) {
    return Boolean(payload && typeof payload === "object" && (
      Array.isArray(payload.aircraft)
        || Array.isArray(payload.flyingPlanes)
        || Array.isArray(payload.airportList)
        || payload.totalMatched !== undefined
    ));
  }

  function adaptRealtimeSnapshot(payload, iconContext, requestParams = {}, sourcePid = "513008") {
    const airports = Array.isArray(payload.airportList)
      ? payload.airportList.map(adaptAirportListItem).filter(Boolean)
      : [];
    const aircraftSource = Array.isArray(payload.aircraft)
      ? payload.aircraft
      : Array.isArray(payload.flyingPlanes)
        ? payload.flyingPlanes
        : [];
    const aircraft = aircraftSource
      .map((item, index) => adaptAircraftRecord(item, index, iconContext, sourcePid, requestParams))
      .filter(Boolean);
    const removed = Array.isArray(payload.removedAircraftUniqueKeys)
      ? payload.removedAircraftUniqueKeys.map((value) => String(value))
      : [];
    const loadedAt = Date.now();

    return {
      loadedAt,
      airports,
      aircraft,
      counts: {
        airports: airports.length,
        aircraft: aircraft.length,
        totalMatched: toInteger(payload.totalMatched, aircraft.length)
      },
      viewportVersion: firstValue(payload.viewportVersion, payload.version, `vp_${loadedAt}`),
      ttlMs: toInteger(payload.ttlMs, toInteger(requestParams.ttlMs, 3000)),
      totalMatched: toInteger(payload.totalMatched, aircraft.length),
      truncated: Boolean(payload.truncated || aircraft.length < toInteger(payload.totalMatched, aircraft.length)),
      bounds: payload.bounds || {
        north: toNumber(requestParams.north),
        south: toNumber(requestParams.south),
        west: toNumber(requestParams.west),
        east: toNumber(requestParams.east)
      },
      removedAircraftUniqueKeys: removed,
      sourcePid,
      raw: payload
    };
  }

  function adaptAircraftRecord(item, index, iconContext, sourcePid, requestParams) {
    if (item.coordinate || item.aircraftTypeCode || item.category === "J" || item.groundSpeedKt !== undefined) {
      return adaptViewportAircraft(item, index, iconContext, sourcePid, requestParams);
    }
    return adaptFlyingPlane(item, index, iconContext, sourcePid, requestParams);
  }

  function adaptAirportListItem(item) {
    const lat = toNumber(item.lat);
    const lng = toNumber(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const airportCode = cleanCode(item.airportCode);
    const icaoCode = cleanCode(item.icaoCode);
    const id = icaoCode || airportCode;
    if (!id) {
      return null;
    }
    const name = firstValue(item.airportNameEn, item.airportName, item.airportFourName, id);
    const city = firstValue(item.cityName, item.airportFourName, item.airportName, "");
    const ground = toInteger(item.groundNum, 0);
    const displayLevel = normalizeAirportLevel(item.level, ground);
    const trafficScore = toInteger(item.trafficScore, Math.round(ground * 1.8));
    return {
      id,
      iata: airportCode || id,
      icaoCode,
      airportCode,
      name,
      city,
      country: "",
      lat,
      lng,
      elevation: null,
      elevationMeters: null,
      runways: "-",
      departures: 0,
      arrivals: 0,
      ground,
      delay: "-",
      weather: "-",
      level: displayLevel,
      displayLevel,
      trafficScore,
      businessJetScore: toInteger(item.businessJetScore, Math.min(100, Math.round(ground * 1.8))),
      markerSize: airportMarkerSizeForLevel(displayLevel),
      labelMode: "auto",
      airportType: firstValue(item.airportType, "commercial"),
      hasScheduledPassenger: item.hasScheduledPassenger ?? true,
      hasFbo: item.hasFbo ?? ground > 0,
      source: "513008",
      raw: item
    };
  }

  function normalizeAirportLevel(value, ground = 0) {
    const explicit = toInteger(value, null);
    if (explicit !== null) {
      return Math.max(1, Math.min(5, explicit));
    }
    if (ground >= 30) return 1;
    if (ground >= 18) return 2;
    if (ground >= 10) return 3;
    if (ground >= 4) return 4;
    return 5;
  }

  function airportMarkerSizeForLevel(level) {
    if (level <= 2) return "major";
    if (level <= 4) return "medium";
    return "small";
  }

  function adaptFlyingPlane(item, index, iconContext, sourcePid = "513008", requestParams = {}) {
    const coordinate = item.coordinate || {};
    const lat = toNumber(coordinate.lat);
    const lng = toNumber(coordinate.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const uniqueKey = String(firstValue(item.uniqueKey, `live-${index}`));
    const planeSize = firstValue(item.planeSize, "中型");
    const sizeClass = SIZE_CLASS_BY_PLANE_SIZE[planeSize] || "midsize";
    const iconKey = iconContext.aircraftIconKeyByTypeCode?.BIZ || iconContext.defaultBusinessJetIconKey || "lj45";
    return {
      id: uniqueKey,
      uniqueKey,
      tailNoEncrypted: item.tailNo || "",
      callsign: makeProtectedCallsign(uniqueKey),
      registration: "Protected",
      model: planeSize,
      category: sizeClass,
      sizeClass,
      family: planeSize,
      operator: item.companyId ? `Operator ${item.companyId}` : "Business aviation",
      companyId: item.companyId || "",
      companyLogo: item.companyLogo || "",
      from: "-",
      to: "-",
      altitude: normalizeAltitude(item.altitudeFt ?? item.altitude ?? item.altitudeM),
      speed: normalizeSpeed(item.groundSpeedKt ?? item.speedKt ?? item.speed ?? item.groundSpeed),
      verticalSpeed: toNumber(item.verticalSpeed ?? item.verticalSpeedFpm),
      squawk: "-",
      progress: 0,
      status: item.shareState === 0 ? "Limited" : "Live",
      source: `${sourcePid} realtime`,
      depart: "-",
      arrive: "-",
      route: [[lat, lng]],
      livePosition: [lat, lng],
      heading: normalizeCourse(coordinate.course),
      updatedAtEpochMs: normalizeEpochMs(item.updatedAtEpochMs || item.updatedAt || item.createTime) || Date.now(),
      viewportTtlMs: toInteger(requestParams.ttlMs, 3000),
      quality: firstValue(item.quality, "good"),
      dataCategory: "business_jet",
      shareState: item.shareState,
      international: item.international,
      planeSize,
      aircraftTypeCode: "BIZ",
      fr24IconKey: iconKey,
      raw: item
    };
  }

  function adaptViewportAircraft(item, index, iconContext, sourcePid = "513008", requestParams = {}) {
    const coordinate = item.coordinate || item.position || {};
    const lat = toNumber(coordinate.lat ?? item.lat ?? item.latitude);
    const lng = toNumber(coordinate.lng ?? coordinate.lon ?? item.lng ?? item.lon ?? item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const uniqueKey = String(firstValue(item.uniqueKey, item.id, item.flightId, `live-${index}`));
    const typeCode = cleanCode(item.aircraftTypeCode || item.icaoCode || item.modelSeries || item.typeCode);
    const iconKey = typeCode
      ? iconContext.aircraftIconKeyByTypeCode?.[typeCode] || iconContext.defaultBusinessJetIconKey || "LJ60"
      : iconContext.defaultBusinessJetIconKey || "LJ60";
    const model = firstValue(item.model, item.modelNameEn, item.modelName, item.planeSize, typeCode, "Business jet");
    const sizeClass = firstValue(item.sizeClass, SIZE_CLASS_BY_PLANE_SIZE[item.planeSize], null);
    return {
      id: uniqueKey,
      uniqueKey,
      tailNoEncrypted: item.tailNo || item.tailNoEncrypted || "",
      callsign: firstValue(item.callsign, item.flight, makeProtectedCallsign(uniqueKey)),
      registration: firstValue(item.registration, item.tailNoDisplay, "Protected"),
      model,
      category: sizeClass || "midsize",
      sizeClass: sizeClass || "midsize",
      family: firstValue(item.family, item.planeSize, model),
      operator: firstValue(item.operator, item.operatorName, item.companyName, item.companyId ? `Operator ${item.companyId}` : "Business aviation"),
      companyId: item.companyId || "",
      companyLogo: item.companyLogo || "",
      from: cleanCode(item.departureAirport || item.from || item.depIcaoCode) || "-",
      to: cleanCode(item.arrivalAirport || item.to || item.arrIcaoCode) || "-",
      altitude: normalizeAltitude(item.altitudeFt ?? item.altitude ?? item.altitudeM),
      speed: normalizeSpeed(item.groundSpeedKt ?? item.speedKt ?? item.speed ?? item.groundSpeed),
      verticalSpeed: toNumber(item.verticalSpeedFpm ?? item.verticalSpeed),
      squawk: firstValue(item.squawk, "-"),
      progress: toNumber(item.progress) || 0,
      status: firstValue(item.status, item.flightStateStr, "Live"),
      source: firstValue(item.source, `${sourcePid} viewport`),
      depart: firstValue(item.depart, item.departedTime, "-"),
      arrive: firstValue(item.arrive, item.arrivalTime, "-"),
      route: [[lat, lng]],
      livePosition: [lat, lng],
      heading: normalizeCourse(coordinate.course ?? coordinate.heading ?? item.heading ?? item.course),
      updatedAtEpochMs: normalizeEpochMs(item.updatedAtEpochMs || item.updatedAt || item.timestamp || item.createTime) || Date.now(),
      viewportTtlMs: toInteger(requestParams.ttlMs, 3000),
      quality: firstValue(item.quality, "good"),
      dataCategory: firstValue(item.aircraftCategory, item.category, "business_jet"),
      aircraftTypeCode: typeCode || "BIZ",
      fr24IconKey: iconKey,
      displayPriority: toInteger(item.displayPriority, 0),
      raw: item
    };
  }

  function adaptFlightTrack(payload, iconContext) {
    const base = payload.flightBaseInfo || {};
    const plane = payload.planeInfo || {};
    const summary = payload.summaryInfo || {};
    const serviceProvider = payload.serviceProvider || {};
    const coordinates = Array.isArray(payload.coordinates)
      ? payload.coordinates.map(adaptTrackPoint).filter(Boolean)
      : [];
    const route = coordinates.map((point) => [point.lat, point.lng]);
    const lastPoint = coordinates[coordinates.length - 1] || null;
    const typeCode = cleanCode(plane.icaoCode || plane.modelSeries);
    const sizeClass = SIZE_CLASS_BY_PLANE_SIZE[plane.planeSize] || null;

    return {
      raw: payload,
      permissionInfo: payload.permissionInfo || {},
      airportInfo: payload.airportInfo || {},
      flightBaseInfo: base,
      planeInfo: plane,
      serviceProvider,
      summaryInfo: summary,
      coordinates,
      route,
      livePosition: lastPoint ? [lastPoint.lat, lastPoint.lng] : null,
      updates: {
        from: cleanCode(base.depIcaoCode || base.depAirport || payload.airportInfo?.dep?.icaoCode || payload.airportInfo?.dep?.airportCode) || "-",
        to: cleanCode(base.arrIcaoCode || base.arrAirport || payload.airportInfo?.arr?.icaoCode || payload.airportInfo?.arr?.airportCode) || "-",
        fromName: firstValue(base.depAirportName, payload.airportInfo?.dep?.airportNameEn, payload.airportInfo?.dep?.airportName, payload.airportInfo?.dep?.airportFourName),
        toName: firstValue(base.arrAirportName, payload.airportInfo?.arr?.airportNameEn, payload.airportInfo?.arr?.airportName, payload.airportInfo?.arr?.airportFourName),
        depart: displayTime(base.depTime1 || base.depTime2),
        arrive: displayTimeWithAcrossDays(base.arrTime1 || base.arrTime2, base.acrossDays),
        status: firstValue(base.flightStateStr, summary.flightStateStr, FLIGHT_STATE_LABELS[summary.flightState], "Live"),
        registration: firstValue(plane.tailNoDisplay, "Protected"),
        model: firstValue(plane.modelNameEn, plane.modelName),
        family: firstValue(plane.modelName, plane.modelNameEn, plane.planeSize),
        operator: firstValue(serviceProvider.companyNameShort, serviceProvider.companyName, plane.trusteeship),
        altitude: metersToFeet(summary.altitude ?? lastPoint?.altitude),
        speed: kmhToKnots(summary.speed ?? lastPoint?.speed),
        heading: normalizeCourse(lastPoint?.course),
        source: "513009 realtime track",
        aircraftTypeCode: typeCode,
        fr24IconKey: typeCode ? iconContext.aircraftIconKeyByTypeCode?.[typeCode] : null,
        sizeClass,
        planeSize: plane.planeSize
      }
    };
  }

  function adaptPlaneDetail(payload, iconContext) {
    const plane = payload.planeInfo || {};
    const serviceProvider = payload.serviceProvider || {};
    const typeCode = cleanCode(plane.icaoCode || plane.modelSeries);
    const sizeClass = SIZE_CLASS_BY_PLANE_SIZE[plane.planeSize] || null;
    return {
      raw: payload,
      permissionInfo: payload.permissionInfo || {},
      planeInfo: plane,
      serviceProvider,
      tripsForSale: payload.tripsForSale || [],
      groundPlans: payload.groundPlans || [],
      updates: {
        registration: firstValue(plane.tailNoDisplay, "Protected"),
        model: firstValue(plane.modelNameEn, plane.modelName),
        family: firstValue(plane.modelName, plane.modelNameEn, plane.planeSize),
        operator: firstValue(serviceProvider.companyNameShort, serviceProvider.companyName, plane.trusteeship),
        aircraftTypeCode: typeCode,
        fr24IconKey: typeCode ? iconContext.aircraftIconKeyByTypeCode?.[typeCode] : null,
        sizeClass,
        planeSize: plane.planeSize,
        source: "513011 aircraft profile"
      }
    };
  }

  function adaptAirportDetail(payload) {
    const info = payload.airportInfo || {};
    const weather = payload.weatherInfo || {};
    const flights = payload.flightsInfo || {};
    const ground = payload.groundInfo || {};
    const airportCode = cleanCode(info.airportCode);
    const icaoCode = cleanCode(info.icaoCode);
    const lat = toNumber(info.lat);
    const lng = toNumber(info.lon);
    const departures = toInteger(flights.outboundActually, 0) || toInteger(flights.outboundPlan, 0);
    const arrivals = toInteger(flights.inboundActually, 0) || toInteger(flights.inboundPlan, 0);
    const runwayCount = firstValue(info.runwayCount, "");
    const runwayLength = firstValue(info.runwayLength, "");

    return {
      raw: payload,
      date: payload.date || "",
      airportInfo: info,
      airportTerminals: payload.airportTerminals || [],
      weatherInfo: weather,
      weatherNotices: payload.weatherNotices || [],
      flightsInfo: flights,
      groundInfo: ground,
      airportNotices: payload.airportNotices || [],
      updates: {
        id: icaoCode || airportCode,
        iata: airportCode,
        icaoCode,
        airportCode,
        name: firstValue(info.airportNameEn, info.airportName),
        country: firstValue(info.countryName, ""),
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        elevation: metersToFeet(info.elevation),
        elevationMeters: toNumber(info.elevation),
        runways: runwayCount || runwayLength ? `${runwayCount || "-"} / ${runwayLength || "-"} m` : "-",
        departures,
        arrivals,
        ground: toInteger(ground.groundNum, 0),
        weather: formatWeather(weather),
        delay: flights.sortiesEstimate ? `${flights.sortiesEstimate} sorties` : "-",
        grade: info.grade,
        type: info.type,
        timeZone: info.timeZone,
        plateau: info.plateau
      }
    };
  }

  function adaptTrackPoint(item) {
    const lat = toNumber(item.lat);
    const lng = toNumber(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return {
      lat,
      lng,
      altitude: toNumber(item.altitude),
      speed: toNumber(item.speed),
      course: normalizeCourse(item.course),
      createTime: item.createTime || null,
      userMark: item.userMark
    };
  }

  function cleanCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function firstValue(...values) {
    return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") ?? "";
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function toInteger(value, fallback = 0) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeAltitude(value) {
    const number = toNumber(value);
    if (!Number.isFinite(number)) {
      return null;
    }
    return number > 0 && number <= 15000 ? Math.round(number * 3.28084) : Math.round(number);
  }

  function normalizeSpeed(value) {
    const number = toNumber(value);
    if (!Number.isFinite(number)) {
      return null;
    }
    return number > 650 ? Math.round(number * 0.539957) : Math.round(number);
  }

  function normalizeEpochMs(value) {
    if (!value) {
      return null;
    }
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number > 10000000000 ? number : number * 1000;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function metersToFeet(value) {
    const number = toNumber(value);
    return Number.isFinite(number) ? Math.round(number * 3.28084) : null;
  }

  function kmhToKnots(value) {
    const number = toNumber(value);
    return Number.isFinite(number) ? Math.round(number * 0.539957) : null;
  }

  function normalizeCourse(value) {
    const number = toNumber(value);
    return Number.isFinite(number) ? Math.round((number + 360) % 360) : null;
  }

  function displayTime(value) {
    if (!value) {
      return "-";
    }
    const text = String(value);
    return text.includes(" ") ? text.split(" ").pop().slice(0, 5) : text;
  }

  function displayTimeWithAcrossDays(value, acrossDays) {
    const time = displayTime(value);
    const days = toInteger(acrossDays, 0);
    return time !== "-" && days > 0 ? `${time} +${days}` : time;
  }

  function formatWeather(weather) {
    const parts = [weather.tmp, weather.weather, weather.wind].filter(Boolean);
    return parts.length ? parts.join(" / ") : "-";
  }

  function makeProtectedCallsign(uniqueKey) {
    const text = String(uniqueKey || "JET");
    return `JET${text.slice(-4).padStart(4, "0")}`;
  }

  window.BIZJET_DATA_SERVICE = {
    create,
    adapters: {
      adaptRealtimeSnapshot,
      adaptFlightTrack,
      adaptPlaneDetail,
      adaptAirportDetail
    },
    SIZE_CLASS_BY_PLANE_SIZE
  };
})();
