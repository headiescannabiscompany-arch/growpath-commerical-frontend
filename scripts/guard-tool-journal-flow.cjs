"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TOOLS_DIR = path.join(ROOT, "src", "app", "home", "personal", "(tabs)", "tools");
const HELPER_FILE = path.join(
  ROOT,
  "src",
  "features",
  "personal",
  "tools",
  "saveToolRunAndOpenJournal.ts"
);
const MIN_EXPECTED_TOOL_SCREENS = 7;

const BLOCKED_PATTERNS = ["/home/personal/logs/new?", "toolRunId="];

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

function findViolations(file, raw) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const lines = raw.split(/\r?\n/);
  const violations = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of BLOCKED_PATTERNS) {
      if (line.includes(pattern)) {
        violations.push(`${rel}:${i + 1} contains blocked pattern "${pattern}"`);
      }
    }
  }
  return violations;
}

function main() {
  if (!fs.existsSync(TOOLS_DIR)) {
    console.error(`Missing tools directory: ${TOOLS_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(HELPER_FILE)) {
    console.error(`Missing canonical helper file: ${HELPER_FILE}`);
    process.exit(1);
  }

  const files = walkFiles(TOOLS_DIR);
  const toolScreens = files.filter((f) => {
    const name = path.basename(f);
    return name.endsWith(".tsx") && name !== "index.tsx" && !name.startsWith("_");
  });
  const failures = [];

  if (toolScreens.length < MIN_EXPECTED_TOOL_SCREENS) {
    console.error(
      `Guard under-scanned tool routes: toolScreens=${toolScreens.length} expected>=${MIN_EXPECTED_TOOL_SCREENS}`
    );
    process.exit(1);
  }

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    failures.push(...findViolations(file, raw));
  }

  if (failures.length > 0) {
    console.error("Tool journal flow guard failed:");
    for (const f of failures) console.error(` - ${f}`);
    console.error(
      "Use src/features/personal/tools/saveToolRunAndOpenJournal.ts for journal navigation."
    );
    process.exit(1);
  }

  console.log(
    `Guard passed: allTsxScanned=${files.length} | toolScreensChecked=${toolScreens.length}`
  );
}

main();
