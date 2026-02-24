import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".expo", ".next"]);

const PLACEHOLDER_PATTERNS = [
  /PlannedScreen/,
  /\(Planned\)/,
  /Planned feature/i,
  /Planned content/i,
  /Planned Modules/i,
  /Create \(Planned\)/i,
  /\bSoon\b/
];

const CORRUPTION_PATTERNS = [
  new RegExp("\u00c3"), // Ã
  new RegExp("\u00e2\u20ac\u2122"), // '
  new RegExp("\u00e2\u20ac\u0153"), // "
  new RegExp("\u00e2\u20ac"), // â€
  new RegExp("\u00c2"), // Â
  /�/
];

const EXPORT_SANITY_FILES = [
  "src/app/home/facility/sop-runs/index.tsx",
  "src/app/home/facility/sop-runs/start.tsx",
  "src/app/home/facility/sop-runs/[id].tsx",
  "src/app/home/facility/sop-runs/presets.tsx",
  "src/app/home/facility/sop-runs/compare.tsx",
  "src/app/home/facility/sop-runs/compare-result.tsx",
  "src/app/home/facility/audit-logs/index.tsx",
  "src/app/home/facility/audit-logs/[id].tsx",
  "src/app/home/facility/audit-logs/[entity]/[entityId].tsx",
  "src/app/home/personal/(tabs)/tools/index.tsx",
  "src/app/home/personal/(tabs)/tools/vpd.tsx",
  "src/app/home/personal/(tabs)/tools/npk.tsx",
  "src/app/home/personal/(tabs)/tools/watering.tsx",
  "src/screens/GrowLogScreen.js"
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile() && CODE_EXTS.has(path.extname(abs))) out.push(abs);
  }
  return out;
}

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

function scanFiles(files, patterns, label) {
  const findings = [];
  for (const abs of files) {
    const text = fs.readFileSync(abs, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const re of patterns) {
        if (re.test(line)) {
          findings.push({ file: rel(abs), line: idx + 1, pattern: String(re), source: line.trim() });
        }
      }
    });
  }
  if (findings.length === 0) {
    console.log(`[ok] ${label}: no findings`);
  } else {
    console.log(`[fail] ${label}: ${findings.length} findings`);
    for (const f of findings) {
      console.log(` - ${f.file}:${f.line} ${f.source}`);
    }
  }
  return findings;
}

function checkExportSanity() {
  const missing = [];
  for (const relPath of EXPORT_SANITY_FILES) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) {
      missing.push({ file: relPath, reason: "missing file" });
      continue;
    }
    const text = fs.readFileSync(abs, "utf8");
    if (!/export\s+default|export\s+\{\s*default\s*\}/.test(text)) {
      missing.push({ file: relPath, reason: "missing default export" });
    }
  }
  if (missing.length === 0) {
    console.log("[ok] export sanity: passed");
  } else {
    console.log(`[fail] export sanity: ${missing.length} issues`);
    for (const m of missing) console.log(` - ${m.file}: ${m.reason}`);
  }
  return missing;
}

const placeholderFiles = [
  ...walk(path.join(ROOT, "src", "app")),
  ...walk(path.join(ROOT, "src", "screens"))
];

const corruptionFiles = [
  ...walk(path.join(ROOT, "src")),
  ...walk(path.join(ROOT, "tests")),
  ...walk(path.join(ROOT, "scripts"))
].filter((abs) => rel(abs) !== "scripts/verify-delivery.mjs");

const placeholderFindings = scanFiles(placeholderFiles, PLACEHOLDER_PATTERNS, "placeholder scan");
const corruptionFindings = scanFiles(corruptionFiles, CORRUPTION_PATTERNS, "corruption scan");
const exportFindings = checkExportSanity();

if (placeholderFindings.length || corruptionFindings.length || exportFindings.length) {
  process.exit(1);
}

console.log("verify:delivery complete");
