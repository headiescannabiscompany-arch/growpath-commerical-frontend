// Loopback-only inspection of a local export. No deployment, account or record writes.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../../dist-w10-20261014-final");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon"
};
const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(405).end();
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1:4183").pathname);
  } catch {
    return res.writeHead(400).end();
  }
  let file = path.resolve(root, "." + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    if (!path.extname(file) && fs.existsSync(file + ".html")) file += ".html";
    else if (!path.extname(file)) file = path.join(root, "index.html");
    else return res.writeHead(404).end();
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.growpathai.com; frame-src 'none'; form-action 'none'; base-uri 'self'"
  );
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
});
server.listen(4183, "127.0.0.1", () =>
  console.log("W10 local preview: http://127.0.0.1:4183")
);
process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
