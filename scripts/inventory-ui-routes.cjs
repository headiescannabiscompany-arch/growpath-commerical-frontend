"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.join(ROOT, "src", "app");
const OUT_DIR = path.join(ROOT, "tmp", "spec");
const OUT_FILE = path.join(OUT_DIR, "ui-routes.json");
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!EXTS.has(path.extname(entry.name))) continue;
    out.push(abs);
  }
  return out;
}

function toRoute(appRelativePath) {
  const noExt = appRelativePath.replace(/\.(tsx?|jsx?)$/i, "");
  const segments = noExt
    .split("/")
    .filter(Boolean)
    .filter((seg) => !seg.startsWith("(") || !seg.endsWith(")"))
    .filter((seg) => seg !== "_layout");
  if (segments.length === 0) return null;
  if (segments[segments.length - 1] === "index") segments.pop();
  return "/" + segments.join("/");
}

function main() {
  if (!fs.existsSync(APP_DIR)) {
    console.error("Missing src/app directory");
    process.exit(1);
  }

  const rows = walk(APP_DIR)
    .map((abs) => {
      const rel = path.relative(APP_DIR, abs).replace(/\\/g, "/");
      return {
        file: `src/app/${rel}`,
        route: toRoute(rel),
        kind: rel.includes("_layout.") ? "layout" : "screen"
      };
    })
    .filter((row) => !!row.route)
    .sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));

  const routes = Array.from(new Set(rows.map((r) => r.route))).sort();
  const payload = {
    generatedAt: new Date().toISOString(),
    appDir: "src/app",
    routeCount: routes.length,
    fileCount: rows.length,
    routes,
    files: rows
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Routes: ${routes.length} | Files: ${rows.length}`);
}

main();
