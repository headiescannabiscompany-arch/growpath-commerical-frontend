import fs from "fs";
import path from "path";

function source(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function expectOrder(contents, names) {
  let prior = -1;
  for (const name of names) {
    const index = contents.indexOf(`name="${name}"`);
    expect(index).toBeGreaterThan(prior);
    prior = index;
  }
}

describe("workspace bottom-tab order", () => {
  it("keeps Personal learning visible in task-first order", () => {
    const contents = source("src/app/home/personal/(tabs)/_layout.tsx");
    expectOrder(contents, ["index", "grows", "tools", "community", "courses", "profile"]);
    expect(contents).toContain('name="courses" options={{ title: "Courses" }}');
  });

  it("keeps Commercial compact navigation task-first without hiding workspaces", () => {
    const contents = source("src/app/home/commercial/_layout.tsx");
    const more = source("src/app/home/commercial/more.tsx");
    expectOrder(contents, [
      "index",
      "storefront/index",
      "products/index",
      "feed",
      "courses",
      "lives",
      "orders",
      "analytics",
      "profile",
      "tools/index",
      "more"
    ]);
    expect(contents).toContain("const compactSecondaryHref");
    expect(contents).toContain(
      'options={{ title: "Courses", href: compactSecondaryHref("courses") }}'
    );
    expect(contents).toContain(
      'options={{ title: "Lives", href: compactSecondaryHref("lives") }}'
    );
    expect(contents).toMatch(
      /name="orders"\s+options=\{\{[\s\S]*?title: "Orders",[\s\S]*?href: compactSecondaryHref\("orders"\),[\s\S]*?headerShown: false/
    );
    expect(contents).toMatch(
      /name="analytics"\s+options=\{\{[\s\S]*?title: "Analytics",[\s\S]*?href: compactSecondaryHref\("analytics"\),[\s\S]*?headerShown: false/
    );
    expect(contents).toContain('name="more"');
    expect(contents).toContain("href: compactTabs ? undefined : null");
    [
      "/home/commercial/courses",
      "/home/commercial/lives",
      "/home/commercial/community",
      "/home/commercial/orders",
      "/home/commercial/analytics",
      "/home/commercial/product-lines",
      "/home/commercial/batch-planner",
      "/home/commercial/trials",
      "/home/commercial/inventory",
      "/home/commercial/profile",
      "/home/commercial/tools"
    ].forEach((href) => expect(more).toContain(`href: "${href}"`));
    expect(contents).toContain(
      'name="tools/library" options={{ href: null, title: "Tool Library" }}'
    );
    expect(contents).toContain('name="tasks" options={{ title: "Tasks", href: null }}');
  });

  it("keeps the five Facility compact destinations in task-first order", () => {
    const contents = source("src/app/home/facility/(tabs)/_layout.tsx");
    expectOrder(contents, ["dashboard", "rooms", "tasks", "ai-ask", "profile"]);
    expect(contents).toContain("href: compactTabs ? null : undefined");
  });

  it("keeps legacy Facility navigation anchored by Dashboard and Profile", () => {
    const contents = source("src/navigation/FacilityTabs.js");
    expectOrder(contents, [
      "FacilityDashboard",
      "FacilityRooms",
      "FacilityTasks",
      "FacilityCompliance",
      "FacilityProfile"
    ]);
    expect(contents).toContain('title: "Inventory", tabBarButton: () => null');
    expect(contents).toContain('title: "Team", tabBarButton: () => null');
    expect(contents).toContain('title: "Reports", tabBarButton: () => null');
  });
});
