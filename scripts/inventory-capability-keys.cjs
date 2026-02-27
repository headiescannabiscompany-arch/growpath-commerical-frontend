"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "src", "entitlements", "capabilityKeys.ts");
const OUT_DIR = path.join(ROOT, "tmp", "spec");
const OUT_FILE = path.join(OUT_DIR, "capability-keys.json");

function parseCapabilityKeys(source) {
  const entries = [];
  const regex = /([A-Z0-9_]+)\s*:\s*"([A-Z0-9_]+)"/g;
  let match = null;
  while ((match = regex.exec(source)) !== null) {
    entries.push({ key: match[1], value: match[2] });
  }
  return entries;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing capability source: ${SOURCE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SOURCE, "utf8");
  const entries = parseCapabilityKeys(raw);
  const keys = Array.from(new Set(entries.map((e) => e.key))).sort();
  const values = Array.from(new Set(entries.map((e) => e.value))).sort();

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFile: "src/entitlements/capabilityKeys.ts",
    totalEntries: entries.length,
    uniqueKeys: keys.length,
    uniqueValues: values.length,
    keys,
    values
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`Capability keys: ${keys.length}`);
}

main();
