import {
  FACILITY_COMPLIANCE_TAB_LABEL,
  FACILITY_GROWS_TAB_LABEL,
  FACILITY_TASKS_TAB_LABEL,
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

  it("lets photo diagnosis own its accurate semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("ai-diagnosis-photo")).toBe(false);
    expect(shouldShowFacilityRouteHeader("ai-ask")).toBe(true);
  });

  it("lets Facility Grow Intelligence own its accurate semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("ai-tools")).toBe(false);
    expect(shouldShowFacilityRouteHeader("plants")).toBe(true);
  });

  it("lets Facility Reports own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("reports")).toBe(false);
    expect(shouldShowFacilityRouteHeader("logs")).toBe(true);
  });

  it("lets Facility Analytics own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("analytics")).toBe(false);
    expect(shouldShowFacilityRouteHeader("logs")).toBe(true);
  });

  it("lets Facility Integrations own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("integrations")).toBe(false);
    expect(shouldShowFacilityRouteHeader("logs")).toBe(true);
  });

  it("lets Licensed Sales & Transfers own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("transfers")).toBe(false);
    expect(shouldShowFacilityRouteHeader("plants")).toBe(true);
  });

  it("lets Facility Inventory own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("inventory")).toBe(false);
    expect(shouldShowFacilityRouteHeader("logs")).toBe(true);
  });

  it("lets Facility Rooms & Workspaces own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("rooms")).toBe(false);
    expect(shouldShowFacilityRouteHeader("plants")).toBe(true);
  });

  it("lets Facility Grows own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("grows")).toBe(false);
    expect(FACILITY_GROWS_TAB_LABEL).toBe("Grows");
    expect(shouldShowFacilityRouteHeader("logs")).toBe(true);
  });

  it("lets Facility Tasks own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("tasks")).toBe(false);
    expect(FACILITY_TASKS_TAB_LABEL).toBe("Tasks");
    expect(shouldShowFacilityRouteHeader("dashboard")).toBe(true);
  });

  it("lets Facility Compliance own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("compliance")).toBe(false);
    expect(FACILITY_COMPLIANCE_TAB_LABEL).toBe("Compliance");
    expect(shouldShowFacilityRouteHeader("sop-runs")).toBe(true);
  });

  it("lets Facility Team own its semantic page heading", () => {
    expect(shouldShowFacilityRouteHeader("team")).toBe(false);
    expect(shouldShowFacilityRouteHeader("audit-logs")).toBe(true);
  });
});
