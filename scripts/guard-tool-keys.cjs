"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TOOLS_DIR = path.join(ROOT, "src", "app", "home", "personal", "(tabs)", "tools");

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
      continue;
    }
    if (!entry.name.endsWith(".tsx")) continue;
    if (entry.name === "index.tsx" || entry.name.startsWith("_")) continue;
    out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(TOOLS_DIR)) {
    console.error(`Missing tools directory: ${TOOLS_DIR}`);
    process.exit(1);
  }

  const files = walkFiles(TOOLS_DIR);
  const failures = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const base = path.basename(file, ".tsx");
    const raw = fs.readFileSync(file, "utf8");

    if (raw.includes("saveToolRunAndOpenJournal(")) {
      const keyMatches = [...raw.matchAll(/toolKey:\s*"([^"]+)"/g)];
      if (keyMatches.length === 0) {
        failures.push(`${rel} missing toolKey for saveToolRunAndOpenJournal`);
      }
      for (const match of keyMatches) {
        const key = String(match[1] || "");
        if (key !== base) {
          failures.push(`${rel} has toolKey "${key}" but filename key is "${base}"`);
        }
      }
    }

    const typeMatches = [...raw.matchAll(/toolType:\s*"([^"]+)"/g)];
    for (const match of typeMatches) {
      const key = String(match[1] || "");
      if (key !== base) {
        failures.push(`${rel} has toolType "${key}" but filename key is "${base}"`);
      }
    }
  }

  if (failures.length) {
    console.error("Tool key guard failed:");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log(`Tool key guard passed: ${files.length} tool screens checked.`);
}

main();
