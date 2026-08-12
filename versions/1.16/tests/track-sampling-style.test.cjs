const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

assert.match(
  appSource,
  /function\s+trackSpanHasSemanticBoundary\(points,\s*startIndex,\s*endIndex\)\s*{[\s\S]*?trackPointHasSemanticBoundary\(points\[index\],\s*points\[index - 1\]\)/,
  "track sampling checks every skipped source segment for style boundaries"
);

assert.match(
  appSource,
  /function\s+sampledTrackPointForRender\(points,\s*indexes,\s*outputIndex\)\s*{[\s\S]*?trackSpanHasSemanticBoundary\(points,\s*sourceIndex,\s*nextSourceIndex\)[\s\S]*?renderActualToNext:\s*true/,
  "safe sampled bridges are marked as actual-to-next render segments"
);

assert.match(
  appSource,
  /const\s+indexes\s*=\s*\[\.\.\.requiredIndexes\]\.sort\(\(a,\s*b\)\s*=>\s*a\s*-\s*b\);[\s\S]*?return\s+indexes\.map\(\(_,\s*outputIndex\)\s*=>\s*sampledTrackPointForRender\(points,\s*indexes,\s*outputIndex\)\);/,
  "sampled track output preserves bridge metadata for segment rendering"
);

assert.match(
  appSource,
  /if\s*\(start\.renderActualToNext\)\s*{[\s\S]*?return\s+"";/,
  "render-only actual bridges do not become coverage-gap dashed segments"
);

assert.ok(
  appSource.indexOf("if (start.isEstimated || end.isEstimated") < appSource.indexOf("if (start.renderActualToNext)"),
  "explicit estimated data still wins over sampled actual bridge metadata"
);

console.log("track sampling style: ok");
