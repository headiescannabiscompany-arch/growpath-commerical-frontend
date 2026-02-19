import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['src/app', 'src/screens'];
const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);

async function walk(dir) {
  const out = [];
  let ents = [];
  try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (exts.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

function routeFromFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel.startsWith('src/app/')) {
    let r = rel.replace(/^src\/app/, '').replace(/\.(t|j)sx?$/, '');
    r = r.replace(/\/index$/, '');
    r = r.replace(/\/_layout$/, '');
    if (!r.startsWith('/')) r = '/' + r;
    return r || '/';
  }
  if (rel.startsWith('src/screens/')) {
    const base = path.basename(rel).replace(/\.(t|j)sx?$/, '');
    return `/legacy/${base}`;
  }
  return null;
}

function modeFromPath(route) {
  if (!route) return 'unknown';
  if (route.includes('/facility')) return 'facility';
  if (route.includes('/commercial')) return 'commercial';
  if (route.includes('/personal')) return 'personal';
  return 'shared';
}

function requiresAuth(route) {
  if (!route) return null;
  if (route === '/' || /login|signup|onboarding|forgot|reset/i.test(route)) return false;
  return true;
}

function isTab(filePath) {
  return filePath.includes('/(tabs)/') || filePath.includes('\\(tabs)\\');
}

const files = (await Promise.all(TARGETS.map((t) => walk(path.join(ROOT, t))))).flat();
const records = files
  .map((f) => {
    const route_path = routeFromFile(f);
    if (!route_path) return null;
    const file_path = path.relative(ROOT, f).replace(/\\/g, '/');
    return {
      route_path,
      file_path,
      requires_auth: requiresAuth(route_path),
      mode: modeFromPath(route_path),
      is_tab: isTab(file_path),
      notes: file_path.includes('src/screens/') ? 'legacy screen file' : ''
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.route_path.localeCompare(b.route_path) || a.file_path.localeCompare(b.file_path));

await fs.mkdir(path.join(ROOT, 'docs/qa'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'docs/qa/route_inventory.json'), JSON.stringify(records, null, 2) + '\n');
console.log(`Wrote ${records.length} routes to docs/qa/route_inventory.json`);
