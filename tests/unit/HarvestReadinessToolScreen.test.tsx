import React from "react";
import {
  fireEvent,
  fireEventAsync,
  renderAsync,
  waitFor
} from "@testing-library/react-native";

import HarvestReadinessToolRoute, {
  createHarvestPhotoStyles
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
});

const mockRunCalculator = jest.fn();
const mockGetToolRun = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockGetHarvestBatch = jest.fn();
const mockListHarvestBatches = jest.fn();
const mockUpdateHarvestBatch = jest.fn();
const mockAnalyzeTrichomePhotos = jest.fn();
const mockAskPersonalAssistant = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockListFacilityGrows = jest.fn();
const mockFetchCommercialGrows = jest.fn();
const mockListEvidenceAssets = jest.fn();
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
    aiUsable: true,
    qualityWarnings: []
  };
  const frameAsset = (index: number) => ({
    ...asset(index),
    id: `video-frame-${index}`,
    _id: `64b00000000000000000001${index}`,
    source: "generated",
    sourceVideoEvidenceAssetId: videoAsset._id,
    frameExtractionVersion: "client-harvest-v1",
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
          accessibilityLabel: "Add harvest video and extracted frames",
          onPress: () =>
            props.onChange([
              videoAsset,
              frameAsset(1),
              frameAsset(2),
              frameAsset(3),
              frameAsset(4)
            ])
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
    listEvidenceAssets: (...args: any[]) => mockListEvidenceAssets(...args)
  };
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

jest.mock("@/api/harvestVision", () => ({
  analyzeTrichomePhotos: (...args: any[]) => mockAnalyzeTrichomePhotos(...args)
}));

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

async function renderHarvestReadinessTool(
  props: React.ComponentProps<typeof HarvestReadinessToolRoute> = {}
) {
  return renderAsync(<HarvestReadinessToolRoute {...props} />);
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
        reviewPolicyVersion: "harvest-trichome-server-attestation-v1"
      },
      aiCreditsUsed: 1,
      aiTokensRemaining: 58,
      creditStatus: "charged"
    });
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

  it("lets a user select a grow before choosing trichome photos", async () => {
    mockRouteParams = {};
    mockListPersonalGrows.mockResolvedValue([
      { id: "grow-1", name: "Flower Tent" },
      { id: "grow-2", name: "Second Run" }
    ]);
    const screen = await renderHarvestReadinessTool();

    await waitFor(() => expect(screen.getByText("Flower Tent")).toBeTruthy());
    expect(screen.getByText("Select a grow before analyzing a photo.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select grow Flower Tent"));
    await waitFor(() =>
      expect(screen.queryByText("Select a grow before analyzing a photo.")).toBeNull()
    );
  });

  it("shows actionable photo requirements before the user chooses media", async () => {
    const screen = await renderHarvestReadinessTool();

    expect(screen.getByText("Harvest Readiness Estimate").props).toMatchObject({
      accessibilityRole: "header",
      "aria-level": 2
    });
    expect(screen.getByText("AI trichome photo estimate (optional)").props).toMatchObject(
      {
        accessibilityRole: "header",
        "aria-level": 2
      }
    );
    expect(screen.getByText("Photo checklist before analysis").props).toMatchObject({
      accessibilityRole: "header",
      "aria-level": 3
    });
    expect(screen.getByText(/at least 3 sharp macro photos/i)).toBeTruthy();
    expect(screen.getByText(/trichome gland heads on bud calyxes/i)).toBeTruthy();
    expect(screen.getByText(/neutral white light/i)).toBeTruthy();
    expect(
      screen.getByText(/even 12 wide photos cannot replace three true macros/i)
    ).toBeTruthy();
    expect(screen.getByText(/No trichome evidence is ready/i)).toBeTruthy();
    expect(mockSavedGrowPhotoEvidencePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        purpose: "harvest",
        maxPhotos: 12
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

  it("auto-selects the sole authorized grow for a required shared workflow", async () => {
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
      expect(screen.getByText("Grow context: facility-grow-only")).toBeTruthy()
    );
    expect(screen.getByLabelText("Select grow Only Flower Room")).toBeTruthy();
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
      inputs: { evidenceAssetIds: retainedIds }
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
        screen.getByText("Restored 4 exact harvest photos for this grow.")
      ).toBeTruthy()
    );
    expect(mockGetToolRun).toHaveBeenCalledWith("harvest-run-1");
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({ evidenceAssetIds: retainedIds })
      )
    );
  });

  it("blocks an incomplete photo set without spending a credit", async () => {
    const screen = await renderHarvestReadinessTool();

    fireEvent.press(screen.getByLabelText("Add one harvest evidence photo"));

    expect(screen.getByText(/Add 3 more photos/i)).toBeTruthy();
    expect(screen.getByText(/no AI credit will be used yet/i)).toBeTruthy();
    await fireEventAsync.press(screen.getByLabelText("Analyze harvest trichome photo"));
    expect(mockAnalyzeTrichomePhotos).not.toHaveBeenCalled();
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
    expect(screen.getByText(/usage-harvest-1/i)).toBeTruthy();

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
              reviewPolicyVersion: "harvest-trichome-server-attestation-v1"
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
      expect(screen.getByText(/evidence receipt that does not match/i)).toBeTruthy()
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
        "10% clear · 35% cloudy · 10% confirmed amber to 30% possible amber · 25% cloudy or glare"
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
