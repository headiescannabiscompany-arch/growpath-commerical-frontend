const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  analyzeTrichomePhotos,
  isSupportedHarvestReviewPolicy,
  submitHarvestTrichomeFeedback
} = require("@/api/harvestVision");

function responseForPolicy(reviewPolicyVersion: string) {
  return {
    result: {
      photoUsable: false,
      analysisId: "usage-1",
      evidenceUsed: ["evidence-1"],
      imagesAnalyzed: 1,
      analysisReceipt: {
        aiUsageEventId: "usage-1",
        normalizedHarvestResultDigest: "a".repeat(64),
        evidenceFingerprint: "evidence-1",
        reviewPolicyVersion
      }
    }
  };
}

describe("Harvest vision receipt policies", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    "harvest-trichome-server-attestation-v1",
    "harvest-trichome-server-attestation-v2-full-grid"
  ])("accepts a signed %s review", async (reviewPolicyVersion) => {
    mockApiRequest.mockResolvedValue(responseForPolicy(reviewPolicyVersion));

    await expect(
      analyzeTrichomePhotos({
        growId: "grow-1",
        evidenceAssetIds: ["evidence-1"],
        workspaceType: "personal"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        analysisReceipt: expect.objectContaining({ reviewPolicyVersion })
      })
    );
    expect(isSupportedHarvestReviewPolicy(reviewPolicyVersion)).toBe(true);
  });

  it("rejects an unknown or unsigned review policy", async () => {
    mockApiRequest.mockResolvedValue(
      responseForPolicy("harvest-trichome-untrusted-future-policy")
    );

    await expect(
      analyzeTrichomePhotos({
        growId: "grow-1",
        evidenceAssetIds: ["evidence-1"],
        workspaceType: "personal"
      })
    ).rejects.toThrow(/not securely attested/i);
  });

  it("submits only the owner correction fields for server binding", async () => {
    mockApiRequest.mockResolvedValue({ success: true, feedbackId: "feedback-1" });

    await submitHarvestTrichomeFeedback({
      analysisId: "review-1",
      estimateAlignment: "amber_higher",
      ownerVisibleAmberPercent: 30,
      basis: "Brown heads remain brown while reflections change.",
      consentForModelTraining: true
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/ai/feedback", {
      method: "POST",
      body: {
        targetType: "harvest_trichome_review",
        targetId: "review-1",
        rating: 2,
        estimateAlignment: "amber_higher",
        ownerVisibleAmberPercent: 30,
        basis: "Brown heads remain brown while reflections change.",
        consentForModelTraining: true
      }
    });
  });
});
