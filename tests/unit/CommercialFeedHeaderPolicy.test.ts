import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Commercial Feed header policy", () => {
  it("uses page headings without duplicate tab headers", () => {
    const layout = read("src/app/home/commercial/_layout.tsx");
    const feed = read("src/app/feed/index.tsx");
    const orders = read("src/screens/commercial/OrdersScreen.tsx");

    expect(layout).toMatch(
      /name="feed"\s+options=\{\{[\s\S]*?title: "Feed \/ Campaigns",[\s\S]*?tabBarLabel: compactTabs \? "Feed" : "Feed \/ Campaigns",[\s\S]*?headerShown: false/
    );
    expect(layout).toMatch(
      /name="orders"\s+options=\{\{[\s\S]*?title: "Orders",[\s\S]*?headerShown: false/
    );
    expect(feed).toContain('accessibilityRole="header"');
    expect(orders).toContain('accessibilityRole="header"');
  });
});
