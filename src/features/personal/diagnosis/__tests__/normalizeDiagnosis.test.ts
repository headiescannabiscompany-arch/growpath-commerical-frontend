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

  it("normalizes legacy analyze details envelope", () => {
    const result = normalizeDiagnosisResponse({
      id: "d2",
      issueSummary: "Yellowing or chlorosis",
      sourceType: "heuristic",
      severity: 2,
      details: {
        likelyIssues: [
          {
            evidence: ["Lower leaves are yellow."],
            counterEvidence: ["Could be normal senescence."],
            nextChecks: ["Check runoff pH."]
          }
        ],
        diagnosisClass: "nutrition_or_root_zone_triage",
        patternSummary: "location: lower old leaves",
        rootZoneSummary: "moisture: too wet",
        environmentSummary: "rh: 72",
        numberSummary: "runoffEC: 2.8",
        recommendations: ["Verify pH before changing feed."],
        suggestedTags: ["yellowing"],
        tasksToCreate: [{ title: "Check runoff pH." }],
        urgency: "medium",
        disclaimer: "GrowPathAI provides plant-health triage."
      }
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "d2",
        source: "heuristic",
        evidence: ["Lower leaves are yellow."],
        counterEvidence: ["Could be normal senescence."],
        missingData: ["Check runoff pH."],
        actions: ["Verify pH before changing feed."],
        tags: ["yellowing"],
        followUp: "Check runoff pH.",
        diagnosisClass: "nutrition_or_root_zone_triage",
        patternSummary: "location: lower old leaves",
        rootZoneSummary: "moisture: too wet",
        environmentSummary: "rh: 72",
        numberSummary: "runoffEC: 2.8",
        urgency: "medium"
      })
    );
  });
});
