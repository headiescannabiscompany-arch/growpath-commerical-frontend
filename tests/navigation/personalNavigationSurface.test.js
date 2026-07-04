const fs = require("fs");
const path = require("path");

describe("personal navigation release surface", () => {
  const layout = fs.readFileSync(
    path.join(process.cwd(), "src/app/home/personal/(tabs)/_layout.tsx"),
    "utf8"
  );

  test("keeps core personal destinations in the bottom tabs", () => {
    for (const name of ["index", "grows", "tools", "community", "courses", "profile"]) {
      expect(layout).toMatch(new RegExp(`name="${name}"`));
      expect(layout).not.toMatch(
        new RegExp(`name="${name}"\\s+options=\\{\\{[^}]*href:\\s*null`)
      );
    }
  });

  test("keeps contextual destinations out of primary bottom navigation", () => {
    for (const name of ["ai", "forum", "diagnose"]) {
      expect(layout).toMatch(new RegExp(`name="${name}"`));
      expect(layout).toMatch(
        new RegExp(`name="${name}"\\s+options=\\{\\{[^}]*href:\\s*null`)
      );
    }
  });
});
