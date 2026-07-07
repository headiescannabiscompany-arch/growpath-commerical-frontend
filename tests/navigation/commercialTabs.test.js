import fs from "fs";
import path from "path";

describe("CommercialTabs", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/navigation/CommercialTabs.js"),
    "utf8"
  );

  it("keeps storefront as a primary commercial tab", () => {
    const dashboardIndex = source.indexOf('name="CommercialDashboard"');
    const evidenceIndex = source.indexOf('name="CommercialGrows"');
    const productsIndex = source.indexOf('name="CommercialProducts"');
    const storefrontIndex = source.indexOf('name="Storefront"');
    const feedIndex = source.indexOf('name="CommercialFeed"');
    const profileIndex = source.indexOf('name="CommercialProfile"');

    expect(dashboardIndex).toBeGreaterThanOrEqual(0);
    expect(evidenceIndex).toBeGreaterThan(dashboardIndex);
    expect(productsIndex).toBeGreaterThan(evidenceIndex);
    expect(storefrontIndex).toBeGreaterThan(productsIndex);
    expect(feedIndex).toBeGreaterThan(storefrontIndex);
    expect(profileIndex).toBeGreaterThan(feedIndex);
    expect(source).toContain('options={{ title: "Storefront" }}');
    expect(source).toContain('options={{ title: "Feed / Campaigns" }}');
    expect(source).toContain('options={{ title: "Evidence & Trials" }}');
  });
});
