"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const TELEMETRY_API_FILE = path.join(SRC_DIR, "api", "telemetry.ts");

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function stripTelemetryRoutesBlock(raw) {
  const start = raw.indexOf("export const TELEMETRY_ROUTES");
  const end = raw.indexOf("} as const;", start);
  if (start < 0 || end < 0) return raw;
  return raw.slice(0, start) + raw.slice(end + "} as const;".length);
}

function main() {
  const failures = [];

  if (!fs.existsSync(TELEMETRY_API_FILE)) {
    console.error(`Missing telemetry API file: ${path.relative(ROOT, TELEMETRY_API_FILE)}`);
    process.exit(1);
  }

  const telemetryRaw = fs.readFileSync(TELEMETRY_API_FILE, "utf8");

  if (/\bfetch\s*\(/.test(telemetryRaw)) {
    failures.push("src/api/telemetry.ts must not use fetch(); use apiRequest()");
  }
  if (/\baxios\b/.test(telemetryRaw)) {
    failures.push("src/api/telemetry.ts must not use axios; use apiRequest()");
  }

  const stripped = stripTelemetryRoutesBlock(telemetryRaw);
  if (/["'`]\/api\/telemetry/.test(stripped)) {
    failures.push('src/api/telemetry.ts contains direct "/api/telemetry" literal outside TELEMETRY_ROUTES');
  }

  if (!/delete\s+config\.pulse\.apiKey\s*;/.test(telemetryRaw)) {
    failures.push("src/api/telemetry.ts must strip config.pulse.apiKey during source normalization");
  }

  const allFiles = walkFiles(SRC_DIR);
  for (const file of allFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (file === TELEMETRY_API_FILE) continue;
    const raw = fs.readFileSync(file, "utf8");
    if (/["'`]\/api\/telemetry/.test(raw)) {
      failures.push(`${rel} contains direct "/api/telemetry" literal; use src/api/telemetry.ts`);
    }
  }

  if (failures.length) {
    console.error("Telemetry API guard failed:");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log("Telemetry API guard passed.");
}

main();
