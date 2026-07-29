import {
  evidenceReviewNextChecks,
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
});
