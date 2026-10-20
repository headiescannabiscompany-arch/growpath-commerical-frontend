"use strict";
// Static loopback server only: no database, POST API, app bootstrap or secrets.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const tls = require("node:tls");
const inherited = process.env;
process.env = Object.fromEntries(
  ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]
    .filter((key) => inherited[key] !== undefined)
    .map((key) => [key, inherited[key]])
);
const forbidden = () => {
  throw new Error("External transport forbidden");
};
http.request =
  http.get =
  https.request =
  https.get =
  tls.connect =
  global.fetch =
    forbidden;
const expectedRoot = path.resolve(
  __dirname,
  "../../../../../outputs/tmp-course-gift-host-20261016"
);
const bundle = fs.realpathSync(process.argv[2]);
const folder = path.dirname(bundle);
if (
  path.basename(bundle) !== "fixture.js" ||
  !path.basename(folder).startsWith("growpath-gift-host-bundle-") ||
  path.dirname(folder).toLowerCase() !== fs.realpathSync(expectedRoot).toLowerCase()
)
  throw new Error("Only this task's exact temporary bundle is permitted");
const bytes = fs.readFileSync(bundle);
const courseEntry = process.argv.includes("--course-entry");
const html = Buffer.from(
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local course-gift host/navigation check</title><style>body{margin:0;background:#0d151b;color:white;font-family:sans-serif}button{padding:8px}pre{white-space:pre-wrap}#root{min-height:100vh}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>'
);
const routes = new Set([
  "/",
  "/ordinary",
  "/login",
  "/courses",
  "/claim-course-gift",
  "/course-gifts/checkout"
]);
if (courseEntry) {
  routes.add(`/courses/${"a".repeat(24)}`);
  routes.add(`/home/commercial/courses/${"b".repeat(24)}`);
}
let port,
  stopping = false,
  startupFailed = false,
  timer;
const server = http.createServer((req, res) => {
  if (
    req.socket.remoteAddress !== "127.0.0.1" ||
    req.headers.host !== `127.0.0.1:${port}`
  ) {
    res.writeHead(403).end();
    return;
  }
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
  );
  if (req.method !== "GET") {
    res.writeHead(405).end();
    return;
  }
  let pathname;
  try {
    pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (pathname === "/fixture.js") {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.end(bytes);
  } else if (routes.has(pathname)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  } else res.writeHead(404).end();
});
function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  server.close(() => {
    try {
      // Exact validated bundle folder only; never the enclosing TEMP/workspace.
      fs.rmSync(folder, { recursive: true, force: true });
      console.log(JSON.stringify({ stopped: true, startupFailed, cleanupFailed: false }));
      process.exit(startupFailed ? 1 : 0);
    } catch {
      console.log(JSON.stringify({ stopped: true, cleanupFailed: true }));
      process.exit(1);
    }
  });
  server.closeAllConnections();
}
server.listen(0, "127.0.0.1", () => {
  port = server.address().port;
  console.log(
    JSON.stringify({
      ready: true,
      url: `http://127.0.0.1:${port}`,
      pid: process.pid,
      bundleFolder: folder,
      expiresInMinutes: 30
    })
  );
  timer = setTimeout(stop, 30 * 60 * 1000);
});
server.on("error", () => {
  startupFailed = true;
  console.error("Local host fixture server failed");
  stop();
});
process.stdin.setEncoding("utf8");
let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (input.includes("stop\n") || input.includes("stop\r\n")) stop();
});
process.stdin.on("end", stop);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
