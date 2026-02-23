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

const files = fs.existsSync(SRC) ? walk(SRC) : [];
const report = [];

const fnDecl = /^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/;
const constFn = /^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*\(.*\)\s*=>/;
const constFn2 = /^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*function\s*\(/;
const classDecl = /^\s*class\s+([A-Za-z_$][\w$]*)\s*/;
const constDecl = /^\s*const\s+([A-Za-z_$][\w$]*)\b/;
const letDecl = /^\s*let\s+([A-Za-z_$][\w$]*)\b/;
const importLine = /^\s*import\s+.*;\s*$/;

function scanFile(file) {
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const imports = new Set();
  const names = new Map();
  let inImports = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (inImports) {
      if (line.trim() === "" || importLine.test(line)) {
        if (importLine.test(line)) {
          if (imports.has(line)) {
            report.push({
              type: "duplicate-import-line",
              file,
              line: lineNo,
              detail: line.trim()
            });
          }
          imports.add(line);
        }
      } else {
        inImports = false;
      }
    }

    const m1 = line.match(fnDecl) || line.match(constFn) || line.match(constFn2) || line.match(classDecl) || line.match(constDecl) || line.match(letDecl);
    if (m1) {
      const name = m1[1];
      if (!name) continue;
      const key = name;
      if (!names.has(key)) names.set(key, []);
      names.get(key).push(lineNo);
    }
  }

  for (const [name, linesList] of names.entries()) {
    if (linesList.length > 1) {
      report.push({
        type: "duplicate-identifier",
        file,
        name,
        lines: linesList
      });
    }
  }
}

for (const f of files) scanFile(f);

const outDir = path.join(ROOT, "tmp");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "parse-blockers.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

console.log(`Scanned ${files.length} files. Findings: ${report.length}`);
console.log(`Wrote ${outPath}`);
