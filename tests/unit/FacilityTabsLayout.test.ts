import {
  shouldHideFacilityTabBar,
  shouldShowFacilityRouteHeader
} from "@/app/home/facility/(tabs)/_layout";

describe("Facility tabs layout", () => {
  it("hides the tab bar for canonical nested facility inventory routes", () => {
    expect(shouldHideFacilityTabBar("/home/facility/inventory/new")).toBe(true);
    expect(shouldHideFacilityTabBar("/home/facility/inventory/item-1")).toBe(true);
  });

  it("keeps legacy compatibility filenames hidden while canonical wrappers migrate links", () => {
    expect(
      shouldHideFacilityTabBar("/home/facility/(tabs)/CreateInventoryItemScreen")
    ).toBe(true);
    expect(
      shouldHideFacilityTabBar("/home/facility/(tabs)/InventoryItemDetailScreen")
    ).toBe(true);
  });

  it("leaves the facility inventory root as a tabbed root page", () => {
    expect(shouldHideFacilityTabBar("/home/facility/inventory")).toBe(false);
  });

  it("lets the More page own its single semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("more")).toBe(false);
    expect(shouldShowFacilityRouteHeader("dashboard")).toBe(true);
  });

  it("lets AI Templates own its single semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("ai-template")).toBe(false);
    expect(shouldShowFacilityRouteHeader("ai-validation")).toBe(true);
  });
});
