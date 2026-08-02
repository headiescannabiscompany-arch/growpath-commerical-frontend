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

function screenBlock(contents, name) {
  const nameIndex = contents.indexOf(`name="${name}"`);
  expect(nameIndex).toBeGreaterThan(-1);
  const nextScreen = contents.indexOf("<Tabs.Screen", nameIndex + 1);
  return contents.slice(nameIndex, nextScreen === -1 ? undefined : nextScreen);
}

describe("workspace bottom-tab order", () => {
  it("keeps six readable Personal destinations in task-first order", () => {
    const contents = source("src/app/home/personal/(tabs)/_layout.tsx");
    expectOrder(contents, ["index", "grows", "community", "discover", "more", "profile"]);
    expect(contents).toContain(
      'name="tools" options={{ href: null, tabBarButton: () => null }}'
    );
    expect(contents).toContain(
      'name="courses" options={{ href: null, tabBarButton: () => null }}'
    );
  });

  it("keeps Commercial compact navigation task-first without hiding workspaces", () => {
    const contents = source("src/app/home/commercial/_layout.tsx");
    const more = source("src/app/home/commercial/more.tsx");
    expectOrder(contents, [
      "index",
      "storefront/index",
      "grows/index",
      "community",
      "more",
      "profile"
    ]);
    expect(contents).not.toContain("const compactSecondaryHref");
    [
      "tools/index",
      "discover",
      "courses",
      "products/index",
      "feed",
      "lives",
      "orders",
      "inventory",
      "analytics"
    ].forEach((name) => expect(screenBlock(contents, name)).toContain("href: null"));
    expect(contents).toContain('name="community"');
    expect(contents).toContain('tabBarLabel: "Forum"');
    expect(contents).toContain('name="more"');
    expect(contents).toContain(
      'options={{ title: "More", tabBarLabel: "More", headerShown: false }}'
    );
    expect(contents).toContain(
      'name="storefront/edit"\n        options={{\n          title: "Edit Storefront",\n          href: null,\n          tabBarButton: () => null,\n          headerShown: false\n        }}'
    );
    expect(contents).toContain(
      'name="storefront/preview"\n        options={{\n          title: "Preview Storefront",\n          href: null,\n          tabBarButton: () => null,\n          headerShown: false\n        }}'
    );
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
    expect(screenBlock(contents, "tools/library")).toContain("href: null");
    expect(screenBlock(contents, "tasks")).toContain("href: null");
  });

  it("centers every workspace text-only tab without reserving an icon row", () => {
    const contents = source("src/navigation/workspaceTabOptions.ts");

    expect(contents).toContain('tabBarLabelPosition: "beside-icon"');
    expect(contents).toContain("tabBarIcon: () => null");
    expect(contents).toContain('tabBarIconStyle: { display: "none" }');
    expect(contents).toContain("fontSize: compact ? 10 : 12");
    expect(contents).toContain("marginStart: 0");
    expect(contents).toContain("marginEnd: 0");
  });

  it("keeps six readable Facility destinations in task-first order", () => {
    const contents = source("src/app/home/facility/(tabs)/_layout.tsx");
    const more = source("src/app/home/facility/(tabs)/more.tsx");
    expectOrder(contents, [
      "dashboard",
      "grows",
      "tasks",
      "compliance",
      "more",
      "profile"
    ]);
    expect(contents).toContain('tabBarLabel: "Dashboard"');
    expect(contents).toContain('tabBarLabel: "Compliance"');
    expect(contents).toContain(
      'name="logs"\n        options={{ title: "Logs", href: null, tabBarButton: () => null }}'
    );
    expect(more).toContain('href: "/home/facility/ai-tools"');
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
