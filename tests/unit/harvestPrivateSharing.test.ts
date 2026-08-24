import type { EvidenceFrameExtraction } from "@/api/evidence";
import type { TrichomeVisionResult } from "@/api/harvestVision";
import {
  buildSignedHarvestResultShareText,
  exportSelectedHarvestFrames,
  HARVEST_PRIVATE_FRAME_EXPORT_BYTE_LIMIT,
  HARVEST_PRIVATE_FRAME_EXPORT_LIMIT,
  harvestRetainedFrameExportCandidates,
  isShareableSignedHarvestResult,
  savedHarvestAnalysis
} from "@/features/personal/tools/harvestPrivateSharing";
import type { EvidenceAsset } from "@/types/evidence";

const digest = "a".repeat(64);
const resultDigest = "b".repeat(64);
const signature = "c".repeat(64);

function sourceVideo(): EvidenceAsset {
  return {
    id: "local-source",
    _id: "private-source-video-id",
    assetType: "video",
    originalUri: "/api/evidence-assets/uploads/private-video-upload/object",
    durableUrl: "/api/evidence-assets/uploads/private-video-upload/object",
    source: "library",
    purpose: "harvest",
    uploadStatus: "uploaded",
    aiUsable: false,
    qualityWarnings: []
  };
}

function retainedFrame(
  index: number,
  overrides: Partial<EvidenceAsset> = {}
): EvidenceAsset {
  return {
    id: `local-frame-${index}`,
    _id: `retained-frame-${index}`,
    assetType: "photo",
    originalUri: `/api/evidence-assets/uploads/frame-upload-${index}/object`,
    durableUrl: `/api/evidence-assets/uploads/frame-upload-${index}/object`,
    mimeType: "image/jpeg",
    source: "generated",
    purpose: "harvest",
    uploadStatus: "uploaded",
    aiUsable: true,
    qualityWarnings: [],
    sourceVideoEvidenceAssetId: "private-source-video-id",
    frameExtractionVersion: "harvest-video-preselection-v1",
    frameExtractionAttempt: 2,
    frameIndex: index,
    frameTimeSeconds: index * 1.5,
    ...overrides
  };
}

function extraction(): EvidenceFrameExtraction {
  return {
    status: "completed",
    attemptCount: 2,
    requestedFrameCount: 12,
    version: "harvest-video-preselection-v1",
    retryable: true,
    frames: [],
    preselection: {
      policyVersion: "harvest-video-preselection-v1",
      candidateLimit: 600,
      sampledCount: 30,
      qualityUsableCount: 10,
      qualityRejectedCount: 20,
      rejectedReasons: {
        decodeError: 1,
        invalidMetrics: 1,
        obviousBlur: 8,
        underexposed: 5,
        overexposedOrGlare: 5
      },
      distinctCandidateCount: 8,
      duplicateCandidateCount: 2,
      duplicateClusterCount: 1,
      targetFrameCount: 2,
      selectedCount: 2,
      coveredBucketCount: 2,
      selectedBytesTotal: 2048,
      selectedByteLimit: 8192,
      selected: [
        {
          frameIndex: 0,
          evidenceAssetId: "retained-frame-0",
          candidateIndex: 2,
          requestedTimeSeconds: 0,
          qualityScore: 0.9,
          coverageBucket: 0,
          sequenceGroupId: "sequence-1",
          sequenceRole: "anchor",
          countingEligible: true
        },
        {
          frameIndex: 1,
          evidenceAssetId: "retained-frame-1",
          candidateIndex: 3,
          requestedTimeSeconds: 1.5,
          qualityScore: 0.8,
          coverageBucket: 1,
          sequenceGroupId: "sequence-1",
          sequenceRole: "adjacent",
          countingEligible: false
        }
      ]
    }
  };
}

function retainedFrameSet(count: number) {
  const selected = Array.from({ length: count }, (_, index) => ({
    frameIndex: index,
    evidenceAssetId: `retained-frame-${index}`,
    candidateIndex: index,
    requestedTimeSeconds: index * 1.5,
    qualityScore: 0.9,
    coverageBucket: index,
    sequenceGroupId: `sequence-${index}`,
    sequenceRole: "standalone" as const,
    countingEligible: true
  }));
  const base = extraction();
  const exactExtraction: EvidenceFrameExtraction = {
    ...base,
    requestedFrameCount: count > 12 ? 80 : 12,
    preselection: {
      ...base.preselection!,
      targetFrameCount: count,
      selectedCount: count,
      coveredBucketCount: count,
      selectedBytesTotal: count * 1024,
      selected
    }
  };
  const frames = Array.from({ length: count }, (_, index) => retainedFrame(index));
  return harvestRetainedFrameExportCandidates({
    sourceVideo: sourceVideo(),
    extraction: exactExtraction,
    frames
  });
}

function signedDeepResult(
  overrides: Partial<TrichomeVisionResult> & Record<string, unknown> = {}
): TrichomeVisionResult {
  const selectedEvidenceAssetIds = Array.from(
    { length: 13 },
    (_, index) => `private-selected-id-${index + 1}`
  );
  const evidenceUsed = [...selectedEvidenceAssetIds];
  return {
    photoUsable: true,
    imageQuality: "usable",
    clear: 0.15,
    cloudy: 0.65,
    amber: 0.2,
    visibleSampleEstimateUsable: true,
    sampleClear: 0.15,
    sampleCloudy: 0.6,
    sampleAmberMin: 0.15,
    sampleAmberMax: 0.25,
    sampleCloudyOrGlare: 0.05,
    confidence: 0.82,
    dominant: "cloudy",
    cloudinessObservation: "direct_cloudy",
    headDevelopmentObservation: "intact_swollen",
    headDevelopmentSignals: ["fused_heads", "ruptured_heads", "bare_stalks"],
    visibleTraits: [],
    evidence: [],
    recommendation: "Review the whole plant.",
    limitations: [],
    qualityChecks: {
      focus: "usable",
      glare: "localized",
      lighting: "neutral",
      headVisibility: "sufficient",
      roleCoverage: "complete"
    },
    provider: "openai",
    providerLabel: "OpenAI",
    providerModel: "private-provider-model",
    imagesAnalyzed: 13,
    analysisMode: "deep",
    batchCount: 2,
    batchSize: 12,
    manifestDigest: digest,
    selectedEvidenceDigest: digest,
    analyzedEvidenceDigest: resultDigest,
    creditsQuoted: 2,
    aggregateReceipt: {
      kind: "harvest_vision_aggregate",
      version: 2,
      signature,
      keyId: "server-key-id",
      manifestDigest: digest,
      selectedEvidenceDigest: digest,
      analyzedEvidenceDigest: resultDigest
    },
    selectedEvidenceAssetIds,
    evidenceUsed,
    batchSummaries: [
      {
        batchIndex: 0,
        imageCount: 12,
        globalImageIndexes: Array.from({ length: 12 }, (_, index) => index + 1),
        inputDigest: digest,
        resultDigest
      },
      {
        batchIndex: 1,
        imageCount: 1,
        globalImageIndexes: [13],
        inputDigest: resultDigest,
        resultDigest: digest
      }
    ],
    analysisId: "usage-event-id",
    analysisReceipt: {
      kind: "harvest_vision_aggregate",
      version: 2,
      signature,
      keyId: "server-key-id",
      manifestDigest: digest,
      selectedEvidenceDigest: digest,
      analyzedEvidenceDigest: resultDigest,
      aiUsageEventId: "usage-event-id",
      normalizedHarvestResultDigest: resultDigest,
      evidenceFingerprint: [...selectedEvidenceAssetIds].sort().join("|"),
      reviewPolicyVersion: "harvest-trichome-server-attestation-v4-batched-evidence"
    },
    aiCreditsUsed: 2,
    creditStatus: "charged",
    ...overrides
  } as TrichomeVisionResult;
}

describe("Harvest private frame and signed-result sharing", () => {
  it("offers only the complete verified retained-frame manifest, never source, direct, or unselected media", () => {
    const candidates = harvestRetainedFrameExportCandidates({
      sourceVideo: sourceVideo(),
      extraction: extraction(),
      frames: [retainedFrame(0), retainedFrame(1)]
    });

    expect(candidates.map((candidate) => candidate.asset._id)).toEqual([
      "retained-frame-0",
      "retained-frame-1"
    ]);
    expect(candidates.map((candidate) => candidate.sequenceRole)).toEqual([
      "anchor",
      "adjacent"
    ]);
    expect(candidates.some((candidate) => candidate.asset.assetType === "video")).toBe(
      false
    );

    expect(
      harvestRetainedFrameExportCandidates({
        sourceVideo: sourceVideo(),
        extraction: extraction(),
        frames: [retainedFrame(0), retainedFrame(1), retainedFrame(9)]
      })
    ).toEqual([]);
    expect(
      harvestRetainedFrameExportCandidates({
        sourceVideo: sourceVideo(),
        extraction: extraction(),
        frames: [retainedFrame(0), retainedFrame(1, { frameExtractionAttempt: 1 })]
      })
    ).toEqual([]);
  });

  it("exports only explicitly selected protected frames and hides identifiers and URLs", async () => {
    const candidates = harvestRetainedFrameExportCandidates({
      sourceVideo: sourceVideo(),
      extraction: extraction(),
      frames: [retainedFrame(0), retainedFrame(1)]
    });
    const getPlayback = jest.fn(async (uploadId: string) => ({
      playbackUrl: `https://private.example/${uploadId}?signed=secret`,
      expiresInSeconds: 300
    }));
    const fetchImpl = jest.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/jpeg" }
        })
    );
    let exportedBlob: Blob | null = null;
    const anchor = { href: "", download: "", click: jest.fn(), remove: jest.fn() };
    const documentObject = {
      createElement: jest.fn(() => anchor),
      body: { appendChild: jest.fn() }
    } as any;

    const response = await exportSelectedHarvestFrames({
      candidates,
      selectedAssetIds: ["retained-frame-1"],
      workspace: { workspaceType: "personal" },
      dependencies: {
        platform: "web",
        getPlayback: getPlayback as any,
        fetchImpl: fetchImpl as any,
        documentObject,
        createObjectUrl: (blob) => {
          exportedBlob = blob;
          return "blob:private-export";
        },
        revokeObjectUrl: jest.fn()
      }
    });

    expect(response).toEqual({
      method: "web-download",
      exportedCount: 1,
      exportedBytes: 3
    });
    expect(getPlayback).toHaveBeenCalledTimes(1);
    expect(getPlayback).toHaveBeenCalledWith("frame-upload-1", {
      workspaceType: "personal"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://private.example/frame-upload-1?signed=secret"
    );
    const html = await exportedBlob!.text();
    expect(html).toContain("Selected frame 1");
    expect(html).toContain("comparison-only");
    expect(html).not.toContain("retained-frame-0");
    expect(html).not.toContain("retained-frame-1");
    expect(html).not.toContain("private-source-video-id");
    expect(html).not.toContain("private.example");
    expect(html).not.toContain("frame-upload-1");
    expect(html).not.toContain("signed=secret");
  });

  it("bounds each repeatable private export to 12 frames before retrieving bytes", async () => {
    const candidates = retainedFrameSet(HARVEST_PRIVATE_FRAME_EXPORT_LIMIT + 1);
    const getPlayback = jest.fn();

    await expect(
      exportSelectedHarvestFrames({
        candidates,
        selectedAssetIds: candidates.map((candidate) => String(candidate.asset._id)),
        workspace: { workspaceType: "personal" },
        dependencies: { platform: "web", getPlayback: getPlayback as any }
      })
    ).rejects.toThrow(/no more than 12 retained frames per private package/i);
    expect(getPlayback).not.toHaveBeenCalled();
  });

  it("rejects a declared package over 24 MiB before retrieving any frame", async () => {
    const candidates = retainedFrameSet(1);
    candidates[0].asset.fileSizeBytes = HARVEST_PRIVATE_FRAME_EXPORT_BYTE_LIMIT + 1;
    const getPlayback = jest.fn();

    await expect(
      exportSelectedHarvestFrames({
        candidates,
        selectedAssetIds: [String(candidates[0].asset._id)],
        workspace: { workspaceType: "personal" },
        dependencies: { platform: "web", getPlayback: getPlayback as any }
      })
    ).rejects.toThrow(/exceed 24 MiB/i);
    expect(getPlayback).not.toHaveBeenCalled();
  });

  it("stops on actual bytes over 24 MiB when stored size metadata is unavailable", async () => {
    const candidates = retainedFrameSet(1);
    const getPlayback = jest.fn(async () => ({
      playbackUrl: "https://private.example/frame",
      expiresInSeconds: 300
    }));
    const arrayBuffer = jest.fn(async () => ({
      byteLength: HARVEST_PRIVATE_FRAME_EXPORT_BYTE_LIMIT + 1
    }));
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      headers: { get: (name: string) => (name === "content-type" ? "image/jpeg" : null) },
      arrayBuffer
    }));

    await expect(
      exportSelectedHarvestFrames({
        candidates,
        selectedAssetIds: [String(candidates[0].asset._id)],
        workspace: { workspaceType: "personal" },
        dependencies: {
          platform: "web",
          getPlayback: getPlayback as any,
          fetchImpl: fetchImpl as any
        }
      })
    ).rejects.toThrow(/exceed 24 MiB/i);
    expect(getPlayback).toHaveBeenCalledTimes(1);
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  it("shares only completed attested results and sanitizes the readable summary", () => {
    const result = signedDeepResult();
    expect(isShareableSignedHarvestResult(result)).toBe(true);
    const summary = buildSignedHarvestResultShareText(result);
    expect(summary).toContain("server-attested image review");
    expect(summary).toContain("https://growpathai.com");
    expect(summary).toContain("15% directly confirmed amber");
    expect(summary).toContain("not the whole plant");
    expect(summary).toContain(
      "Visible head-development signals: fused heads, ruptured heads, bare stalks"
    );
    expect(summary).not.toContain("private-selected-id");
    expect(summary).not.toContain("private-analyzed-id");
    expect(summary).not.toContain("usage-event-id");
    expect(summary).not.toContain("server-key-id");
    expect(summary).not.toContain(signature);
    expect(summary).not.toContain(digest);
    expect(summary).not.toContain("private-provider-model");
  });

  it("rejects unattested, failed/refunded, tampered, and deleted results", () => {
    expect(
      isShareableSignedHarvestResult(
        signedDeepResult({ analysisReceipt: undefined } as any)
      )
    ).toBe(false);
    expect(
      isShareableSignedHarvestResult(signedDeepResult({ creditStatus: "refunded" }))
    ).toBe(false);
    expect(isShareableSignedHarvestResult(signedDeepResult({ imagesAnalyzed: 12 }))).toBe(
      false
    );
    expect(
      isShareableSignedHarvestResult(
        signedDeepResult({
          aggregateReceipt: {
            ...signedDeepResult().aggregateReceipt!,
            signature: "tampered"
          }
        })
      )
    ).toBe(false);
    expect(
      isShareableSignedHarvestResult({
        ...signedDeepResult(),
        errorCode: "HARVEST_RESULT_DELETED"
      })
    ).toBe(false);
    expect(
      savedHarvestAnalysis({
        outputs: {
          photoAnalysis: signedDeepResult({ analysisMode: "standard" })
        }
      } as any)
    ).toBeNull();
    expect(() =>
      buildSignedHarvestResultShareText(
        signedDeepResult({ analysisReceipt: undefined } as any)
      )
    ).toThrow(/completed, securely attested/i);
  });

  it("omits an unrecognized head-development signal from the readable share", () => {
    const summary = buildSignedHarvestResultShareText(
      signedDeepResult({
        headDevelopmentSignals: ["ruptured_heads", "private_provider_payload"] as any
      })
    );

    expect(summary).toContain("ruptured heads");
    expect(summary).not.toContain("private provider payload");
  });
});
