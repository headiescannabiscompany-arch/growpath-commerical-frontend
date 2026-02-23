import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".expo", ".next"]);

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (EXTS.has(path.extname(p))) out.push(p);
  }
  return out;
}

function normalizeCrlf(s) {
  return s.replace(/\r\n/g, "\n");
}

function toCrlf(s) {
  return s.replace(/\n/g, "\r\n");
}

const files = fs.existsSync(SRC) ? walk(SRC) : [];
const changed = [];
const report = [];

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const lf = normalizeCrlf(raw);
  const lines = lf.split("\n");
  const seen = new Set();
  let dupCount = 0;
  const out = [];
  for (const line of lines) {
    if (line.startsWith("import ") && line.endsWith(";")) {
      if (seen.has(line)) {
        dupCount += 1;
        continue;
      }
      seen.add(line);
    }
    out.push(line);
  }
  if (dupCount > 0) {
    report.push({ file: path.relative(ROOT, file).replace(/\\/g, "/"), removed: dupCount });
    const next = toCrlf(out.join("\n"));
    fs.writeFileSync(file, next, "utf8");
    changed.push(file);
  }
}

const outDir = path.join(ROOT, "tmp");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "duplicate-imports.json"), JSON.stringify(report, null, 2), "utf8");

console.log(`Scanned ${files.length} files. Updated ${changed.length}.`);
if (report.length) console.log(`Wrote tmp/duplicate-imports.json`);
