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
  it("keeps Personal compact navigation in release order", () => {
    const contents = source("src/app/home/personal/(tabs)/_layout.tsx");
    expectOrder(contents, ["index", "grows", "community", "discover", "more", "profile"]);
    expect(contents).toContain('name="courses" options={{ href: null }}');
  });

  it("keeps Commercial compact navigation with Profile last", () => {
    const contents = source("src/app/home/commercial/_layout.tsx");
    const more = source("src/app/home/commercial/more.tsx");

    expectOrder(contents, [
      "index",
      "storefront/index",
      "feed",
      "community",
      "more",
      "profile"
    ]);
    for (const name of [
      "grows/index",
      "tools/index",
      "discover",
      "courses",
      "products/index",
      "lives",
      "orders",
      "inventory",
      "analytics",
      "tasks"
    ]) {
      expect(contents).toMatch(
        new RegExp(
          `name="${name.replace("/", "\\/")}"[\\s\\S]*?tabBarButton: \\(\\) => null`
        )
      );
    }
    expect(contents).toContain('tabBarLabel: compactTabs ? "Feed" : "Feed / Campaigns"');
    expect(contents).toContain('tabBarLabel: "Forum"');
    expect(contents).toContain('tabBarLabel: "More"');

    for (const href of [
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
    ]) {
      expect(more).toContain(`href: "${href}"`);
    }
  });

  it("centers Commercial text-only tabs without reserving an icon row", () => {
    const contents = source("src/app/home/commercial/_layout.tsx");
    expect(contents).toContain("tabBarIcon: () => null");
    expect(contents).toContain("tabBarShowIcon: false");
    expect(contents).toContain("fontSize: compactTabs ? 9 : 12");
    expect(contents).toContain("marginStart: 0");
    expect(contents).toContain("marginEnd: 0");
  });

  it("keeps the six Facility compact destinations in release order", () => {
    const contents = source("src/app/home/facility/(tabs)/_layout.tsx");
    expectOrder(contents, [
      "dashboard",
      "grows",
      "tasks",
      "compliance",
      "more",
      "profile"
    ]);
    for (const name of ["rooms", "plants", "sop-runs", "logs", "ai-tools", "ai-ask"]) {
      expect(contents).toMatch(
        new RegExp(`name="${name}"[\\s\\S]*?tabBarButton: \\(\\) => null`)
      );
    }
  });

  it("keeps legacy Facility navigation anchored to the live shell order", () => {
    const contents = source("src/navigation/FacilityTabs.js");
    expectOrder(contents, [
      "FacilityDashboard",
      "FacilityRooms",
      "FacilityGrows",
      "FacilityPlants",
      "FacilityTasks",
      "FacilitySopRuns",
      "FacilityCompliance",
      "FacilityMore",
      "FacilityProfile"
    ]);
    expect(contents).toContain('title: "Inventory", tabBarButton: () => null');
    expect(contents).toContain('title: "Team", tabBarButton: () => null');
    expect(contents).toContain('title: "Reports", tabBarButton: () => null');
  });
});
