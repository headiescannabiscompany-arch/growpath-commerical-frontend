import fs from "fs";
import path from "path";

describe("CommercialTabs", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/navigation/CommercialTabs.js"),
    "utf8"
  );

  it("keeps the modern commercial tab order with storefront first and utility routes hidden", () => {
    const dashboardIndex = source.indexOf('name="CommercialDashboard"');
    const storefrontIndex = source.indexOf('name="Storefront"');
    const growsIndex = source.indexOf('name="CommercialGrows"');
    const toolsIndex = source.indexOf('name="CommercialTools"');
    const discoverIndex = source.indexOf('name="CommercialDiscover"');
    const coursesIndex = source.indexOf('name="CommercialCourses"');
    const communityIndex = source.indexOf('name="CommercialCommunity"');
    const profileIndex = source.indexOf('name="CommercialProfile"');

    expect(dashboardIndex).toBeGreaterThanOrEqual(0);
    expect(storefrontIndex).toBeGreaterThan(dashboardIndex);
    expect(growsIndex).toBeGreaterThan(storefrontIndex);
    expect(toolsIndex).toBeGreaterThan(growsIndex);
    expect(discoverIndex).toBeGreaterThan(toolsIndex);
    expect(coursesIndex).toBeGreaterThan(discoverIndex);
    expect(communityIndex).toBeGreaterThan(coursesIndex);
    expect(profileIndex).toBeGreaterThan(communityIndex);
    expect(source).toContain('options={{ title: "Storefront" }}');
    expect(source).toContain('options={{ title: "Grows" }}');
    expect(source).toContain('options={{ title: "AI Tools" }}');
    expect(source).toContain('options={{ title: "Discover" }}');
    expect(source).toContain('options={{ title: "Courses" }}');
    expect(source).toContain('options={{ title: "Forum / Q&A" }}');
    expect(source).toContain("../app/home/commercial/feed");
    expect(source).toContain('title: "Products", tabBarButton: () => null');
    expect(source).toContain('title: "Feed / Campaigns", tabBarButton: () => null');
    expect(source).toContain('title: "Lives", tabBarButton: () => null');
    expect(source).toContain('title: "Orders", tabBarButton: () => null');
    expect(source).toContain('title: "Analytics", tabBarButton: () => null');
  });
});
