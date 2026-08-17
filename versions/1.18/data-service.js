(function () {
  const BLOCKED_PIDS = new Set(["513012"]);
  const timeUtils = typeof window !== "undefined" ? window.BIZJET_TIME || null : null;

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
        airportDetail: new Map(),
        flightHistory: new Map(),
        airportGround: new Map(),
        airportDynamic: new Map()
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

    async getFlightHistory(tailNo) {
      return this.cached("flightHistory", tailNo, async () => {
        const payload = await this.request("513013", { tailNo });
        return adaptFlightHistory(payload);
      });
    }

    async getAirportGround(airportCode) {
      return this.cached("airportGround", airportCode, async () => {
        const payload = await this.request("513014", { airportCode });
        return adaptAirportGround(payload);
      });
    }

    async getAirportDynamic(airportCode) {
      return this.cached("airportDynamic", airportCode, async () => {
        const payload = await this.request("513015", { airportCode });
        return adaptAirportDynamic(payload);
      });
    }

    async cached(type, key, loader) {
      if (!key) {
        return null;
      }
      const cache = this.cache[type];
      const cached = cache.get(key);
      if (cached?.pending) {
        return cached.pending;
      }
      if (cached && Date.now() - cached.loadedAt < this.config.detailCacheMs) {
        return cached.value;
      }
      const pending = loader()
        .then((value) => {
          cache.set(key, { value, loadedAt: Date.now() });
          return value;
        })
        .catch((error) => {
          if (cache.get(key)?.pending === pending) {
            cache.delete(key);
          }
          throw error;
        });
      cache.set(key, { pending, loadedAt: Date.now() });
      return pending;
    }

    async request(pid, params = {}) {
      if (!this.isEnabled()) {
        throw new Error("API access is disabled");
      }

      const requestPid = String(pid || "").trim();
      if (BLOCKED_PIDS.has(requestPid)) {
        throw new Error(`API ${requestPid} requests are disabled`);
      }
      const startedAt = Date.now();
      let debugEventSent = false;

      const body = new URLSearchParams({
        pid: requestPid,
        accountType: this.config.accountType,
        authorizedUser: JSON.stringify(this.config.authorizedUser || {}),
        ...serializeRequestParams(params)
      });

      try {
        const text = await postForm(this.config.baseUrl, body, this.config.requestTimeoutMs, requestPid);
        try {
          const rawResponse = JSON.parse(text);
          const payload = unwrapPayload(rawResponse);
          debugEventSent = true;
          emitApiDebugEvent({
            status: "success",
            pid: requestPid,
            params: { ...params },
            rawResponse,
            payload,
            startedAt,
            receivedAt: Date.now(),
            durationMs: Date.now() - startedAt
          });
          return payload;
        } catch (error) {
          debugEventSent = true;
          emitApiDebugEvent({
            status: "error",
            pid: requestPid,
            params: { ...params },
            rawText: text,
            error: `API ${requestPid} returned non-JSON data`,
            startedAt,
            receivedAt: Date.now(),
            durationMs: Date.now() - startedAt
          });
          throw new Error(`API ${requestPid} returned non-JSON data`);
        }
      } catch (error) {
        if (!debugEventSent) {
          emitApiDebugEvent({
            status: "error",
            pid: requestPid,
            params: { ...params },
            error: error?.message || String(error),
            startedAt,
            receivedAt: Date.now(),
            durationMs: Date.now() - startedAt
          });
        }
        throw error;
      }
    }
  }

  function emitApiDebugEvent(detail) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }
    window.dispatchEvent(new CustomEvent("bizjet:api-debug", { detail }));
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
    const displayLevel = normalizeAirportLevel(
      item.displayLevel ?? item.airportLevel ?? item.airportTier ?? item.level,
      ground
    );
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
    const tierMatch = String(value ?? "").trim().toUpperCase().match(/^L([1-4])$/);
    const explicit = tierMatch ? Number(tierMatch[1]) : toInteger(value, null);
    if (explicit !== null) {
      return Math.max(1, Math.min(4, explicit));
    }
    if (ground >= 30) return 1;
    if (ground >= 12) return 2;
    if (ground >= 3) return 3;
    return 4;
  }

  function airportMarkerSizeForLevel(level) {
    if (level <= 2) return "major";
    return level <= 3 ? "medium" : "small";
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
    const typeCode = firstAircraftTypeCode(item, item.planeInfo, item.aircraft, item.plane);
    const iconKey = iconKeyForAircraftTypeCode(typeCode, iconContext);
    const snapshotTrack = adaptSnapshotTrack(item.coordinates || item.points || item.track);
    const registration = displayRegistration(
      item.tailNoClear,
      item.registrationClear,
      item.tailNoDisplay,
      item.registration,
      "Protected"
    );
    const apiCallsign = callsignFromSources(item, item.flightBaseInfo, item.summaryInfo);
    return {
      id: uniqueKey,
      uniqueKey,
      tailNoEncrypted: item.tailNo || "",
      tailNoClear: displayRegistration(item.tailNoClear, item.registrationClear),
      apiCallsign,
      flightNo: apiCallsign,
      callsign: firstValue(apiCallsign, makeProtectedCallsign(uniqueKey)),
      registration,
      model: planeSize,
      category: sizeClass,
      sizeClass,
      family: planeSize,
      operator: item.companyId ? `Operator ${item.companyId}` : "Business aviation",
      companyId: item.companyId || "",
      companyLogo: item.companyLogo || "",
      from: "-",
      to: "-",
      altitude: altitudeFeetFromItem(item),
      altitudeAglFt: altitudeFeetFromFields(
        item.altitudeAglFt ?? item.aglFt ?? item.heightAglFt,
        item.altitudeAglM ?? item.aglM ?? item.heightAglM
      ),
      radioAltitudeFt: altitudeFeetFromFields(item.radioAltitudeFt, item.radioAltitudeM),
      terrainElevationFt: altitudeFeetFromFields(item.terrainElevationFt, item.terrainElevationM),
      onGround: normalizeAircraftOnGround(item),
      speed: normalizeSpeed(item.groundSpeedKt ?? item.speedKt ?? item.speed ?? item.groundSpeed),
      verticalSpeed: toNumber(item.verticalSpeed ?? item.verticalSpeedFpm),
      squawk: "-",
      progress: 0,
      status: item.shareState === 0 ? "Limited" : "Live",
      source: `${sourcePid} realtime`,
      depart: "-",
      arrive: "-",
      route: snapshotTrack.length ? snapshotTrack : [[lat, lng]],
      trackRoute: snapshotTrack.length >= 2 ? snapshotTrack : null,
      livePosition: [lat, lng],
      heading: normalizeCourse(coordinate.course),
      updatedAtEpochMs: normalizeEpochMs(item.updatedAtEpochMs || item.updatedAt || item.timestamp || item.createTime) || Date.now(),
      positionTimestamp: normalizeEpochMs(item.positionTimestamp || item.updatedAtEpochMs || item.updatedAt || item.timestamp || item.createTime) || Date.now(),
      viewportTtlMs: toInteger(requestParams.ttlMs, 3000),
      quality: firstValue(item.quality, "good"),
      dataCategory: "business_jet",
      shareState: item.shareState,
      international: item.international,
      planeSize,
      icaoCode: typeCode,
      aircraftTypeCode: typeCode || "BIZ",
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
    const typeCode = firstAircraftTypeCode(item, item.planeInfo, item.aircraft, item.plane);
    const iconKey = iconKeyForAircraftTypeCode(typeCode, iconContext);
    const model = firstValue(item.model, item.modelNameEn, item.modelName, item.planeSize, typeCode, "Business jet");
    const sizeClass = firstValue(item.sizeClass, SIZE_CLASS_BY_PLANE_SIZE[item.planeSize], null);
    const snapshotTrack = adaptSnapshotTrack(item.coordinates || item.points || item.track);
    const registration = displayRegistration(
      item.tailNoClear,
      item.registrationClear,
      item.tailNoDisplay,
      item.registrationDisplay,
      item.registration,
      item.tailNo,
      "Protected"
    );
    const apiCallsign = callsignFromSources(item, item.flightBaseInfo, item.summaryInfo);
    return {
      id: uniqueKey,
      uniqueKey,
      tailNoEncrypted: item.tailNo || item.tailNoEncrypted || "",
      tailNoClear: displayRegistration(item.tailNoClear, item.registrationClear),
      apiCallsign,
      flightNo: apiCallsign,
      callsign: firstValue(apiCallsign, makeProtectedCallsign(uniqueKey)),
      registration,
      model,
      category: sizeClass || "midsize",
      sizeClass: sizeClass || "midsize",
      family: firstValue(item.family, item.planeSize, model),
      operator: firstValue(item.operator, item.operatorName, item.companyName, item.companyId ? `Operator ${item.companyId}` : "Business aviation"),
      companyId: item.companyId || "",
      companyLogo: item.companyLogo || "",
      from: cleanCode(item.departureAirport || item.from || item.depIcaoCode) || "-",
      to: cleanCode(item.arrivalAirport || item.to || item.arrIcaoCode) || "-",
      altitude: altitudeFeetFromItem(item),
      altitudeAglFt: altitudeFeetFromFields(
        item.altitudeAglFt ?? item.aglFt ?? item.heightAglFt,
        item.altitudeAglM ?? item.aglM ?? item.heightAglM
      ),
      radioAltitudeFt: altitudeFeetFromFields(item.radioAltitudeFt, item.radioAltitudeM),
      terrainElevationFt: altitudeFeetFromFields(item.terrainElevationFt, item.terrainElevationM),
      onGround: normalizeAircraftOnGround(item),
      speed: normalizeSpeed(item.groundSpeedKt ?? item.speedKt ?? item.speed ?? item.groundSpeed),
      verticalSpeed: toNumber(item.verticalSpeedFpm ?? item.verticalSpeed),
      squawk: firstValue(item.squawk, "-"),
      progress: toNumber(item.progress) || 0,
      status: firstValue(item.status, item.flightStateStr, "Live"),
      source: firstValue(item.source, `${sourcePid} viewport`),
      depart: firstValue(item.depart, item.departedTime, "-"),
      arrive: firstValue(item.arrive, item.arrivalTime, "-"),
      route: snapshotTrack.length ? snapshotTrack : [[lat, lng]],
      trackRoute: snapshotTrack.length >= 2 ? snapshotTrack : null,
      livePosition: [lat, lng],
      heading: normalizeCourse(coordinate.course ?? coordinate.heading ?? item.heading ?? item.course),
      updatedAtEpochMs: normalizeEpochMs(item.updatedAtEpochMs || item.updatedAt || item.timestamp || item.createTime) || Date.now(),
      positionTimestamp: normalizeEpochMs(item.positionTimestamp || item.updatedAtEpochMs || item.updatedAt || item.timestamp || item.createTime) || Date.now(),
      viewportTtlMs: toInteger(requestParams.ttlMs, 3000),
      quality: firstValue(item.quality, "good"),
      dataCategory: firstValue(item.aircraftCategory, item.category, "business_jet"),
      icaoCode: typeCode,
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
    const estimatedSegments = Array.isArray(payload.estimatedSegments) ? payload.estimatedSegments : [];
    const estimatedSegmentByStart = new Map(estimatedSegments.map((segment) => [
      `${toInteger(segment.fromIndex, -1)}:${toInteger(segment.toIndex, -1)}`,
      segment.reason || "coverage_gap"
    ]));
    const coordinates = Array.isArray(payload.coordinates || payload.points)
      ? (payload.coordinates || payload.points)
        .map((item, index) => {
          const point = adaptTrackPoint(item);
          if (!point) {
            return null;
          }
          const estimatedReason = estimatedSegmentByStart.get(`${index}:${index + 1}`);
          return {
            ...point,
            estimatedToNext: Boolean(estimatedReason),
            estimatedReason: estimatedReason || point.estimatedReason || ""
          };
        })
        .filter(Boolean)
      : [];
    const route = coordinates.map((point) => [point.lat, point.lng]);
    const lastPoint = coordinates[coordinates.length - 1] || null;
    const typeCode = firstAircraftTypeCode(plane, payload, base, summary);
    const sizeClass = SIZE_CLASS_BY_PLANE_SIZE[plane.planeSize] || null;
    const depZone = firstValue(
      base.depZoneId,
      base.depTimeZone,
      payload.departureAirport?.zoneId,
      payload.departureAirport?.timeZone,
      payload.airportInfo?.dep?.zoneId,
      payload.airportInfo?.dep?.timeZone
    );
    const arrZone = firstValue(
      base.arrZoneId,
      base.arrTimeZone,
      payload.arrivalAirport?.zoneId,
      payload.arrivalAirport?.timeZone,
      payload.airportInfo?.arr?.zoneId,
      payload.airportInfo?.arr?.timeZone
    );
    const serverNowSource = firstValue(base.serverNowEpochMs, payload.serverNowEpochMs, payload.serverNow);
    const serverNowTimeRef = serverNowSource
      ? makeTimeRef(serverNowSource, { sourceField: "serverNowEpochMs", semantic: "server_now" })
      : makeTimeRef(base.currentTimeGmt8, { timeZone: "Asia/Shanghai", sourceField: "flightBaseInfo.currentTimeGmt8", semantic: "server_now" });
    const apiCallsign = callsignFromSources(base, summary, payload, plane);
    const timeRefs = {
      scheduledDeparture: makeTimeRef(firstValue(base.depTime2EpochMs, base.scheduledDepartureEpochMs, base.depTime2, base.scheduledDepartureTime, base.depPlanTime), {
        timeZone: depZone,
        sourceField: "flightBaseInfo.depTime2",
        semantic: "scheduled_departure"
      }),
      actualDeparture: makeTimeRef(firstValue(base.depActualEpochMs, base.depTime1EpochMs, base.depTime1, base.departedTime), {
        timeZone: depZone,
        sourceField: "flightBaseInfo.depTime1",
        semantic: "actual_departure"
      }),
      scheduledArrival: makeTimeRef(firstValue(base.arrTime2EpochMs, base.scheduledArrivalEpochMs, base.arrTime2, base.scheduledArrivalTime, base.arrPlanTime), {
        timeZone: arrZone,
        sourceField: "flightBaseInfo.arrTime2",
        semantic: "scheduled_arrival"
      }),
      estimatedArrival: makeTimeRef(firstValue(base.arrEstimatedEpochMs, base.arrTime1EpochMs, base.arrActualEpochMs, base.arrTime1, base.arrivalTime), {
        timeZone: arrZone,
        sourceField: "flightBaseInfo.arrTime1",
        semantic: "estimated_arrival"
      }),
      serverNow: serverNowTimeRef,
      currentTimeGmt8: makeTimeRef(base.currentTimeGmt8, {
        timeZone: "Asia/Shanghai",
        sourceField: "flightBaseInfo.currentTimeGmt8",
        semantic: "server_now_gmt8"
      })
    };

    return {
      raw: payload,
      permissionInfo: payload.permissionInfo || {},
      airportInfo: payload.airportInfo || {},
      flightBaseInfo: base,
      planeInfo: plane,
      serviceProvider,
      summaryInfo: summary,
      selectedRouteVersion: payload.selectedRouteVersion || payload.routeVersion || "",
      serverNowEpochMs: serverNowTimeRef.epochMs,
      timeRefs,
      departureAirport: adaptRouteAirport(payload.departureAirport || payload.airportInfo?.dep),
      arrivalAirport: adaptRouteAirport(payload.arrivalAirport || payload.airportInfo?.arr),
      estimatedSegments,
      coordinates,
      route,
      livePosition: lastPoint ? [lastPoint.lat, lastPoint.lng] : null,
      updates: {
        from: cleanCode(base.depIcaoCode || base.depAirport || payload.departureAirport?.icao || payload.departureAirport?.icaoCode || payload.airportInfo?.dep?.icaoCode || payload.airportInfo?.dep?.airportCode) || "-",
        to: cleanCode(base.arrIcaoCode || base.arrAirport || payload.arrivalAirport?.icao || payload.arrivalAirport?.icaoCode || payload.airportInfo?.arr?.icaoCode || payload.airportInfo?.arr?.airportCode) || "-",
        fromName: firstValue(base.depAirportName, payload.airportInfo?.dep?.airportNameEn, payload.airportInfo?.dep?.airportName, payload.airportInfo?.dep?.airportFourName),
        toName: firstValue(base.arrAirportName, payload.airportInfo?.arr?.airportNameEn, payload.airportInfo?.arr?.airportName, payload.airportInfo?.arr?.airportFourName),
        apiCallsign,
        callsign: apiCallsign,
        flightNo: apiCallsign,
        depart: displayTime(base.depTime1 || base.depTime2),
        arrive: displayTimeWithAcrossDays(base.arrTime1 || base.arrTime2, base.acrossDays),
        status: firstValue(base.flightStateStr, summary.flightStateStr, FLIGHT_STATE_LABELS[summary.flightState], "Live"),
        registration: displayRegistration(plane.tailNoClear, plane.registrationClear, plane.tailNoDisplay, plane.registration, plane.tailNo, "Protected"),
        model: firstValue(plane.modelNameEn, plane.modelName),
        family: firstValue(plane.modelName, plane.modelNameEn, plane.planeSize),
        operator: firstValue(serviceProvider.companyNameShort, serviceProvider.companyName, plane.trusteeship),
        altitude: summary.altitude !== undefined && summary.altitude !== null
          ? metersToFeet(summary.altitude)
          : lastPoint?.altitudeFt ?? null,
        altitudeAglFt: altitudeFeetFromFields(
          summary.altitudeAglFt ?? summary.aglFt,
          summary.altitudeAglM ?? summary.aglM
        ),
        radioAltitudeFt: altitudeFeetFromFields(summary.radioAltitudeFt, summary.radioAltitudeM),
        terrainElevationFt: altitudeFeetFromFields(summary.terrainElevationFt, summary.terrainElevationM),
        onGround: normalizeAircraftOnGround(summary),
        positionTimestamp: lastPoint?.timestamp || serverNowTimeRef.epochMs,
        speed: summary.speed !== undefined && summary.speed !== null
          ? kmhToKnots(summary.speed)
          : lastPoint?.groundSpeedKt ?? null,
        heading: normalizeCourse(lastPoint?.heading),
        source: "513009 realtime track",
        icaoCode: typeCode,
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
    const typeCode = firstAircraftTypeCode(plane, payload);
    const sizeClass = SIZE_CLASS_BY_PLANE_SIZE[plane.planeSize] || null;
    return {
      raw: payload,
      permissionInfo: payload.permissionInfo || {},
      planeInfo: plane,
      serviceProvider,
      tripsForSale: payload.tripsForSale || [],
      groundPlans: payload.groundPlans || [],
      updates: {
        registration: displayRegistration(plane.tailNoClear, plane.registrationClear, plane.tailNoDisplay, plane.registration, plane.tailNo, "Protected"),
        model: firstValue(plane.modelNameEn, plane.modelName),
        family: firstValue(plane.modelName, plane.modelNameEn, plane.planeSize),
        operator: firstValue(serviceProvider.companyNameShort, serviceProvider.companyName, plane.trusteeship),
        icaoCode: typeCode,
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
        zoneId: info.zoneId,
        serverNowEpochMs: normalizeEpochMs(info.serverNowEpochMs || payload.serverNowEpochMs || payload.serverNow),
        plateau: info.plateau
      }
    };
  }

  function adaptFlightHistory(payload) {
    const flights = Array.isArray(payload.data)
      ? payload.data.map(adaptHistoryFlight).filter(Boolean)
      : [];
    return {
      raw: payload,
      currentPage: toInteger(payload.currentPage, 1),
      hasNextPage: toInteger(payload.hasNextPage, 0) === 1,
      flights,
      groundAirportInfo: adaptHistoryGroundAirport(payload.groundAirportInfo)
    };
  }

  function adaptHistoryFlight(item) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const depZone = firstValue(item.depZoneId, item.depTimeZone);
    const arrZone = firstValue(item.arrZoneId, item.arrTimeZone);
    const depTimeRef = makeTimeRef(firstValue(item.depActualEpochMs, item.depTime1), {
      timeZone: depZone,
      sourceField: "513013.depTime1",
      semantic: "history_departure"
    });
    const arrTimeRef = makeTimeRef(firstValue(item.arrActualEpochMs, item.arrTime1), {
      timeZone: arrZone,
      sourceField: "513013.arrTime1",
      semantic: "history_arrival"
    });
    const uniqueKey = firstValue(item.uniqueKey, item.flightUniqueKey, item.flightKey, "");
    const callSign = callsignFromSources(item);
    return {
      raw: item,
      id: String(firstValue(uniqueKey, item.flightId, "")),
      uniqueKey,
      flightId: firstValue(item.flightId, ""),
      callSign,
      flightNo: callSign,
      depAirport: cleanCode(item.depAirport),
      depAirportName: firstValue(item.depAirportFourName, item.depAirportName),
      depAirportFullName: firstValue(item.depAirportName, item.depAirportFourName),
      depAirportNameEn: firstValue(item.depAirportNameEn, ""),
      depAirportCountry: firstValue(item.depAirportCountry, ""),
      arrAirport: cleanCode(item.arrAirport),
      arrAirportName: firstValue(item.arrAirportFourName, item.arrAirportName),
      arrAirportFullName: firstValue(item.arrAirportName, item.arrAirportFourName),
      arrAirportNameEn: firstValue(item.arrAirportNameEn, ""),
      arrAirportCountry: firstValue(item.arrAirportCountry, ""),
      flightState: toInteger(item.flightState, null),
      flightStateStr: firstValue(item.flightStateStr, ""),
      flightStateIcon: firstValue(item.flightStateIcon, ""),
      countryType: firstValue(item.countryType, ""),
      depTimeZone: depZone,
      arrTimeZone: arrZone,
      depTimeRef,
      arrTimeRef,
      depActualEpochMs: depTimeRef.epochMs,
      arrActualEpochMs: arrTimeRef.epochMs,
      serverNowEpochMs: normalizeEpochMs(item.serverNowEpochMs),
      acrossDays: toInteger(item.acrossDays, 0),
      estimateTimeMinutes: toInteger(item.estimateTime, null)
    };
  }

  function adaptHistoryGroundAirport(input) {
    if (!input || typeof input !== "object") {
      return null;
    }
    return {
      ...input,
      airportCode: cleanCode(input.airportCode),
      airportName: firstValue(input.airportName, input.airportFourName),
      airportFourName: firstValue(input.airportFourName, input.airportName),
      airportNameEn: firstValue(input.airportNameEn, ""),
      country: firstValue(input.country, input.countryName, "")
    };
  }

  function adaptAirportGround(payload) {
    const info = payload.airportInfo || {};
    const ground = payload.groundInfo || {};
    const groundPlanes = Array.isArray(ground.groundPlanes)
      ? ground.groundPlanes.map(adaptGroundPlane).filter(Boolean)
      : [];
    const groundModels = Array.isArray(ground.groundModels)
      ? ground.groundModels.map(adaptGroundModel).filter(Boolean)
      : [];
    const airportCode = cleanCode(info.airportCode);
    const icaoCode = cleanCode(info.icaoCode);
    return {
      raw: payload,
      airportInfo: info,
      groundInfo: {
        ...ground,
        groundPlanes,
        groundModels
      },
      groundPlanes,
      groundModels,
      updates: {
        id: icaoCode || airportCode,
        airportCode,
        iata: airportCode,
        icaoCode,
        ground: toInteger(ground.groundNum, groundPlanes.length),
        timeZone: info.timeZone,
        country: firstValue(info.countryName, ""),
        name: firstValue(info.airportNameEn, info.airportName)
      }
    };
  }

  function adaptGroundPlane(item) {
    if (!item || typeof item !== "object") {
      return null;
    }
    return {
      raw: item,
      tailNoEncrypted: firstValue(item.tailNo, ""),
      registration: displayRegistration(item.tailNoClear, item.registrationClear, item.tailNoDisplay, item.registration),
      tailNoDisplay: displayRegistration(item.tailNoDisplay, item.tailNoClear, item.registrationClear, item.registration),
      brandName: firstValue(item.brandName, ""),
      modelCode: cleanCode(item.modelCode || item.icaoCode),
      icaoCode: cleanCode(item.icaoCode || item.modelCode),
      modelName: firstValue(item.modelName, ""),
      modelImg: firstValue(item.modelImg, ""),
      flightState: toInteger(item.flightState, null),
      trusteeship: firstValue(item.trusteeship, ""),
      groundTime: toInteger(item.groundTime, null),
      groundTimeStr: firstValue(item.groundTimeStr, ""),
      serviceStatus: toInteger(item.serviceStatus, null),
      shareState: toInteger(item.shareState, null),
      serviceProvider: firstValue(item.serviceProvider, ""),
      companyLogo: firstValue(item.companyLogo, "")
    };
  }

  function adaptGroundModel(item) {
    if (!item || typeof item !== "object") {
      return null;
    }
    return {
      raw: item,
      modelCode: cleanCode(item.modelCode),
      modelName: firstValue(item.modelName, ""),
      modelImg: firstValue(item.modelImg, ""),
      brandName: firstValue(item.brandName, ""),
      count: toInteger(item.count, 0)
    };
  }

  function adaptAirportDynamic(payload) {
    const info = payload.airportInfo || {};
    const weather = payload.airportWeather || payload.weatherInfo || {};
    const flights = payload.flightsInfo || {};
    const airportCode = cleanCode(info.airportCode);
    const icaoCode = cleanCode(info.icaoCode);
    const lat = toNumber(info.lat);
    const lng = toNumber(info.lon);
    return {
      raw: payload,
      date: payload.date || "",
      airportInfo: info,
      weatherInfo: weather,
      flightsInfo: flights,
      dailyStatistics: payload.dailyStatistics || {},
      totalStatistics: payload.totalStatistics || {},
      popularModels: payload.popularModels || {},
      originAndDest: payload.originAndDest || {},
      updates: {
        id: icaoCode || airportCode,
        iata: airportCode,
        airportCode,
        icaoCode,
        name: firstValue(info.airportNameEn, info.airportName),
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        elevation: metersToFeet(info.elevation),
        elevationMeters: toNumber(info.elevation),
        runways: info.runwayCount || info.runwayLength ? `${info.runwayCount || "-"} / ${info.runwayLength || "-"} m` : "",
        departures: toInteger(flights.outboundActually, 0) || toInteger(flights.outboundPlan, 0),
        arrivals: toInteger(flights.inboundActually, 0) || toInteger(flights.inboundPlan, 0),
        weather: formatWeather(weather),
        delay: flights.sortiesEstimate ? `${flights.sortiesEstimate} sorties` : "",
        grade: info.grade,
        type: info.type,
        plateau: info.plateau,
        openState: info.openState
      }
    };
  }

  function trackArrayLatLng(item) {
    const first = toNumber(item?.[0]);
    const second = toNumber(item?.[1]);
    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }
    const firstLooksLat = Math.abs(first) <= 90 && Math.abs(second) <= 180;
    const secondLooksLat = Math.abs(second) <= 90 && Math.abs(first) <= 180;
    if (firstLooksLat || !secondLooksLat) {
      return { lat: first, lng: second };
    }
    return { lat: second, lng: first };
  }

  function valueLooksLikeEpoch(value) {
    if (typeof value === "string" && /[-T:\s]/.test(value.trim())) {
      return normalizeEpochMs(value) !== null;
    }
    const numeric = toNumber(value);
    return Number.isFinite(numeric) && Math.abs(numeric) > 100000000;
  }

  function adaptArrayTrackPoint(item) {
    const coordinate = trackArrayLatLng(item);
    if (!coordinate) {
      return null;
    }
    const third = item[2];
    const fourth = item[3];
    const fifth = item[4];
    const sixth = item[5];
    const thirdIsTime = valueLooksLikeEpoch(third);
    const fourthIsTime = valueLooksLikeEpoch(fourth);
    const fifthIsTime = valueLooksLikeEpoch(fifth);
    const headingValue = thirdIsTime || item.length >= 5 ? sixth : fourthIsTime ? third : null;
    const altitudeValue = thirdIsTime
      ? fourth
      : fourthIsTime
        ? null
        : third;
    const speedValue = thirdIsTime
      ? fifth
      : fourthIsTime
        ? null
        : fourth;
    const timestampValue = thirdIsTime ? third : fourthIsTime ? fourth : fifthIsTime ? fifth : null;
    return {
      lat: coordinate.lat,
      lng: coordinate.lng,
      altitudeFt: normalizeAltitude(altitudeValue),
      groundSpeedKt: normalizeSpeed(speedValue),
      heading: normalizeCourse(headingValue),
      timestamp: normalizeEpochMs(timestampValue),
      source: "array-coordinate",
      quality: "good",
      isEstimated: false,
      estimatedReason: ""
    };
  }

  function adaptTrackPoint(item) {
    if (Array.isArray(item)) {
      return adaptArrayTrackPoint(item);
    }
    const lat = toNumber(item.lat ?? item.latitude);
    const lng = toNumber(item.lng ?? item.lon ?? item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const altitudeFt = toNumber(item.altitudeFt ?? item.altFt ?? item.baroAltitudeFt ?? item.gpsAltitudeFt);
    const altitudeM = toNumber(item.altitudeM ?? item.altM ?? item.heightM ?? item.baroAltitudeM ?? item.gpsAltitudeM);
    const speedKt = toNumber(item.groundSpeedKt ?? item.speedKt ?? item.groundSpeed ?? item.gs ?? item.velocityKt);
    const speedKmh = toNumber(item.speedKmh ?? item.velocityKmh);
    const isEstimated = Boolean(item.isEstimated || item.estimated || item.quality === "estimated");
    return {
      lat,
      lng,
      altitudeFt: Number.isFinite(altitudeFt)
        ? altitudeFt
          : Number.isFinite(altitudeM)
            ? metersToFeet(altitudeM)
          : normalizeAltitude(item.altitude ?? item.alt ?? item.height ?? item.baroAltitude ?? item.gpsAltitude),
      groundSpeedKt: Number.isFinite(speedKt)
        ? speedKt
        : Number.isFinite(speedKmh)
          ? kmhToKnots(speedKmh)
          : normalizeSpeed(item.speed ?? item.velocity),
      heading: normalizeCourse(item.heading ?? item.course ?? item.track ?? item.bearing),
      timestamp: normalizeEpochMs(item.timestamp || item.createTime || item.time || item.sampleTime || item.positionTime),
      source: firstValue(item.source, item.userMark, ""),
      quality: firstValue(item.quality, isEstimated ? "estimated" : "good"),
      isEstimated,
      estimatedReason: firstValue(item.estimatedReason, item.reason, isEstimated ? "coverage_gap" : "")
    };
  }

  function adaptSnapshotTrack(source) {
    if (!Array.isArray(source)) {
      return [];
    }
    return source.map((item) => {
      return adaptTrackPoint(item);
    }).filter(Boolean);
  }

  function adaptRouteAirport(input) {
    if (!input || typeof input !== "object") {
      return null;
    }
    const lat = toNumber(input.lat ?? input.latitude);
    const lng = toNumber(input.lng ?? input.lon ?? input.longitude);
    return {
      ...input,
      icao: cleanCode(input.icao || input.icaoCode || input.airportFourName),
      iata: cleanCode(input.iata || input.airportCode),
      zoneId: input.zoneId,
      timeZone: input.timeZone,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null
    };
  }

  const AIRCRAFT_TYPE_CODE_FIELDS = [
    "icaoCode",
    "icao_code"
  ];

  const AIRCRAFT_TYPE_NESTED_FIELDS = [
    "planeInfo",
    "aircraftInfo",
    "aircraft",
    "plane",
    "modelInfo"
  ];

  function cleanAircraftTypeCode(value) {
    const code = cleanCode(value);
    return code && !["BIZ", "J", "BUSINESS", "BUSINESS_JET", "BUSINESS-JET"].includes(code) ? code : "";
  }

  function firstAircraftTypeCode(...sources) {
    const queue = sources.filter(Boolean);
    const seen = new Set();
    for (let index = 0; index < queue.length; index += 1) {
      const source = queue[index];
      if (source === null || source === undefined) {
        continue;
      }
      if (typeof source !== "object") {
        const code = cleanAircraftTypeCode(source);
        if (code) {
          return code;
        }
        continue;
      }
      if (seen.has(source)) {
        continue;
      }
      seen.add(source);
      for (const field of AIRCRAFT_TYPE_CODE_FIELDS) {
        const code = cleanAircraftTypeCode(source[field]);
        if (code) {
          return code;
        }
      }
      for (const field of AIRCRAFT_TYPE_NESTED_FIELDS) {
        if (source[field]) {
          queue.push(source[field]);
        }
      }
    }
    return "";
  }

  function iconKeyForAircraftTypeCode(typeCode, iconContext) {
    return typeCode
      ? iconContext.aircraftIconKeyByTypeCode?.[typeCode] || iconContext.defaultBusinessJetIconKey || "LJ60"
      : iconContext.defaultBusinessJetIconKey || "LJ60";
  }

  function cleanCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function firstValue(...values) {
    return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") ?? "";
  }

  function cleanCallsign(value) {
    const text = String(value ?? "").trim();
    if (!text || encryptedTailNoLike(text)) {
      return "";
    }
    const normalized = text.replace(/\s+/g, "").toUpperCase();
    return ["-", "—", "N/A", "NA", "NULL", "UNDEFINED", "PROTECTED"].includes(normalized)
      ? ""
      : normalized;
  }

  function comparableAircraftIdentity(value) {
    const text = String(value ?? "").trim();
    if (!text || encryptedTailNoLike(text)) {
      return "";
    }
    return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function registrationValuesFromSources(sources) {
    const fields = [
      "tailNoClear",
      "registrationClear",
      "tailNoDisplay",
      "registrationDisplay",
      "registration",
      "tailNumber",
      "tailNo"
    ];
    const values = [];
    sources.forEach((source) => {
      if (!source || typeof source !== "object") {
        return;
      }
      fields.forEach((field) => {
        const value = displayRegistration(source[field]);
        if (value) {
          values.push(value);
        }
      });
      [
        source.planeInfo,
        source.aircraftInfo,
        source.aircraft,
        source.plane
      ].filter(Boolean).forEach((nested) => {
        fields.forEach((field) => {
          const value = displayRegistration(nested[field]);
          if (value) {
            values.push(value);
          }
        });
      });
    });
    return values
      .map(comparableAircraftIdentity)
      .filter((value, index, list) => value && list.indexOf(value) === index);
  }

  function callsignMatchesRegistration(callsign, registrations) {
    const comparable = comparableAircraftIdentity(callsign);
    return Boolean(comparable && registrations.includes(comparable));
  }

  function callsignFromSources(...sources) {
    const fields = [
      "callSign",
      "callsign",
      "call_sign",
      "flightNo",
      "flightNumber",
      "flight",
      "tripNo",
      "taskNo"
    ];
    const registrations = registrationValuesFromSources(sources);
    let registrationLikeFallback = "";
    for (const source of sources) {
      if (source === null || source === undefined) {
        continue;
      }
      if (typeof source !== "object") {
        const callsign = cleanCallsign(source);
        if (callsign) {
          if (callsignMatchesRegistration(callsign, registrations)) {
            registrationLikeFallback ||= callsign;
            continue;
          }
          return callsign;
        }
        continue;
      }
      for (const field of fields) {
        const callsign = cleanCallsign(source[field]);
        if (callsign) {
          if (callsignMatchesRegistration(callsign, registrations)) {
            registrationLikeFallback ||= callsign;
            continue;
          }
          return callsign;
        }
      }
    }
    return registrationLikeFallback;
  }

  function displayRegistration(...values) {
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (!text || encryptedTailNoLike(text)) {
        continue;
      }
      return text;
    }
    return "";
  }

  function encryptedTailNoLike(value) {
    const text = String(value || "").trim();
    return text.length >= 16
      && /^[A-Za-z0-9+/]+={0,2}$/.test(text)
      && /[+/=]/.test(text);
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

  function altitudeFeetFromFields(feetValue, meterValue) {
    const feet = toNumber(feetValue);
    if (Number.isFinite(feet)) {
      return Math.round(feet);
    }
    return metersToFeet(meterValue);
  }

  function altitudeFeetFromItem(item = {}) {
    const explicit = altitudeFeetFromFields(item.altitudeFt, item.altitudeM);
    return Number.isFinite(explicit) ? explicit : normalizeAltitude(item.altitude);
  }

  function normalizeOptionalBoolean(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "ground", "on-ground", "onground", "landed"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "air", "airborne", "flying"].includes(normalized)) {
      return false;
    }
    return null;
  }

  function normalizeAircraftOnGround(item = {}) {
    const explicit = normalizeOptionalBoolean(item.onGround ?? item.isOnGround);
    if (explicit !== null) {
      return explicit;
    }
    const airGroundState = item.airGroundState;
    if (airGroundState === null || airGroundState === undefined || airGroundState === "") {
      return null;
    }
    const numericState = Number(airGroundState);
    if (numericState === 0) {
      return true;
    }
    if (numericState === 1) {
      return false;
    }
    const normalized = String(airGroundState).trim().toLowerCase();
    if (["ground", "on-ground", "onground", "landed"].includes(normalized)) {
      return true;
    }
    if (["air", "airborne", "flying", "in-air"].includes(normalized)) {
      return false;
    }
    return null;
  }

  function normalizeSpeed(value) {
    const number = toNumber(value);
    if (!Number.isFinite(number)) {
      return null;
    }
    return number > 650 ? Math.round(number * 0.539957) : Math.round(number);
  }

  function normalizeEpochMs(value, options = {}) {
    if (timeUtils?.normalizeEpochMs) {
      return timeUtils.normalizeEpochMs(value, options);
    }
    if (!value) {
      return null;
    }
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number > 10000000000 ? number : number * 1000;
    }
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
      const parsed = Date.parse(text.replace(" ", "T"));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function makeTimeRef(value, options = {}) {
    if (timeUtils?.makeTimeRef) {
      return timeUtils.makeTimeRef(value, options);
    }
    return {
      raw: value === null || value === undefined ? "" : String(value),
      epochMs: normalizeEpochMs(value),
      displayZone: options.timeZone || "",
      offsetMinutes: null,
      sourceField: options.sourceField || "",
      semantic: options.semantic || "",
      confidence: value ? "raw-only" : "missing"
    };
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
      adaptAirportDetail,
      adaptFlightHistory,
      adaptAirportGround,
      adaptAirportDynamic
    },
    SIZE_CLASS_BY_PLANE_SIZE
  };
})();
