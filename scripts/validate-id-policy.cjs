"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const POLICY_PATH = path.join(ROOT, "docs", "contracts", "ID_POLICY.md");
const INDEX_PATH = path.join(ROOT, "docs", "GROWPATHAI_TOTAL_SPEC_INDEX.md");
const TOOL_SPEC_PATH = path.join(
  ROOT,
  "docs",
  "GROWPATH_TOOL_FUNCTION_SPEC_V1.0.1_HARDENED.md"
);

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "tmp", "dist", "build", "coverage"].includes(entry.name)) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && /\.(md|json)$/i.test(entry.name)) out.push(abs);
  }
  return out;
}

const failures = [];

if (!fs.existsSync(POLICY_PATH)) {
  failures.push(`Missing ID policy: ${rel(POLICY_PATH)}`);
}

if (!read(INDEX_PATH).includes("docs/contracts/ID_POLICY.md")) {
  failures.push("Total spec index must include docs/contracts/ID_POLICY.md");
}

const toolSpec = read(TOOL_SPEC_PATH);
if (!toolSpec.includes("See `docs/contracts/ID_POLICY.md`")) {
  failures.push("Hardened tool-function spec must reference the canonical ID policy");
}

const forbiddenPatterns = [
  /All objects use `id: string` \(UUID\)/,
  /public API IDs are UUID-v4/i,
  /all GrowPath IDs are UUID/i
];

for (const file of walk(path.join(ROOT, "docs"))) {
  const text = read(file);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(line)) {
        failures.push(`${rel(file)}:${index + 1} forbidden ID policy wording: ${line.trim()}`);
      }
    }
  });
}

if (failures.length) {
  console.error("[fail] ID policy validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[ok] ID policy validation passed.");
