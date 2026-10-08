const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { webRoutes } = require("../scripts/web-route-inventory.cjs");

test("route inventory strips groups/platform suffixes without exporting native-only or special files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-route-inventory-"));
  for (const file of [
    "index.tsx",
    "_layout.tsx",
    "+html.tsx",
    "(tabs)/home/index.tsx",
    "(tabs)/home/_layout.tsx",
    "claim.web.tsx",
    "claim.tsx",
    "camera.native.tsx",
    "camera.ios.tsx",
    "camera.android.tsx",
    "store/[slug].tsx",
    "readme.md"
  ]) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "");
  }
  assert.deepEqual(webRoutes(root), ["", "claim", "home", "store/[slug]"]);
});
