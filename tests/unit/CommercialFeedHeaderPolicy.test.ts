import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Commercial Feed header policy", () => {
  it("uses the page heading without a duplicate tab header", () => {
    const layout = read("src/app/home/commercial/_layout.tsx");
    const feed = read("src/app/feed/index.tsx");

    expect(layout).toContain(
      'options={{ title: "Feed / Campaigns", headerShown: false }}'
    );
    expect(feed).toContain('accessibilityRole="header"');
  });
});
