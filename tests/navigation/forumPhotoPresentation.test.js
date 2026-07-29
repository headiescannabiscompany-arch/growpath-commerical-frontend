import fs from "fs";
import path from "path";

function source(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("forum photo presentation", () => {
  it("uses phone-friendly social media sizing without oversized desktop photos", () => {
    const feed = source("src/app/home/personal/(tabs)/forum/index.tsx");
    const detail = source("src/app/home/personal/(tabs)/forum/post/[id].tsx");

    expect(feed).toMatch(/photoThumb:\s*\{[\s\S]*?width: "100%"/);
    expect(feed).toMatch(/photoThumb:\s*\{[\s\S]*?maxWidth: 680/);
    expect(feed).toMatch(/photoThumb:\s*\{[\s\S]*?aspectRatio: 4 \/ 3/);
    expect(feed).toMatch(/photoThumb:\s*\{[\s\S]*?alignSelf: "center"/);
    expect(detail).toMatch(/postPhoto:\s*\{[\s\S]*?width: "100%"/);
    expect(detail).toMatch(/postPhoto:\s*\{[\s\S]*?maxWidth: 720/);
    expect(detail).toMatch(/commentPhoto:\s*\{[\s\S]*?width: "100%"/);
    expect(detail).toMatch(/commentPhoto:\s*\{[\s\S]*?maxWidth: 560/);
  });
});
