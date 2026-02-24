import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "tests", "scripts"].map((d) => path.join(ROOT, d));
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md"]);
const IGNORE = new Set(["node_modules", ".git", "dist", "build", "coverage", ".expo", ".next"]);

const REPLACEMENTS = [
  ["\u00e2\u20ac\u2122", "'"],
  ["\u00e2\u20ac\u0153", '"'],
  ["\u00e2\u20ac\u009d", '"'],
  ["\u00e2\u20ac\u00a6", "..."],
  ["\u00e2\u20ac\u00a2", "- "],
  [" \u00e2\u20ac\u00a2 ", " - "],
  ["\u00c2\u00b7", " - "],
  ["\u00e2\u20ac\u00ba", ">"],
  ["\u00e2\u20ac\u201d", "-"],
  ["\u00e2\u20ac\u201c", "-"],
  ["\u00e2\u2020\u2019", "->"],
  ["\u00c2\u00b0F", "degF"],
  ["\u00c2\u00b0C", "degC"],
  ["\u00ce\u00bcmol/m\u00c2\u00b2/s", "umol/m2/s"],
  ["mol/m\u00c2\u00b2/day", "mol/m2/day"],
  ["m\u00c2\u00b2", "m2"]
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(abs));
    else if (ent.isFile() && EXTS.has(path.extname(abs))) out.push(abs);
  }
  return out;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  for (const file of walk(dir)) {
    const original = fs.readFileSync(file, "utf8");
    let next = original;
    for (const [from, to] of REPLACEMENTS) {
      next = next.split(from).join(to);
    }
    if (next !== original) {
      fs.writeFileSync(file, next, "utf8");
      changed += 1;
    }
  }
}

console.log(`normalize-mojibake: changed ${changed} files`);
