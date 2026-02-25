"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SURFACE_PATH = path.join(ROOT, "docs", "product", "V1_UI_SURFACE.json");
const MATRIX_PATH = path.join(ROOT, "docs", "product", "V1_FEATURE_BACKEND_MATRIX.json");

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function collectSurfaceRoutes(surface) {
  const out = new Set();
  const modes = surface?.modes || {};
  for (const mode of Object.keys(modes)) {
    const def = modes[mode] || {};
    for (const r of def.routes || []) out.add(String(r));
    for (const r of def.outOfNavRoutes || []) out.add(String(r));
  }
  return out;
}

function main() {
  if (!fs.existsSync(SURFACE_PATH)) {
    console.error(`Missing ${SURFACE_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(MATRIX_PATH)) {
    console.error(`Missing ${MATRIX_PATH}`);
    process.exit(1);
  }

  const surface = readJson(SURFACE_PATH);
  const matrix = readJson(MATRIX_PATH);
  const features = Array.isArray(matrix?.features) ? matrix.features : [];

  const requiredRoutes = collectSurfaceRoutes(surface);
  const rowsByRoute = new Map();

  for (const row of features) {
    const route = row?.ui?.route;
    if (!route || typeof route !== "string") continue;
    const arr = rowsByRoute.get(route) || [];
    arr.push(row);
    rowsByRoute.set(route, arr);
  }

  const failures = [];
  const warnings = [];

  for (const route of Array.from(requiredRoutes).sort()) {
    const rows = rowsByRoute.get(route) || [];
    if (rows.length === 0) {
      failures.push(`Missing matrix mapping for UI route: ${route}`);
      continue;
    }

    const hasActionableStatus = rows.some((r) =>
      ["Functional", "Planned", "Disabled"].includes(String(r?.status || ""))
    );
    if (!hasActionableStatus) {
      failures.push(`Route mapped but has no actionable status row: ${route}`);
    }
  }

  for (const [route, rows] of rowsByRoute.entries()) {
    if (!requiredRoutes.has(route) && route.startsWith("/home/")) {
      warnings.push(
        `Matrix route not in V1_UI_SURFACE (check stale/extra row): ${route} (${rows.length} row(s))`
      );
    }
  }

  console.log(`Surface routes required: ${requiredRoutes.size}`);
  console.log(`Matrix feature rows: ${features.length}`);
  console.log(`Matrix routes mapped: ${rowsByRoute.size}`);

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(` - ${w}`);
  }

  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log("\nV1 UI surface validation passed.");
}

main();
