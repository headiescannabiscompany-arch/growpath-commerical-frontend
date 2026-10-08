const fs = require("node:fs");
const path = require("node:path");

// Inventory the existing Expo routes, not a second manually maintained router.
function webRoutes(appDir) {
  const routes = new Set();
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (
        !/\.[jt]sx?$/.test(entry.name) ||
        /\.(native|ios|android)\.[jt]sx?$/.test(entry.name)
      )
        continue;
      const parts = path
        .relative(appDir, full)
        .replaceAll("\\", "/")
        .replace(/(?:\.web)?\.[jt]sx?$/, "")
        .split("/");
      if (parts.some((part) => part.startsWith("_") || part.startsWith("+"))) continue;
      const publicParts = parts.filter((part) => !/^\(.+\)$/.test(part));
      if (publicParts.at(-1) === "index") publicParts.pop();
      routes.add(publicParts.join("/"));
    }
  }
  visit(appDir);
  return [...routes].sort();
}

module.exports = { webRoutes };
