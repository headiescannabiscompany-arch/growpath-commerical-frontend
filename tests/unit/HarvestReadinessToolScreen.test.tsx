import React from "react";
import { Alert, type AlertButton } from "react-native";
import {
  act,
  fireEvent,
  fireEventAsync,
  render,
  renderAsync,
  waitFor
} from "@testing-library/react-native";

import HarvestReadinessToolRoute, {
  createHarvestPhotoStyles,
  harvestAnalyzedGlobalIndexes,
  harvestBatchSummariesCoverEvidence,
  harvestHeadDevelopmentSignalLabel,
  harvestVideoReviewPlan,
  savedHarvestAnalysis,
  savedHarvestAnalysisOperationId,
  UnsavedHarvestDeepResultDiscard
} from "@/app/home/personal/(tabs)/tools/harvest-readiness";
import { getThemePalette } from "@/theme/appTheme";

describe("Harvest Readiness Night theme", () => {
  it("uses the active palette for photo evidence guidance and notes", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createHarvestPhotoStyles(palette);

    expect(styles.card.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.checklist.backgroundColor).toBe(palette.surface);
    expect(styles.checklistTitle.color).toBe(palette.text);
    expect(styles.checklistItem.color).toBe(palette.textMuted);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.button.backgroundColor).toBe(palette.accent);
    expect(styles.qualityChecks.backgroundColor).toBe(palette.surface);
  });

  it("requires explicit confirmation before discarding only an unsaved Deep result", () => {
    const onDiscard = jest.fn();
    const screen = render(
      <UnsavedHarvestDeepResultDiscard
        operation={
          {
            id: "operation-deep-1",
            status: "succeeded",
            analysisMode: "deep",
            clientOperationKey: "stable-client-operation-key",
            requestDigest: "a".repeat(64),
            batchCount: 2,
            completedBatches: 2,
            creditsQuoted: 2,
            creditState: "charged"
          } as any
        }
        busy={false}
        onDiscard={onDiscard}
      />
    );

    fireEvent.press(screen.getByLabelText("Discard unsaved Deep result"));
    expect(screen.getByText(/source video and retained frames are kept/i)).toBeTruthy();
    expect(screen.getByText(/credits already charged.*not refunded/i)).toBeTruthy();
    expect(
      screen.getByLabelText("Permanently discard unsaved Deep result")
    ).toBeDisabled();

    fireEvent(
      screen.getByLabelText(
        "I understand unsaved Deep result discard is permanent and not refunded"
      ),
      "valueChange",
      true
    );
    expect(
      screen.getByLabelText("Permanently discard unsaved Deep result")
    ).not.toBeDisabled();
    fireEvent.press(screen.getByLabelText("Permanently discard unsaved Deep result"));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("renders the explicit ruptured-head and bare-stalk morphology labels", () => {
    expect(harvestHeadDevelopmentSignalLabel("ruptured_heads")).toBe("ruptured heads");
    expect(harvestHeadDevelopmentSignalLabel("bare_stalks")).toBe("bare stalks");
  });
});

const mockRunCalculator = jest.fn();
const mockGetToolRun = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockGetHarvestBatch = jest.fn();
const mockListHarvestBatches = jest.fn();
const mockUpdateHarvestBatch = jest.fn();
const mockAnalyzeTrichomePhotos = jest.fn();
const mockQuoteDeepTrichomeReview = jest.fn();
const mockStartDeepTrichomeReview = jest.fn();
const mockFindDeepTrichomeReviewOperation = jest.fn();
const mockGetDeepTrichomeReviewOperation = jest.fn();
const mockCreateHarvestFeedReviewDraft = jest.fn();
const mockDeleteHarvestFeedReviewDraft = jest.fn();
const mockGetHarvestFeedReviewDraft = jest.fn();
const mockSubmitHarvestTrichomeFeedback = jest.fn();
const mockAskPersonalAssistant = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockListFacilityGrows = jest.fn();
const mockFetchCommercialGrows = jest.fn();
const mockListEvidenceAssets = jest.fn();
const mockExtractEvidenceVideoFrames = jest.fn();
const mockGetEvidenceVideoFrameExtraction = jest.fn();
const mockGetEvidenceAssetsByIds = jest.fn();
const mockSavedGrowPhotoEvidencePicker = jest.fn();
const mockMediaEvidencePickerProps = jest.fn();
let mockRouteParams: Record<string, string> = { growId: "grow-1" };
let mockEntitlements: Record<string, any> = {
  plan: "pro",
  mode: "personal",
  facilityId: null,
  can: () => true
};

jest.mock("@/components/media/MediaEvidencePicker", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  const asset = (index: number) => ({
    id: `evidence-${index}`,
    _id: `64b00000000000000000000${index}`,
    assetType: "photo",
    originalUri: `file:///trichomes-${index}.jpg`,
    durableUrl: `/uploads/trichomes-${index}.jpg`,
    mimeType: "image/jpeg",
    growId: "grow-1",
    source: "library",
    purpose: "harvest",
    uploadStatus: "uploaded",
    aiUsable: true,
    qualityWarnings: []
  });
  const videoAsset = {
    id: "source-video-1",
    _id: "64b000000000000000000099",
    assetType: "video",
    originalUri: "file:///trichomes.mov",
    durableUrl: "/uploads/trichomes.mov",
    mimeType: "video/quicktime",
    growId: "grow-1",
    source: "library",
    purpose: "harvest",
    uploadStatus: "uploaded",
    aiUsable: false,
    qualityWarnings: []
  };
  const frameAsset = (index: number) => ({
    ...asset(index),
    id: `video-frame-${index}`,
    _id: `64b00000000000000000001${index}`,
    source: "generated",
    sourceVideoEvidenceAssetId: videoAsset._id,
    frameExtractionVersion: "harvest-video-server-v2",
    frameExtractionAttempt: 1,
    frameIndex: index,
    frameTimeSeconds: index * 2
  });
  return (props: any) => {
    mockMediaEvidencePickerProps(props);
    return React.createElement(
      View,
      { accessibilityLabel: "Media evidence picker" },
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Add one harvest evidence photo",
          onPress: () => props.onChange([asset(1)])
        },
        React.createElement(Text, null, "Add One Photo")
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Add complete harvest photo set",
          onPress: () => props.onChange([asset(1), asset(2), asset(3), asset(4)])
        },
        React.createElement(Text, null, "Add Complete Photo Set")
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Add duplicate-heavy harvest photo set",
          onPress: () =>
            props.onChange(Array.from({ length: 13 }, (_, index) => asset(index + 1)))
        },
        React.createElement(Text, null, "Add Duplicate-heavy Photo Set")
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Add harvest video and extracted frames",
          onPress: () => props.onChange([videoAsset])
        },
        React.createElement(Text, null, "Add Video And Frames")
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Remove harvest evidence",
          onPress: () => props.onChange([])
        },
        React.createElement(Text, null, "Remove Harvest Evidence")
      )
    );
  };
});

jest.mock("@/components/media/SavedGrowPhotoEvidencePicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) => {
    mockSavedGrowPhotoEvidencePicker(props);
    return React.createElement(View, { accessibilityLabel: "Saved grow photo evidence" });
  };
});

jest.mock("@/api/evidence", () => {
  const actual = jest.requireActual("@/api/evidence");
  return {
    ...actual,
    listEvidenceAssets: (...args: any[]) => mockListEvidenceAssets(...args),
    extractEvidenceVideoFrames: (...args: any[]) =>
      mockExtractEvidenceVideoFrames(...args),
    getEvidenceVideoFrameExtraction: (...args: any[]) =>
      mockGetEvidenceVideoFrameExtraction(...args),
    getEvidenceAssetsByIds: (...args: any[]) => mockGetEvidenceAssetsByIds(...args)
  };
});

describe("Harvest saved Deep review integrity", () => {
  const digest = (character: string) => character.repeat(64);
  const selectedEvidenceAssetIds = Array.from(
    { length: 13 },
    (_, index) => `saved-evidence-${index + 1}`
  );
  const deepAnalysis = {
    photoUsable: true,
    analysisId: "saved-deep-analysis-1",
    analysisMode: "deep",
    selectedEvidenceAssetIds,
    evidenceUsed: selectedEvidenceAssetIds,
    imagesAnalyzed: 13,
    batchCount: 2,
    batchSize: 12,
    aggregationVersion: "harvest-aggregate-v1",
    creditsQuoted: 2,
    aiCreditsUsed: 2,
    manifestDigest: digest("a"),
    selectedEvidenceDigest: digest("b"),
    analyzedEvidenceDigest: digest("c"),
    batchSummaries: [
      {
        batchIndex: 0,
        imageCount: 12,
        globalImageIndexes: Array.from({ length: 12 }, (_, index) => index + 1),
        inputDigest: digest("d"),
        resultDigest: digest("e")
      },
      {
        batchIndex: 1,
        imageCount: 1,
        globalImageIndexes: [13],
        inputDigest: digest("f"),
        resultDigest: digest("1")
      }
    ],
    analysisReceipt: {
      kind: "harvest_vision_aggregate",
      version: 2,
      signature: digest("3"),
      keyId: "aggregate-key-1",
      manifestDigest: digest("a"),
      selectedEvidenceDigest: digest("b"),
      analyzedEvidenceDigest: digest("c"),
      aiUsageEventId: "saved-deep-analysis-1",
      normalizedHarvestResultDigest: digest("2"),
      evidenceFingerprint: [...selectedEvidenceAssetIds].sort().join("|"),
      reviewPolicyVersion: "harvest-trichome-server-attestation-v4-batched-evidence"
    },
    aggregateReceipt: {
      kind: "harvest_vision_aggregate",
      version: 2,
      signature: digest("3"),
      keyId: "aggregate-key-1",
      manifestDigest: digest("a"),
      selectedEvidenceDigest: digest("b"),
      analyzedEvidenceDigest: digest("c")
    }
  };

  it("restores only when the aggregate receipt binds the exact top-level digests", () => {
    expect(
      savedHarvestAnalysis({
        outputs: { photoAnalysis: deepAnalysis }
      } as any)
    ).toEqual(expect.objectContaining({ analysisId: "saved-deep-analysis-1" }));

    expect(
      savedHarvestAnalysis({
        outputs: {
          photoAnalysis: {
            ...deepAnalysis,
            aggregateReceipt: {
              ...deepAnalysis.aggregateReceipt,
              selectedEvidenceDigest: digest("9")
            }
          }
        }
      } as any)
    ).toBeNull();
    expect(
      savedHarvestAnalysis({
        outputs: {
          photoAnalysis: { ...deepAnalysis, aggregateReceipt: undefined }
        }
      } as any)
    ).toBeNull();

    const selectedWithLeadingDuplicate = [
      "saved-byte-duplicate",
      ...selectedEvidenceAssetIds
    ];
    const gappedReplay = {
      ...deepAnalysis,
      selectedEvidenceAssetIds: selectedWithLeadingDuplicate,
      analysisReceipt: {
        ...deepAnalysis.analysisReceipt,
        evidenceFingerprint: [...selectedWithLeadingDuplicate].sort().join("|")
      },
      batchSummaries: [
        {
          ...deepAnalysis.batchSummaries[0],
          globalImageIndexes: Array.from({ length: 12 }, (_, index) => index + 2)
        },
        {
          ...deepAnalysis.batchSummaries[1],
          globalImageIndexes: [14]
        }
      ]
    };
    expect(
      savedHarvestAnalysis({ outputs: { photoAnalysis: gappedReplay } } as any)
    ).toEqual(expect.objectContaining({ analysisId: "saved-deep-analysis-1" }));
  });

  it("restores only a valid Deep operation id retained with the signed saved result", () => {
    expect(
      savedHarvestAnalysisOperationId({
        outputs: {
          photoAnalysis: {
            ...deepAnalysis,
            operationId: "operation-deep-saved-1"
          }
        }
      } as any)
    ).toBe("operation-deep-saved-1");
    expect(
      savedHarvestAnalysisOperationId({
        outputs: {
          photoAnalysis: { ...deepAnalysis, operationId: "bad/id" }
        }
      } as any)
    ).toBe("");
  });

  it("requires complete one-based aggregate batch coverage", () => {
    expect(
      harvestBatchSummariesCoverEvidence(
        deepAnalysis.batchSummaries,
        Array.from({ length: 13 }, (_, index) => index + 1),
        2
      )
    ).toBe(true);
    expect(
      harvestBatchSummariesCoverEvidence(
        [
          {
            ...deepAnalysis.batchSummaries[0],
            globalImageIndexes: Array.from({ length: 12 }, (_, index) => index)
          },
          deepAnalysis.batchSummaries[1]
        ],
        Array.from({ length: 13 }, (_, index) => index + 1),
        2
      )
    ).toBe(false);
  });

  it("accepts the exact gapped global indexes when duplicates occur before or inside the unique set", () => {
    const analyzedIds = Array.from({ length: 13 }, (_, index) => `unique-${index + 1}`);
    const duplicateFirstSelected = ["duplicate-copy", ...analyzedIds];
    const duplicateMiddleSelected = [
      ...analyzedIds.slice(0, 6),
      "duplicate-copy",
      ...analyzedIds.slice(6)
    ];
    const firstIndexes = harvestAnalyzedGlobalIndexes(
      duplicateFirstSelected,
      analyzedIds
    );
    const middleIndexes = harvestAnalyzedGlobalIndexes(
      duplicateMiddleSelected,
      analyzedIds
    );
    expect(firstIndexes).toEqual(Array.from({ length: 13 }, (_, index) => index + 2));
    expect(middleIndexes).toEqual([1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14]);

    const summaries = [
      {
        batchIndex: 0,
        imageCount: 12,
        globalImageIndexes: firstIndexes!.slice(0, 12),
        inputDigest: digest("4"),
        resultDigest: digest("5")
      },
      {
        batchIndex: 1,
        imageCount: 1,
        globalImageIndexes: firstIndexes!.slice(12),
        inputDigest: digest("6"),
        resultDigest: digest("7")
      }
    ];
    expect(harvestBatchSummariesCoverEvidence(summaries, firstIndexes!, 2)).toBe(true);
    expect(
      harvestBatchSummariesCoverEvidence(
        summaries,
        Array.from({ length: 13 }, (_, index) => index + 1),
        2
      )
    ).toBe(false);
  });
});

describe("Harvest server-video plan restoration", () => {
  it("never silently retries a failed Standard extraction with the Deep ceiling", () => {
    expect(
      harvestVideoReviewPlan({
        status: "failed",
        chosenCeiling: 12,
        requestedFrameCount: 80,
        targetFrameCount: 80
      })
    ).toEqual({
      selectedCeiling: 12,
      effectiveCeiling: 12,
      restoreLocked: false
    });
    expect(
      harvestVideoReviewPlan({
        status: "completed",
        chosenCeiling: 12,
        requestedFrameCount: 80,
        selectedCount: 48
      })
    ).toEqual({
      selectedCeiling: 80,
      effectiveCeiling: 80,
      restoreLocked: true
    });
  });
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockRouteParams,
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn()
  })
}));

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args),
  listGrows: (...args: any[]) => mockListFacilityGrows(...args)
}));

jest.mock("@/api/commercialWorkflows", () => ({
  fetchCommercialGrows: (...args: any[]) => mockFetchCommercialGrows(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/auth/AuthContext", () => {
  const actual = jest.requireActual("@/auth/AuthContext");
  return {
    ...actual,
    useOptionalAuth: () => ({ user: { id: "account-1" } })
  };
});

jest.mock("@/components/feed/FeedBanner", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "feed-banner" });
});

jest.mock("@/features/personal/tools/ToolPlantContextPicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ToolPlantContextPicker: () => React.createElement(View, { testID: "plant-picker" }),
    useToolPlantContext: () => ({
      plants: [],
      plantId: "",
      selectedPlant: null,
      setPlantId: jest.fn(),
      toolRunContext: { selectedPlantContext: null }
    })
  };
});

jest.mock("@/api/toolRuns", () => ({
  getToolRun: (...args: any[]) => mockGetToolRun(...args),
  runCalculator: (...args: any[]) => mockRunCalculator(...args)
}));

jest.mock("@/api/growpathModules", () => ({
  createGrowpathModuleRecord: (...args: any[]) => mockCreateGrowpathModuleRecord(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: jest.fn(),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

jest.mock("@/api/harvestBatches", () => ({
  getHarvestBatch: (...args: any[]) => mockGetHarvestBatch(...args),
  listHarvestBatches: (...args: any[]) => mockListHarvestBatches(...args),
  updateHarvestBatch: (...args: any[]) => mockUpdateHarvestBatch(...args)
}));

jest.mock("@/api/harvestVision", () => {
  const actual = jest.requireActual("@/api/harvestVision");
  return {
    ...actual,
    analyzeTrichomePhotos: (...args: any[]) => mockAnalyzeTrichomePhotos(...args),
    quoteDeepTrichomeReview: (...args: any[]) => mockQuoteDeepTrichomeReview(...args),
    startDeepTrichomeReview: (...args: any[]) => mockStartDeepTrichomeReview(...args),
    findDeepTrichomeReviewOperation: (...args: any[]) =>
      mockFindDeepTrichomeReviewOperation(...args),
    getDeepTrichomeReviewOperation: (...args: any[]) =>
      mockGetDeepTrichomeReviewOperation(...args),
    createHarvestFeedReviewDraft: (...args: any[]) =>
      mockCreateHarvestFeedReviewDraft(...args),
    deleteHarvestFeedReviewDraft: (...args: any[]) =>
      mockDeleteHarvestFeedReviewDraft(...args),
    getHarvestFeedReviewDraft: (...args: any[]) => mockGetHarvestFeedReviewDraft(...args),
    submitHarvestTrichomeFeedback: (...args: any[]) =>
      mockSubmitHarvestTrichomeFeedback(...args)
  };
});

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

async function renderHarvestReadinessTool(
  props: React.ComponentProps<typeof HarvestReadinessToolRoute> = {}
) {
  return renderAsync(<HarvestReadinessToolRoute {...props} />);
}

const feedDraftDigest = (character: string) => character.repeat(64);

function deepFeedReviewQuote() {
  return {
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
    manifestDigest: feedDraftDigest("a"),
    selectedEvidenceDigest: feedDraftDigest("b"),
    analyzedEvidenceDigest: feedDraftDigest("c"),
    expiresAt: "2099-08-23T18:00:00.000Z"
  };
}

function deepFeedReviewPacket(input: any, operationId = "operation-deep-feed-delete") {
  const selectedIds = input.evidenceAssetIds.map(String);
  const aggregateReceipt = {
    kind: "harvest_vision_aggregate",
    version: 2,
    signature: feedDraftDigest("3"),
    keyId: "aggregate-key-1",
    manifestDigest: feedDraftDigest("a"),
    selectedEvidenceDigest: feedDraftDigest("b"),
    analyzedEvidenceDigest: feedDraftDigest("c")
  };
  return {
    operation: {
      id: operationId,
      status: "succeeded",
      analysisMode: "deep",
      clientOperationKey: input.clientOperationKey,
      requestDigest: feedDraftDigest("d"),
      batchCount: 2,
      completedBatches: 2,
      creditsQuoted: 2,
      creditState: "charged"
    },
    result: {
      photoUsable: true,
      imageQuality: "usable",
      clear: 0.1,
      cloudy: 0.75,
      amber: 0.15,
      confidence: 0.82,
      dominant: "cloudy",
      visibleTraits: ["Resolved intact gland heads"],
      evidence: ["Thirteen authenticated stills"],
      recommendation: "Review the complete sampled-area evidence.",
      limitations: [],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imageDetail: "high",
      imagesAnalyzed: 13,
      evidenceUsed: selectedIds,
      selectedEvidenceAssetIds: selectedIds,
      analysisId: `usage-${operationId}`,
      analysisMode: "deep",
      batchCount: 2,
      batchSize: 12,
      aggregationVersion: "harvest-aggregate-v1",
      creditsQuoted: 2,
      aiCreditsUsed: 2,
      creditStatus: "charged",
      manifestDigest: feedDraftDigest("a"),
      selectedEvidenceDigest: feedDraftDigest("b"),
      analyzedEvidenceDigest: feedDraftDigest("c"),
      batchSummaries: [
        {
          batchIndex: 0,
          imageCount: 12,
          globalImageIndexes: Array.from({ length: 12 }, (_, index) => index + 1),
          inputDigest: feedDraftDigest("4"),
          resultDigest: feedDraftDigest("5")
        },
        {
          batchIndex: 1,
          imageCount: 1,
          globalImageIndexes: [13],
          inputDigest: feedDraftDigest("6"),
          resultDigest: feedDraftDigest("7")
        }
      ],
      inspectionViews: [
        {
          sourceEvidenceAssetId: selectedIds[12],
          sourceImageIndex: 13,
          kind: "macro coverage row 1 column 1",
          cropStrategy: "macro_coverage",
          derivationVersion: "retained-original-macro-jpeg-v1",
          sourceBounds: {
            left: 0,
            top: 0,
            width: 640,
            height: 640,
            sourceWidth: 1280,
            sourceHeight: 1280
          },
          width: 640,
          height: 640,
          mimeType: "image/jpeg",
          sha256: feedDraftDigest("8")
        }
      ],
      analysisReceipt: {
        ...aggregateReceipt,
        aiUsageEventId: `usage-${operationId}`,
        normalizedHarvestResultDigest: feedDraftDigest("2"),
        evidenceFingerprint: [...selectedIds].sort().join("|"),
        reviewPolicyVersion: "harvest-trichome-server-attestation-v4-batched-evidence"
      },
      aggregateReceipt
    }
  };
}

function privateFeedReviewDraft() {
  return {
    success: true,
    idempotentReplay: true,
    draft: {
      id: "64c000000000000000000001",
      status: "draft",
      type: "education",
      sourceType: "harvest_readiness",
      title: "Private Harvest Readiness review",
      body: "A bounded signed review of visible sampled areas.",
      tags: ["harvest-readiness"],
      contentLabels: ["cannabis", "education"],
      selectedViewCount: 1,
      selectionDigest: feedDraftDigest("9"),
      selectedViews: [
        {
          ...deepFeedReviewPacket({
            evidenceAssetIds: Array.from(
              { length: 13 },
              (_, index) => `64b0000000000000000000${index + 1}`
            ),
            clientOperationKey: "not-used"
          }).result.inspectionViews[0]
        }
      ]
    }
  };
}

async function renderCompletedDeepFeedReview() {
  mockQuoteDeepTrichomeReview.mockResolvedValueOnce(deepFeedReviewQuote());
  mockStartDeepTrichomeReview.mockImplementationOnce(async (input) =>
    deepFeedReviewPacket(input)
  );
  const screen = await renderHarvestReadinessTool();

  fireEvent.press(screen.getByLabelText("Add duplicate-heavy harvest photo set"));
  await waitFor(() =>
    expect(
      screen.getByLabelText("Get exact harvest review quote").props.accessibilityState
        .disabled
    ).toBe(false)
  );
  fireEvent.press(screen.getByLabelText("Get exact harvest review quote"));
  await screen.findByText(/Deep review: 2 signed batches · 2 AI credits/i);
  fireEvent(
    screen.getByLabelText(
      "Accept 2-credit Deep review and private OpenAI image dispatch"
    ),
    "valueChange",
    true
  );
  await waitFor(() =>
    expect(
      screen.getByLabelText("Analyze harvest trichome photo").props.accessibilityState
        .disabled
    ).toBe(false)
  );
  fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));
  await screen.findByText("GrowPath Feed review draft");
  return screen;
}

async function renderRestoredPrivateFeedDraft() {
  mockGetHarvestFeedReviewDraft.mockResolvedValueOnce(privateFeedReviewDraft());
  const screen = await renderCompletedDeepFeedReview();
  await screen.findByLabelText("Private Harvest Feed draft preview");
  return screen;
}

describe("HarvestReadinessToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRouteParams = { growId: "grow-1" };
    mockEntitlements = {
      plan: "pro",
      mode: "personal",
      facilityId: null,
      can: () => true
    };
    mockListPersonalGrows.mockImplementation(() => new Promise(() => {}));
    mockListFacilityGrows.mockResolvedValue([]);
    mockFetchCommercialGrows.mockResolvedValue([]);
    mockListEvidenceAssets.mockResolvedValue([]);
    mockFindDeepTrichomeReviewOperation.mockResolvedValue(null);
    mockGetHarvestFeedReviewDraft.mockRejectedValue(
      Object.assign(new Error("not found"), { status: 404 })
    );
    mockGetToolRun.mockResolvedValue(null);
    mockListHarvestBatches.mockResolvedValue([]);
    mockAskPersonalAssistant.mockRejectedValue(new Error("assistant unavailable"));
    mockRunCalculator.mockResolvedValue({
      outputs: {
        readinessStatus: "approaching_window",
        estimatedWindow: {
          startDay: 60,
          targetDay: 63,
          endDay: 66
        },
        harvestWindowReview: {
          range: {
            kind: "breeder_timing_planning_range",
            startDay: 60,
            targetDay: 63,
            endDay: 66,
            confidence: "low"
          },
          reasonsWindowMayBeOpen: [
            "The user-supplied approximate harvest date has been reached.",
            "Aroma is reported as dropping."
          ],
          reasonsToWait: ["Bud/calyx swelling is reported as unfinished."],
          missingEvidence: ["Representative trichome observations"],
          boundary:
            "This is a timing-context planning range, not a trichome-derived harvest date."
        },
        wholePlantMaturity: {
          pistilStatus: "mixed",
          budSwellStatus: "mostly_swollen"
        },
        trichomeObservation: {
          clearPercent: 10,
          cloudyPercent: 75,
          amberPercent: 15,
          evidenceStatus: "entered"
        },
        harvestTask: {
          title: "Recheck harvest window",
          priority: "medium",
          dueInDays: 3
        },
        warnings: ["Lower buds may need more time."]
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
    mockGetHarvestBatch.mockResolvedValue({
      id: "harvest-1",
      growId: "grow-1",
      name: "Harvest A",
      dryCureRecords: [
        {
          stage: "drying",
          qualityNotes: "Initial hang check.",
          linkedToolRunId: "toolrun-old"
        }
      ],
      linkedToolRunIds: ["toolrun-old"]
    });
    mockUpdateHarvestBatch.mockResolvedValue({ id: "harvest-1" });
    mockSubmitHarvestTrichomeFeedback.mockResolvedValue({
      success: true,
      feedbackId: "feedback-1",
      queueStatus: "queued",
      received: {}
    });
    mockAnalyzeTrichomePhotos.mockResolvedValue({
      photoUsable: true,
      imageQuality: "usable",
      clear: 0.12,
      cloudy: 0.73,
      amber: 0.15,
      confidence: 0.81,
      dominant: "cloudy",
      cloudinessObservation: "likely_cloudy_persistent",
      cloudinessConfidence: 0.61,
      cloudinessBasis:
        "The same region stayed diffusely white while the highlight moved.",
      visibleTraits: ["Intact opaque gland heads"],
      evidence: ["Mostly opaque gland heads"],
      recommendation: "Confirm across additional bud sites.",
      limitations: [],
      qualityChecks: {
        focus: "usable",
        glare: "localized",
        lighting: "neutral",
        headVisibility: "sufficient",
        roleCoverage: "complete"
      },
      imageFindings: [
        {
          imageIndex: 1,
          role: "top_macro",
          usableForDistribution: true,
          trichomeRichRegion: "center calyx",
          excludedReason: "",
          focus: "sharp",
          glare: "localized",
          visibleHeadDetail: "sufficient"
        }
      ],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imageDetail: "high",
      imagesAnalyzed: 4,
      evidenceUsed: [
        "64b000000000000000000001",
        "64b000000000000000000002",
        "64b000000000000000000003",
        "64b000000000000000000004"
      ],
      analysisId: "usage-harvest-1",
      analysisReceipt: {
        aiUsageEventId: "usage-harvest-1",
        normalizedHarvestResultDigest: "a".repeat(64),
        evidenceFingerprint: [
          "64b000000000000000000001",
          "64b000000000000000000002",
          "64b000000000000000000003",
          "64b000000000000000000004"
        ].join("|"),
        reviewPolicyVersion: "harvest-trichome-server-attestation-v2-full-grid"
      },
      aiCreditsUsed: 1,
      aiTokensRemaining: 58,
      creditStatus: "charged"
    });
  });

  it("saves a structured owner correction without rerunning or spending an AI credit", async () => {
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() => expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByLabelText("Amber looks higher"));
    fireEvent.changeText(
      screen.getByLabelText("Your visible-area amber estimate percent"),
      "30"
    );
    fireEvent.changeText(
      screen.getByLabelText("Why the Harvest estimate needs correction"),
      "Resolved amber heads remain brown while the reflection changes."
    );
    fireEvent(
      screen.getByLabelText("Allow correction to improve model calibration"),
      "valueChange",
      true
    );
    fireEvent(
      screen.getByLabelText("Confirm rights for Harvest calibration photos"),
      "valueChange",
      true
    );
    await fireEventAsync.press(screen.getByLabelText("Save Harvest estimate correction"));

    await waitFor(() =>
      expect(mockSubmitHarvestTrichomeFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: "usage-harvest-1",
          estimateAlignment: "amber_higher",
          ownerVisibleAmberPercent: 30,
          consentForModelTraining: true,
          basis: "Resolved amber heads remain brown while the reflection changes.",
          calibrationAuthorization: {
            version: "harvest-trichome-calibration-consent-v1",
            rightsConfirmed: true,
            scope: "internal_ai_evaluation_and_calibration",
            publicUseAuthorized: false
          }
        })
      )
    );
    expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        "Correction saved with permission to use it for model calibration. No AI credit was used."
      )
    ).toBeTruthy();
  });

  it("requires image rights confirmation before calibration use", async () => {
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() => expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Estimate looks close"));
    fireEvent(
      screen.getByLabelText("Allow correction to improve model calibration"),
      "valueChange",
      true
    );
    await fireEventAsync.press(screen.getByLabelText("Save Harvest estimate correction"));

    expect(mockSubmitHarvestTrichomeFeedback).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Confirm that you own these photos or have permission before authorizing calibration use."
      )
    ).toBeTruthy();
  });

  it("shows an optional calendar date and explains both sides of the harvest range", async () => {
    const screen = await renderHarvestReadinessTool();

    expect(
      screen.getByLabelText(
        "Harvest Readiness Estimate Your approximate harvest date (optional)"
      )
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));

    expect(
      await screen.findByText(
        /Reason the window may be open: The user-supplied approximate harvest date has been reached/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/Reason to wait: Bud\/calyx swelling is reported as unfinished/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Still needed: Representative trichome observations/i)
    ).toBeTruthy();
  });

  it("never accepts trichome percentages from generic grow-context AI prefill", async () => {
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        flowerDay: "58",
        cloudyPercent: "80",
        amberPercent: "10",
        clearPercent: "10",
        pistilStatus: "mostly receded"
      })
    });
    const screen = await renderHarvestReadinessTool();

    await fireEventAsync.press(screen.getByText("Fill readiness review from grow"));

    await waitFor(() =>
      expect(
        screen.getByLabelText("Harvest Readiness Estimate Flower day").props.value
      ).toBe("58")
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Cloudy %").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Amber %").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Clear %").props.value).toBe(
      ""
    );

    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          cloudyPercent: "",
          amberPercent: "",
          clearPercent: "",
          trichomeSource: "manual_entry"
        })
      )
    );
  });

  it("lets a personal user analyze standalone or optionally attach a grow", async () => {
    mockRouteParams = {};
    mockListPersonalGrows.mockResolvedValue([
      { id: "grow-1", name: "Flower Tent" },
      { id: "grow-2", name: "Second Run" }
    ]);
    const screen = await renderHarvestReadinessTool();

    await waitFor(() => expect(screen.getByText("Flower Tent")).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use Harvest Readiness Estimate without a grow")
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Standalone review: upload the required photos now/i)
      ).toBeTruthy()
    );
    expect(screen.queryByText("Select a grow before analyzing a photo.")).toBeNull();

    fireEvent.press(screen.getByLabelText("Select grow Flower Tent"));
    await waitFor(() =>
      expect(
        screen.queryByText(/Standalone review: upload the required photos now/i)
      ).toBeNull()
    );
  });

  it("shows actionable photo requirements before the user chooses media", async () => {
    const screen = await renderHarvestReadinessTool();

    expect(screen.getByText("Harvest Readiness Estimate").props).toMatchObject({
      accessibilityRole: "header",
      "aria-level": 2
    });
    expect(
      screen.getByText("AI trichome evidence review (one readiness input)").props
    ).toMatchObject({
      accessibilityRole: "header",
      "aria-level": 2
    });
    expect(screen.getByText("Photo checklist before analysis").props).toMatchObject({
      accessibilityRole: "header",
      "aria-level": 3
    });
    expect(screen.getByText(/at least 3 sharp macro photos/i)).toBeTruthy();
    expect(screen.getByText(/trichome gland heads on bud calyxes/i)).toBeTruthy();
    expect(screen.getByText(/neutral white light/i)).toBeTruthy();
    expect(
      screen.getByText(/Image count is not coverage.*cannot replace three true macros/i)
    ).toBeTruthy();
    expect(screen.getByText(/No trichome evidence is ready/i)).toBeTruthy();
    expect(mockSavedGrowPhotoEvidencePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        purpose: "harvest",
        maxPhotos: 80,
        maxUserPhotos: 12
      })
    );
    expect(mockMediaEvidencePickerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        purpose: "harvest",
        videoWorkspaceType: "personal",
        videoWorkspaceId: undefined
      })
    );
  });

  it("accepts an authorized Commercial route grow, lets Facility select a grow, and scopes both analyses", async () => {
    mockRouteParams = {
      commercialAccountId: "commercial-1",
      growId: "commercial-grow-1"
    };
    mockEntitlements = {
      plan: "commercial",
      mode: "commercial",
      facilityId: null,
      can: () => true
    };
    mockFetchCommercialGrows.mockResolvedValue([
      { id: "commercial-grow-1", name: "Commercial Trial" },
      { id: "commercial-grow-2", name: "Commercial Control" }
    ]);
    const commercial = await renderHarvestReadinessTool({
      backFallbackHref: "/home/commercial/tools",
      workspaceType: "commercial"
    });
    await waitFor(() =>
      expect(commercial.getByLabelText("Select grow Commercial Trial")).toBeTruthy()
    );
    expect(commercial.getByText("Grow context: commercial-grow-1")).toBeTruthy();
    expect(commercial.queryByLabelText("Saved grow photo evidence")).toBeNull();
    await waitFor(() =>
      expect(mockListEvidenceAssets).toHaveBeenCalledWith({
        growId: "commercial-grow-1",
        workspaceType: "commercial"
      })
    );
    await waitFor(() =>
      expect(commercial.queryByText("Restoring saved harvest evidence...")).toBeNull()
    );
    fireEvent.press(commercial.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(
      commercial.getByLabelText("Analyze harvest trichome photo")
    );
    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "commercial-grow-1",
          workspaceType: "commercial",
          workspaceId: undefined,
          facilityId: undefined,
          evidenceAssetIds: [
            "64b000000000000000000001",
            "64b000000000000000000002",
            "64b000000000000000000003",
            "64b000000000000000000004"
          ]
        })
      )
    );
    expect(mockMediaEvidencePickerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        purpose: "harvest",
        videoWorkspaceType: "commercial",
        videoWorkspaceId: undefined
      })
    );
    fireEvent.press(commercial.getByLabelText("Run Harvest Readiness Estimate"));
    await waitFor(() =>
      expect(commercial.getByText("Harvest Readiness Estimate result")).toBeTruthy()
    );
    expect(commercial.queryByText("Create Harvest Follow-up Tasks")).toBeNull();
    expect(commercial.queryByText("Save Harvest Review")).toBeNull();
    expect(mockGetHarvestBatch).not.toHaveBeenCalled();
    await commercial.unmountAsync();

    mockAnalyzeTrichomePhotos.mockClear();
    mockRouteParams = {};
    mockEntitlements = {
      plan: "facility",
      mode: "facility",
      facilityId: "facility-1",
      can: () => true
    };
    mockListFacilityGrows.mockResolvedValue([
      { id: "facility-grow-1", name: "Flower Room A" },
      { id: "facility-grow-2", name: "Flower Room B" }
    ]);
    const facility = await renderHarvestReadinessTool({
      backFallbackHref: "/home/facility/ai-tools",
      workspaceType: "facility",
      workspaceId: "facility-1"
    });
    await waitFor(() =>
      expect(facility.getByLabelText("Select grow Flower Room A")).toBeTruthy()
    );
    fireEvent.press(facility.getByLabelText("Select grow Flower Room A"));
    expect(facility.queryByLabelText("Saved grow photo evidence")).toBeNull();
    await waitFor(() =>
      expect(mockListEvidenceAssets).toHaveBeenCalledWith({
        growId: "facility-grow-1",
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      })
    );
    await waitFor(() =>
      expect(facility.queryByText("Restoring saved harvest evidence...")).toBeNull()
    );
    fireEvent.press(facility.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(facility.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "facility-grow-1",
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1",
          evidenceAssetIds: [
            "64b000000000000000000001",
            "64b000000000000000000002",
            "64b000000000000000000003",
            "64b000000000000000000004"
          ]
        })
      )
    );
    expect(mockListFacilityGrows).toHaveBeenCalledWith("facility-1");
    expect(mockMediaEvidencePickerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        purpose: "harvest",
        sourceContext: expect.objectContaining({ facilityId: "facility-1" }),
        videoWorkspaceType: "facility",
        videoWorkspaceId: "facility-1"
      })
    );
    await facility.unmountAsync();
  });

  it("keeps a sole Facility grow optional and allows a standalone Facility review", async () => {
    mockRouteParams = {};
    mockEntitlements = {
      plan: "facility",
      mode: "facility",
      facilityId: "facility-1",
      can: () => true
    };
    mockListFacilityGrows.mockResolvedValue([
      { _id: "facility-grow-only", name: "Only Flower Room" }
    ]);

    const screen = await renderHarvestReadinessTool({
      workspaceType: "facility",
      workspaceId: "facility-1"
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Select grow Only Flower Room")).toBeTruthy()
    );
    expect(
      screen.getByText(/Standalone review: upload the required photos now/i)
    ).toBeTruthy();
    expect(screen.queryByText("Grow context: facility-grow-only")).toBeNull();

    fireEvent(
      screen.getByLabelText(
        "Confirm this standalone evidence is cannabis or hemp flower"
      ),
      "valueChange",
      true
    );
    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: undefined,
          cropContext: "cannabis",
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        })
      )
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          growId: undefined,
          cropContext: "cannabis",
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        })
      )
    );
    expect(screen.queryByText("Create Harvest Follow-up Tasks")).toBeNull();
    expect(screen.queryByText("Save Harvest Review")).toBeNull();
  });

  it("restores durable harvest evidence after a page or account-session reload", async () => {
    mockListEvidenceAssets.mockResolvedValue(
      [1, 2, 3, 4].map((index) => ({
        id: `restored-${index}`,
        _id: `64c00000000000000000000${index}`,
        growId: "grow-1",
        assetType: "photo",
        originalUri: `/uploads/restored-${index}.jpg`,
        durableUrl: `/uploads/restored-${index}.jpg`,
        mimeType: "image/jpeg",
        source: "library",
        purpose: "harvest",
        uploadStatus: "uploaded",
        aiUsable: true,
        qualityWarnings: []
      }))
    );
    const screen = await renderHarvestReadinessTool();

    await waitFor(() =>
      expect(
        screen.getByText("Restored 4 saved harvest photos for this grow.")
      ).toBeTruthy()
    );
    expect(mockListEvidenceAssets).toHaveBeenCalledWith({ growId: "grow-1" });

    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          evidenceAssetIds: [
            "64c000000000000000000001",
            "64c000000000000000000002",
            "64c000000000000000000003",
            "64c000000000000000000004"
          ]
        })
      )
    );
  });

  it("restores only the exact evidence retained by a saved Harvest run", async () => {
    mockRouteParams = { growId: "grow-1", retryToolRunId: "harvest-run-1" };
    const retainedIds = [1, 2, 3, 4].map((index) => `64c00000000000000000000${index}`);
    mockGetToolRun.mockResolvedValue({
      id: "harvest-run-1",
      toolType: "harvest_readiness",
      growId: "grow-1",
      inputs: { evidenceAssetIds: retainedIds },
      outputs: {
        photoAnalysis: {
          performed: true,
          photoUsable: true,
          imageQuality: "usable",
          clear: 0.17,
          cloudy: 0.52,
          amber: 0.01,
          sampleAmberMin: 0.01,
          sampleAmberMax: 0.23,
          confidence: 0.62,
          dominant: "cloudy",
          visibleTraits: ["Resolved trichome heads"],
          evidence: ["Full-area grid review"],
          recommendation: "Review the sampled-area range.",
          limitations: ["Warm light overlaps possible amber."],
          provider: "openai",
          providerLabel: "OpenAI trichome image review",
          providerModel: "gpt-4o-mini",
          imagesAnalyzed: 4,
          evidenceUsed: retainedIds,
          analysisId: "64d000000000000000000001",
          aiUsageEventId: "64d000000000000000000001",
          normalizedHarvestResultDigest: "b".repeat(64),
          evidenceFingerprint: retainedIds.join("|"),
          reviewPolicyVersion: "harvest-trichome-server-attestation-v1",
          aiCreditsUsed: 1,
          aiTokensRemaining: 90,
          creditStatus: "charged"
        }
      }
    });
    mockListEvidenceAssets.mockResolvedValue([
      ...retainedIds.map((id, index) => ({
        id,
        _id: id,
        growId: "grow-1",
        assetType: "photo",
        originalUri: `/uploads/retained-${index + 1}.jpg`,
        durableUrl: `/uploads/retained-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        source: "library",
        purpose: "harvest",
        uploadStatus: "uploaded",
        aiUsable: true,
        qualityWarnings: []
      })),
      {
        id: "unrelated-harvest-photo",
        _id: "unrelated-harvest-photo",
        growId: "grow-1",
        assetType: "photo",
        originalUri: "/uploads/unrelated.jpg",
        durableUrl: "/uploads/unrelated.jpg",
        mimeType: "image/jpeg",
        source: "library",
        purpose: "harvest",
        uploadStatus: "uploaded",
        aiUsable: true,
        qualityWarnings: []
      }
    ]);

    const screen = await renderHarvestReadinessTool();

    await waitFor(() =>
      expect(
        screen.getByText(
          "Restored 4 exact harvest photos for this grow. Restored the signed photo analysis for zero-credit review."
        )
      ).toBeTruthy()
    );
    expect(mockGetToolRun).toHaveBeenCalledWith("harvest-run-1");
    expect(screen.getByText("Help correct this estimate")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Amber looks higher"));
    fireEvent.changeText(
      screen.getByLabelText("Your visible-area amber estimate percent"),
      "30"
    );
    await fireEventAsync.press(screen.getByLabelText("Save Harvest estimate correction"));
    await waitFor(() =>
      expect(mockSubmitHarvestTrichomeFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: "64d000000000000000000001",
          estimateAlignment: "amber_higher",
          ownerVisibleAmberPercent: 30
        })
      )
    );
    expect(mockAnalyzeTrichomePhotos).not.toHaveBeenCalled();
  });

  it("recovers a saved Deep operation and private draft without local mapping or a new dispatch", async () => {
    mockRouteParams = { growId: "grow-1", retryToolRunId: "harvest-deep-run-1" };
    const retainedIds = Array.from(
      { length: 13 },
      (_, index) => `64b0000000000000000000${index + 1}`
    );
    const packet = deepFeedReviewPacket(
      { evidenceAssetIds: retainedIds, clientOperationKey: "saved-run-client-key" },
      "operation-deep-saved-run"
    );
    mockGetToolRun.mockResolvedValue({
      id: "harvest-deep-run-1",
      toolType: "harvest_readiness",
      growId: "grow-1",
      inputs: { evidenceAssetIds: retainedIds },
      outputs: {
        photoAnalysis: {
          ...packet.result,
          operationId: "operation-deep-saved-run"
        }
      }
    });
    mockListEvidenceAssets.mockResolvedValue(
      retainedIds.map((id, index) => ({
        id,
        _id: id,
        growId: "grow-1",
        assetType: "photo",
        originalUri: `/uploads/deep-retained-${index + 1}.jpg`,
        durableUrl: `/uploads/deep-retained-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        source: "library",
        purpose: "harvest",
        uploadStatus: "uploaded",
        aiUsable: true,
        qualityWarnings: []
      }))
    );
    mockGetDeepTrichomeReviewOperation.mockResolvedValueOnce(packet);
    mockGetHarvestFeedReviewDraft.mockResolvedValueOnce(privateFeedReviewDraft());

    const screen = await renderHarvestReadinessTool();

    expect(
      await screen.findByLabelText("Private Harvest Feed draft preview")
    ).toBeTruthy();
    expect(mockGetDeepTrichomeReviewOperation).toHaveBeenCalledWith(
      "operation-deep-saved-run",
      { workspaceType: "personal" },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(screen.getByText("Private Harvest Readiness review")).toBeTruthy();
    expect(mockStartDeepTrichomeReview).not.toHaveBeenCalled();
    expect(mockAnalyzeTrichomePhotos).not.toHaveBeenCalled();
  });

  it("preserves a fresh analysis after restoring a saved Harvest run", async () => {
    mockRouteParams = { growId: "grow-1", retryToolRunId: "harvest-run-1" };
    const retainedIds = [1, 2, 3, 4].map((index) => `64c00000000000000000000${index}`);
    mockGetToolRun.mockResolvedValue({
      id: "harvest-run-1",
      toolType: "harvest_readiness",
      growId: "grow-1",
      inputs: { evidenceAssetIds: retainedIds },
      outputs: {
        photoAnalysis: {
          performed: true,
          photoUsable: true,
          imageQuality: "usable",
          clear: 0.17,
          cloudy: 0.52,
          amber: 0.01,
          confidence: 0.62,
          dominant: "cloudy",
          visibleTraits: ["Resolved trichome heads"],
          evidence: ["Full-area grid review"],
          recommendation: "Review the sampled-area range.",
          limitations: ["Warm light overlaps possible amber."],
          provider: "openai",
          providerLabel: "OpenAI trichome image review",
          providerModel: "gpt-4o-mini",
          imagesAnalyzed: 4,
          evidenceUsed: retainedIds,
          analysisId: "saved-analysis-1",
          aiUsageEventId: "saved-analysis-1",
          normalizedHarvestResultDigest: "b".repeat(64),
          evidenceFingerprint: retainedIds.join("|"),
          reviewPolicyVersion: "harvest-trichome-server-attestation-v1",
          aiCreditsUsed: 1,
          aiTokensRemaining: 90,
          creditStatus: "charged"
        }
      }
    });
    mockListEvidenceAssets.mockResolvedValue(
      retainedIds.map((id, index) => ({
        id,
        _id: id,
        growId: "grow-1",
        assetType: "photo",
        originalUri: `/uploads/retained-${index + 1}.jpg`,
        durableUrl: `/uploads/retained-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        source: "library",
        purpose: "harvest",
        uploadStatus: "uploaded",
        aiUsable: true,
        qualityWarnings: []
      }))
    );
    mockAnalyzeTrichomePhotos.mockResolvedValueOnce({
      photoUsable: true,
      imageQuality: "usable",
      clear: 0.08,
      cloudy: 0.69,
      amber: 0.23,
      confidence: 0.78,
      dominant: "cloudy",
      visibleTraits: ["Persistent cloudy heads", "Visible amber heads"],
      evidence: ["Four retained photos"],
      recommendation: "Review the updated visible-area estimate.",
      limitations: [],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imagesAnalyzed: 4,
      evidenceUsed: retainedIds,
      analysisId: "fresh-analysis-2",
      analysisReceipt: {
        aiUsageEventId: "fresh-analysis-2",
        normalizedHarvestResultDigest: "c".repeat(64),
        evidenceFingerprint: retainedIds.join("|"),
        reviewPolicyVersion: "harvest-trichome-server-attestation-v2-full-grid"
      },
      aiCreditsUsed: 1,
      aiTokensRemaining: 89,
      creditStatus: "charged"
    });

    const screen = await renderHarvestReadinessTool();

    await waitFor(() =>
      expect(
        screen.getByText("AI estimate: 52% cloudy, 1% amber, 17% clear.")
      ).toBeTruthy()
    );
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(
        screen.getByText("AI estimate: 69% cloudy, 23% amber, 8% clear.")
      ).toBeTruthy()
    );
    expect(
      screen.queryByText("AI estimate: 52% cloudy, 1% amber, 17% clear.")
    ).toBeNull();
    expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledTimes(1);
  });

  it("blocks an incomplete photo set without spending a credit", async () => {
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add one harvest evidence photo"));

    expect(screen.getByText(/Add 3 more photos/i)).toBeTruthy();
    expect(screen.getByText(/no AI credit will be used yet/i)).toBeTruthy();
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    expect(mockAnalyzeTrichomePhotos).not.toHaveBeenCalled();
  });

  it("keeps a >12 selected exact manifest on the standard path when server dedupe finds 12 unique images", async () => {
    const selectedIds = Array.from(
      { length: 13 },
      (_, index) => `64b00000000000000000000${index + 1}`
    );
    const analyzedIds = selectedIds.slice(0, 12);
    mockQuoteDeepTrichomeReview.mockResolvedValue({
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
      manifestDigest: "a".repeat(64),
      selectedEvidenceDigest: "b".repeat(64),
      analyzedEvidenceDigest: "c".repeat(64),
      expiresAt: null
    });
    mockAnalyzeTrichomePhotos.mockResolvedValueOnce({
      photoUsable: true,
      imageQuality: "usable",
      clear: 0.12,
      cloudy: 0.73,
      amber: 0.15,
      confidence: 0.81,
      dominant: "cloudy",
      visibleTraits: ["Intact opaque gland heads"],
      evidence: ["Mostly opaque gland heads"],
      recommendation: "Confirm across additional bud sites.",
      limitations: [],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      analysisMode: "standard",
      selectedEvidenceAssetIds: selectedIds,
      imagesAnalyzed: 12,
      evidenceUsed: analyzedIds,
      analysisId: "usage-standard-dedupe-1",
      analysisReceipt: {
        aiUsageEventId: "usage-standard-dedupe-1",
        normalizedHarvestResultDigest: "d".repeat(64),
        evidenceFingerprint: [...selectedIds].sort().join("|"),
        reviewPolicyVersion: "harvest-trichome-server-attestation-v3-head-development"
      },
      aiCreditsUsed: 1,
      creditStatus: "charged"
    });
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add duplicate-heavy harvest photo set"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Get exact harvest review quote").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Get exact harvest review quote"));
    expect(
      await screen.findByText(/Standard review: 1 signed batch · 1 AI credit/i)
    ).toBeTruthy();
    expect(screen.queryByText(/Quote expires/i)).toBeNull();
    expect(screen.queryByText(/1970/i)).toBeNull();

    fireEvent.changeText(
      screen.getByLabelText("Harvest photo notes"),
      "Changed private provider context"
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Get exact harvest review quote").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    expect(screen.getByText(/Exact Quote Required/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Get exact harvest review quote"));
    expect(
      await screen.findByText(/Standard review: 1 signed batch · 1 AI credit/i)
    ).toBeTruthy();

    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceAssetIds: selectedIds,
          notes: "Changed private provider context"
        })
      )
    );
    expect(mockStartDeepTrichomeReview).not.toHaveBeenCalled();
    expect(await screen.findByText("Qualified macro evidence")).toBeTruthy();
  });

  it("allows a credited Personal/free account to use Deep review only after explicit acceptance", async () => {
    mockEntitlements = {
      plan: "free",
      mode: "personal",
      facilityId: null,
      can: () => true
    };
    mockQuoteDeepTrichomeReview.mockResolvedValueOnce({
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
      manifestDigest: "a".repeat(64),
      selectedEvidenceDigest: "b".repeat(64),
      analyzedEvidenceDigest: "c".repeat(64),
      expiresAt: "2099-08-23T18:00:00.000Z"
    });
    mockStartDeepTrichomeReview.mockImplementationOnce(async (input) => ({
      operation: {
        id: "operation-deep-screen-1",
        status: "queued",
        analysisMode: "deep",
        clientOperationKey: input.clientOperationKey,
        requestDigest: "d".repeat(64),
        batchCount: 2,
        completedBatches: 0,
        creditsQuoted: 2
      }
    }));
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add duplicate-heavy harvest photo set"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Get exact harvest review quote").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Get exact harvest review quote"));
    expect(
      await screen.findByText(/Deep review: 2 signed batches · 2 AI credits/i)
    ).toBeTruthy();
    expect(
      screen.getByText(
        /send the 13 unique still images from this exact selected set privately to OpenAI/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/GPS\/EXIF location or capture-date metadata.*not sent/i)
    ).toBeTruthy();
    expect(mockStartDeepTrichomeReview).not.toHaveBeenCalled();

    fireEvent(
      screen.getByLabelText(
        "Accept 2-credit Deep review and private OpenAI image dispatch"
      ),
      "valueChange",
      true
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Analyze harvest trichome photo").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() => expect(mockStartDeepTrichomeReview).toHaveBeenCalledTimes(1));
    expect(mockAnalyzeTrichomePhotos).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Deep review is queued.*0 of 2 provider batches/i)
    ).toBeTruthy();
  });

  it("aborts and ignores a private Feed draft response after the bound review changes", async () => {
    const digest = (character: string) => character.repeat(64);
    mockQuoteDeepTrichomeReview.mockResolvedValueOnce({
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
      expiresAt: "2099-08-23T18:00:00.000Z"
    });
    mockStartDeepTrichomeReview.mockImplementationOnce(async (input) => {
      const selectedIds = input.evidenceAssetIds.map(String);
      const aggregateReceipt = {
        kind: "harvest_vision_aggregate",
        version: 2,
        signature: digest("3"),
        keyId: "aggregate-key-1",
        manifestDigest: digest("a"),
        selectedEvidenceDigest: digest("b"),
        analyzedEvidenceDigest: digest("c")
      };
      return {
        operation: {
          id: "operation-deep-feed-a",
          status: "succeeded",
          analysisMode: "deep",
          clientOperationKey: input.clientOperationKey,
          requestDigest: digest("d"),
          batchCount: 2,
          completedBatches: 2,
          creditsQuoted: 2,
          creditState: "charged"
        },
        result: {
          photoUsable: true,
          imageQuality: "usable",
          clear: 0.1,
          cloudy: 0.75,
          amber: 0.15,
          confidence: 0.82,
          dominant: "cloudy",
          visibleTraits: ["Resolved intact gland heads"],
          evidence: ["Thirteen authenticated stills"],
          recommendation: "Review the complete sampled-area evidence.",
          limitations: [],
          provider: "openai",
          providerLabel: "OpenAI trichome image review",
          providerModel: "gpt-4o-mini",
          imageDetail: "high",
          imagesAnalyzed: 13,
          evidenceUsed: selectedIds,
          selectedEvidenceAssetIds: selectedIds,
          analysisId: "usage-deep-feed-a",
          analysisMode: "deep",
          batchCount: 2,
          batchSize: 12,
          aggregationVersion: "harvest-aggregate-v1",
          creditsQuoted: 2,
          aiCreditsUsed: 2,
          creditStatus: "charged",
          manifestDigest: digest("a"),
          selectedEvidenceDigest: digest("b"),
          analyzedEvidenceDigest: digest("c"),
          batchSummaries: [
            {
              batchIndex: 0,
              imageCount: 12,
              globalImageIndexes: Array.from({ length: 12 }, (_, index) => index + 1),
              inputDigest: digest("4"),
              resultDigest: digest("5")
            },
            {
              batchIndex: 1,
              imageCount: 1,
              globalImageIndexes: [13],
              inputDigest: digest("6"),
              resultDigest: digest("7")
            }
          ],
          inspectionViews: [
            {
              sourceEvidenceAssetId: selectedIds[12],
              sourceImageIndex: 13,
              kind: "macro coverage row 1 column 1",
              cropStrategy: "macro_coverage",
              derivationVersion: "retained-original-macro-jpeg-v1",
              sourceBounds: {
                left: 0,
                top: 0,
                width: 640,
                height: 640,
                sourceWidth: 1280,
                sourceHeight: 1280
              },
              width: 640,
              height: 640,
              mimeType: "image/jpeg",
              sha256: digest("8")
            }
          ],
          analysisReceipt: {
            ...aggregateReceipt,
            aiUsageEventId: "usage-deep-feed-a",
            normalizedHarvestResultDigest: digest("2"),
            evidenceFingerprint: [...selectedIds].sort().join("|"),
            reviewPolicyVersion: "harvest-trichome-server-attestation-v4-batched-evidence"
          },
          aggregateReceipt
        }
      };
    });
    let resolveDraft: ((value: any) => void) | undefined;
    const delayedDraft = new Promise((resolve) => {
      resolveDraft = resolve;
    });
    mockCreateHarvestFeedReviewDraft.mockReturnValueOnce(delayedDraft);
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add duplicate-heavy harvest photo set"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Get exact harvest review quote").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Get exact harvest review quote"));
    await screen.findByText(/Deep review: 2 signed batches · 2 AI credits/i);
    fireEvent(
      screen.getByLabelText(
        "Accept 2-credit Deep review and private OpenAI image dispatch"
      ),
      "valueChange",
      true
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Analyze harvest trichome photo").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await screen.findByText("GrowPath Feed review draft");
    fireEvent.press(
      screen.getByLabelText(
        "Add macro coverage row 1 column 1 from source photo 13 to the private Feed review draft"
      )
    );
    fireEvent.press(screen.getByLabelText("Create private GrowPath Feed review draft"));
    await waitFor(() =>
      expect(mockCreateHarvestFeedReviewDraft).toHaveBeenCalledTimes(1)
    );
    expect(screen.getByLabelText("Prepare a new harvest review quote")).toBeDisabled();
    const signal = mockCreateHarvestFeedReviewDraft.mock.calls[0][3].signal;

    fireEvent.changeText(
      screen.getByLabelText("Harvest photo notes"),
      "Changed after the private draft request began"
    );
    await waitFor(() => expect(signal.aborted).toBe(true));
    await act(async () => {
      resolveDraft?.({
        idempotentReplay: false,
        draft: {
          id: "stale-draft-a",
          title: "Stale review A must not render",
          body: "Old result",
          selectedViewCount: 1,
          selectedViews: []
        }
      });
      await delayedDraft;
    });

    expect(screen.queryByText("Stale review A must not render")).toBeNull();
    expect(screen.queryByLabelText("Private Harvest Feed draft preview")).toBeNull();
  });

  it("keeps Prepare New unavailable until the private Feed draft lookup settles", async () => {
    let rejectLookup: ((reason: any) => void) | undefined;
    const delayedLookup = new Promise((_resolve, reject) => {
      rejectLookup = reject;
    });
    mockGetHarvestFeedReviewDraft.mockReturnValueOnce(delayedLookup);
    const screen = await renderCompletedDeepFeedReview();

    expect(screen.getByLabelText("Prepare a new harvest review quote")).toBeDisabled();
    await act(async () => {
      rejectLookup?.(Object.assign(new Error("not found"), { status: 404 }));
      await delayedLookup.catch(() => undefined);
    });
    await waitFor(() =>
      expect(
        screen.getByLabelText("Prepare a new harvest review quote")
      ).not.toBeDisabled()
    );
  });

  it("confirms private Feed draft deletion and preserves the signed result and evidence", async () => {
    mockDeleteHarvestFeedReviewDraft.mockResolvedValueOnce({
      deleted: true,
      draftId: "64c000000000000000000001"
    });
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(
        (_title: string, _message?: string, buttons?: AlertButton[]) => {
          buttons?.find((button) => button.text === "Delete Draft")?.onPress?.();
        }
      );

    try {
      const screen = await renderRestoredPrivateFeedDraft();
      expect(screen.getByText("Private Harvest Readiness review")).toBeTruthy();
      expect(screen.getByLabelText("Prepare a new harvest review quote")).toBeDisabled();

      fireEvent.press(screen.getByLabelText("Delete private GrowPath Feed review draft"));

      await waitFor(() =>
        expect(mockDeleteHarvestFeedReviewDraft).toHaveBeenCalledTimes(1)
      );
      expect(alertSpy).toHaveBeenCalledWith(
        "Delete private Feed draft?",
        expect.stringMatching(
          /does not delete the signed Harvest result, retained source video, or zoom-source photos/i
        ),
        expect.arrayContaining([
          expect.objectContaining({ text: "Keep Draft", style: "cancel" }),
          expect.objectContaining({ text: "Delete Draft", style: "destructive" })
        ])
      );
      expect(mockDeleteHarvestFeedReviewDraft).toHaveBeenCalledWith(
        "operation-deep-feed-delete",
        { workspaceType: "personal" },
        { signal: expect.any(AbortSignal) }
      );
      await screen.findByText(
        /private Feed review draft was deleted.*signed Harvest result and source evidence were kept/i
      );
      expect(screen.queryByLabelText("Private Harvest Feed draft preview")).toBeNull();
      expect(screen.getByLabelText("Share signed Harvest review summary")).toBeTruthy();
      expect(
        screen.getByText(/AI estimate: 75% cloudy, 15% amber, 10% clear/i)
      ).toBeTruthy();
      expect(
        screen.getByLabelText(
          "Add macro coverage row 1 column 1 from source photo 13 to the private Feed review draft"
        )
      ).toBeTruthy();
      expect(mockMediaEvidencePickerProps.mock.calls.at(-1)?.[0].value).toHaveLength(13);
      expect(mockStartDeepTrichomeReview).toHaveBeenCalledTimes(1);
      expect(mockAnalyzeTrichomePhotos).not.toHaveBeenCalled();
    } finally {
      alertSpy.mockRestore();
    }
  });

  it("keeps the displayed private Feed draft when DELETE confirms a different draft id", async () => {
    mockDeleteHarvestFeedReviewDraft.mockResolvedValueOnce({
      deleted: true,
      draftId: "64c000000000000000000099"
    });
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(
        (_title: string, _message?: string, buttons?: AlertButton[]) => {
          buttons?.find((button) => button.text === "Delete Draft")?.onPress?.();
        }
      );

    try {
      const screen = await renderRestoredPrivateFeedDraft();
      fireEvent.press(screen.getByLabelText("Delete private GrowPath Feed review draft"));

      expect(
        await screen.findByText(/confirmed deletion for a different private Feed draft/i)
      ).toBeTruthy();
      expect(screen.getByLabelText("Private Harvest Feed draft preview")).toBeTruthy();
      expect(screen.getByText("Private Harvest Readiness review")).toBeTruthy();
    } finally {
      alertSpy.mockRestore();
    }
  });

  it("aborts and ignores a stale private Feed draft deletion after the review changes", async () => {
    let resolveDelete: ((value: any) => void) | undefined;
    const delayedDelete = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    mockDeleteHarvestFeedReviewDraft.mockReturnValueOnce(delayedDelete);
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(
        (_title: string, _message?: string, buttons?: AlertButton[]) => {
          buttons?.find((button) => button.text === "Delete Draft")?.onPress?.();
        }
      );

    try {
      const screen = await renderRestoredPrivateFeedDraft();
      fireEvent.press(screen.getByLabelText("Delete private GrowPath Feed review draft"));
      await waitFor(() =>
        expect(mockDeleteHarvestFeedReviewDraft).toHaveBeenCalledTimes(1)
      );
      expect(screen.getByLabelText("Prepare a new harvest review quote")).toBeDisabled();
      const signal = mockDeleteHarvestFeedReviewDraft.mock.calls[0][2].signal;

      fireEvent.changeText(
        screen.getByLabelText("Harvest photo notes"),
        "Changed after the private draft deletion began"
      );
      await waitFor(() => expect(signal.aborted).toBe(true));
      await act(async () => {
        resolveDelete?.({
          deleted: true,
          draftId: "64c000000000000000000001"
        });
        await delayedDelete;
      });

      expect(
        screen.queryByText(/private Feed review draft was deleted.*source evidence/i)
      ).toBeNull();
      expect(screen.queryByText("Private Harvest Readiness review")).toBeNull();
      expect(screen.queryByLabelText("Private Harvest Feed draft preview")).toBeNull();
      expect(mockStartDeepTrichomeReview).toHaveBeenCalledTimes(1);
    } finally {
      alertSpy.mockRestore();
    }
  });

  it("analyzes a complete evidence set before filling trichome percentages", async () => {
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          evidenceAssetIds: [
            "64b000000000000000000001",
            "64b000000000000000000002",
            "64b000000000000000000003",
            "64b000000000000000000004"
          ]
        })
      )
    );
    expect(screen.getByDisplayValue("73")).toBeTruthy();
    expect(screen.getByDisplayValue("15")).toBeTruthy();
    expect(screen.getByDisplayValue("12")).toBeTruthy();
    expect(screen.getByText("Qualified macro evidence")).toBeTruthy();
    expect(screen.getByText("Confirm across additional bud sites.")).toBeTruthy();
    expect(screen.getByText("Set quality checks")).toBeTruthy();
    expect(screen.getByText("Per-photo zoom review")).toBeTruthy();
    expect(screen.getByText(/best region: center calyx/i)).toBeTruthy();
    expect(screen.getByText(/Provider image detail: high/i)).toBeTruthy();
    expect(screen.getByText(/likely cloudy persistent/i)).toBeTruthy();
    expect(screen.getByText(/61% confidence/i)).toBeTruthy();
    expect(screen.getByText(/highlight moved/i)).toBeTruthy();
    expect(screen.getByText(/run the rule-based readiness estimate/)).toBeTruthy();
    expect(screen.getByText(/1 charged · 58 remaining/i)).toBeTruthy();
    expect(screen.getByLabelText("Share signed Harvest review summary")).toBeTruthy();
    expect(screen.queryByText(/usage-harvest-1/i)).toBeNull();

    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          trichomeSource: "ai_photo_estimate",
          photoAnalysis: expect.objectContaining({
            performed: true,
            analysisId: "usage-harvest-1",
            analysisReceipt: {
              aiUsageEventId: "usage-harvest-1",
              normalizedHarvestResultDigest: "a".repeat(64),
              evidenceFingerprint: [
                "64b000000000000000000001",
                "64b000000000000000000002",
                "64b000000000000000000003",
                "64b000000000000000000004"
              ].join("|"),
              reviewPolicyVersion: "harvest-trichome-server-attestation-v2-full-grid"
            }
          })
        })
      )
    );
  });

  it("does not fill trichome fields when the analysis receipt is missing", async () => {
    mockAnalyzeTrichomePhotos.mockResolvedValueOnce({
      photoUsable: true,
      imageQuality: "usable",
      clear: 0.12,
      cloudy: 0.73,
      amber: 0.15,
      confidence: 0.81,
      dominant: "cloudy",
      visibleTraits: [],
      evidence: [],
      recommendation: "Review the set.",
      limitations: [],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imagesAnalyzed: 4,
      evidenceUsed: [
        "64b000000000000000000001",
        "64b000000000000000000002",
        "64b000000000000000000003",
        "64b000000000000000000004"
      ],
      analysisId: "usage-without-receipt",
      aiCreditsUsed: 1,
      creditStatus: "charged"
    });
    const screen = await renderHarvestReadinessTool();
    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() =>
      expect(screen.getByText(/evidence receipt does not match/i)).toBeTruthy()
    );
    expect(screen.queryByDisplayValue("73")).toBeNull();
    expect(screen.queryByText("Qualified macro evidence")).toBeNull();
  });

  it("uses the exact source-video and extracted-frame set for analysis and calculation", async () => {
    const exactEvidenceIds = [
      "64b000000000000000000099",
      "64b000000000000000000011",
      "64b000000000000000000012",
      "64b000000000000000000013",
      "64b000000000000000000014"
    ];
    const analyzedFrameIds = exactEvidenceIds.slice(1);
    const extractionVersion = "harvest-video-server-v2";
    const manifest = {
      policyVersion: "harvest-video-preselection-v1",
      candidateIntervalSeconds: 1,
      candidateLimit: 600,
      sampledCount: 40,
      qualityUsableCount: 18,
      qualityRejectedCount: 22,
      rejectedReasons: {
        decodeError: 0,
        invalidMetrics: 0,
        obviousBlur: 10,
        underexposed: 4,
        overexposedOrGlare: 8
      },
      distinctCandidateCount: 12,
      duplicateCandidateCount: 6,
      duplicateClusterCount: 3,
      targetFrameCount: 4,
      selectedCount: 4,
      coveredBucketCount: 4,
      selectedBytesTotal: 400_000,
      selectedByteLimit: 2_000_000,
      selected: analyzedFrameIds.map((evidenceAssetId, frameIndex) => ({
        frameIndex,
        evidenceAssetId,
        candidateIndex: frameIndex * 5,
        requestedTimeSeconds: frameIndex * 5,
        qualityScore: 0.9,
        coverageBucket: frameIndex,
        sequenceRole: "standalone",
        countingEligible: true
      }))
    };
    const exactSource = {
      id: "source-video-1",
      _id: exactEvidenceIds[0],
      assetType: "video",
      originalUri: "file:///trichomes.mov",
      durableUrl: "/uploads/trichomes.mov",
      mimeType: "video/quicktime",
      growId: "grow-1",
      source: "library",
      purpose: "harvest",
      uploadStatus: "uploaded",
      aiUsable: false,
      qualityWarnings: [],
      frameExtraction: {
        status: "completed",
        attemptCount: 1,
        version: extractionVersion,
        frameAssetIds: analyzedFrameIds,
        frameCount: analyzedFrameIds.length,
        preselection: manifest
      }
    };
    const exactFrames = analyzedFrameIds.map((id, frameIndex) => ({
      id: `video-frame-${frameIndex}`,
      _id: id,
      assetType: "photo",
      originalUri: `/api/evidence-assets/uploads/private-frame-${frameIndex}/object`,
      durableUrl: `/api/evidence-assets/uploads/private-frame-${frameIndex}/object`,
      mimeType: "image/jpeg",
      growId: "grow-1",
      source: "generated",
      purpose: "harvest",
      uploadStatus: "uploaded",
      aiUsable: true,
      qualityWarnings: [],
      sourceVideoEvidenceAssetId: exactEvidenceIds[0],
      frameExtractionVersion: extractionVersion,
      frameExtractionAttempt: 1,
      frameIndex,
      frameTimeSeconds: frameIndex * 5,
      frameTimeBasis: "requested"
    }));
    mockExtractEvidenceVideoFrames.mockResolvedValueOnce({
      sourceVideo: exactSource,
      extraction: {
        status: "completed",
        attemptCount: 1,
        version: extractionVersion,
        retryable: false,
        frames: exactFrames,
        preselection: manifest
      }
    });
    mockGetEvidenceAssetsByIds.mockResolvedValueOnce([exactSource, ...exactFrames]);
    mockAnalyzeTrichomePhotos.mockResolvedValueOnce({
      photoUsable: true,
      imageQuality: "usable",
      clear: 0.12,
      cloudy: 0.73,
      amber: 0.15,
      confidence: 0.81,
      dominant: "cloudy",
      visibleTraits: ["Intact opaque gland heads"],
      evidence: ["Mostly opaque gland heads"],
      recommendation: "Confirm across additional bud sites.",
      limitations: [],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imagesAnalyzed: 4,
      evidenceUsed: analyzedFrameIds,
      analysisId: "usage-harvest-1",
      analysisReceipt: {
        aiUsageEventId: "usage-harvest-1",
        normalizedHarvestResultDigest: "b".repeat(64),
        evidenceFingerprint: analyzedFrameIds.join("|"),
        reviewPolicyVersion: "harvest-trichome-server-attestation-v1"
      },
      aiCreditsUsed: 1,
      aiTokensRemaining: 57,
      creditStatus: "charged"
    });
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add harvest video and extracted frames"));
    await fireEventAsync.press(screen.getByLabelText("Select Best Video Frames"));
    await waitFor(() =>
      expect(screen.getByText(/4 server-selected frames are retained/i)).toBeTruthy()
    );
    expect(
      screen.getByText(
        /Selected for this private package: 0 of 12 maximum; 4 retained available/i
      )
    ).toBeTruthy();
    expect(
      mockMediaEvidencePickerProps.mock.calls.at(-1)?.[0].generatedFrameExportSelection
    ).toEqual(
      expect.objectContaining({
        eligibleAssetIds: analyzedFrameIds,
        selectedAssetIds: []
      })
    );
    expect(
      mockMediaEvidencePickerProps.mock.calls
        .at(-1)?.[0]
        .generatedFrameExportSelection.eligibleAssetIds.includes(exactEvidenceIds[0])
    ).toBe(false);
    expect(screen.queryByText("Select All Retained")).toBeNull();
    expect(screen.getByText(/Choose up to 12 frames per package/i)).toBeTruthy();
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith({
        growId: "grow-1",
        evidenceAssetIds: exactEvidenceIds,
        workspaceType: "personal",
        workspaceId: undefined,
        facilityId: undefined,
        plantId: undefined,
        sampleLocation: "mixed_bud_sites",
        notes: undefined
      })
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          growId: "grow-1",
          evidenceAssetIds: exactEvidenceIds,
          mediaEvidence: expect.arrayContaining([
            expect.objectContaining({
              id: "64b000000000000000000099",
              type: "video"
            }),
            expect.objectContaining({
              id: "64b000000000000000000011",
              type: "photo",
              sourceVideoEvidenceAssetId: "64b000000000000000000099"
            })
          ])
        })
      )
    );
  });

  it("keeps manual observations while clearing only unreviewed photo drafts when evidence is removed", async () => {
    const screen = await renderHarvestReadinessTool();

    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Flower day"),
      "57"
    );
    fireEvent.changeText(
      screen.getByLabelText(
        "Harvest Readiness Estimate Hair / pistil status (fresh, dying, dark, receded)"
      ),
      "mostly dark and receded"
    );
    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(
        screen.getByLabelText("Harvest Readiness Estimate Cloudy %").props.value
      ).toBe("73")
    );
    expect(
      screen.getByLabelText("Harvest Readiness Estimate Flower day").props.value
    ).toBe("57");
    expect(
      screen.getByLabelText(
        "Harvest Readiness Estimate Hair / pistil status (fresh, dying, dark, receded)"
      ).props.value
    ).toBe("mostly dark and receded");
    expect(
      screen.getByLabelText("Cloudy % was filled by AI and needs review")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Amber % was filled by AI and needs review")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Clear % was filled by AI and needs review")
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Cloudy %"),
      "70"
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          cloudyPercent: "70",
          amberPercent: "15",
          clearPercent: "12",
          trichomeSource: "ai_photo_estimate",
          fieldProvenance: expect.objectContaining({
            cloudyPercent: "visual_prefill_user_reviewed",
            amberPercent: "visual_prefill_unverified",
            clearPercent: "visual_prefill_unverified"
          }),
          aiPrefillProvenance: expect.objectContaining({
            prefilledFields: expect.arrayContaining(["amberPercent", "clearPercent"]),
            userReviewedFields: expect.arrayContaining(["cloudyPercent"]),
            userEditedFields: expect.arrayContaining(["cloudyPercent"])
          }),
          photoAnalysis: expect.objectContaining({
            analysisId: "usage-harvest-1",
            performed: true
          })
        })
      )
    );
    fireEvent.press(screen.getByLabelText("Remove harvest evidence"));

    await waitFor(() =>
      expect(
        screen.getByLabelText("Harvest Readiness Estimate Amber %").props.value
      ).toBe("")
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Clear %").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Cloudy %").props.value).toBe(
      "70"
    );
    expect(
      screen.getByLabelText("Harvest Readiness Estimate Flower day").props.value
    ).toBe("57");
    expect(
      screen.getByLabelText(
        "Harvest Readiness Estimate Hair / pistil status (fresh, dying, dark, receded)"
      ).props.value
    ).toBe("mostly dark and receded");
    expect(
      screen.queryByLabelText("Cloudy % was filled by AI and needs review")
    ).toBeNull();
  });

  it("shows a sampled-area estimate without filling representative readiness fields", async () => {
    mockAnalyzeTrichomePhotos.mockResolvedValue({
      photoUsable: false,
      imageQuality: "limited",
      clear: null,
      cloudy: null,
      amber: null,
      visibleSampleEstimateUsable: true,
      sampleClear: 0.1,
      sampleCloudy: 0.35,
      sampleAmber: 0.1,
      sampleAmberOrWarmLight: 0.2,
      sampleAmberMin: 0.1,
      sampleAmberMax: 0.3,
      sampleCloudyOrGlare: 0.25,
      sampleEstimateBasis: "Visible intact heads in the center calyx regions.",
      visibleSampleHeadCount: 40,
      visibleSampleCountSource: "resolved_head_tally",
      visibleSampleCountingConfidence: "medium",
      confidence: 0.24,
      dominant: "uncertain",
      visibleTraits: ["Pistils visible; gland heads blurred"],
      evidence: [],
      recommendation: "Move closer and stabilize the camera.",
      limitations: ["Trichome heads are out of focus."],
      imageFindings: [
        {
          imageIndex: 1,
          role: "additional_macro",
          usableForDistribution: false,
          usableForVisibleSample: true,
          trichomeRichRegion: "center calyx",
          excludedReason: "Representative site coverage is incomplete.",
          focus: "partial",
          glare: "localized",
          visibleHeadDetail: "limited",
          resolvedHeadCounts: {
            clear: 4,
            cloudy: 14,
            amber: 4,
            amberOrWarmLight: 8,
            cloudyOrGlare: 10
          },
          resolvedHeadTotal: 40,
          countingConfidence: "medium"
        }
      ],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imagesAnalyzed: 4,
      evidenceUsed: [
        "64b000000000000000000001",
        "64b000000000000000000002",
        "64b000000000000000000003",
        "64b000000000000000000004"
      ],
      analysisId: "usage-harvest-2",
      analysisReceipt: {
        aiUsageEventId: "usage-harvest-2",
        normalizedHarvestResultDigest: "c".repeat(64),
        evidenceFingerprint: [
          "64b000000000000000000001",
          "64b000000000000000000002",
          "64b000000000000000000003",
          "64b000000000000000000004"
        ].join("|"),
        reviewPolicyVersion: "harvest-trichome-server-attestation-v1"
      },
      aiCreditsUsed: 1,
      aiTokensRemaining: 57,
      creditStatus: "charged"
    });
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        readinessStatus: "insufficient_evidence",
        trichomeSource: "manual_or_missing",
        photoAnalysis: {
          performed: true,
          visibleSampleEstimateUsable: true,
          visibleSampleHeadCount: 40,
          visibleSampleCountingConfidence: "medium",
          imagesAnalyzed: 4,
          providerLabel: "OpenAI trichome image review",
          providerModel: "gpt-5.4",
          imageDetail: "original"
        }
      },
      toolRun: { id: "toolrun-visible-sample", _id: "toolrun-visible-sample" }
    });
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(screen.getByText("Visible-area estimate — review before using")).toBeTruthy()
    );
    expect(
      screen.getByText(
        "10% clear · 35% cloudy · 10% directly confirmed amber · up to 30% possible amber total · 25% cloudy or glare"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /strict evidence floor, not the tool's claim that the photographed sample is probably that low/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /possible-amber upper bound includes 20% of resolved yellow, orange, or brown heads/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Counted heads: 40 · Counting confidence: medium · Percentages calculated from the per-photo tallies"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /tally: 4 clear \/ 14 cloudy \/ 4 confirmed amber \/ 8 amber or warm light \/ 10 cloudy or glare \(40 heads, medium confidence\)/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Photo 1 | additional macro | center calyx | 40 heads | medium confidence"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "10% clear | 35% cloudy | 10% confirmed amber to 30% possible amber | 25% cloudy or glare"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Photo 1 has the strongest inspected amber signal: 10% confirmed amber to 30% possible amber/i
      )
    ).toBeTruthy();
    expect(screen.getByText(/never a whole-plant percentage/i)).toBeTruthy();
    expect(screen.getByText("Move closer and stabilize the camera.")).toBeTruthy();
    expect(screen.getByText("Limitation: Trichome heads are out of focus.")).toBeTruthy();
    expect(screen.getByLabelText("Harvest Readiness Estimate Cloudy %").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Amber %").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Clear %").props.value).toBe(
      ""
    );

    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));
    await waitFor(() =>
      expect(
        screen.getByText(
          "AI counted-area estimate (40 visible heads; medium counting confidence). Representative top, middle, and lower percentages remain manual or missing."
        )
      ).toBeTruthy()
    );
  });

  it("shows exact missing harvest photo roles in the shared evidence review", async () => {
    const limitedPhotoAnalysis = {
      photoUsable: false,
      imageQuality: "limited",
      clear: null,
      cloudy: null,
      amber: null,
      confidence: 0.24,
      dominant: "uncertain",
      visibleTraits: ["Gland heads are not resolved"],
      evidence: [],
      recommendation: "Stabilize the camera and retake the macro set.",
      limitations: ["The top sample is blurred."],
      qualityChecks: {
        focus: "blocking",
        glare: "none",
        lighting: "neutral",
        headVisibility: "unresolved",
        roleCoverage: "incomplete"
      },
      imageFindings: [
        {
          imageIndex: 1,
          role: "top_macro",
          usableForDistribution: false,
          trichomeRichRegion: "",
          excludedReason: "gland heads are blurred",
          focus: "blurred",
          glare: "none",
          visibleHeadDetail: "unresolved"
        }
      ],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imagesAnalyzed: 4,
      evidenceUsed: [
        "64b000000000000000000001",
        "64b000000000000000000002",
        "64b000000000000000000003",
        "64b000000000000000000004"
      ],
      analysisId: "usage-harvest-limited",
      analysisReceipt: {
        aiUsageEventId: "usage-harvest-limited",
        normalizedHarvestResultDigest: "d".repeat(64),
        evidenceFingerprint: [
          "64b000000000000000000001",
          "64b000000000000000000002",
          "64b000000000000000000003",
          "64b000000000000000000004"
        ].join("|"),
        reviewPolicyVersion: "harvest-trichome-server-attestation-v1"
      },
      aiCreditsUsed: 1,
      aiTokensRemaining: 56,
      creditStatus: "charged"
    };
    mockAnalyzeTrichomePhotos.mockResolvedValue(limitedPhotoAnalysis);
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        readinessStatus: "insufficient_evidence",
        confidence: "low",
        photoAnalysis: { ...limitedPhotoAnalysis, performed: true }
      },
      toolRun: { id: "toolrun-limited", _id: "toolrun-limited" }
    });
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() => expect(mockAnalyzeTrichomePhotos).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));

    await waitFor(() => expect(screen.getByText("Evidence review")).toBeTruthy());
    expect(
      screen.getAllByText(/Retake photo 1 \(top macro\): gland heads are blurred/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Add a sharp macro photo.*middle bud calyx/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Add one wider bud-context photo.*macro samples/).length
    ).toBeGreaterThan(0);
  });

  it("turns analysis-service failures into retake guidance without filling fields", async () => {
    mockAnalyzeTrichomePhotos.mockRejectedValue(
      new Error("The photo-analysis service is unavailable.")
    );
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(screen.getByText(/Photo analysis did not run/i)).toBeTruthy()
    );
    expect(screen.getByText(/No trichome fields were filled/i)).toBeTruthy();
    expect(
      screen.getAllByText(/top, middle, and lower bud sites/i).length
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Harvest photo analysis result")).toBeNull();
    expect(screen.getByLabelText("Harvest Readiness Estimate Cloudy %").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Amber %").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("Harvest Readiness Estimate Clear %").props.value).toBe(
      ""
    );
  });

  it("creates harvest decision tasks from the saved readiness ToolRun", async () => {
    const screen = await renderHarvestReadinessTool();

    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Flower day"),
      "56"
    );
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Trichome sample location"),
      "top and lower buds"
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          growId: "grow-1",
          flowerDay: "56",
          sampleLocation: "top and lower buds",
          budSwell: "",
          smellNotes: "",
          trichomeSource: "manual_entry"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Harvest Readiness Estimate result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Harvest Follow-up Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "harvest-readiness",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            flowerDay: "56",
            sampleLocation: "top and lower buds"
          }),
          output: expect.objectContaining({
            readinessStatus: "approaching_window"
          }),
          tasks: [
            expect.objectContaining({
              title: "Recheck harvest window",
              allDay: true,
              calendarType: "harvest_readiness",
              sourceStage: "harvest_readiness_recheck",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("top and lower buds")
            }),
            expect.objectContaining({
              title: "Capture top and lower trichome photos",
              sourceStage: "trichome_photo_capture"
            }),
            expect.objectContaining({
              title: "Make harvest window decision",
              priority: "high",
              sourceStage: "harvest_window_decision",
              description: expect.stringContaining("flower day 60")
            }),
            expect.objectContaining({
              title: "Prepare dry/cure setup",
              priority: "high",
              sourceStage: "dry_cure_setup"
            })
          ]
        })
      )
    );
  });

  it("saves harvest readiness review to a harvest batch record", async () => {
    mockListHarvestBatches.mockResolvedValue([
      {
        id: "harvest-1",
        growId: "grow-1",
        name: "Harvest A",
        batchCode: "HB-001",
        status: "harvested"
      }
    ]);
    const screen = await renderHarvestReadinessTool();

    await waitFor(() =>
      expect(mockListHarvestBatches).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    fireEvent.press(
      screen.getByLabelText(
        "Harvest Readiness Estimate Harvest batch write-back (optional): Harvest A (HB-001)"
      )
    );

    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Flower day"),
      "56"
    );
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Trichome sample location"),
      "top and lower buds"
    );
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Cloudy %"),
      "65"
    );
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Amber %"),
      "8"
    );
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Clear %"),
      "10"
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          growId: "grow-1",
          harvestBatchId: "harvest-1"
        })
      )
    );

    await waitFor(() =>
      expect(screen.getByText("Harvest Readiness Estimate result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Save Harvest Review"));

    await waitFor(() => expect(mockGetHarvestBatch).toHaveBeenCalledWith("harvest-1"));
    expect(mockUpdateHarvestBatch).toHaveBeenCalledWith(
      "harvest-1",
      expect.objectContaining({
        qualityNotes: expect.stringContaining("Readiness: approaching window."),
        linkedToolRunIds: ["toolrun-old", "toolrun-1"],
        dryCureRecords: [
          expect.objectContaining({
            stage: "drying",
            linkedToolRunId: "toolrun-old"
          }),
          expect.objectContaining({
            stage: "quality_review",
            linkedToolRunId: "toolrun-1",
            qualityNotes: expect.stringContaining(
              "Trichomes: cloudy 65%, amber 8%, clear 10%."
            )
          })
        ]
      })
    );
    await waitFor(() =>
      expect(screen.getByText("Saved harvest review to batch.")).toBeTruthy()
    );
  });

  it("clears a selected harvest batch when the grow context changes", async () => {
    mockRouteParams = {};
    mockListPersonalGrows.mockResolvedValue([
      { id: "grow-1", name: "Flower Tent" },
      { id: "grow-2", name: "Second Run" }
    ]);
    mockListHarvestBatches.mockImplementation(async ({ growId }: { growId: string }) =>
      growId === "grow-1"
        ? [
            {
              id: "harvest-1",
              growId: "grow-1",
              name: "Harvest A",
              batchCode: "HB-001",
              status: "harvested"
            }
          ]
        : [
            {
              id: "harvest-2",
              growId: "grow-2",
              name: "Harvest B",
              batchCode: "HB-002",
              status: "harvested"
            }
          ]
    );
    const screen = await renderHarvestReadinessTool();

    await waitFor(() => expect(screen.getByText("Flower Tent")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Select grow Flower Tent"));
    await waitFor(() =>
      expect(
        screen.getByLabelText(
          "Harvest Readiness Estimate Harvest batch write-back (optional): Harvest A (HB-001)"
        )
      ).toBeTruthy()
    );
    fireEvent.press(
      screen.getByLabelText(
        "Harvest Readiness Estimate Harvest batch write-back (optional): Harvest A (HB-001)"
      )
    );

    fireEvent.press(screen.getByLabelText("Select grow Second Run"));
    await waitFor(() =>
      expect(mockListHarvestBatches).toHaveBeenCalledWith({ growId: "grow-2" })
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText(
          "Harvest Readiness Estimate Harvest batch write-back (optional): Do not link a harvest batch"
        ).props.accessibilityState
      ).toEqual({ checked: true })
    );
    expect(
      screen.queryByLabelText(
        "Harvest Readiness Estimate Harvest batch write-back (optional): Harvest A (HB-001)"
      )
    ).toBeNull();
  });
});
