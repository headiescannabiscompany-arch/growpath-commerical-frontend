import fs from "fs";
import path from "path";

describe("CommercialTabs", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/navigation/CommercialTabs.js"),
    "utf8"
  );

  it("keeps storefront as a primary commercial tab", () => {
    const dashboardIndex = source.indexOf('name="CommercialDashboard"');
    const storefrontIndex = source.indexOf('name="Storefront"');
    const productsIndex = source.indexOf('name="CommercialProducts"');
    const coursesIndex = source.indexOf('name="CommercialCourses"');
    const livesIndex = source.indexOf('name="CommercialLives"');
    const feedIndex = source.indexOf('name="CommercialFeed"');
    const profileIndex = source.indexOf('name="CommercialProfile"');

    expect(dashboardIndex).toBeGreaterThanOrEqual(0);
    expect(storefrontIndex).toBeGreaterThan(dashboardIndex);
    expect(productsIndex).toBeGreaterThan(storefrontIndex);
    expect(coursesIndex).toBeGreaterThan(productsIndex);
    expect(livesIndex).toBeGreaterThan(coursesIndex);
    expect(feedIndex).toBeGreaterThan(livesIndex);
    expect(profileIndex).toBeGreaterThan(feedIndex);
    expect(source).toContain('options={{ title: "Storefront" }}');
    expect(source).toContain('options={{ title: "Courses" }}');
    expect(source).toContain('options={{ title: "Lives" }}');
    expect(source).toContain('options={{ title: "Feed / Campaigns" }}');
    expect(source).not.toContain('name="CommercialGrows"');
    expect(source).not.toContain('options={{ title: "Evidence & Trials" }}');
  });
});
