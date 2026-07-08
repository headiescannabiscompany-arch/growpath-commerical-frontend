const fs = require("fs");
const path = require("path");

describe("legacy commercial Forum/Q&A groups screen", () => {
  const sourcePath = path.join(
    __dirname,
    "..",
    "..",
    "src",
    "screens",
    "commercial",
    "CommunitiesScreen.js"
  );

  it("uses Forum/Q&A group copy instead of stale community labels", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).toContain("Discover Forum Groups");
    expect(source).toContain("Featured Forum Groups");
    expect(source).toContain("All Forum Groups");
    expect(source).toContain("Create Forum Group");
    expect(source).toContain("Share your question or topic with Forum/Q&A");
    expect(source).toContain("Commercial Ops");
    expect(source).not.toContain("Discover Communities");
    expect(source).not.toContain("Featured Communities");
    expect(source).not.toContain("Create Community");
    expect(source).not.toContain("Search communities");
    expect(source).not.toContain("Share your question or topic with the community");
    expect(source).not.toContain('"Business"');
  });

  it("renders featured groups from loaded data and avoids corrupted glyphs", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).toContain("availableGuilds\n                  .filter");
    expect(source).not.toContain("browseGuilds\n                  .filter");
    expect(source).not.toContain("ð");
    expect(source).not.toContain("â");
  });
});
