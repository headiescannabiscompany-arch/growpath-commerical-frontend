import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const TESTS = path.join(ROOT, "tests");

const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".expo", ".next"]);

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function isCodeFile(p) {
  return EXTS.some((e) => p.endsWith(e));
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

const importRe =
  /\bimport\s+[^;]*?\s+from\s+["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']\s*\)|\bexport\s+[^;]*?\s+from\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

function extractImports(code) {
  const deps = [];
  let m;
  while ((m = importRe.exec(code))) {
    const dep = m[1] || m[2] || m[3] || m[4];
    if (dep) deps.push(dep);
  }
  return deps;
}

function resolveFileLike(base) {
  for (const ext of EXTS) {
    const p = base.endsWith(ext) ? base : base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }

  for (const ext of EXTS) {
    const p = path.join(base, "index" + ext);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }

  return null;
}

function resolveRelative(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  return resolveFileLike(base);
}

function resolveSpec(fromFile, spec) {
  if (spec.startsWith(".")) return resolveRelative(fromFile, spec);

  if (spec.startsWith("@/")) {
    const base = path.join(SRC, spec.slice(2));
    return resolveFileLike(base);
  }

  if (spec.startsWith("src/")) {
    const base = path.join(ROOT, spec);
    return resolveFileLike(base);
  }

  return null;
}

function groupByBase(files) {
  const map = new Map();
  for (const f of files) {
    const dir = path.dirname(f);
    const base = path.basename(f, path.extname(f));
    const key = path.join(dir, base);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  return map;
}

const srcFiles = fs.existsSync(SRC) ? walk(SRC).filter(isCodeFile) : [];
const testFiles = fs.existsSync(TESTS) ? walk(TESTS).filter(isCodeFile) : [];
const allFiles = [...srcFiles, ...testFiles];

const graph = new Map();
const importers = new Map();

for (const f of allFiles) {
  const code = read(f);
  const specs = extractImports(code);
  const deps = [];
  for (const s of specs) {
    const r = resolveSpec(f, s);
    if (r) deps.push(r);
  }
  graph.set(f, deps);

  for (const d of deps) {
    if (!importers.has(d)) importers.set(d, []);
    importers.get(d).push(f);
  }
}

const byBase = groupByBase(allFiles);
const twins = [];
for (const [, arr] of byBase.entries()) {
  const exts = new Set(arr.map((f) => path.extname(f)));
  if (exts.has(".js") && (exts.has(".ts") || exts.has(".tsx"))) {
    twins.push(arr.map(rel));
  }
}

const apiDir = path.join(SRC, "api");
const apiFiles = allFiles.filter((f) => f.startsWith(apiDir));
const apiOrphans = apiFiles
  .filter((f) => !importers.has(f))
  .map(rel)
  .sort();

const legacyClientCallers = allFiles
  .filter((f) => {
    const c = read(f);
    return (
      c.includes('from "./client"') ||
      c.includes('from "./client.js"') ||
      c.includes('from "../api/client"') ||
      c.includes('from "@/api/client"') ||
      c.includes('from "src/api/client"')
    );
  })
  .map(rel)
  .sort();

const bannedFindings = [];
const banned = [
  { label: "fetch(", regex: /\bfetch\s*\(/ },
  { label: "axios", regex: /\baxios\b/ },
  { label: "/:id placeholder", regex: /\/:/ }
];

for (const f of allFiles) {
  const c = read(f);
  for (const b of banned) {
    if (b.regex.test(c)) bannedFindings.push({ file: rel(f), rule: b.label });
  }
}

const report = {
  root: ROOT,
  counts: {
    srcFiles: srcFiles.length,
    testFiles: testFiles.length,
    totalFiles: allFiles.length,
    apiFiles: apiFiles.length,
    apiOrphans: apiOrphans.length,
    legacyClientCallers: legacyClientCallers.length,
    jsTsTwins: twins.length,
    bannedFindings: bannedFindings.length
  },
  jsTsTwins: twins,
  apiOrphans,
  legacyClientCallers,
  bannedFindings
};

const outDir = path.join(ROOT, "tmp", "scan");
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");

let md = `# Full Scan Report\n\n`;
md += `## Counts\n`;
md += `- src files: ${report.counts.srcFiles}\n`;
md += `- test files: ${report.counts.testFiles}\n`;
md += `- total files: ${report.counts.totalFiles}\n`;
md += `- api files: ${report.counts.apiFiles}\n`;
md += `- api orphans: ${report.counts.apiOrphans}\n`;
md += `- legacy client callers: ${report.counts.legacyClientCallers}\n`;
md += `- js/ts twin modules: ${report.counts.jsTsTwins}\n`;
md += `- banned findings: ${report.counts.bannedFindings}\n\n`;

md += `## JS/TS Twins (same module name exists in both JS + TS)\n`;
md += report.jsTsTwins.length ? report.jsTsTwins.map((g) => `- ${g.join(" , ")}`).join("\n") : `- none`;
md += `\n\n## API Orphans (src/api files not imported anywhere)\n`;
md += report.apiOrphans.length ? report.apiOrphans.map((f) => `- ${f}`).join("\n") : `- none`;
md += `\n\n## Legacy client callers\n`;
md += report.legacyClientCallers.length ? report.legacyClientCallers.map((f) => `- ${f}`).join("\n") : `- none`;
md += `\n\n## Banned findings\n`;
md += report.bannedFindings.length
  ? report.bannedFindings.map((x) => `- ${x.rule}: ${x.file}`).join("\n")
  : `- none`;
md += `\n`;

fs.writeFileSync(path.join(outDir, "report.md"), md, "utf8");

console.log(`Wrote:\n- ${path.join("tmp", "scan", "report.md")}\n- ${path.join("tmp", "scan", "report.json")}`);
