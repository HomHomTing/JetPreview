(function () {
  const ISO_WITH_ZONE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
  const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
  const UTC_OFFSET_PATTERN = /^(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i;
  const knownIanaTimeZones = new Map();

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeEpochMs(value, options = {}) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    if (value instanceof Date) {
      const epoch = value.getTime();
      return Number.isFinite(epoch) ? epoch : null;
    }
    const numeric = finiteNumber(value);
    if (numeric !== null) {
      return numeric > 10000000000 ? numeric : numeric * 1000;
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    if (ISO_WITH_ZONE_PATTERN.test(text)) {
      const parsed = Date.parse(text.replace(" ", "T"));
      return Number.isFinite(parsed) ? parsed : null;
    }
    const zone = normalizeZone(options.timeZone || options.zone || options.displayZone || "");
    const localParts = parseLocalDateTimeParts(text);
    if (localParts && zone) {
      const byOffset = parseUtcOffsetMinutes(zone);
      if (byOffset !== null) {
        return localDateTimePartsToEpochMs(localParts, byOffset);
      }
      if (isIanaTimeZone(zone)) {
        return localDateTimePartsToIanaEpochMs(localParts, zone);
      }
    }
    if (options.allowUnsafeLocalParse) {
      const parsed = Date.parse(text);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function makeTimeRef(value, options = {}) {
    const zone = normalizeZone(options.timeZone || options.zone || options.displayZone || "");
    const sourceField = options.sourceField || "";
    const semantic = options.semantic || "";
    const raw = value === null || value === undefined ? "" : String(value);
    const epochMs = normalizeEpochMs(value, { timeZone: zone });
    const offsetMinutes = parseUtcOffsetMinutes(zone);
    const confidence = epochMs !== null
      ? zone
        ? isIanaTimeZone(zone) ? "local-string" : offsetMinutes !== null ? "offset-string" : "exact"
        : "exact"
      : raw
        ? "raw-only"
        : "missing";
    return {
      raw,
      epochMs,
      displayZone: zone,
      offsetMinutes,
      sourceField,
      semantic,
      confidence
    };
  }

  function firstPresent(...values) {
    return values.find((value) => value !== null && value !== undefined && value !== "");
  }

  function makeFirstTimeRef(candidates = [], options = {}) {
    for (const candidate of candidates) {
      const value = typeof candidate === "object" && candidate !== null && "value" in candidate
        ? candidate.value
        : candidate;
      if (value === null || value === undefined || value === "") {
        continue;
      }
      return makeTimeRef(value, {
        ...options,
        sourceField: typeof candidate === "object" && candidate !== null && candidate.sourceField
          ? candidate.sourceField
          : options.sourceField
      });
    }
    return makeTimeRef("", options);
  }

  function normalizeZone(zone) {
    const text = String(zone || "").trim();
    if (!text || text === "-" || text.toUpperCase() === "N/A") {
      return "";
    }
    return text;
  }

  function parseUtcOffsetMinutes(zone) {
    const text = normalizeZone(zone);
    if (!text) {
      return null;
    }
    if (/^(?:UTC|GMT)$/i.test(text)) {
      return 0;
    }
    const match = text.match(UTC_OFFSET_PATTERN);
    if (!match) {
      return null;
    }
    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 14 || minutes > 59) {
      return null;
    }
    return sign * (hours * 60 + minutes);
  }

  function offsetLabel(offsetMinutes) {
    const offset = Number(offsetMinutes);
    if (!Number.isFinite(offset)) {
      return "";
    }
    if (offset === 0) {
      return "UTC";
    }
    const sign = offset < 0 ? "-" : "+";
    const absolute = Math.abs(offset);
    const hours = Math.floor(absolute / 60);
    const minutes = absolute % 60;
    return minutes ? `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}` : `UTC${sign}${hours}`;
  }

  function isIanaTimeZone(zone) {
    const text = normalizeZone(zone);
    if (!text || !text.includes("/")) {
      return false;
    }
    if (knownIanaTimeZones.has(text)) {
      return knownIanaTimeZones.get(text);
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: text }).format(new Date(0));
      knownIanaTimeZones.set(text, true);
      return true;
    } catch (error) {
      knownIanaTimeZones.set(text, false);
      return false;
    }
  }

  function zoneLabel(zone) {
    const normalized = normalizeZone(zone);
    if (!normalized) {
      return "";
    }
    if (isIanaTimeZone(normalized)) {
      return normalized;
    }
    const offset = parseUtcOffsetMinutes(normalized);
    return offset !== null ? offsetLabel(offset) : normalized;
  }

  function parseLocalDateTimeParts(value) {
    const match = String(value || "").trim().match(LOCAL_DATE_TIME_PATTERN);
    if (!match) {
      return null;
    }
    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4] || 0),
      minute: Number(match[5] || 0),
      second: Number(match[6] || 0)
    };
    if (!validDateTimeParts(parts)) {
      return null;
    }
    return parts;
  }

  function validDateTimeParts(parts) {
    if (!parts || parts.year < 1900 || parts.year > 3000 || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) {
      return false;
    }
    if (parts.hour < 0 || parts.hour > 23 || parts.minute < 0 || parts.minute > 59 || parts.second < 0 || parts.second > 59) {
      return false;
    }
    const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
    return check.getUTCFullYear() === parts.year
      && check.getUTCMonth() + 1 === parts.month
      && check.getUTCDate() === parts.day;
  }

  function localDateTimePartsToEpochMs(parts, offsetMinutes) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - offsetMinutes * 60000;
  }

  function localDateTimePartsToIanaEpochMs(parts, timeZone) {
    const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    let offset = timeZoneOffsetMinutes(utcGuess, timeZone);
    let epoch = localDateTimePartsToEpochMs(parts, offset);
    const adjustedOffset = timeZoneOffsetMinutes(epoch, timeZone);
    if (adjustedOffset !== offset) {
      epoch = localDateTimePartsToEpochMs(parts, adjustedOffset);
    }
    return epoch;
  }

  function timeZoneOffsetMinutes(epochMs, timeZone) {
    const parts = datePartsForZone(epochMs, timeZone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return Math.round((asUtc - epochMs) / 60000);
  }

  function datePartsForZone(epochMs, timeZone = "UTC") {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const lookup = Object.fromEntries(formatter.formatToParts(new Date(epochMs)).map((part) => [part.type, part.value]));
    let hour = Number(lookup.hour || 0);
    if (hour === 24) {
      hour = 0;
    }
    return {
      year: Number(lookup.year),
      month: Number(lookup.month),
      day: Number(lookup.day),
      hour,
      minute: Number(lookup.minute),
      second: Number(lookup.second)
    };
  }

  function datePartsForOffset(epochMs, offsetMinutes = 0) {
    const shifted = new Date(Number(epochMs) + offsetMinutes * 60000);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds()
    };
  }

  function displayPartsForZone(epochMs, zone = "UTC") {
    const normalized = normalizeZone(zone) || "UTC";
    const offset = parseUtcOffsetMinutes(normalized);
    if (offset !== null) {
      return { parts: datePartsForOffset(epochMs, offset), label: offsetLabel(offset) };
    }
    if (isIanaTimeZone(normalized)) {
      return { parts: datePartsForZone(epochMs, normalized), label: normalized };
    }
    return { parts: datePartsForZone(epochMs, "UTC"), label: "UTC" };
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatParts(parts, options = {}) {
    const time = `${pad2(parts.hour)}:${pad2(parts.minute)}${options.seconds ? `:${pad2(parts.second)}` : ""}`;
    return options.date ? `${pad2(parts.month)}-${pad2(parts.day)} ${time}` : time;
  }

  function formatEpochMs(epochMs, options = {}) {
    const epoch = normalizeEpochMs(epochMs);
    if (epoch === null) {
      return options.fallback || "N/A";
    }
    const { parts, label } = displayPartsForZone(epoch, options.timeZone || "UTC");
    const text = formatParts(parts, options);
    return options.includeZone === false ? text : `${text} ${options.zoneLabel || label}`;
  }

  function formatTimeRef(ref, options = {}) {
    if (!ref || typeof ref !== "object") {
      return formatEpochMs(ref, options);
    }
    if (ref.epochMs !== null && ref.epochMs !== undefined) {
      return formatEpochMs(ref.epochMs, {
        ...options,
        timeZone: options.timeZone || ref.displayZone || "UTC",
        zoneLabel: options.zoneLabel || zoneLabel(ref.displayZone)
      });
    }
    if (ref.raw) {
      const label = zoneLabel(ref.displayZone);
      return `${ref.raw}${label ? ` ${label}` : " timezone unknown"}`;
    }
    return options.fallback || "N/A";
  }

  function nowInZone(options = {}) {
    const epoch = normalizeEpochMs(options.nowEpochMs) || Date.now();
    return formatEpochMs(epoch, {
      timeZone: options.timeZone || "UTC",
      seconds: options.seconds,
      includeZone: options.includeZone !== false,
      date: options.date
    });
  }

  function relativeTime(epochMs, nowEpochMs = Date.now()) {
    const epoch = normalizeEpochMs(epochMs);
    const now = normalizeEpochMs(nowEpochMs) || Date.now();
    if (epoch === null) {
      return "N/A";
    }
    const diffSeconds = Math.max(0, Math.round((now - epoch) / 1000));
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    return `${Math.round(diffHours / 24)}d ago`;
  }

  const api = {
    normalizeEpochMs,
    makeTimeRef,
    makeFirstTimeRef,
    parseUtcOffsetMinutes,
    isIanaTimeZone,
    zoneLabel,
    formatEpochMs,
    formatTimeRef,
    nowInZone,
    relativeTime,
    _private: {
      parseLocalDateTimeParts,
      localDateTimePartsToEpochMs,
      localDateTimePartsToIanaEpochMs,
      timeZoneOffsetMinutes,
      datePartsForZone,
      datePartsForOffset
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.BIZJET_TIME = api;
  }
})();
