const fs = require("fs");
const path = require("path");

describe("personal navigation release surface", () => {
  const layout = fs.readFileSync(
    path.join(process.cwd(), "src/app/home/personal/(tabs)/_layout.tsx"),
    "utf8"
  );
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  test("keeps core personal destinations in the bottom tabs", () => {
    for (const name of ["index", "grows", "community", "discover", "more", "profile"]) {
      expect(layout).toMatch(new RegExp(`name="${name}"`));
      expect(layout).not.toMatch(
        new RegExp(`name="${name}"\\s+options=\\{\\{[^}]*href:\\s*null`)
      );
    }
  });

  test("keeps contextual destinations out of primary bottom navigation", () => {
    for (const name of [
      "tools",
      "courses",
      "ai",
      "forum",
      "diagnose",
      "field-studies/index",
      "field-studies/[studyId]"
    ]) {
      expect(layout).toMatch(new RegExp(`name="${escapeRegExp(name)}"`));
      expect(layout).toMatch(
        new RegExp(`name="${escapeRegExp(name)}"\\s+options=\\{\\{[^}]*href:\\s*null`)
      );
    }
  });
});
