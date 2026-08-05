import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const requireFromPreview = createRequire(new URL("../public-preview/package.json", import.meta.url));
const sharp = requireFromPreview("sharp");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "exports", "gl7t-gl8t-ga7c-icon-concepts-20260805");
const svgDir = path.join(outDir, "svg");
const sizes = [128, 256, 512, 1024];

const colors = {
  fill: "#FDB813",
  stroke: "#121920",
  highlight: "#FFE16A",
  map: "#759ca1",
  mapDark: "#4e747c",
  panel: "#f5f2e9",
  ink: "#151b22",
  muted: "#68757f"
};

const lj60Path =
  "M32 4.5c2.8 0 4.6 13.4 5.3 19.7l17.8 7.2c1.1.4 1.8 1.4 1.8 2.6v3.3L38 33.6l-1 8.7 7.4 4.4V50l-10.1-2L32 59.5 29.7 48l-10.1 2v-3.3l7.4-4.4-1-8.7-18.9 3.7V34c0-1.2.7-2.2 1.8-2.6l17.8-7.2c.7-6.3 2.5-19.7 5.3-19.7Z";

const variants = [
  {
    id: "concept-1",
    name: "A · Balanced four-cabin",
    note: "11% longer cabin, 7% broader span, rear pods readable but restrained.",
    scalePx: 31,
    paths: {
      wing:
        "M27.7 24.7 5.5 33.9c-1 .4-1.7 1.4-1.7 2.5v3.3l24.1-4.5Zm8.6 0 22.2 9.2c1 .4 1.7 1.4 1.7 2.5v3.3l-24.1-4.5Z",
      tail:
        "M27.5 47.2 16.4 51.3v3.5l12.8-2.2Zm9 0 11.1 4.1v3.5l-12.8-2.2Z",
      body:
        "M32 1.6c3 0 4.7 14.7 5.2 22.6v16c0 3.2-1 6-2.6 8.6l-.7 4.8 6.2 4.6v3.3L34 59.8 32 62.5l-2-2.7-6.1 1.7v-3.3l6.2-4.6-.7-4.8c-1.6-2.6-2.6-5.4-2.6-8.6v-16c.5-7.9 2.2-22.6 5.2-22.6Z",
      engines:
        "M22.8 36.8c2.1-.5 4.1 1.3 4.4 4l.6 5.5c-1.2 1.2-3.8 1.4-5.1.1l-1.1-6.6c-.2-1.4.3-2.6 1.2-3Zm18.4 0c-2.1-.5-4.1 1.3-4.4 4l-.6 5.5c1.2 1.2 3.8 1.4 5.1.1l1.1-6.6c.2-1.4-.3-2.6-1.2-3Z"
    }
  },
  {
    id: "concept-2",
    name: "B · Heavy tail-engine signature",
    note: "Engine pods enlarged and dropped aft, so the silhouette is not just a scaled LJ60.",
    scalePx: 31.5,
    paths: {
      wing:
        "M27.8 25.8 6 35c-1 .4-1.7 1.4-1.7 2.6v3.5l24-5.4Zm8.4 0 21.8 9.2c1 .4 1.7 1.4 1.7 2.6v3.5l-24-5.4Z",
      tail:
        "M27.6 48.4 14.8 53.4v3.6l14.7-3Zm8.8 0 12.8 5v3.6l-14.7-3Z",
      body:
        "M32 1.8c3.2 0 4.9 15.6 5.2 23.5v12.8c0 5.6-1 9.4-3 12.2l-.5 4.3 5.5 4.1v3.4l-5.8-1.8L32 62.6l-1.4-2.3-5.8 1.8v-3.4l5.5-4.1-.5-4.3c-2-2.8-3-6.6-3-12.2V25.3c.3-7.9 2-23.5 5.2-23.5Z",
      engines:
        "M21.2 34.6c2.9-.8 5.3 1.5 5.7 5.2l.8 8.2c-1.3 1.8-5.4 2-7 .3l-1.4-9.3c-.2-2 .5-3.8 1.9-4.4Zm21.6 0c-2.9-.8-5.3 1.5-5.7 5.2l-.8 8.2c1.3 1.8 5.4 2 7 .3l1.4-9.3c.2-2-.5-3.8-1.9-4.4Z"
    }
  },
  {
    id: "concept-3",
    name: "C · Gulfstream clean winglet",
    note: "Sharper swept wing and canted tips, with slimmer rear engines and a very clean fuselage.",
    scalePx: 31,
    paths: {
      wing:
        "M27.6 25.3 6.8 32.7c-1.1.4-1.9 1.4-2 2.6l-.3 3.1 23.8-3.6 1.5-2.2-1.6-1.1Zm8.8 0 20.8 7.4c1.1.4 1.9 1.4 2 2.6l.3 3.1-23.8-3.6-1.5-2.2 1.6-1.1Zm-22.5 5.6-7.2-.9 1.2 3.4 6.2 1Zm36.2 0 7.2-.9-1.2 3.4-6.2 1Z",
      tail:
        "M27.6 47.8 18 50.8v3.4l11.5-1.9Zm8.8 0 9.6 3v3.4l-11.5-1.9Z",
      body:
        "M32 1.9c2.8 0 4.5 14.9 5.2 23.5v15.4c0 3.3-1.1 6.2-2.8 8.7l-.7 4.5 6.4 4.4v3.2l-6.2-1.7L32 62.2l-1.9-2.3-6.2 1.7v-3.2l6.4-4.4-.7-4.5c-1.7-2.5-2.8-5.4-2.8-8.7V25.4c.7-8.6 2.4-23.5 5.2-23.5Z",
      engines:
        "M23 38.2c1.8-.6 3.4.8 3.7 3.1l.6 5.4c-1 1-3.5 1.2-4.7.2l-1-5.9c-.2-1.3.4-2.4 1.4-2.8Zm18 0c-1.8-.6-3.4.8-3.7 3.1l-.6 5.4c1 1 3.5 1.2 4.7.2l1-5.9c.2-1.3-.4-2.4-1.4-2.8Z"
    }
  },
  {
    id: "concept-4",
    name: "D · Bombardier smooth-flex",
    note: "Longest cabin read, wings slightly aft and more elastic, engines set wider from fuselage.",
    scalePx: 31.2,
    paths: {
      wing:
        "M27.5 27.2 4.7 36.2c-.9.4-1.5 1.3-1.5 2.3v3.2l24.9-5.7 2-2.9Zm9 0 22.8 9c.9.4 1.5 1.3 1.5 2.3v3.2L35.9 36l-2-2.9Z",
      tail:
        "M27.2 49.6 15.2 54.1v3.5l14-2.6Zm9.6 0 12 4.5v3.5l-14-2.6Z",
      body:
        "M32 1.4c3.4 0 5.1 16.2 5.2 24.9v13.4c0 4.1-1.1 7.7-3.2 10.6l-.4 4.2 6.7 4.6v3.1l-6.9-1.8-1.4 2.3-1.4-2.3-6.9 1.8v-3.1l6.7-4.6-.4-4.2c-2.1-2.9-3.2-6.5-3.2-10.6V26.3c.1-8.7 1.8-24.9 5.2-24.9Z",
      engines:
        "M21.4 38c2.4-.9 4.7 1 5 4.3l.6 6.6c-1.4 1.4-4.5 1.4-5.9 0L20 41.7c-.2-1.6.4-3.1 1.4-3.7Zm21.2 0c-2.4-.9-4.7 1-5 4.3l-.6 6.6c1.4 1.4 4.5 1.4 5.9 0l1.1-7.2c.2-1.6-.4-3.1-1.4-3.7Z"
    }
  },
  {
    id: "concept-5",
    name: "E · Map-readability bold",
    note: "Highest contrast and simplest silhouette, sacrificing a little realism for small map sizes.",
    scalePx: 32,
    paths: {
      wing:
        "M27.4 25.9 4.5 35.2c-1.1.4-1.8 1.5-1.8 2.7v3.9l25.8-5.6Zm9.2 0 22.9 9.3c1.1.4 1.8 1.5 1.8 2.7v3.9l-25.8-5.6Z",
      tail:
        "M26.9 48.2 14.2 52.9v4l15.3-3.2Zm10.2 0 12.7 4.7v4l-15.3-3.2Z",
      body:
        "M32 1.2c3.5 0 5.3 16.3 5.6 24.8v13.8c0 4.1-1.3 7.8-3.5 10.8l-.3 3.9 7 5v3.4l-7.5-2.4L32 63l-1.3-2.5-7.5 2.4v-3.4l7-5-.3-3.9c-2.2-3-3.5-6.7-3.5-10.8V26c.3-8.5 2.1-24.8 5.6-24.8Z",
      engines:
        "M20.8 36.6c2.9-.9 5.5 1.4 5.9 5.4l.8 7.1c-1.5 1.8-5.5 1.9-7.2.1L19.1 41c-.3-2 .4-3.8 1.7-4.4Zm22.4 0c-2.9-.9-5.5 1.4-5.9 5.4l-.8 7.1c1.5 1.8 5.5 1.9 7.2.1l1.2-8.2c.3-2-.4-3.8-1.7-4.4Z"
    }
  }
];

function iconSvg(variant, title = variant.name) {
  const p = variant.paths;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="4096" viewBox="0 0 64 64" fill="none" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <title>${title}</title>
  <defs>
    <filter id="shadow" x="-25%" y="-25%" width="155%" height="165%">
      <feDropShadow dx="1.45" dy="2.55" stdDeviation="1.15" flood-color="${colors.stroke}" flood-opacity="0.44"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <path d="${p.wing}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
    <path d="${p.tail}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
    <path d="${p.body}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
    <path d="${p.engines}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
    <path d="${p.body}" fill="none" stroke="${colors.highlight}" stroke-opacity="0.24" stroke-width="0.35" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${p.engines}" fill="none" stroke="${colors.highlight}" stroke-opacity="0.22" stroke-width="0.35" stroke-linejoin="round" stroke-linecap="round"/>
  </g>
</svg>
`;
}

function previewIconGroup(paths, x, y, scale, label, sublabel) {
  const tx = `translate(${x} ${y}) scale(${scale})`;
  return `
    <g transform="${tx}">
      <path d="${paths.wing}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
      <path d="${paths.tail}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
      <path d="${paths.body}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
      <path d="${paths.engines}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
    </g>
    <text x="${x + 32 * scale}" y="${y + 84 * scale}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="16" font-weight="700" fill="${colors.ink}" text-anchor="middle">${label}</text>
    <text x="${x + 32 * scale}" y="${y + 105 * scale}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="12" fill="${colors.muted}" text-anchor="middle">${sublabel}</text>
  `;
}

function baselineGroup(x, y, scale) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <path d="${lj60Path}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
    </g>
    <text x="${x + 32 * scale}" y="${y + 84 * scale}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="16" font-weight="700" fill="${colors.ink}" text-anchor="middle">LJ60 baseline</text>
    <text x="${x + 32 * scale}" y="${y + 105 * scale}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="12" fill="${colors.muted}" text-anchor="middle">generic business jet</text>
  `;
}

function wrapWords(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function svgTextLines(text, x, y, options = {}) {
  const {
    maxChars = 52,
    lineHeight = 18,
    size = 14,
    fill = colors.muted,
    weight = 400,
    anchor = "start"
  } = options;
  return wrapWords(text, maxChars)
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${line}</text>`
    )
    .join("\n");
}

function previewSvg() {
  const cards = variants
    .map((variant, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const cardX = 64 + col * 492;
      const cardY = 354 + row * 380;
      const iconX = cardX + 72;
      const iconY = cardY + 78;
      return `
      <g>
        <rect x="${cardX}" y="${cardY}" width="430" height="314" rx="18" fill="#ffffff" stroke="#d8dbdd"/>
        <rect x="${cardX + 22}" y="${cardY + 28}" width="386" height="138" rx="10" fill="${colors.map}"/>
        <path d="M${cardX + 22} ${cardY + 122} C ${cardX + 108} ${cardY + 96}, ${cardX + 162} ${cardY + 162}, ${cardX + 248} ${cardY + 118} S ${cardX + 360} ${cardY + 94}, ${cardX + 408} ${cardY + 132}" fill="none" stroke="${colors.mapDark}" stroke-width="13" stroke-opacity=".45"/>
        <g transform="translate(${cardX + 100} ${cardY + 68}) scale(.78) rotate(-28 32 32)">
          <path d="${lj60Path}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill" opacity=".72"/>
        </g>
        <g transform="translate(${cardX + 242} ${cardY + 52}) scale(.88) rotate(-28 32 32)">
          <path d="${variant.paths.wing}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
          <path d="${variant.paths.tail}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
          <path d="${variant.paths.body}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
          <path d="${variant.paths.engines}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.45" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"/>
        </g>
        <text x="${cardX + 24}" y="${cardY + 198}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="22" font-weight="750" fill="${colors.ink}">${variant.name}</text>
        ${svgTextLines(variant.note, cardX + 24, cardY + 226, { maxChars: 52, size: 14, lineHeight: 18 })}
        <text x="${cardX + 24}" y="${cardY + 286}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="13" fill="${colors.muted}">Map display target: ${variant.scalePx}px; codes: GL7T / GL8T / GA7C</text>
      </g>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs>
    <filter id="previewShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="8" dy="14" stdDeviation="9" flood-color="#101820" flood-opacity=".22"/>
    </filter>
  </defs>
  <rect width="1600" height="1120" fill="${colors.panel}"/>
  <text x="64" y="72" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="34" font-weight="800" fill="${colors.ink}">GL7T / GL8T / GA7C four-cabin business jet icon concepts</text>
  <text x="64" y="112" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="17" fill="${colors.muted}">Based on LJ60 FR24-style yellow scheme. Real ratio target: fuselage +11%, span +7% vs three-cabin reference; visual features are intentionally stronger.</text>
  <g filter="url(#previewShadow)">
    <rect x="64" y="154" width="720" height="150" rx="16" fill="#ffffff" stroke="#d8dbdd"/>
    ${baselineGroup(114, 180, 1.32)}
    ${previewIconGroup(variants[0].paths, 328, 172, 1.42, "Four-cabin target", "+11% length / +7% span")}
    <line x1="286" y1="180" x2="286" y2="280" stroke="#d8dbdd"/>
    <text x="546" y="205" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="16" font-weight="700" fill="${colors.ink}">Design emphasis</text>
    <text x="546" y="232" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="14" fill="${colors.muted}">Longer cabin read</text>
    <text x="546" y="254" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="14" fill="${colors.muted}">Aft-mounted turbofan pods</text>
    <text x="546" y="276" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="14" fill="${colors.muted}">Sharper flagship tail/wing-tip signature</text>
  </g>
  <g filter="url(#previewShadow)">
    ${cards}
  </g>
</svg>`;
}

function htmlPreview() {
  const cards = variants
    .map(
      (variant) => `<article class="card">
  <div class="map-chip">
    <span class="baseline"><img src="../../assets/aircraft-icons/fr24-template-shadow-fr24yellow/LJ60.png" alt=""></span>
    <span class="candidate"><img src="png_512/${variant.id}.png" alt=""></span>
  </div>
  <div class="row">
    <div>
      <h2>${variant.name}</h2>
      <p>${variant.note}</p>
      <p class="meta">Display target ${variant.scalePx}px · GL7T / GL8T / GA7C</p>
    </div>
    <a href="svg/${variant.id}.svg">SVG</a>
  </div>
</article>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GL7T / GL8T / GA7C icon concepts</title>
  <style>
    :root { color-scheme: light; --yellow:${colors.fill}; --ink:${colors.ink}; --muted:${colors.muted}; --stroke:${colors.stroke}; --map:${colors.map}; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: ${colors.panel}; color: var(--ink); }
    main { max-width: 1380px; margin: 0 auto; padding: 36px 28px 48px; }
    h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.15; }
    .lead { margin: 0 0 24px; color: var(--muted); font-size: 16px; }
    .overview { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .panel, .card { background: #fff; border: 1px solid #d8dbdd; border-radius: 8px; box-shadow: 0 12px 26px rgba(17, 25, 32, .09); }
    .panel { padding: 18px 20px; }
    .panel h2 { margin: 0 0 10px; font-size: 17px; }
    .panel p { margin: 6px 0; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
    .card { padding: 14px; }
    .map-chip { position: relative; height: 154px; overflow: hidden; border-radius: 6px; background: var(--map); }
    .map-chip:before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.16), transparent 42%), radial-gradient(circle at 24% 68%, rgba(54,88,94,.42) 0 16%, transparent 17%); }
    .map-chip:after { content: ""; position: absolute; left: -18%; right: -18%; top: 54%; height: 18px; transform: rotate(-24deg); background: rgba(56,81,88,.35); border-radius: 99px; }
    .baseline, .candidate { position: absolute; display: grid; place-items: center; z-index: 1; filter: drop-shadow(7px 10px 7px rgba(18,25,32,.38)); }
    .baseline { left: 38px; top: 56px; width: 28px; height: 28px; opacity: .62; transform: rotate(-28deg); }
    .candidate { right: 58px; top: 42px; width: 38px; height: 38px; transform: rotate(-28deg); }
    img { width: 100%; height: 100%; object-fit: contain; }
    h2 { margin: 12px 0 6px; font-size: 16px; line-height: 1.2; }
    p { margin: 0; color: var(--muted); }
    .meta { margin-top: 10px; font-size: 12px; }
    .row { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
    a { color: #174f86; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
<main>
  <h1>GL7T / GL8T / GA7C 四客舱旗舰公务机 icon 方案</h1>
  <p class="lead">基于现有 LJ60 方案，只做候选预览，不更新首页地图和控制台映射。</p>
  <section class="overview">
    <div class="panel">
      <h2>尺寸逻辑</h2>
      <p>四客舱组：Global 7500 / Global 8000 / Gulfstream G700，均值约 33.7 m 机长、31.6 m 翼展。</p>
      <p>三客舱参考：Global 6000 / Gulfstream G650ER，均值约 30.4 m 机长、29.5 m 翼展。</p>
      <p>图标目标：相对三客舱参考，机身约 +11%，翼展约 +7%。</p>
    </div>
    <div class="panel">
      <h2>视觉逻辑</h2>
      <p>保持 FR24 黄、深色描边、低位投影。</p>
      <p>为了避免“只是放大”，五版都强化了后段机身、尾吊发动机、翼梢/尾翼识别点。</p>
    </div>
  </section>
  <section class="grid">
    ${cards}
  </section>
</main>
</body>
</html>`;
}

function readme() {
  return `# GL7T / GL8T / GA7C icon concepts

This folder contains five preview-only icon concepts for:
- GL7T = Bombardier Global 7500
- GL8T = Bombardier Global 8000
- GA7C = Gulfstream G700

No production map or admin-console mapping has been changed.

## Size logic

Four-cabin target group:
- Bombardier Global 7500: about 33.8-33.9 m length, 31.7 m wingspan.
- Bombardier Global 8000: about 33.8 m length, 31.8 m wingspan.
- Gulfstream G700: 33.48 m length, 31.39 m wingspan.

Three-cabin / current business-jet reference group:
- Bombardier Global 6000: about 30.30 m length, 28.65-28.70 m wingspan.
- Gulfstream G650ER: about 30.40 m length, 30.35 m wingspan.

Average target ratio used for drawing:
- Fuselage length: about +11%.
- Wingspan: about +7%.

The five concepts intentionally exaggerate rear-mounted turbofan pods, aft fuselage length, and tail/wing-tip details so the result is not merely a scaled LJ60.

## Files

- svg/concept-1.svg ... svg/concept-5.svg
- png_128/, png_256/, png_512/, png_1024/
- preview.svg
- preview.png
- preview.html

## Reference links

- Gulfstream G700 official specs: https://www.gulfstream.com/en/aircraft/gulfstream-g700/
- Gulfstream G650ER dimensions reference: https://aerocorner.com/aircraft/gulfstream-g650er/
- Bombardier Global 7500 dimensions reference: https://www.acm.aero/en/global-7500/
- Bombardier Global 6000 dimensions reference: https://www.acm.aero/en/global-6000/
- Bombardier Global 8000 dimensions reference: https://www.aeroexpo.cn/prod/bombardier/product-169445-329.html
`;
}

async function renderPng(svg, target, width) {
  await sharp(Buffer.from(svg)).resize(width, width).png({ compressionLevel: 9 }).toFile(target);
}

async function renderPreviewPng(svg, target) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(target);
}

async function main() {
  await fs.mkdir(svgDir, { recursive: true });
  for (const size of sizes) {
    await fs.mkdir(path.join(outDir, `png_${size}`), { recursive: true });
  }

  for (const variant of variants) {
    const svg = iconSvg(variant, `GL7T / GL8T / GA7C ${variant.name}`);
    await fs.writeFile(path.join(svgDir, `${variant.id}.svg`), svg);
    for (const size of sizes) {
      await renderPng(svg, path.join(outDir, `png_${size}`, `${variant.id}.png`), size);
    }
  }

  const fullPreview = previewSvg();
  await fs.writeFile(path.join(outDir, "preview.svg"), fullPreview);
  await renderPreviewPng(fullPreview, path.join(outDir, "preview.png"));
  await fs.writeFile(path.join(outDir, "preview.html"), htmlPreview());
  await fs.writeFile(path.join(outDir, "README.md"), readme());

  console.log(`Generated ${variants.length} GL7T/GL8T/GA7C icon concepts in ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
