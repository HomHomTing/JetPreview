const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const time = require("../time-utils.js");

const shanghaiWallTime = "2026-08-06 15:30:00";
const shanghaiEpoch = Date.UTC(2026, 7, 6, 7, 30, 0);

assert.equal(
  time.normalizeEpochMs(shanghaiWallTime, { timeZone: "UTC+8" }),
  shanghaiEpoch,
  "UTC offset local strings parse to the correct absolute instant"
);
assert.equal(
  time.normalizeEpochMs(shanghaiWallTime, { timeZone: "Asia/Shanghai" }),
  shanghaiEpoch,
  "IANA local strings parse to the correct absolute instant"
);
assert.equal(
  time.normalizeEpochMs(shanghaiWallTime),
  null,
  "timezone-free strings are not parsed as device-local time"
);
assert.equal(
  time.formatEpochMs(shanghaiEpoch, { timeZone: "UTC", date: true }),
  "08-06 07:30 UTC",
  "UTC display is explicit"
);
assert.equal(
  time.formatEpochMs(shanghaiEpoch, { timeZone: "UTC+8", date: true }),
  "08-06 15:30 UTC+8",
  "UTC offset display is explicit"
);

const childScript = `
  const time = require(${JSON.stringify(path.join(__dirname, "..", "time-utils.js"))});
  const epoch = time.normalizeEpochMs("2026-08-06 15:30:00", { timeZone: "Asia/Shanghai" });
  console.log(JSON.stringify({
    epoch,
    utc: time.formatEpochMs(epoch, { timeZone: "UTC", date: true }),
    local: time.formatEpochMs(epoch, { timeZone: "Asia/Shanghai", date: true })
  }));
`;

const outputs = ["UTC", "Asia/Shanghai", "America/New_York"].map((tz) => execFileSync(
  process.execPath,
  ["-e", childScript],
  {
    encoding: "utf8",
    env: { ...process.env, TZ: tz }
  }
).trim());

assert.equal(outputs[0], outputs[1], "UTC and Asia/Shanghai devices render configured zones identically");
assert.equal(outputs[0], outputs[2], "UTC and America/New_York devices render configured zones identically");

console.log("time utils: ok");
