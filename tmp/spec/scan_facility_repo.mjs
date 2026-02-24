import fs from "fs";
import path from "path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node scan_facility_repo.mjs <repoRoot>");
  process.exit(1);
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}
function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|jsx|json)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const srcDir = exists(path.join(root, "src")) ? path.join(root, "src") : root;
const files = exists(srcDir) ? walk(srcDir) : [];

const needles = [
  "invite", "invites", "teamInvite", "AcceptInvite", "join-facility",
  "facilityRole", "FacilityMember", "TEAM_INVITE", "TEAM_UPDATE_ROLE",
  "/api/invites", "/api/facilities", "facility.settings.edit",
  "onboarding/create-facility", "onboarding/join-facility",
  "home/facility", "facilities/[facilityId]/team", "facility/(tabs)/team"
];

const hits = [];
for (const f of files) {
  const txt = fs.readFileSync(f, "utf8");
  const lower = txt.toLowerCase();
  for (const n of needles) {
    if (lower.includes(n.toLowerCase())) {
      hits.push({ file: path.relative(root, f), needle: n });
    }
  }
}

const type =
  exists(path.join(root, "src", "app")) ? "expo-router" :
  exists(path.join(root, "src", "screens")) ? "screens-nav" :
  "unknown";

const outDir = path.join(process.cwd(), "tmp", "spec", "legacy_scan");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `facility_scan_${path.basename(root)}.json`);
fs.writeFileSync(outFile, JSON.stringify({ root, type, hitCount: hits.length, hits }, null, 2));

console.log(`Repo: ${root}`);
console.log(`Type: ${type}`);
console.log(`Hits: ${hits.length}`);
console.log(`Wrote: ${path.relative(process.cwd(), outFile)}`);
