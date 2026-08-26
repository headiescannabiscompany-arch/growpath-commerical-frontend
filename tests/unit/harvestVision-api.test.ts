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
  retryPristineDeepTrichomeReviewOperation,
  discardUnsavedDeepTrichomeReview,
  createHarvestFeedReviewDraft,
  deleteHarvestFeedReviewDraft,
  getHarvestFeedReviewDraft,
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

  it("normalizes durable Deep aggregate aliases without weakening the signed receipt", async () => {
    const aggregateReceipt = {
      kind: "harvest_vision_aggregate",
      version: 2,
      signature: digest("e"),
      keyId: "harvest-receipt-key-1",
      manifestDigest: digest("b"),
      selectedEvidenceDigest: digest("c"),
      analyzedEvidenceDigest: digest("d"),
      aggregationVersion: "harvest-deterministic-aggregate-v1"
    };
    mockApiRequest.mockResolvedValueOnce({
      result: {
        ...responseForPolicy("harvest-trichome-server-attestation-v4-batched-evidence")
          .result,
        analysisMode: "deep",
        aggregationPolicyVersion: "harvest-deterministic-aggregate-v1",
        manifestDigest: digest("b"),
        selectedEvidenceDigest: digest("c"),
        analyzedEvidenceDigest: digest("d"),
        batchSummaries: [
          {
            batchIndex: 0,
            globalImageIndexes: [1],
            inputDigest: digest("f"),
            resultDigest: digest("0")
          }
        ],
        analysisReceipt: {
          ...aggregateReceipt,
          aiUsageEventId: "usage-1",
          normalizedHarvestResultDigest: digest("a"),
          evidenceFingerprint: "evidence-1",
          reviewPolicyVersion: "harvest-trichome-server-attestation-v4-batched-evidence"
        },
        aggregateReceipt
      }
    });

    await expect(analyzeTrichomePhotos(exactAnalysisInput)).resolves.toEqual(
      expect.objectContaining({
        aggregationVersion: "harvest-deterministic-aggregate-v1",
        batchSummaries: [
          expect.objectContaining({
            batchIndex: 0,
            imageCount: 1,
            globalImageIndexes: [1]
          })
        ]
      })
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
      timeoutMs: 120000,
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

  it("retries one pristine failed operation without creating a replacement request", async () => {
    mockApiRequest.mockResolvedValue({
      retried: true,
      operation: {
        id: "operation-deep-1",
        state: "queued",
        analysisMode: "deep",
        clientOperationKey: "harvest-deep-stable-key-1",
        requestDigest: digest("d"),
        batchCount: 2,
        completedBatches: 0,
        creditsQuoted: 2,
        creditState: "not_reserved"
      }
    });

    await expect(
      retryPristineDeepTrichomeReviewOperation("operation-deep-1", {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        operation: expect.objectContaining({
          id: "operation-deep-1",
          status: "queued",
          creditState: "not_reserved"
        })
      })
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/ai/harvest/trichomes/operations/operation-deep-1/retry",
      expect.objectContaining({
        method: "POST",
        retries: 0,
        body: {
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        }
      })
    );
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

  it("creates and reloads only a private receipt-bound Harvest Feed review draft", async () => {
    const selectedView = {
      sourceEvidenceAssetId: "64b000000000000000000001",
      sourceImageIndex: 4,
      kind: "macro-grid-2",
      cropStrategy: "macro_coverage" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      sourceBounds: {
        left: 100,
        top: 200,
        width: 800,
        height: 800,
        sourceWidth: 1920,
        sourceHeight: 1080
      },
      width: 800,
      height: 800,
      mimeType: "image/jpeg" as const,
      sha256: digest("f")
    };
    const response = {
      success: true,
      idempotentReplay: false,
      draft: {
        id: "64c000000000000000000001",
        status: "draft",
        type: "education",
        sourceType: "harvest_readiness",
        title: "Harvest Readiness review",
        body: "A bounded signed review of visible sampled areas.",
        tags: ["harvest-readiness"],
        contentLabels: ["cannabis", "education"],
        selectedViewCount: 1,
        selectionDigest: digest("e"),
        selectedViews: [selectedView]
      }
    };
    mockApiRequest.mockResolvedValueOnce(response).mockResolvedValueOnce({
      ...response,
      idempotentReplay: true
    });

    await expect(
      createHarvestFeedReviewDraft(
        "operation-deep-1",
        {
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        },
        [selectedView]
      )
    ).resolves.toEqual(
      expect.objectContaining({
        idempotentReplay: false,
        draft: expect.objectContaining({ status: "draft", selectedViewCount: 1 })
      })
    );
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "/api/ai/harvest/trichomes/operations/operation-deep-1/feed-draft",
      expect.objectContaining({
        method: "POST",
        retries: 0,
        body: expect.objectContaining({ selectedViews: [selectedView] })
      })
    );

    await expect(
      getHarvestFeedReviewDraft("operation-deep-1", {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      })
    ).resolves.toEqual(expect.objectContaining({ idempotentReplay: true }));
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "/api/ai/harvest/trichomes/operations/operation-deep-1/feed-draft",
      expect.objectContaining({
        params: expect.objectContaining({ facilityId: "facility-1" })
      })
    );
  });

  it("deletes a private Feed draft once with the exact workspace query", async () => {
    const controller = new AbortController();
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      deleted: true,
      draftId: "64c000000000000000000001"
    });

    await expect(
      deleteHarvestFeedReviewDraft(
        "operation-deep-1",
        {
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        },
        { signal: controller.signal }
      )
    ).resolves.toEqual({
      deleted: true,
      draftId: "64c000000000000000000001"
    });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/ai/harvest/trichomes/operations/operation-deep-1/feed-draft",
      {
        method: "DELETE",
        signal: controller.signal,
        timeoutMs: 60000,
        retries: 0,
        params: {
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        }
      }
    );
  });

  it.each([
    ["missing success", { deleted: true, draftId: "64c000000000000000000001" }],
    [
      "a non-deletion",
      { success: true, deleted: false, draftId: "64c000000000000000000001" }
    ],
    ["an empty draft ID", { success: true, deleted: true, draftId: "" }],
    ["a non-string draft ID", { success: true, deleted: true, draftId: {} }],
    ["a malformed draft ID", { success: true, deleted: true, draftId: "draft-1" }]
  ])("rejects %s in a Feed-draft deletion response", async (_label, response) => {
    mockApiRequest.mockResolvedValueOnce(response);

    await expect(
      deleteHarvestFeedReviewDraft("operation-deep-1", {
        workspaceType: "personal"
      })
    ).rejects.toThrow(/did not confirm deletion/i);
  });

  it("rejects a Feed draft whose inspection derivation version is unknown", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      idempotentReplay: false,
      draft: {
        id: "64c000000000000000000002",
        status: "draft",
        type: "education",
        sourceType: "harvest_readiness",
        title: "Harvest Readiness review",
        body: "A bounded signed review of visible sampled areas.",
        tags: ["harvest-readiness"],
        contentLabels: ["cannabis", "education"],
        selectedViewCount: 1,
        selectionDigest: digest("e"),
        selectedViews: [
          {
            sourceEvidenceAssetId: "64b000000000000000000001",
            sourceImageIndex: 1,
            kind: "macro-grid-1",
            cropStrategy: "macro_coverage",
            derivationVersion: "untrusted-future-recipe",
            sourceBounds: {
              left: 0,
              top: 0,
              width: 800,
              height: 800,
              sourceWidth: 1080,
              sourceHeight: 1920
            },
            width: 800,
            height: 800,
            mimeType: "image/jpeg",
            sha256: digest("f")
          }
        ]
      }
    });

    await expect(
      getHarvestFeedReviewDraft("operation-deep-1", {
        workspaceType: "personal"
      })
    ).rejects.toThrow(/complete private Harvest Feed review draft/i);
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
