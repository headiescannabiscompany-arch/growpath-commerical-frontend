import {
  buildNutrientContextAssumption,
  buildNutrientContextNotices,
  nutrientContextState
} from "@/features/personal/tools/nutrientContext";

describe("nutrient context helpers", () => {
  it("warns when no crop context is selected", () => {
    const state = nutrientContextState(null);
    expect(state.state).toBe("missing");
    expect(state.message).toContain("generic");
    expect(buildNutrientContextNotices(null)[0]).toMatchObject({
      key: "nutrient-crop-context-missing",
      severity: "medium"
    });
  });

  it("warns when selected crop context is not confirmed", () => {
    const context = {
      cropCommonName: "Blueberry",
      scientificName: "Vaccinium corymbosum",
      growthProfile: { confirmationStatus: "needs_confirmation" }
    };
    const state = nutrientContextState(context);
    expect(state.state).toBe("unconfirmed");
    expect(state.message).toContain("Blueberry");
    expect(buildNutrientContextAssumption(context)).toContain("not confirmed");
  });

  it("marks crop context included when crop profile is selected", () => {
    const context = {
      cropCommonName: "Olive",
      scientificName: "Olea europaea",
      cropProfileId: "crop-olive-1"
    };
    const notice = buildNutrientContextNotices(context)[0];
    expect(nutrientContextState(context).state).toBe("confirmed");
    expect(notice.severity).toBe("info");
    expect(notice.message).toContain("Olive");
    expect(buildNutrientContextAssumption(context)).toContain("reviewed source data");
  });
});
