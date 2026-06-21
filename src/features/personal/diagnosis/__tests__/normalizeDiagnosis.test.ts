import { normalizeDiagnosisResponse } from "../normalizeDiagnosis";

describe("normalizeDiagnosisResponse", () => {
  it("normalizes nested provider output", () => {
    const result = normalizeDiagnosisResponse({
      data: {
        diagnosis: {
          _id: "d1",
          possibleIssue: "Possible calcium-related issue",
          confidenceLevel: "moderate",
          severity: 4,
          evidenceObserved: ["New growth affected"],
          suggestedActions: ["Check root-zone pH"],
          provider: "openai"
        }
      }
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: "d1",
        confidence: "medium",
        severity: "high",
        source: "openai",
        actions: ["Check root-zone pH"]
      })
    );
  });

  it("labels missing provider provenance as unverified", () => {
    expect(normalizeDiagnosisResponse({ issueSummary: "Healthy" }).source).toBe(
      "unverified"
    );
  });
});
