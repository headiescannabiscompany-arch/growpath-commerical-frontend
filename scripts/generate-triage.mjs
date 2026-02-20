import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function safeRead(fp) {
  try {
    return fs.readFileSync(fp, "utf8");
  } catch {
    return null;
  }
}

function bytes(fp) {
  try {
    return fs.statSync(fp).size;
  } catch {
    return 0;
  }
}

function sha1(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

function isTextFile(p) {
  return /\.(js|jsx|ts|tsx|mjs|cjs|json|md|yml|yaml)$/i.test(p);
}

function routePathFromAppFile(rel) {
  let p = rel.replace(/^src\/app\//, "").replace(/\.(tsx|ts|jsx|js)$/, "");
  if (p === "index") return "/";
  p = p.replace(/\/index$/, "/");
  p = p.replace(/\/_/g, "/_");
  return `/${p}`.replace(/\/+/g, "/");
}

function findImports(content) {
  const deps = new Set();
  if (!content) return deps;
  const importRe = /\bimport\s+(?:.+?\s+from\s+)?["']([^"']+)["']/g;
  const reqRe = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while ((m = importRe.exec(content))) deps.add(m[1]);
  while ((m = reqRe.exec(content))) deps.add(m[1]);
  return deps;
}

function resolveLocal(fromRel, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.dirname(path.join(ROOT, fromRel));
  const raw = path.resolve(base, spec);
  const candidates = [
    raw,
    `${raw}.js`,
    `${raw}.jsx`,
    `${raw}.ts`,
    `${raw}.tsx`,
    path.join(raw, "index.js"),
    path.join(raw, "index.jsx"),
    path.join(raw, "index.ts"),
    path.join(raw, "index.tsx")
  ];
  for (const c of candidates) {
    const rel = toPosix(path.relative(ROOT, c));
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return rel;
  }
  return null;
}

function main() {
  fs.mkdirSync(path.join(ROOT, "docs/qa"), { recursive: true });

  const files = sh("git ls-files").split("\n").map(toPosix).filter(Boolean);

  const inventory = [];
  const textByFile = new Map();
  const hashByFile = new Map();

  for (const f of files) {
    const abs = path.join(ROOT, f);
    const ext = path.extname(f).toLowerCase();
    const size = bytes(abs);

    let lastCommitHash = "";
    let lastCommitDate = "";
    try {
      lastCommitHash = sh(`git log -n 1 --pretty=format:%H -- "${f}"`);
      lastCommitDate = sh(`git log -n 1 --pretty=format:%cs -- "${f}"`);
    } catch {
      // ignore
    }

    const rec = { path: f, ext, bytes: size, lastCommitHash, lastCommitDate };
    if (f.startsWith("src/app/") && /\.(ts|tsx|js|jsx)$/i.test(f)) {
      rec.routeGuess = routePathFromAppFile(f);
    }
    inventory.push(rec);

    if (isTextFile(f) && size > 0 && size < 2_000_000) {
      const t = safeRead(abs);
      if (t != null) {
        textByFile.set(f, t);
        hashByFile.set(f, sha1(t));
      }
    }
  }

  const issues = [];
  for (const [f, t] of textByFile.entries()) {
    const inSourceScope = f.startsWith("src/") || f.startsWith("tests/") || f.startsWith("scripts/");
    if (!inSourceScope) continue;
    const lines = t.split(/\r?\n/);
    const mergeMarkers = lines.filter((ln) => /^(<<<<<<<|=======|>>>>>>>)\b/.test(ln)).length;
    if (mergeMarkers) issues.push({ file: f, kind: "merge-markers", count: mergeMarkers });

    const defaultExports = (t.match(/\bexport\s+default\b/g) || []).length;
    if (defaultExports > 1) issues.push({ file: f, kind: "multi-export-default", count: defaultExports });

    const reactImports = (t.match(/^\s*import\s+React\b/gm) || []).length;
    if (reactImports > 1) issues.push({ file: f, kind: "multi-import-react", count: reactImports });

    const firstImport = lines.findIndex((ln) => /^\s*import\b/.test(ln));
    const firstCode = lines.findIndex((ln) => /[A-Za-z0-9_]/.test(ln) && !/^\s*(import|export)\b/.test(ln));
    if (firstImport >= 0 && firstCode >= 0 && firstImport > firstCode) {
      issues.push({ file: f, kind: "import-after-code", count: 1 });
    }
  }

  const byHash = new Map();
  for (const [f, h] of hashByFile.entries()) {
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(f);
  }
  const dupGroups = [...byHash.entries()].filter(([, list]) => list.length > 1);

  const roots = files.filter((f) => f.startsWith("src/app/") && /\.(ts|tsx|js|jsx)$/i.test(f));
  const graph = new Map();
  for (const [f, t] of textByFile.entries()) {
    const inSourceScope = f.startsWith("src/") || f.startsWith("tests/") || f.startsWith("scripts/");
    if (!inSourceScope) continue;
    const deps = findImports(t);
    const locals = [];
    for (const d of deps) {
      const r = resolveLocal(f, d);
      if (r) locals.push(r);
    }
    graph.set(f, locals);
  }

  const reachable = new Set();
  const q = [...roots];
  for (const r of q) reachable.add(r);

  while (q.length) {
    const cur = q.shift();
    const next = graph.get(cur) || [];
    for (const n of next) {
      if (!reachable.has(n)) {
        reachable.add(n);
        q.push(n);
      }
    }
  }

  const orphanCandidates = files
    .filter((f) => f.startsWith("src/") && /\.(ts|tsx|js|jsx)$/i.test(f))
    .filter((f) => !reachable.has(f))
    .filter((f) => !f.startsWith("src/app/"));

  fs.writeFileSync(
    path.join(ROOT, "docs/qa/file_inventory.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), inventory }, null, 2) + "\n",
    "utf8"
  );

  const lines = [];
  lines.push("# Codebase triage");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Tracked files: ${files.length}`);
  lines.push(`- Route roots (src/app/**): ${roots.length}`);
  lines.push(`- Structural issues found: ${issues.length}`);
  lines.push(`- Orphan candidates (best-effort): ${orphanCandidates.length}`);
  lines.push(`- Duplicate content groups: ${dupGroups.length}`);
  lines.push("");
  lines.push("## Fix-now structural issues (evidence)");
  lines.push("");
  for (const it of issues.slice(0, 200)) {
    lines.push(`- **${it.kind}** (${it.count}) — \`${it.file}\``);
  }
  if (issues.length > 200) lines.push(`- …and ${issues.length - 200} more`);
  lines.push("");
  lines.push("## Orphan candidates (best-effort reachability)");
  lines.push("");
  for (const f of orphanCandidates.slice(0, 300)) lines.push(`- \`${f}\``);
  if (orphanCandidates.length > 300) lines.push(`- …and ${orphanCandidates.length - 300} more`);
  lines.push("");
  lines.push("## Duplicate content groups");
  lines.push("");
  for (const [, group] of dupGroups.slice(0, 100)) {
    lines.push(`- ${group.map((g) => `\`${g}\``).join(", ")}`);
  }
  if (dupGroups.length > 100) lines.push(`- …and ${dupGroups.length - 100} more groups`);
  lines.push("");
  lines.push("## Notes");
  lines.push("- Reachability is heuristic and based on static import parsing; dynamic requires and runtime routing can create false orphans.");
  lines.push("");

  fs.writeFileSync(path.join(ROOT, "docs/qa/codebase_triage.md"), lines.join("\n") + "\n", "utf8");

  const del = [];
  del.push("# Delete candidates (recommendations only)");
  del.push("");
  del.push("**No deletions should occur until approved.**");
  del.push("");
  del.push("## Candidates");
  del.push("");
  for (const f of orphanCandidates.slice(0, 200)) {
    del.push(`- Risk: **MED** — \`${f}\``);
    del.push("  - Evidence: unreachable via static imports from src/app/** roots");
    del.push(`  - Verify safely: search references via \`rg -n \"${path.basename(f).replace(/\./g, "\\.")}\" src tests\``);
  }
  if (orphanCandidates.length > 200) del.push(`- …and ${orphanCandidates.length - 200} more`);
  del.push("");

  fs.writeFileSync(path.join(ROOT, "docs/qa/delete_candidates.md"), del.join("\n") + "\n", "utf8");

  console.log(`[triage] files=${files.length} roots=${roots.length} issues=${issues.length} orphans=${orphanCandidates.length} dupGroups=${dupGroups.length}`);
}

main();
