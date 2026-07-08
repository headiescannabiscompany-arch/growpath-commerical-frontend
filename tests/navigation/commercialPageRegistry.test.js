import { PAGE_REGISTRY_COMMERCIAL } from "../../src/navigation/pageRegistry.commercial";

describe("commercial page registry", () => {
  it("keeps commercial navigation storefront-centered with evidence and brand tools", () => {
    const labels = PAGE_REGISTRY_COMMERCIAL.filter((entry) => entry.primary).map(
      (entry) => entry.label
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "Storefront",
        "Products",
        "Feed / Campaigns",
        "Forum / Q&A",
        "Courses",
        "Lives",
        "Orders",
        "Analytics",
        "Schedule / Agenda",
        "Alerts",
        "Notifications",
        "Tasks",
        "Profile"
      ])
    );
    expect(labels).not.toContain("Evidence & Trials");
    expect(labels).not.toContain("Product Lines");
    expect(labels).not.toContain("Batch Planner");
    expect(labels).not.toContain("Product Trials");
    expect(labels).not.toContain("Inventory");
  });

  it("demotes product support surfaces from top-level commercial navigation", () => {
    const byName = Object.fromEntries(
      PAGE_REGISTRY_COMMERCIAL.map((entry) => [entry.name, entry])
    );

    [
      "CommercialEvidenceRuns",
      "CommercialProductLines",
      "CommercialBatchPlanner",
      "CommercialProductTrials",
      "CommercialInventory"
    ].forEach((name) => {
      expect(byName[name]).toMatchObject({
        primary: false,
        group: "products",
        supportSurface: true
      });
    });
  });

  it("does not expose shallow campaigns or checkout-only wording as primary navigation", () => {
    const labels = PAGE_REGISTRY_COMMERCIAL.map((entry) => entry.label);

    expect(labels).toContain("Marketing Planner");
    expect(labels).toContain("Orders");
    expect(labels).not.toContain("Campaigns");
    expect(labels).not.toContain("Orders / External Tracking");
  });

  it("routes primary commercial workflows to commercial-aware components", () => {
    const byName = Object.fromEntries(
      PAGE_REGISTRY_COMMERCIAL.map((entry) => [entry.name, entry])
    );

    expect(byName.CommercialEvidenceRuns.component?.name).toBe(
      "CommercialEvidenceRunsRoute"
    );
    expect(byName.CommercialGrows).toBeUndefined();
    expect(byName.CommercialLives.component?.name).toBe("CommercialLivesRoute");
    expect(byName.CommercialProducts.component?.name).toBe("CommercialProductsRoute");
    expect(byName.CommercialProductLines.component?.name).toBe(
      "CommercialProductLinesRoute"
    );
    expect(byName.CommercialBatchPlanner.component?.name).toBe(
      "CommercialBatchPlannerRoute"
    );
    expect(byName.CommercialProductTrials.component?.name).toBe("CommercialTrialsRoute");
    expect(byName.Storefront.component?.name).toBe("CommercialStorefrontRoute");
    expect(byName.MarketingPlanner.component?.name).toBe("CommercialMarketingRoute");
    expect(byName.CommercialInventory.component?.name).toBe("CommercialInventoryRoute");
    expect(byName.Courses.component?.name).toBe("CommercialCoursesRoute");
    expect(byName.Community.component?.name).toBe("CommercialCommunityRoute");
    expect(byName.CommercialAnalytics.component?.name).toBe("CommercialAnalyticsRoute");
    expect(byName.CommercialSchedule.component?.name).toBe("HomeScheduleRoute");
    expect(byName.CommercialAlerts.component?.name).toBe("AlertCenterRoute");
    expect(byName.CommercialNotifications.component?.name).toBe(
      "NotificationCenterRoute"
    );
    expect(byName.Tasks.component?.name).toBe("CommercialTasksRoute");
    expect(byName.Profile.component?.name).toBe("CommercialProfileRoute");
  });
});
