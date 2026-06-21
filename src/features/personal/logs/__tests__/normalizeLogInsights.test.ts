import { normalizeLogInsightSuggestions } from "../normalizeLogInsights";

describe("normalizeLogInsightSuggestions", () => {
  it("normalizes and deduplicates provider suggestions", () => {
    expect(
      normalizeLogInsightSuggestions({
        data: {
          insight: {
            suggestedTags: ["yellowing", " yellowing ", "watering"],
            draftSummary: "Lower leaves changed after watering.",
            missingData: ["root-zone pH"],
            provider: "openai"
          }
        }
      })
    ).toEqual({
      tags: ["yellowing", "watering"],
      summary: "Lower leaves changed after watering.",
      missingData: ["root-zone pH"],
      suggestedTask: "",
      source: "openai"
    });
  });

  it("marks responses without provenance as unverified", () => {
    expect(normalizeLogInsightSuggestions({ tags: ["growth"] }).source).toBe(
      "unverified"
    );
  });
});
