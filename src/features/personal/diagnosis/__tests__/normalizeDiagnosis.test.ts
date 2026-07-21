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

  it("preserves visual crop suggestions, image quality, and the discriminating follow-up", () => {
    const result = normalizeDiagnosisResponse({
      diagnosis: {
        id: "d-visual",
        issueSummary: "Possible late-flower nutrient stress",
        providerName: "openai",
        aiResult: {
          cropIdentity: {
            commonName: "Cannabis",
            scientificName: "Cannabis sativa",
            confidence: "high",
            source: "visual_suggestion",
            requiresUserConfirmation: true,
            visibleEvidence: ["Pistils and trichome-covered bracts are visible"],
            alternatives: []
          },
          imageAnalysis: {
            requested: true,
            performed: true,
            photoCount: 1,
            usableForTriage: true,
            qualityIssues: [],
            observedFeatures: ["Flower and sugar leaves are in focus"],
            limitations: ["Root zone is not visible"]
          },
          followUpQuestion: "What are the current root-zone EC and pH readings?"
        }
      }
    });

    expect(result.cropIdentity).toEqual(
      expect.objectContaining({
        commonName: "Cannabis",
        source: "visual_suggestion",
        requiresUserConfirmation: true,
        visibleEvidence: ["Pistils and trichome-covered bracts are visible"]
      })
    );
    expect(result.imageAnalysis).toEqual(
      expect.objectContaining({
        performed: true,
        usableForTriage: true,
        limitations: ["Root zone is not visible"]
      })
    );
    expect(result.followUp).toBe("What are the current root-zone EC and pH readings?");
  });

  it("keeps provider candidate confidence separate from health status and urgency", () => {
    const result = normalizeDiagnosisResponse({
      diagnosis: {
        id: "d-production-vision",
        issueSummary: "Possible light stress",
        severity: 4,
        urgency: "medium",
        providerName: "openai",
        aiResult: {
          overallHealth: "concern",
          likelyIssues: [
            { issue: "Possible light stress", confidence: 0.8 },
            { issue: "Possible nutrient stress", confidence: 0.7 }
          ]
        }
      }
    });

    expect(result).toEqual(
      expect.objectContaining({
        confidence: "unknown",
        topCandidateConfidence: 0.8,
        overallHealth: "concern",
        severity: "high",
        urgency: "medium"
      })
    );
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
        disclaimer: "GrowPath AI provides plant-health triage."
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
