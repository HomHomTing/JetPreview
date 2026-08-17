#!/usr/bin/env node
import { createServer } from "node:http";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { access } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) {
    continue;
  }
  const key = arg.slice(2);
  const value = process.argv[index + 1]?.startsWith("--") ? "true" : process.argv[index + 1] || "true";
  args.set(key, value);
  if (value !== "true") {
    index += 1;
  }
}

const host = args.get("host") || "0.0.0.0";
const port = Number(args.get("port") || 8792);
const token = args.get("token") || randomBytes(12).toString("hex");
const cookieName = "bizjet_ipad_preview";
const rootAllowlist = new Set([
  "index.html",
  "admin.html",
  "styles.css",
  "admin.css",
  "app.js",
  "admin.js",
  "data-service.js",
  "time-utils.js",
  "ground-projection-core.js",
  "aircraft-icon-config.js",
  "aircraft-icon-runtime-config.js"
]);
const directoryAllowlist = ["assets"];
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, item) => {
    const [key, ...rest] = item.trim().split("=");
    if (key) {
      cookies[key] = decodeURIComponent(rest.join("="));
    }
    return cookies;
  }, {});
}

function hasValidToken(request, url) {
  const queryToken = url.searchParams.get("previewToken");
  const cookieToken = parseCookies(request.headers.cookie || "")[cookieName];
  return queryToken === token || cookieToken === token;
}

function safeRequestPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const cleaned = normalize(decoded === "/" ? "/index.html" : decoded).replace(/^[/\\]+/, "");
  if (!cleaned || cleaned.startsWith("..") || cleaned.includes(`${sep}..${sep}`)) {
    return "";
  }
  const firstSegment = cleaned.split(/[\\/]/)[0];
  if (rootAllowlist.has(cleaned) || directoryAllowlist.includes(firstSegment)) {
    return cleaned;
  }
  return "";
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sendHtml(response, status, html) {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(html);
}

function sendJavaScript(response, code) {
  response.writeHead(200, {
    "content-type": "text/javascript; charset=utf-8",
    "cache-control": "no-store",
    "set-cookie": `${cookieName}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`
  });
  response.end(code);
}

function forbidden(response) {
  sendHtml(response, 403, `<!doctype html>
<html lang="zh-CN">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview token required</title>
  <body style="margin:0;background:#101418;color:#f4f7f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;display:grid;min-height:100vh;place-items:center">
    <main style="max-width:520px;padding:28px">
      <h1 style="font-size:24px">需要预览令牌</h1>
      <p style="line-height:1.6;color:#aab4bf">请使用终端中打印出来的 iPad 预览链接打开页面。</p>
    </main>
  </body>
</html>`);
}

function readAppConfig() {
  const sandbox = { window: {} };
  runInNewContext(readFileSync(join(rootDir, "config.js"), "utf8"), sandbox, {
    filename: "config.js",
    timeout: 1000
  });
  return sandbox.window.APP_CONFIG || {};
}

function sanitizedConfigScript() {
  const config = JSON.parse(JSON.stringify(readAppConfig()));
  config.api = {
    ...(config.api || {}),
    baseUrl: "/api/private",
    authorizedUser: { hlUserId: "ipad-preview-owner" }
  };
  config.apiDebugConsole = {
    ...(config.apiDebugConsole || {}),
    enabled: true,
    allowedHlUserIds: ["ipad-preview-owner"],
    allowPublicHost: false
  };
  return `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
}

function readRequestBody(request, limitBytes = 2 * 1024 * 1024) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        rejectBody(new Error("Request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    request.on("error", rejectBody);
  });
}

async function proxyPrivateApi(request, response) {
  if (request.method !== "POST") {
    sendHtml(response, 405, "Method not allowed");
    return;
  }
  if (typeof fetch !== "function") {
    sendHtml(response, 500, "Node.js fetch is unavailable. Use Node.js 18 or newer.");
    return;
  }

  const config = readAppConfig();
  const api = config.api || {};
  const baseUrl = String(api.baseUrl || "").trim();
  if (!baseUrl) {
    sendHtml(response, 500, "Private API baseUrl is not configured on the Mac.");
    return;
  }

  const body = new URLSearchParams(await readRequestBody(request));
  const pid = String(body.get("pid") || "").trim();
  if (pid === "513012") {
    sendHtml(response, 403, "API 513012 requests are disabled");
    return;
  }
  body.set("accountType", api.accountType || "web_map");
  body.set("authorizedUser", JSON.stringify(api.authorizedUser || {}));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(api.requestTimeoutMs || 12000));
  try {
    const upstream = await fetch(baseUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal
    });
    const text = await upstream.text();
    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (!hasValidToken(request, url)) {
    forbidden(response);
    return;
  }

  if (url.pathname === "/config.js") {
    sendJavaScript(response, sanitizedConfigScript());
    return;
  }

  if (url.pathname === "/api/private") {
    await proxyPrivateApi(request, response);
    return;
  }

  const requested = safeRequestPath(url.pathname);
  if (!requested) {
    sendHtml(response, 404, "Not found");
    return;
  }

  const filePath = join(rootDir, requested);
  const fileRelative = relative(rootDir, filePath);
  if (fileRelative.startsWith("..") || !(await fileExists(filePath))) {
    sendHtml(response, 404, "Not found");
    return;
  }

  const stats = statSync(filePath);
  if (!stats.isFile()) {
    sendHtml(response, 404, "Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
    "cache-control": "no-store",
    "set-cookie": `${cookieName}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`
  });
  createReadStream(filePath).pipe(response);
}

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    sendHtml(response, 500, "Preview server error");
  });
});

server.listen(port, host, () => {
  const addresses = lanAddresses();
  const query = `previewToken=${encodeURIComponent(token)}`;
  console.log("");
  console.log("iPad preview server is running.");
  console.log(`Local Mac: http://127.0.0.1:${port}/index.html?${query}`);
  if (addresses.length) {
    console.log("Open one of these URLs on the iPad while it is on the same Wi-Fi:");
    addresses.forEach((address) => {
      console.log(`  http://${address}:${port}/index.html?${query}`);
    });
  } else {
    console.log("No LAN IPv4 address was detected. Check Wi-Fi or Ethernet connection.");
  }
  console.log("");
  console.log("Press Ctrl-C to stop the preview server.");
});
