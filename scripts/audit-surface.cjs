"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const APP_DIR = path.join(ROOT, "src", "app");

const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && exts.has(path.extname(ent.name))) out.push(p);
  }
  return out;
}

function isLayoutRoute(rel) {
  return /\/_layout\.(ts|tsx|js|jsx)$/.test(rel);
}

function classify(txt, rel) {
  const apiMarkers = [
    /\bapiRequest\b/,
    /\bendpoints\./,
    /\buseQuery\b/,
    /\buseMutation\b/,
    /\bcallAiTool\b/,
    /\brunTool\b/,
    /\bclient\.(get|post|put|patch|delete)\b/,
  ];

  const navMarkers = [
    /\buseRouter\b/,
    /\buseNavigation\b/,
    /\bLink\b/,
    /\bRedirect\b/,
    /\brouter\./,
    /\bnavigation\./,
  ];

  const placeholderMarkers = [
    /\bcoming soon\b/i,
    /\btemporarily stubbed\b/i,
    /\bnot implemented\b/i,
    /\b\(stub\)\b/i,
    /\bstub\b/i,
  ];

  const hasApi = apiMarkers.some((re) => re.test(txt));
  const hasNav = navMarkers.some((re) => re.test(txt));
  const hasPlaceholderLanguage = placeholderMarkers.some((re) => re.test(txt));

  const textCount = (txt.match(/<Text\b/g) || []).length;
  const hasList = /\bFlatList\b|\bSectionList\b/.test(txt);
  const hasInputs = /\bTextInput\b|\bPicker\b/.test(txt);
  const hasButtons = /\bPressable\b|\bTouchableOpacity\b|\bButton\b/.test(txt);

  if (hasPlaceholderLanguage && !hasApi) return "Likely placeholder";
  if (hasApi) return "API-backed";
  if (isLayoutRoute(rel)) return "Layout";
  if (hasNav && !(hasList || hasInputs || hasButtons)) return "Nav-only";
  if (!hasApi && textCount <= 2 && !hasList && !hasInputs && !hasButtons) return "UI-only";
  return "UI";
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

const files = fs.existsSync(APP_DIR) ? walk(APP_DIR) : [];
const rows = files.map((abs) => {
  const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  const txt = fs.readFileSync(abs, "utf8");
  return { rel, type: classify(txt, rel) };
});

rows.sort((a, b) => a.type.localeCompare(b.type) || a.rel.localeCompare(b.rel));

const counts = {};
for (const r of rows) counts[r.type] = (counts[r.type] || 0) + 1;

console.log("=== Route surface classification ===");
console.log(counts);
console.log("");
for (const r of rows) console.log(pad(r.type, 18) + " " + r.rel);
