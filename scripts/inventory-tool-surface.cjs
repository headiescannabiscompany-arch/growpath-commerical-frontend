"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.join(ROOT, "src", "app");
const CONTRACT_PATH = path.join(ROOT, "docs", "contracts", "FRONTEND_RUNTIME_CONTRACT.json");
const OUT_DIR = path.join(ROOT, "tmp", "spec");
const OUT_FILE = path.join(OUT_DIR, "tool-surface.json");

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx)$/i.test(entry.name)) continue;
    if (/\.bak$/i.test(entry.name)) continue;
    out.push(abs);
  }
  return out;
}

function toRoute(appRelativePath) {
  const noExt = appRelativePath.replace(/\.(tsx?|jsx?)$/i, "");
  const segments = noExt
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => segment !== "_layout");
  if (segments[segments.length - 1] === "index") segments.pop();
  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

function collectRoutes() {
  const files = walk(APP_DIR);
  const routes = [];
  for (const abs of files) {
    const rel = path.relative(APP_DIR, abs).replace(/\\/g, "/");
    routes.push({
      file: `src/app/${rel}`,
      route: toRoute(rel)
    });
  }
  return routes;
}

function main() {
  if (!fs.existsSync(CONTRACT_PATH)) {
    console.error(`Missing contract file: ${CONTRACT_PATH}`);
    process.exit(1);
  }

  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8").replace(/^\uFEFF/, ""));
  const routeRows = collectRoutes();
  const routeSet = new Set(routeRows.map((row) => row.route));

  const required = (contract.tools?.requiredRoutes || []).map((tool) => ({
    id: tool.id,
    route: tool.route,
    file: tool.file,
    routeExists: routeSet.has(tool.route),
    fileExists: fs.existsSync(path.join(ROOT, tool.file))
  }));

  const discoveredPersonalToolRoutes = routeRows
    .filter((row) => row.route.startsWith("/home/personal/tools"))
    .sort((a, b) => a.route.localeCompare(b.route));

  const payload = {
    generatedAt: new Date().toISOString(),
    requiredTools: required,
    discoveredPersonalToolRoutes
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);
  console.log(
    `Required tools: ${required.length} | discovered personal tool routes: ${discoveredPersonalToolRoutes.length}`
  );
}

main();
