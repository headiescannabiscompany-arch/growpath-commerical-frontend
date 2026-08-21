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
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = contents.match(
    new RegExp(`<Tabs\\.Screen\\s+name="${escapedName}"[\\s\\S]*?\\/>`)
  );
  expect(match).not.toBeNull();
  return match[0];
}

function visibleScreenNames(contents) {
  return Array.from(contents.matchAll(/<Tabs\.Screen\s+name="([^"]+)"[\s\S]*?\/>/g))
    .filter((match) => !match[0].includes("href: null"))
    .map((match) => match[1]);
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
    expect(visibleScreenNames(contents)).toEqual([
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
      "tasks",
      "social-tools",
      "links",
      "tools/ipm-scout",
      "tools/saved-runs",
      "tools/species-crop-id"
    ]) {
      expect(screenBlock(contents, name)).toContain("href: null");
    }
    expect(screenBlock(contents, "social-tools")).toContain("headerShown: false");
    expect(screenBlock(contents, "links")).toContain("headerShown: false");
    for (const name of [
      "index",
      "storefront/index",
      "feed",
      "community",
      "more",
      "profile"
    ]) {
      expect(screenBlock(contents, name)).not.toContain("href: null");
    }
    expect(contents).not.toContain("tabBarButton");
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
    expect(contents).toContain('tabBarIconStyle: { display: "none" }');
    expect(contents).toContain('tabBarLabelPosition: "beside-icon"');
    expect(contents).toContain("fontSize: compactTabs ? 9 : 12");
    expect(contents).toContain("marginStart: 0");
    expect(contents).toContain("marginEnd: 0");
  });

  it("removes the empty icon row from every text-only workspace tab bar", () => {
    for (const relativePath of [
      "src/app/home/personal/(tabs)/_layout.tsx",
      "src/app/home/commercial/_layout.tsx",
      "src/app/home/facility/(tabs)/_layout.tsx"
    ]) {
      const contents = source(relativePath);
      expect(contents).toContain('tabBarIconStyle: { display: "none" }');
      expect(contents).toContain('tabBarLabelPosition: "beside-icon"');
    }
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
    expect(visibleScreenNames(contents)).toEqual([
      "dashboard",
      "grows",
      "tasks",
      "compliance",
      "more",
      "profile"
    ]);
    for (const name of ["rooms", "plants", "sop-runs", "logs", "ai-tools", "ai-ask"]) {
      expect(screenBlock(contents, name)).toContain("href: null");
    }
    for (const name of ["dashboard", "grows", "tasks", "compliance", "more", "profile"]) {
      expect(screenBlock(contents, name)).not.toContain("href: null");
    }
    expect(contents).not.toContain("tabBarButton");
  });

  it("uses Expo Router route exclusion instead of empty tab buttons", () => {
    for (const relativePath of [
      "src/app/home/commercial/_layout.tsx",
      "src/app/home/facility/(tabs)/_layout.tsx"
    ]) {
      const contents = source(relativePath);
      expect(contents).toContain("href: null");
      expect(contents).not.toContain("tabBarButton");
    }
  });

  it("routes Facility AI entry points through the full hub and keeps theme controls in Profile", () => {
    const dashboard = source("src/app/home/facility/(tabs)/dashboard.tsx");
    const more = source("src/app/home/facility/(tabs)/more.tsx");
    const profile = source("src/app/home/facility/(tabs)/profile.tsx");

    expect(dashboard).toContain('to: "/home/facility/ai-tools"');
    expect(more).toContain('href: "/home/facility/ai-tools"');
    expect(dashboard).not.toContain("<ThemeModeSelector");
    expect(profile).toContain("<ThemeModeSelector");
  });

  it("keeps Commercial theme controls in Profile instead of the dashboard", () => {
    const dashboard = source("src/app/home/commercial/index.tsx");
    const profile = source("src/app/home/commercial/profile.tsx");

    expect(dashboard).not.toContain("<ThemeModeSelector");
    expect(profile).toContain("<ThemeModeSelector");
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
