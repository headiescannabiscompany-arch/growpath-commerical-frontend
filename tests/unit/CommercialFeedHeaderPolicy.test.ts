import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Commercial page header policy", () => {
  it("uses page headings without duplicate tab headers", () => {
    const layout = read("src/app/home/commercial/_layout.tsx");
    const feed = read("src/app/feed/index.tsx");
    const orders = read("src/screens/commercial/OrdersScreen.tsx");
    const productLines = read("src/app/home/commercial/product-lines.tsx");
    const batchPlanner = read("src/app/home/commercial/batch-planner.tsx");

    expect(layout).toMatch(
      /name="feed"\s+options=\{\{[\s\S]*?title: "Feed \/ Campaigns",[\s\S]*?tabBarLabel: compactTabs \? "Feed" : "Feed \/ Campaigns",[\s\S]*?headerShown: false/
    );
    expect(layout).toMatch(
      /name="orders"\s+options=\{\{[\s\S]*?title: "Orders",[\s\S]*?headerShown: false/
    );
    expect(layout).toMatch(
      /name="product-lines"\s+options=\{\{[\s\S]*?title: "Product Lines",[\s\S]*?headerShown: false/
    );
    expect(layout).toMatch(
      /name="batch-planner"\s+options=\{\{[\s\S]*?title: "Product Batches",[\s\S]*?headerShown: false/
    );
    expect(feed).toContain('accessibilityRole="header"');
    expect(orders).toContain('accessibilityRole="header"');
    expect(productLines).toContain('accessibilityRole="header"');
    expect(productLines).toContain("aria-level={1}");
    expect(productLines).toContain("aria-level={2}");
    expect(productLines).toContain("aria-level={3}");
    expect(batchPlanner).toContain('accessibilityRole="header"');
    expect(batchPlanner).toContain("aria-level={1}");
    expect(batchPlanner).toContain("aria-level={2}");
    expect(batchPlanner).toContain("aria-level={3}");
  });
});
