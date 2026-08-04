import {
  evidenceReviewNextChecks,
  inferEvidenceReview,
  normalizeEvidenceReview
} from "../../src/features/personal/evidence/evidenceReview";

describe("evidence review contract", () => {
  it("preserves a text-only result as unanalyzed and deduplicates next checks", () => {
    const review = normalizeEvidenceReview(
      {
        requested: true,
        performed: false,
        imageQuality: "limited",
        evidence: ["leaf margin visible"],
        missingInformation: ["whole plant", "whole plant"],
        limitations: ["whole plant"]
      },
      { photoCount: 3 }
    );

    expect(review.performed).toBe(false);
    expect(review.photoCount).toBe(3);
    expect(review.quality).toBe("limited");
    expect(evidenceReviewNextChecks(review)).toEqual(["whole plant"]);
  });

  it("normalizes provider media fields without inventing confidence", () => {
    const review = normalizeEvidenceReview({
      performed: true,
      photosAnalyzed: 4,
      providerLabel: "AI image review",
      evidenceUsed: ["underside inspection"],
      counterEvidence: ["glare"],
      visualConfidence: "not provided"
    });

    expect(review).toMatchObject({
      performed: true,
      photosAnalyzed: 4,
      providerLabel: "AI image review",
      confidence: "unknown",
      evidenceUsed: ["underside inspection"],
      counterEvidence: ["glare"]
    });
  });

  it("normalizes IPM structured gaps and next inspections into exact next checks", () => {
    const review = inferEvidenceReview(
      {
        confidence: "moderate",
        missingInformation: [
          { field: "Trap comparison", reason: "No prior dated count" },
          { items: ["Count checked and affected plants by zone"] }
        ],
        nextInspectionSteps: ["Inspect symptomatic leaf undersides at 30x."],
        photoRequests: [
          { request: "Add a dedicated target macro", reason: "Target is ambiguous" }
        ],
        mediaAnalysis: { performed: true, photosAnalyzed: 2 }
      },
      { evidenceAssetIds: ["photo-1", "photo-2"] }
    );

    expect(review).not.toBeNull();
    expect(review?.confidence).toBe("medium");
    expect(evidenceReviewNextChecks(review!)).toEqual(
      expect.arrayContaining([
        "Add a dedicated target macro: Target is ambiguous",
        "Trap comparison: No prior dated count",
        "Count checked and affected plants by zone",
        "Inspect symptomatic leaf undersides at 30x."
      ])
    );
  });

  it("turns diagnosis quality issues into replacement-photo requests", () => {
    const review = inferEvidenceReview(
      {
        imageAnalysis: {
          requested: true,
          performed: true,
          photoCount: 2,
          qualityIssues: [
            "Both photos are too blurry to inspect leaf detail.",
            "A whole-plant context photo is missing."
          ]
        }
      },
      { evidenceAssetIds: ["photo-1", "photo-2"] }
    );

    expect(review?.requiredNextPhotos).toEqual([
      "Both photos are too blurry to inspect leaf detail.",
      "A whole-plant context photo is missing."
    ]);
  });

  it("turns harvest role failures into exact retake and missing-role requests", () => {
    const review = inferEvidenceReview(
      {
        photoAnalysis: {
          performed: true,
          photoUsable: false,
          imagesAnalyzed: 4,
          confidence: 0.24,
          recommendation: "Stabilize the camera and retake the macro set.",
          qualityChecks: { roleCoverage: "incomplete" },
          imageFindings: [
            {
              imageIndex: 1,
              role: "top_macro",
              usableForDistribution: false,
              excludedReason: "gland heads are blurred"
            }
          ]
        }
      },
      { evidenceAssetIds: ["photo-1", "photo-2", "photo-3", "photo-4"] }
    );

    expect(review?.confidence).toBe("low");
    expect(review?.requiredNextPhotos).toEqual(
      expect.arrayContaining([
        "Retake photo 1 (top macro): gland heads are blurred.",
        "Add a sharp macro photo of intact gland heads on a middle bud calyx.",
        "Add a sharp macro photo of intact gland heads on a lower bud calyx.",
        "Add one wider bud-context photo that shows where the macro samples came from.",
        "Stabilize the camera and retake the macro set."
      ])
    );
  });
});
