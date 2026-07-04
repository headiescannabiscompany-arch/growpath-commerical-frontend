import { PAGE_REGISTRY_COMMERCIAL } from "../../src/navigation/pageRegistry.commercial";

describe("commercial page registry", () => {
  it("keeps commercial navigation grow-centered with business tools layered on", () => {
    const labels = PAGE_REGISTRY_COMMERCIAL.map((entry) => entry.label);

    expect(labels).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "Grows & Trials",
        "Products",
        "Product Lines",
        "Storefront",
        "Batch Planner",
        "Product Trials",
        "Inventory",
        "Feed",
        "Community",
        "Courses",
        "Analytics",
        "Profile"
      ])
    );
  });

  it("does not expose shallow campaigns or checkout-only orders as primary wording", () => {
    const labels = PAGE_REGISTRY_COMMERCIAL.map((entry) => entry.label);

    expect(labels).toContain("Marketing Planner");
    expect(labels).toContain("Orders / External Tracking");
    expect(labels).not.toContain("Campaigns");
    expect(labels).not.toContain("Orders");
  });

  it("routes primary commercial workflows to commercial-aware components", () => {
    const byName = Object.fromEntries(
      PAGE_REGISTRY_COMMERCIAL.map((entry) => [entry.name, entry])
    );

    expect(byName.CommercialGrows.component?.name).toBe("CommercialGrowsRoute");
    expect(byName.CommercialProducts.component?.name).toBe("CommercialProductsRoute");
    expect(byName.CommercialProductLines.component?.name).toBe(
      "CommercialProductLinesRoute"
    );
    expect(byName.CommercialBatchPlanner.component?.name).toBe(
      "CommercialBatchPlannerRoute"
    );
    expect(byName.CommercialProductTrials.component?.name).toBe("CommercialTrialsRoute");
    expect(byName.MarketingPlanner.component?.name).toBe("CommercialMarketingRoute");
    expect(byName.CommercialInventory.component?.name).toBe("CommercialInventoryRoute");
    expect(byName.Courses.component?.name).toBe("CommercialCoursesRoute");
    expect(byName.Community.component?.name).toBe("CommercialCommunityRoute");
    expect(byName.CommercialAnalytics.component?.name).toBe("CommercialAnalyticsRoute");
    expect(byName.Profile.component?.name).toBe("CommercialProfileRoute");
  });
});
