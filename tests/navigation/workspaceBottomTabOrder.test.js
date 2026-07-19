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

  it("keeps the five Commercial compact destinations in task-first order", () => {
    const contents = source("src/app/home/commercial/_layout.tsx");
    expectOrder(contents, ["index", "storefront/index", "products/index", "feed"]);
    expect(contents.indexOf('name="profile"')).toBeGreaterThan(
      contents.indexOf('name="analytics"')
    );
    expect(contents).toContain(
      'options={{ title: "Courses", href: compactTabs ? null : undefined }}'
    );
    expect(contents).toContain(
      'options={{ title: "Lives", href: compactTabs ? null : undefined }}'
    );
    expect(contents).toContain(
      'options={{ title: "Orders", href: compactTabs ? null : undefined }}'
    );
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
