import {
  DIAGNOSIS_SAFETY_DISCLAIMER,
  normalizeDiagnosisResponse
} from "../normalizeDiagnosis";

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
          providerName: "openai",
          providerModel: "gpt-4o-mini",
          providerResult: { likelyIssues: [{ issue: "Calcium transport" }] },
          growPathReasoning: ["Compared pattern, root zone, and numbers."],
          improvementNotice: "Stored for review and improvement."
        }
      }
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: "d1",
        confidence: "medium",
        severity: "high",
        source: "openai",
        providerName: "openai",
        providerModel: "gpt-4o-mini",
        growPathReasoning: ["Compared pattern, root zone, and numbers."],
        improvementNotice: "Stored for review and improvement.",
        providerResult: { likelyIssues: [{ issue: "Calcium transport" }] },
        actions: ["Check root-zone pH"]
      })
    );
  });

  it("labels missing provider provenance as unverified", () => {
    const result = normalizeDiagnosisResponse({ issueSummary: "Healthy" });

    expect(result.source).toBe("unverified");
    expect(result.explanation).toBe(DIAGNOSIS_SAFETY_DISCLAIMER);
  });

  it("softens absolute provider summaries before display", () => {
    expect(
      normalizeDiagnosisResponse({
        issueSummary: "Confirmed powdery mildew infection",
        providerName: "openai"
      }).issueSummary
    ).toBe("Possible powdery mildew infection");

    expect(
      normalizeDiagnosisResponse({
        issueSummary: "Leaves are definite calcium deficiency",
        providerName: "openai"
      }).issueSummary
    ).toBe("Leaves are possible calcium deficiency");
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
