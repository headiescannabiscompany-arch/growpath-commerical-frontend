"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET_DIRS = ["src", "backend", "docs", "tests", "scripts"];
const TEXT_EXTENSIONS = /\.(js|jsx|ts|tsx|md|json|cjs|mjs|ps1)$/i;

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      [".git", "node_modules", "tmp", "dist", "build", "coverage"].includes(entry.name)
    ) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && TEXT_EXTENSIONS.test(entry.name)) out.push(abs);
  }
  return out;
}

const failures = [];
const forbidden = [
  /\bX-Facility-Id\b/i,
  /\bx-facility-id\b/i,
  /\bheaders?\s*[:=][^\n]*(facilityId|facility-id)\b/i,
  /\bfacilityId\b[^\n]{0,80}\bheader\b/i,
  /\bheader\b[^\n]{0,80}\bfacilityId\b/i
];

for (const dir of TARGET_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const relative = rel(file);
    if (relative === "scripts/validate-facility-context.cjs") continue;
    const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    raw.split(/\r?\n/).forEach((line, index) => {
      if (/x-test-facility-id/i.test(line)) return;
      if (/test headers \(dev only\)/i.test(line)) return;
      for (const pattern of forbidden) {
        if (pattern.test(line)) {
          failures.push(
            `${relative}:${index + 1} header-derived facility context: ${line.trim()}`
          );
          break;
        }
      }
    });
  }
}

if (failures.length) {
  console.error("[fail] Facility context validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Facility context must come from path params such as /api/facility/:facilityId, not request headers."
  );
  process.exit(1);
}

console.log("[ok] Facility context validation passed.");
