const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  analyzeTrichomePhotos,
  quoteDeepTrichomeReview,
  startDeepTrichomeReview,
  findDeepTrichomeReviewOperation,
  getDeepTrichomeReviewOperation,
  discardUnsavedDeepTrichomeReview,
  isSupportedHarvestReviewPolicy,
  submitHarvestTrichomeFeedback
} = require("@/api/harvestVision");

const digest = (character: string) => character.repeat(64);

const exactAnalysisInput = {
  growId: "grow-1",
  evidenceAssetIds: Array.from({ length: 13 }, (_, index) => `evidence-${index + 1}`),
  workspaceType: "personal" as const,
  sampleLocation: "mixed_bud_sites"
};

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

  it("accepts only a complete signed v4 aggregate receipt", async () => {
    const response = {
      result: {
        ...responseForPolicy("harvest-trichome-server-attestation-v4-batched-evidence")
          .result,
        analysisMode: "deep",
        manifestDigest: digest("b"),
        selectedEvidenceDigest: digest("c"),
        analyzedEvidenceDigest: digest("d"),
        analysisReceipt: {
          kind: "harvest_vision_aggregate",
          version: 2,
          signature: digest("e"),
          keyId: "harvest-receipt-key-1",
          manifestDigest: digest("b"),
          selectedEvidenceDigest: digest("c"),
          analyzedEvidenceDigest: digest("d"),
          aiUsageEventId: "usage-1",
          normalizedHarvestResultDigest: digest("a"),
          evidenceFingerprint: "evidence-1",
          reviewPolicyVersion: "harvest-trichome-server-attestation-v4-batched-evidence"
        },
        aggregateReceipt: {
          kind: "harvest_vision_aggregate",
          version: 2,
          signature: digest("e"),
          keyId: "harvest-receipt-key-1",
          manifestDigest: digest("b"),
          selectedEvidenceDigest: digest("c"),
          analyzedEvidenceDigest: digest("d")
        }
      }
    };
    mockApiRequest.mockResolvedValueOnce(response);

    await expect(analyzeTrichomePhotos(exactAnalysisInput)).resolves.toEqual(
      expect.objectContaining({
        aggregateReceipt: expect.objectContaining({
          signature: digest("e"),
          keyId: "harvest-receipt-key-1"
        })
      })
    );

    mockApiRequest.mockResolvedValueOnce({
      result: {
        ...response.result,
        aggregateReceipt: {
          ...response.result.aggregateReceipt,
          signature: "not-a-signature"
        }
      }
    });
    await expect(analyzeTrichomePhotos(exactAnalysisInput)).rejects.toThrow(
      /not securely attested/i
    );
  });

  it("accepts a duplicate-heavy selected set as a standard one-credit quote", async () => {
    mockApiRequest.mockResolvedValue({
      quote: {
        version: "harvest-analysis-quote-v1",
        token: null,
        analysisMode: "standard",
        selectedEvidenceCount: 13,
        analyzedEvidenceCount: 12,
        duplicateEvidenceCount: 1,
        sourceVideoSelected: false,
        evidenceCount: 12,
        batchCount: 1,
        creditsQuoted: 1,
        manifestDigest: digest("a"),
        selectedEvidenceDigest: digest("b"),
        analyzedEvidenceDigest: digest("c"),
        expiresAt: null
      }
    });

    await expect(quoteDeepTrichomeReview(exactAnalysisInput)).resolves.toEqual(
      expect.objectContaining({
        analysisMode: "standard",
        selectedEvidenceCount: 13,
        analyzedEvidenceCount: 12,
        token: null,
        expiresAt: null,
        creditsQuoted: 1
      })
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/ai/harvest/trichomes/quote",
      expect.objectContaining({ method: "POST", body: exactAnalysisInput })
    );
  });

  it("requires an expiry only for Deep quotes", async () => {
    mockApiRequest.mockResolvedValueOnce({
      quote: {
        version: "harvest-analysis-quote-v1",
        tokenVersion: "harvest-deep-quote-v1",
        token: "signed-deep-token",
        keyId: "harvest-receipt-key-1",
        analysisMode: "deep",
        selectedEvidenceCount: 13,
        analyzedEvidenceCount: 13,
        duplicateEvidenceCount: 0,
        sourceVideoSelected: false,
        evidenceCount: 13,
        batchCount: 2,
        creditsQuoted: 2,
        manifestDigest: digest("a"),
        selectedEvidenceDigest: digest("b"),
        analyzedEvidenceDigest: digest("c"),
        expiresAt: null
      }
    });

    await expect(quoteDeepTrichomeReview(exactAnalysisInput)).rejects.toThrow(
      /complete evidence-bound/i
    );
  });

  it("requires and preserves the public signing-key ID on Deep quotes", async () => {
    const deepQuote = {
      version: "harvest-analysis-quote-v1",
      tokenVersion: "harvest-deep-quote-v1",
      token: "signed-deep-token",
      analysisMode: "deep",
      selectedEvidenceCount: 13,
      analyzedEvidenceCount: 13,
      duplicateEvidenceCount: 0,
      sourceVideoSelected: false,
      evidenceCount: 13,
      batchCount: 2,
      creditsQuoted: 2,
      manifestDigest: digest("a"),
      selectedEvidenceDigest: digest("b"),
      analyzedEvidenceDigest: digest("c"),
      expiresAt: "2099-08-24T12:00:00.000Z"
    };
    mockApiRequest.mockResolvedValueOnce({ quote: deepQuote });
    await expect(quoteDeepTrichomeReview(exactAnalysisInput)).rejects.toThrow(
      /complete evidence-bound/i
    );

    mockApiRequest.mockResolvedValueOnce({
      quote: { ...deepQuote, keyId: "harvest-receipt-key-1" }
    });
    await expect(quoteDeepTrichomeReview(exactAnalysisInput)).resolves.toEqual(
      expect.objectContaining({ keyId: "harvest-receipt-key-1" })
    );
  });

  it("starts Deep review once with the stable request ID in its header and body", async () => {
    mockApiRequest.mockResolvedValue({
      operation: {
        id: "operation-deep-1",
        status: "queued",
        analysisMode: "deep",
        clientOperationKey: "harvest-deep-stable-key-1",
        requestDigest: digest("d"),
        batchCount: 2,
        completedBatches: 0,
        creditsQuoted: 2
      },
      idempotentReplay: false
    });

    await expect(
      startDeepTrichomeReview({
        ...exactAnalysisInput,
        analysisMode: "deep",
        deepReviewQuoteToken: "signed-token",
        creditsQuoted: 2,
        clientOperationKey: "harvest-deep-stable-key-1"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        operation: expect.objectContaining({ id: "operation-deep-1" }),
        idempotentReplay: false
      })
    );
    expect(mockApiRequest).toHaveBeenCalledWith("/api/ai/harvest/trichomes", {
      method: "POST",
      signal: undefined,
      timeoutMs: 45000,
      retries: 0,
      headers: { "X-Client-Request-Id": "harvest-deep-stable-key-1" },
      body: expect.objectContaining({
        clientOperationKey: "harvest-deep-stable-key-1",
        deepReviewQuoteToken: "signed-token",
        creditsQuoted: 2
      })
    });
  });

  it("recovers only the exact workspace-owned operation for one stable key", async () => {
    mockApiRequest.mockResolvedValue({
      operations: [
        {
          id: "operation-deep-1",
          state: "processing",
          analysisMode: "deep",
          clientOperationKey: "harvest-deep-stable-key-1",
          requestDigest: digest("d"),
          batchCount: 2,
          completedBatches: 1,
          creditsQuoted: 2
        }
      ]
    });

    await expect(
      findDeepTrichomeReviewOperation("harvest-deep-stable-key-1", {
        workspaceType: "personal"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        operation: expect.objectContaining({
          id: "operation-deep-1",
          status: "processing",
          completedBatches: 1
        })
      })
    );
  });

  it("accepts the completed-batch alias and rejects unknown credit states", async () => {
    mockApiRequest.mockResolvedValueOnce({
      operation: {
        id: "operation-deep-1",
        state: "processing",
        analysisMode: "deep",
        clientOperationKey: "harvest-deep-stable-key-1",
        requestDigest: digest("d"),
        batchCount: 2,
        completedBatchCount: 1,
        creditsQuoted: 2,
        creditState: "reserved"
      }
    });
    await expect(
      getDeepTrichomeReviewOperation("operation-deep-1", {
        workspaceType: "personal"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        operation: expect.objectContaining({
          completedBatches: 1,
          creditState: "reserved"
        })
      })
    );

    mockApiRequest.mockResolvedValueOnce({
      operation: {
        id: "operation-deep-1",
        state: "failed",
        analysisMode: "deep",
        clientOperationKey: "harvest-deep-stable-key-1",
        requestDigest: digest("d"),
        batchCount: 2,
        completedBatches: 1,
        creditsQuoted: 2,
        creditState: "maybe_charged"
      }
    });
    await expect(
      getDeepTrichomeReviewOperation("operation-deep-1", {
        workspaceType: "personal"
      })
    ).rejects.toThrow(/invalid Deep review operation/i);
  });

  it("permanently discards only one confirmed unsaved succeeded Deep result without media deletion", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      discarded: true,
      permanent: true,
      evidenceDeleted: false,
      sourceVideoDeleted: false,
      operation: {
        id: "operation-deep-1",
        status: "failed",
        state: "failed",
        analysisMode: "deep",
        errorCode: "HARVEST_RESULT_DELETED",
        failureMessage: "The unsaved completed Deep result was discarded by its owner.",
        completedAt: "2026-08-24T10:00:00.000Z",
        discardedAt: "2026-08-24T10:05:00.000Z",
        result: null
      }
    });

    await expect(
      discardUnsavedDeepTrichomeReview("operation-deep-1", {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        discarded: true,
        evidenceDeleted: false,
        sourceVideoDeleted: false
      })
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/ai/harvest/trichomes/operations/operation-deep-1",
      {
        method: "DELETE",
        signal: undefined,
        timeoutMs: 30000,
        retries: 0,
        body: {
          confirmPermanentDelete: true,
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        }
      }
    );
  });

  it("submits only the owner correction fields for server binding", async () => {
    mockApiRequest.mockResolvedValue({ success: true, feedbackId: "feedback-1" });

    await submitHarvestTrichomeFeedback({
      analysisId: "review-1",
      estimateAlignment: "amber_higher",
      ownerVisibleAmberPercent: 30,
      basis: "Brown heads remain brown while reflections change.",
      consentForModelTraining: true,
      calibrationAuthorization: {
        version: "harvest-trichome-calibration-consent-v1",
        rightsConfirmed: true,
        scope: "internal_ai_evaluation_and_calibration",
        publicUseAuthorized: false
      }
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
        consentForModelTraining: true,
        calibrationAuthorization: {
          version: "harvest-trichome-calibration-consent-v1",
          rightsConfirmed: true,
          scope: "internal_ai_evaluation_and_calibration",
          publicUseAuthorized: false
        }
      }
    });
  });
});
