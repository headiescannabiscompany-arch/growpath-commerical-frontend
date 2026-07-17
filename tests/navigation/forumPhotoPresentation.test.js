import fs from "fs";
import path from "path";

function source(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("forum photo presentation", () => {
  it("uses full-width media in the feed and post detail instead of thumbnails", () => {
    const feed = source("src/app/home/personal/(tabs)/forum/index.tsx");
    const detail = source("src/app/home/personal/(tabs)/forum/post/[id].tsx");

    expect(feed).toMatch(/photoThumb:\s*\{[\s\S]*?width: "100%"/);
    expect(feed).toContain("aspectRatio: 16 / 9");
    expect(detail).toMatch(/postPhoto:\s*\{[\s\S]*?width: "100%"/);
    expect(detail).toContain("aspectRatio: 4 / 3");
  });
});
