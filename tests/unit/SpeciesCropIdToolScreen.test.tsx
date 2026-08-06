import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import SpeciesCropIdToolRoute, {
  isCannabisGenusIdentification
} from "@/app/home/personal/(tabs)/tools/species-crop-id";
import { bestStructuredPlantCandidateName } from "@/features/personal/tools/plantIdentificationCandidates";

const mockRunCalculator = jest.fn();
const mockListToolRuns = jest.fn();
const mockGetToolRun = jest.fn();
const mockListEvidenceAssets = jest.fn();
const mockGetEvidenceAssetsByIds = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockUpdateGrowpathModuleRecord = jest.fn();
const mockUpdateToolRun = jest.fn();
const mockUpdatePlantIdCorrection = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockSavePersonalGrowCropIdentity = jest.fn();
const mockSavePersonalPlantCropIdentity = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockAskPersonalAssistant = jest.fn();
const mockListFieldStudies = jest.fn();
const mockCreateFieldStudy = jest.fn();
const mockCreateFieldObservation = jest.fn();
const mockUpdateFieldObservation = jest.fn();
const mockUpdateFieldStudy = jest.fn();
const mockRequestCurrentCoordinates = jest.fn();
const mockUseToolPlantContext = jest.fn();
let mockSearchParams: Record<string, string> = { growId: "grow-1" };
let mockEvidenceAssets: any[] = [];
let mockEntitlementMode: "personal" | "commercial" | "facility" = "personal";
let mockEntitlementFacilityId = "";

function openLocationAndSharing(screen: any) {
  const collapsedControl = screen.queryByText("Optional: add to a Field Study or Nature");
  if (collapsedControl) fireEvent.press(collapsedControl);
}

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn()
  })
}));

jest.mock("@/components/media/MediaEvidencePicker", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return function MockMediaEvidencePicker(props: any) {
    const { onBusyChange, onChange } = props;
    React.useEffect(() => {
      onChange?.(mockEvidenceAssets);
    }, [onChange]);
    return React.createElement(
      View,
      { testID: "media-evidence-picker" },
      React.createElement(Text, null, `Evidence purpose: ${props.purpose}`),
      React.createElement(
        Text,
        null,
        `Retain on remove: ${(props.retainOnRemoveAssetIds || []).join(",")}`
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Replace test evidence",
          onPress: () =>
            onChange?.([
              {
                ...mockEvidenceAssets[0],
                id: "evidence-2",
                _id: "evidence-2",
                durableUrl: "https://example.com/replacement-plant.jpg"
              }
            ])
        },
        React.createElement(Text, null, "Replace test evidence")
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Set test evidence busy",
          onPress: () => onBusyChange?.(true)
        },
        React.createElement(Text, null, "Set test evidence busy")
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Finish test evidence upload",
          onPress: () => onBusyChange?.(false)
        },
        React.createElement(Text, null, "Finish test evidence upload")
      )
    );
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    plan: "pro",
    mode: mockEntitlementMode,
    facilityId: mockEntitlementFacilityId,
    can: () => true
  })
}));

jest.mock("@/components/feed/FeedBanner", () => {
  const React = require("react");
  const { View } = require("react-native");
  function MockFeedBanner() {
    return React.createElement(View, { testID: "feed-banner" });
  }
  return MockFeedBanner;
});

jest.mock("@/features/personal/tools/ToolPlantContextPicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ToolPlantContextPicker: () => React.createElement(View, { testID: "plant-picker" }),
    useToolPlantContext: (...args: any[]) => mockUseToolPlantContext(...args)
  };
});

jest.mock("@/api/toolRuns", () => ({
  runCalculator: (...args: any[]) => mockRunCalculator(...args),
  getToolRun: (...args: any[]) => mockGetToolRun(...args),
  listToolRuns: (...args: any[]) => mockListToolRuns(...args),
  updateToolRun: (...args: any[]) => mockUpdateToolRun(...args),
  updatePlantIdCorrection: (...args: any[]) => mockUpdatePlantIdCorrection(...args)
}));

jest.mock("@/api/evidence", () => {
  const actual = jest.requireActual("@/api/evidence");
  return {
    ...actual,
    listEvidenceAssets: (...args: any[]) => mockListEvidenceAssets(...args),
    getEvidenceAssetsByIds: (...args: any[]) => mockGetEvidenceAssetsByIds(...args)
  };
});

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args),
  savePersonalGrowCropIdentity: (...args: any[]) =>
    mockSavePersonalGrowCropIdentity(...args)
}));

jest.mock("@/api/plants", () => ({
  savePersonalPlantCropIdentity: (...args: any[]) =>
    mockSavePersonalPlantCropIdentity(...args)
}));

jest.mock("@/api/fieldStudies", () => ({
  listFieldStudies: (...args: any[]) => mockListFieldStudies(...args),
  createFieldStudy: (...args: any[]) => mockCreateFieldStudy(...args),
  createFieldObservation: (...args: any[]) => mockCreateFieldObservation(...args),
  updateFieldObservation: (...args: any[]) => mockUpdateFieldObservation(...args),
  updateFieldStudy: (...args: any[]) => mockUpdateFieldStudy(...args)
}));

jest.mock("@/utils/locationSearch", () => ({
  requestCurrentCoordinates: (...args: any[]) => mockRequestCurrentCoordinates(...args)
}));

jest.mock("@/api/growpathModules", () => ({
  createGrowpathModuleRecord: (...args: any[]) => mockCreateGrowpathModuleRecord(...args),
  updateGrowpathModuleRecord: (...args: any[]) => mockUpdateGrowpathModuleRecord(...args)
}));

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: jest.fn(),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

describe("SpeciesCropIdToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchParams = { growId: "grow-1" };
    mockEntitlementMode = "personal";
    mockEntitlementFacilityId = "";
    mockEvidenceAssets = [
      {
        id: "evidence-1",
        _id: "evidence-1",
        assetType: "photo",
        durableUrl: "https://example.com/cannabis-flower.jpg",
        uploadStatus: "uploaded",
        purpose: "other",
        qualityWarnings: []
      }
    ];
    mockListFieldStudies.mockResolvedValue([]);
    mockListToolRuns.mockResolvedValue([]);
    mockGetToolRun.mockResolvedValue(null);
    mockListEvidenceAssets.mockResolvedValue([]);
    mockGetEvidenceAssetsByIds.mockResolvedValue([]);
    mockCreateFieldStudy.mockResolvedValue({
      id: "study-new",
      _id: "study-new",
      title: "Neighborhood plants",
      slug: "neighborhood-plants",
      visibility: "private",
      accessRole: "owner"
    });
    mockCreateFieldObservation.mockResolvedValue({
      observation: { id: "observation-1" }
    });
    mockUpdateFieldObservation.mockResolvedValue({ id: "observation-1" });
    mockUpdateFieldStudy.mockResolvedValue({
      id: "study-1",
      _id: "study-1",
      title: "Roadside survey",
      slug: "roadside-survey",
      visibility: "public",
      accessRole: "owner"
    });
    mockRequestCurrentCoordinates.mockResolvedValue({
      latitude: 39.301234,
      longitude: -76.721234,
      accuracyMeters: 24
    });
    mockUseToolPlantContext.mockReturnValue({
      plants: [],
      plantId: "",
      selectedPlant: null,
      selectedPlantContext: null,
      setPlantId: jest.fn(),
      toolRunContext: { selectedPlantContext: null }
    });
    mockRunCalculator.mockResolvedValue({
      outputs: {
        likelyCrop: "Cannabis",
        broadGroup: "flowering_plant",
        likelyFamily: "Cannabaceae",
        possibleGenera: ["Cannabis"],
        candidates: [
          {
            scientificName: "Cannabis sativa",
            commonNames: ["Cannabis"],
            rank: "species",
            confidence: "medium",
            evidence: ["Visible bracts and pistils"],
            counterEvidence: ["No external range check"],
            missingEvidence: ["Whole-plant context"],
            verificationStatus: "not_verified"
          }
        ],
        sourceVerification: {
          status: "required_not_performed",
          recommendedSourceIds: ["usda-plants-database", "kew-powo"]
        },
        scientificName: "Cannabis sativa",
        confidence: "medium",
        userConfirmationRequired: true,
        identificationNotes:
          "Visible bracts, pistils, resinous sugar leaves, and dense flower structure.",
        identifyingVisualTraits:
          "Bracts, pistils, sugar leaves, and trichome-covered inflorescence.",
        imageAnalysis: {
          requested: true,
          performed: true,
          photoCount: 1,
          photosAnalyzed: 1,
          provider: "growpath_context_plus_openai",
          providerModel: "gpt-4o-mini",
          providerLabel: "GrowPath context + OpenAI image review",
          confidence: "high",
          quality: "usable",
          evidenceUsed: ["evidence-1"],
          limitations: ["Cultivar cannot be identified from appearance."]
        },
        recommendationContext:
          "Confirm crop identity before applying cannabis-specific nutrient or diagnosis guidance."
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockUpdateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockUpdateToolRun.mockResolvedValue({ id: "toolrun-1" });
    mockUpdatePlantIdCorrection.mockResolvedValue({ id: "toolrun-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3"]
    });
    mockSavePersonalGrowCropIdentity.mockResolvedValue({ id: "grow-1" });
    mockSavePersonalPlantCropIdentity.mockResolvedValue({ id: "plant-1" });
    mockListPersonalGrows.mockResolvedValue([]);
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Cannabis",
        scientificName: "Cannabis sativa",
        cultivar: "",
        commonNames: "Cannabis",
        identificationNotes:
          "Visible bracts, pistils, resinous sugar leaves, and dense flower structure.",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "high",
        identifyingVisualTraits:
          "Bracts, pistils, sugar leaves, and trichome-covered inflorescence."
      }),
      provider: "openai",
      providerLabel: "OpenAI vision crop identity",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: {
        requested: true,
        photosAttached: 1,
        photosAnalyzed: 1,
        status: "completed",
        provider: "openai",
        providerModel: "gpt-4o-mini",
        providerLabel: "OpenAI image review"
      },
      limitations: ["Cultivar cannot be identified from appearance."]
    });
  });

  it("blocks identification until every selected evidence upload finishes", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByLabelText("Set test evidence busy"));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Identify Plant from Photos" })
      ).toBeDisabled()
    );
    fireEvent.press(screen.getByRole("button", { name: "Identify Plant from Photos" }));
    expect(mockAskPersonalAssistant).not.toHaveBeenCalled();
    expect(mockRunCalculator).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Finish test evidence upload"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Identify Plant from Photos" })
      ).not.toBeDisabled()
    );
    fireEvent.press(screen.getByRole("button", { name: "Identify Plant from Photos" }));

    await waitFor(() => expect(mockAskPersonalAssistant).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
  });

  it("identifies a cannabis flower without requiring a grow", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    await waitFor(() =>
      expect(
        screen.getByText(/No grow is required. Upload photos or enter what you know/)
      ).toBeTruthy()
    );
    expect(screen.getByText("Step 1 — Add identification evidence")).toBeTruthy();
    expect(screen.getByText("Evidence purpose: crop_identification")).toBeTruthy();
    expect(
      screen.getByText(/direct flash against a dark background can hide color/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/do not enter a cultivar inferred from appearance/i)
    ).toBeTruthy();
    expect(
      screen.queryByLabelText(
        "Species / Crop Identification User confirmed species? true/false"
      )
    ).toBeNull();

    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: undefined,
          workspaceType: "personal",
          evidenceAssetIds: ["evidence-1"],
          context: expect.objectContaining({ workspaceType: "personal" }),
          message: expect.stringContaining(
            'Never put an English common-name phrase such as "rose plant" in scientificName'
          )
        })
      )
    );
    expect(mockAskPersonalAssistant.mock.calls[0][0].message).toContain(
      "Nighttime, a dark background, phone-light illumination, or direct flash is not automatically a failed image"
    );
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          growId: "",
          workspaceType: "personal",
          userEnteredName: "Cannabis",
          scientificName: "Cannabis sativa",
          userConfirmed: false,
          imageAnalysis: expect.objectContaining({
            requested: true,
            performed: true,
            provider: "openai",
            providerModel: "gpt-4o-mini",
            photosAnalyzed: 1,
            confidence: "high"
          })
        })
      )
    );
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
    expect(screen.getByText("Still images inspected")).toBeTruthy();
    expect(screen.getByText("External verification")).toBeTruthy();
    expect(screen.getByText("Candidate comparison")).toBeTruthy();
    expect(screen.getByText(/inspected 1 still image/i)).toBeTruthy();
    expect(screen.queryByText("Confirm & Save to Grow")).toBeNull();
  }, 10_000);

  it("does not claim image analysis after a manual no-media calculation", async () => {
    mockSearchParams = {};
    mockEvidenceAssets = [];
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Rose",
        confidence: "user_entered",
        userConfirmationRequired: true,
        imageAnalysis: {
          requested: false,
          performed: false,
          quality: "unreviewed",
          photosAnalyzed: 0
        }
      },
      toolRun: { id: "manual-no-media-run", _id: "manual-no-media-run" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose"
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Run Species / Crop Identification" })
    );

    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByLabelText(
          "Include or update current location privately with this Plant ID"
        )
      ).not.toBeDisabled()
    );
    expect(screen.queryByText(/The images were reviewed/i)).toBeNull();
    expect(screen.queryByText(/Images were not analyzed — try again/i)).toBeNull();
    expect(screen.queryByText(/Analysis finished/i)).toBeNull();
  });

  it("recovers exact older Personal evidence from a Saved Run and waits for an explicit retry", async () => {
    mockSearchParams = { retryToolRunId: "night-run-1" };
    mockEvidenceAssets = [];
    mockGetToolRun.mockResolvedValue({
      id: "night-run-1",
      _id: "night-run-1",
      toolType: "species_crop_id",
      inputs: {
        evidenceAssetIds: ["older-night-photo-1", "night-frame-1", "night-video-1"],
        imageAnalysis: { evidenceUsed: ["older-night-photo-1", "night-frame-1"] },
        mediaEvidence: [
          { id: "older-night-photo-1", type: "photo" },
          { id: "night-frame-1", type: "photo" },
          { id: "night-video-1", type: "video" }
        ]
      }
    });
    mockListEvidenceAssets.mockResolvedValue([
      {
        id: "recent-unrelated-photo",
        assetType: "photo",
        originalUri: "file:///recent-unrelated-photo.jpg",
        durableUrl: "/protected/recent-unrelated-photo.jpg",
        uploadStatus: "uploaded",
        source: "library",
        purpose: "crop_identification",
        qualityWarnings: []
      }
    ]);
    mockGetEvidenceAssetsByIds.mockResolvedValue([
      {
        id: "night-video-1",
        assetType: "video",
        originalUri: "file:///night-video.mov",
        durableUrl: "/protected/night-video.mov",
        uploadStatus: "uploaded",
        source: "library",
        aiUsable: false,
        purpose: "crop_identification",
        qualityWarnings: []
      },
      {
        id: "night-frame-1",
        assetType: "photo",
        originalUri: "file:///night-frame.jpg",
        durableUrl: "/protected/night-frame.jpg",
        uploadStatus: "uploaded",
        source: "generated",
        sourceVideoEvidenceAssetId: "night-video-1",
        aiUsable: true,
        purpose: "crop_identification",
        qualityWarnings: []
      },
      {
        id: "older-night-photo-1",
        assetType: "photo",
        originalUri: "file:///older-night-photo.jpg",
        durableUrl: "/protected/older-night-photo.jpg",
        uploadStatus: "uploaded",
        source: "library",
        aiUsable: true,
        purpose: "crop_identification",
        qualityWarnings: []
      }
    ]);

    const screen = render(<SpeciesCropIdToolRoute />);

    expect(
      await screen.findByText(
        /Recovered 2 saved photos and 1 private source video.*press Identify Plant from Photos/i
      )
    ).toBeTruthy();
    expect(mockGetToolRun).toHaveBeenCalledWith("night-run-1", {
      workspaceType: "personal"
    });
    expect(mockGetEvidenceAssetsByIds).toHaveBeenCalledWith(
      ["older-night-photo-1", "night-frame-1", "night-video-1"],
      { workspaceType: "personal" }
    );
    expect(mockListEvidenceAssets).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /Retain on remove: older-night-photo-1,night-frame-1,night-video-1/i
      )
    ).toBeTruthy();
    expect(mockAskPersonalAssistant).not.toHaveBeenCalled();
    expect(mockRunCalculator).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceAssetIds: ["older-night-photo-1", "night-frame-1", "night-video-1"]
        })
      )
    );
  });

  it.each([
    [
      "is not AI-approved",
      {
        assetType: "photo",
        purpose: "crop_identification",
        uploadStatus: "uploaded",
        durableUrl: "/protected/saved-photo.jpg",
        aiUsable: false
      },
      /not approved for AI analysis.*Nothing was loaded/i
    ],
    [
      "is not fully uploaded",
      {
        assetType: "photo",
        purpose: "crop_identification",
        uploadStatus: "uploading",
        durableUrl: "/protected/saved-photo.jpg",
        aiUsable: true
      },
      /no longer fully uploaded and available.*Nothing was loaded/i
    ],
    [
      "has no durable reference",
      {
        assetType: "photo",
        purpose: "crop_identification",
        uploadStatus: "uploaded",
        durableUrl: "   ",
        aiUsable: true
      },
      /no longer fully uploaded and available.*Nothing was loaded/i
    ],
    [
      "belongs to another workflow",
      {
        assetType: "photo",
        purpose: "diagnosis",
        uploadStatus: "uploaded",
        durableUrl: "/protected/saved-photo.jpg",
        aiUsable: true
      },
      /belongs to another workflow.*Nothing was loaded/i
    ],
    [
      "no longer has the recorded photo type",
      {
        assetType: "video",
        purpose: "crop_identification",
        uploadStatus: "uploaded",
        durableUrl: "/protected/saved-photo.jpg",
        aiUsable: false
      },
      /saved Plant ID photo no longer has the expected media type.*Nothing was loaded/i
    ]
  ] as Array<[string, Record<string, any>, RegExp]>)(
    "loads none of a Saved Run when exact evidence %s",
    async (_label, asset, error) => {
      mockSearchParams = { retryToolRunId: "saved-run-with-ineligible-evidence" };
      mockEvidenceAssets = [];
      mockGetToolRun.mockResolvedValue({
        id: "saved-run-with-ineligible-evidence",
        _id: "saved-run-with-ineligible-evidence",
        toolType: "species_crop_id",
        inputs: {
          evidenceAssetIds: ["saved-photo-1"],
          imageAnalysis: { evidenceUsed: ["saved-photo-1"] },
          mediaEvidence: [{ id: "saved-photo-1", type: "photo" }]
        }
      });
      mockGetEvidenceAssetsByIds.mockResolvedValue([
        {
          id: "saved-photo-1",
          originalUri: "file:///saved-photo.jpg",
          source: "library",
          qualityWarnings: [],
          ...asset
        }
      ]);

      const screen = render(<SpeciesCropIdToolRoute />);

      expect(await screen.findByText(error)).toBeTruthy();
      expect(screen.queryByText(/Recovered 1 saved photo/i)).toBeNull();
      expect(screen.getByText("Retain on remove:")).toBeTruthy();

      fireEvent.press(screen.getByText("Identify Plant from Photos"));
      expect(mockAskPersonalAssistant).not.toHaveBeenCalled();
      expect(mockRunCalculator).not.toHaveBeenCalled();
    }
  );

  it("sends a generated frame with its source video so the server can verify lineage", async () => {
    mockSearchParams = {};
    mockEvidenceAssets = [
      {
        id: "frame-photo-1",
        _id: "frame-photo-1",
        assetType: "photo",
        source: "generated",
        sourceVideoEvidenceAssetId: "source-video-1",
        durableUrl: "https://example.com/extracted-frame.jpg",
        uploadStatus: "uploaded",
        purpose: "other",
        qualityWarnings: []
      },
      {
        id: "source-video-1",
        _id: "source-video-1",
        assetType: "video",
        source: "upload",
        durableUrl: "https://example.com/source-video.mov",
        uploadStatus: "uploaded",
        purpose: "other",
        qualityWarnings: []
      }
    ];
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Mustard",
        scientificName: "Brassica spp.",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "medium"
      }),
      provider: "openai",
      evidenceUsed: ["frame-photo-1"],
      mediaAnalysis: { photosAnalyzed: 1 },
      analysisReceipt: {
        aiUsageEventId: "usage-frame-1",
        normalizedPlantIdResultDigest: "digest-frame-1",
        evidenceFingerprint: "frame-photo-1|source-video-1",
        reviewPolicyVersion: "plant-id-night-light-detail-v2"
      }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceAssetIds: ["frame-photo-1", "source-video-1"]
        })
      )
    );
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          evidenceAssetIds: ["frame-photo-1", "source-video-1"],
          mediaEvidence: expect.arrayContaining([
            expect.objectContaining({ id: "frame-photo-1", type: "photo" }),
            expect.objectContaining({ id: "source-video-1", type: "video" })
          ]),
          imageAnalysis: expect.objectContaining({
            photoCount: 1,
            photosAnalyzed: 1,
            stillImagesAnalyzed: 1,
            videoFramesAnalyzed: 1,
            videosAttached: 1,
            videosAnalyzed: 0,
            aiUsageEventId: "usage-frame-1",
            normalizedPlantIdResultDigest: "digest-frame-1",
            evidenceFingerprint: "frame-photo-1|source-video-1",
            reviewPolicyVersion: "plant-id-night-light-detail-v2"
          })
        })
      )
    );
  });

  it("scopes facility AI and saved runs while preserving only actual manual input provenance", async () => {
    mockSearchParams = {
      workspace: "facility",
      facilityId: "facility-1",
      growId: "personal-grow-secret",
      plantId: "personal-plant-secret",
      fieldStudyId: "personal-study-secret"
    };
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Roadside flowering plant",
        scientificName: "",
        habitat: "disturbed roadside edge",
        growthHabit: "herb",
        leafMargin: "serrated",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "low"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 },
      analysisReceipt: {
        aiUsageEventId: "usage-facility-1",
        normalizedPlantIdResultDigest: "digest-facility-1",
        evidenceFingerprint: "evidence-1",
        reviewPolicyVersion: "plant-id-night-light-detail-v2"
      }
    });
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(
      screen.getByLabelText("Species / Crop Identification Growth habit: Herb")
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Location or region"),
      "Baltimore County, Maryland"
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceType: "facility",
          facilityId: "facility-1",
          evidenceAssetIds: ["evidence-1"],
          context: expect.objectContaining({
            workspaceType: "facility",
            facilityId: "facility-1"
          })
        })
      )
    );
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          workspaceType: "facility",
          facilityId: "facility-1",
          manualInputProvenance: {
            source: "user_entry",
            morphology: { growthHabit: "herb" },
            observationContext: { region: "Baltimore County, Maryland" }
          },
          imageAnalysis: expect.objectContaining({
            aiUsageEventId: "usage-facility-1",
            normalizedPlantIdResultDigest: "digest-facility-1"
          })
        })
      )
    );
    expect(mockUseToolPlantContext).toHaveBeenCalledWith("", "", false);
    expect(mockListPersonalGrows).not.toHaveBeenCalled();
    expect(mockListFieldStudies).not.toHaveBeenCalled();
    expect(mockCreateGrowpathModuleRecord).not.toHaveBeenCalled();
    expect(mockAskPersonalAssistant.mock.calls[0][0].growId).toBeUndefined();
    expect(mockAskPersonalAssistant.mock.calls[0][0].plantId).toBeUndefined();
    expect(mockRunCalculator.mock.calls[0][1].growId).not.toBe("personal-grow-secret");
    expect(screen.queryByText("Optional: add to a Field Study or Nature")).toBeNull();
    expect(screen.queryByText("Confirm & Save to Grow")).toBeNull();
    expect(screen.queryByText("Create Crop Identity Tasks")).toBeNull();
    expect(
      screen.getByText(
        /This result remains in the current facility workspace's Saved Runs/i
      )
    ).toBeTruthy();
  });

  it("keeps commercial Plant ID out of Personal records even with hostile route context", async () => {
    mockSearchParams = {
      commercialAccountId: "commercial-1",
      retryToolRunId: "personal-run-secret",
      growId: "personal-grow-secret",
      plantId: "personal-plant-secret",
      fieldStudyId: "personal-study-secret"
    };
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() => expect(mockAskPersonalAssistant).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceType: "commercial" })
    );
    expect(mockRunCalculator).toHaveBeenCalledWith(
      "species-crop-id",
      expect.objectContaining({ workspaceType: "commercial" })
    );
    expect(mockListToolRuns).toHaveBeenCalledWith({
      toolType: "species-crop-id",
      workspaceType: "commercial"
    });
    expect(mockAskPersonalAssistant.mock.calls[0][0]).not.toEqual(
      expect.objectContaining({
        commercialAccountId: expect.anything(),
        workspaceId: expect.anything()
      })
    );
    expect(mockRunCalculator.mock.calls[0][1]).not.toEqual(
      expect.objectContaining({
        commercialAccountId: expect.anything(),
        workspaceId: expect.anything()
      })
    );
    expect(mockUseToolPlantContext).toHaveBeenCalledWith("", "", false);
    expect(mockListPersonalGrows).not.toHaveBeenCalled();
    expect(mockListFieldStudies).not.toHaveBeenCalled();
    expect(mockGetToolRun).not.toHaveBeenCalled();
    expect(mockGetEvidenceAssetsByIds).not.toHaveBeenCalled();
    expect(mockListEvidenceAssets).not.toHaveBeenCalled();
    expect(mockCreateGrowpathModuleRecord).not.toHaveBeenCalled();
    expect(mockRunCalculator.mock.calls[0][1].growId).not.toBe("personal-grow-secret");
    expect(screen.queryByText("Optional: add to a Field Study or Nature")).toBeNull();
    expect(screen.queryByText("Confirm & Save to Grow")).toBeNull();
    expect(screen.queryByText("Create Crop Identity Tasks")).toBeNull();
    expect(
      screen.getByText(
        /This result remains in the current commercial workspace's Saved Runs/i
      )
    ).toBeTruthy();
  });

  it("clears Personal state when authenticated mode changes on the mounted route", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Private personal draft"
    );
    openLocationAndSharing(screen);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(screen.getByText("Confirm & Save to Grow")).toBeTruthy());
    await waitFor(() => expect(mockListFieldStudies).toHaveBeenCalledTimes(1));

    mockEvidenceAssets = [];
    mockSearchParams = {};
    mockEntitlementMode = "commercial";
    mockListPersonalGrows.mockClear();
    mockListFieldStudies.mockClear();
    screen.rerender(<SpeciesCropIdToolRoute />);

    await waitFor(() => expect(screen.queryByText("Confirm & Save to Grow")).toBeNull());
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("");
    expect(screen.queryByText("Optional: add to a Field Study or Nature")).toBeNull();
    expect(screen.getByText(/current commercial workspace's Saved Runs/i)).toBeTruthy();
    expect(mockUseToolPlantContext).toHaveBeenLastCalledWith("", "", false);
    expect(mockListPersonalGrows).not.toHaveBeenCalled();
    expect(mockListFieldStudies).not.toHaveBeenCalled();
  });

  it("withholds a crop name and forces low confidence when the submitted views are limited", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Cabbage",
        scientificName: "Brassica oleracea",
        commonNames: "Cabbage",
        imageAnalysisPerformed: "true",
        imageQuality: "limited",
        visualConfidence: "medium",
        candidates: [
          {
            scientificName: "Brassica oleracea",
            commonNames: ["Cabbage"],
            rank: "species",
            confidence: "medium"
          }
        ]
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 },
      limitations: ["Direct flash and deep shadow obscure diagnostic leaf detail."]
    });
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Cabbage",
        scientificName: "Brassica oleracea",
        confidence: "low",
        userConfirmationRequired: true,
        imageAnalysis: {
          requested: true,
          performed: true,
          quality: "limited",
          confidence: "low",
          photosAnalyzed: 1,
          limitations: ["Direct flash and deep shadow obscure diagnostic leaf detail."]
        }
      },
      toolRun: { id: "toolrun-limited-1", _id: "toolrun-limited-1" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          userEnteredName: "",
          scientificName: "",
          commonNames: "",
          imageAnalysis: expect.objectContaining({
            performed: true,
            quality: "limited",
            confidence: "low",
            limitations: expect.arrayContaining([
              "Direct flash and deep shadow obscure diagnostic leaf detail."
            ])
          }),
          identificationDraft: expect.objectContaining({
            candidates: [],
            requiredNextPhotos: expect.arrayContaining([
              expect.stringMatching(/even daylight or diffuse light/i)
            ])
          })
        })
      )
    );
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("");
    expect(await screen.findByText("Analysis finished — retake required")).toBeTruthy();
    expect(
      screen.getByText(/No plant name was accepted from this evidence/i)
    ).toBeTruthy();
    expect(screen.queryByText("Candidate found: Cabbage")).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm in Saved Run" })).toBeDisabled();
  });

  it("distinguishes an unavailable image review from evidence that needs a retake", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "",
        scientificName: "",
        commonNames: "",
        imageAnalysisPerformed: "false",
        imageQuality: "unusable",
        visualConfidence: "low",
        candidates: []
      }),
      provider: "openai",
      evidenceUsed: [],
      mediaAnalysis: { photosAnalyzed: 0 },
      limitations: ["Image analysis did not complete."]
    });
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "unknown crop",
        confidence: "low",
        userConfirmationRequired: true,
        imageAnalysis: {
          requested: true,
          performed: false,
          quality: "unusable",
          confidence: "low",
          photosAnalyzed: 0,
          limitations: ["Image analysis did not complete."]
        }
      },
      toolRun: { id: "toolrun-provider-failure", _id: "toolrun-provider-failure" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    expect(await screen.findByText("Images were not analyzed — try again")).toBeTruthy();
    expect(screen.getByText(/uploaded evidence is still attached/i)).toBeTruthy();
    expect(screen.queryByText(/retake required/i)).toBeNull();
  });

  it("removes the prior result when a same-evidence AI retry fails", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose"
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    expect(await screen.findByText("Candidate found: Cannabis")).toBeTruthy();
    expect(
      screen.getByLabelText("Species / Crop Identification Scientific name, if known")
        .props.value
    ).toBe("Cannabis sativa");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Identify Plant from Photos" })
      ).not.toBeDisabled()
    );

    mockAskPersonalAssistant.mockRejectedValueOnce(
      new Error("Nighttime image review could not be completed.")
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    expect(
      await screen.findByText("Nighttime image review could not be completed.")
    ).toBeTruthy();
    expect(screen.queryByText("Candidate found: Cannabis")).toBeNull();
    expect(screen.queryByText("Species / Crop Identification result")).toBeNull();
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("Rose");
    expect(
      screen.getByLabelText("Species / Crop Identification Scientific name, if known")
        .props.value
    ).toBe("");
    expect(mockRunCalculator).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["blank", ""],
    ["malformed", '```json\n{"userEnteredName":"Cannabis"\n```']
  ])(
    "keeps uploaded evidence ready to retry when the AI returns a %s response",
    async (_label, reply) => {
      mockSearchParams = {};
      mockAskPersonalAssistant.mockResolvedValueOnce({
        success: true,
        reply,
        provider: "openai",
        evidenceUsed: ["evidence-1"],
        mediaAnalysis: { photosAnalyzed: 1 }
      });
      const screen = render(<SpeciesCropIdToolRoute />);

      fireEvent.press(screen.getByText("Identify Plant from Photos"));

      expect(
        await screen.findByText(/could not read the AI identification response/i)
      ).toBeTruthy();
      expect(screen.getByText(/uploaded evidence is still attached/i)).toBeTruthy();
      expect(mockRunCalculator).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Identify Plant from Photos" })
        ).not.toBeDisabled()
      );
    }
  );

  it("keeps an illuminated nighttime cannabis view as a usable unconfirmable candidate", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Cannabis",
        scientificName: "Cannabis sativa",
        commonNames: "Cannabis",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "medium",
        candidates: [
          {
            scientificName: "Cannabis spp.",
            commonNames: ["Cannabis"],
            rank: "genus",
            confidence: "medium"
          }
        ]
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 },
      limitations: [
        "Nighttime phone-light illumination is present, but sharp bracts, pistils, sugar leaves, and inflorescence structure remain visible."
      ]
    });
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Cannabis",
        scientificName: "Cannabis spp.",
        confidence: "medium",
        userConfirmationRequired: true,
        candidates: [
          {
            scientificName: "Cannabis spp.",
            commonNames: ["Cannabis"],
            rank: "genus",
            confidence: "medium"
          }
        ],
        imageAnalysis: {
          requested: true,
          performed: true,
          quality: "usable",
          // Even if an older calculator incorrectly upgrades the response,
          // the original medium-confidence image review must keep confirmation off.
          confidence: "high",
          photosAnalyzed: 1
        }
      },
      toolRun: { id: "toolrun-medium-1", _id: "toolrun-medium-1" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          userEnteredName: "",
          scientificName: "",
          commonNames: "",
          identityInputProvenance: {
            source: "user_entry",
            providedFields: [],
            userEnteredName: "",
            scientificName: "",
            commonNames: [],
            cultivar: ""
          },
          identificationDraft: expect.objectContaining({
            candidates: [
              expect.objectContaining({
                scientificName: "Cannabis spp.",
                commonNames: ["Cannabis"],
                confidence: "medium"
              })
            ]
          }),
          imageAnalysis: expect.objectContaining({
            performed: true,
            quality: "usable",
            confidence: "medium"
          })
        })
      )
    );
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("");
    expect(await screen.findByText("Candidate found: Cannabis")).toBeTruthy();
    expect(
      screen.getByText(/Nighttime or phone-light evidence is accepted/i)
    ).toBeTruthy();
    expect(screen.queryByText(/retake required/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm in Saved Run" })).toBeDisabled();
  });

  it("shows a crop-level candidate when artificial lighting limits exact certainty but preserves diagnostic structure", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "",
        scientificName: "",
        commonNames: "",
        imageAnalysisPerformed: "true",
        imageQuality: "limited",
        visualConfidence: "low",
        identifyingVisualTraits:
          "Sharp bracts, pistils, resinous sugar leaves, and inflorescence structure remain visible under phone light.",
        candidates: [
          {
            scientificName: "Cannabis spp.",
            commonNames: ["Cannabis"],
            rank: "genus",
            confidence: "low",
            evidence: ["Visible bracts, pistils, and resinous sugar leaves"],
            missingEvidence: ["Neutral-light whole-plant view"]
          }
        ],
        requiredNextPhotos: ["Add a neutral-light whole-plant view."]
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 },
      limitations: ["Phone light limits exact color confidence."]
    });
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "unknown crop",
        confidence: "low",
        identityEvidenceStatus: "candidate_only",
        userConfirmationRequired: true,
        candidates: [
          {
            scientificName: "Cannabis sativa",
            commonNames: ["Cannabis"],
            rank: "species",
            confidence: "medium",
            evidence: ["Visible bracts, pistils, and resinous sugar leaves"]
          }
        ],
        imageAnalysis: {
          requested: true,
          performed: true,
          quality: "limited",
          confidence: "low",
          retakeRequired: false,
          photosAnalyzed: 1
        }
      },
      toolRun: { id: "limited-cannabis-candidate", _id: "limited-cannabis-candidate" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    expect(
      await screen.findByText("Candidate found: Cannabis — more evidence needed")
    ).toBeTruthy();
    expect(screen.getByText(/lighting limits exact certainty/i)).toBeTruthy();
    expect(screen.queryByText(/No plant name was accepted/i)).toBeNull();
    expect(screen.queryByText("Cannabis sativa")).toBeNull();
    expect(screen.getAllByText("Cannabis spp.").length).toBeGreaterThan(0);
  });

  it("honors the server confirmation block and shows its reason", async () => {
    mockSearchParams = {};
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Cannabis",
        scientificName: "Cannabis sativa",
        confidence: "high",
        confirmationAvailable: false,
        confirmationBlockedReason:
          "Add evenly lit diagnostic views before confirming this identity.",
        imageAnalysis: {
          requested: true,
          performed: true,
          quality: "usable",
          confidence: "high",
          photosAnalyzed: 1
        }
      },
      toolRun: { id: "toolrun-server-block-1", _id: "toolrun-server-block-1" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    expect(
      await screen.findByText(
        "Confirmation unavailable: Add evenly lit diagnostic views before confirming this identity."
      )
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm in Saved Run" })).toBeDisabled();
  });

  it("allows a server-approved user Rose claim when attached images were not analyzed", async () => {
    mockSearchParams = {};
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Rose",
        confidence: "low",
        confirmationAvailable: true,
        imageAnalysis: {
          requested: true,
          performed: false,
          quality: "unusable",
          confidence: "low",
          photosAnalyzed: 0
        }
      },
      toolRun: { id: "toolrun-user-rose-unseen", _id: "toolrun-user-rose-unseen" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));

    expect(
      await screen.findByText(
        "User-entered identity: Rose. The attached images did not visually verify this identity. Confirmation saves the explicit user entry, not the AI candidate."
      )
    ).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm in Saved Run" });
    expect(confirm).not.toBeDisabled();
    fireEvent.press(confirm);
    await waitFor(() =>
      expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith(
        "toolrun-user-rose-unseen",
        { decision: "accepted" }
      )
    );
  });

  it("lets a user Rose correction override a conflicting medium AI Cabbage candidate", async () => {
    mockSearchParams = {};
    mockListToolRuns.mockResolvedValueOnce([
      {
        id: "prior-ai-pepper",
        toolName: "species-crop-id",
        inputs: {
          imageAnalysis: {
            requested: true,
            performed: true,
            quality: "usable",
            confidence: "medium",
            evidenceUsed: ["evidence-1"],
            evidenceFingerprint: "evidence-1"
          },
          identificationDraft: {
            candidates: [
              {
                scientificName: "Piper nigrum",
                commonNames: ["Black pepper"],
                confidence: "medium"
              }
            ]
          }
        }
      }
    ]);
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Cabbage",
        scientificName: "Brassica oleracea",
        commonNames: "Cabbage",
        candidates: [
          {
            scientificName: "Brassica oleracea",
            commonNames: ["Cabbage"],
            rank: "species",
            confidence: "medium"
          }
        ],
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "medium"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 }
    });
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Cabbage",
        scientificName: "Brassica oleracea",
        confidence: "low",
        confirmationAvailable: true,
        identityConflictDetected: true,
        imageAnalysis: {
          requested: true,
          performed: true,
          quality: "limited",
          confidence: "low",
          photosAnalyzed: 1,
          limitations: [
            "A repeated review of the same unchanged evidence produced a conflicting identity or unsupported quality/confidence upgrade."
          ]
        }
      },
      toolRun: { id: "toolrun-user-rose-medium", _id: "toolrun-user-rose-medium" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose"
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    expect(
      await screen.findByText(
        "User-entered identity: Rose. The attached images did not visually verify this identity. Confirmation saves the explicit user entry, not the AI candidate."
      )
    ).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm in Saved Run" });
    expect(confirm).not.toBeDisabled();
    fireEvent.press(confirm);
    await waitFor(() =>
      expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith(
        "toolrun-user-rose-medium",
        { decision: "accepted" }
      )
    );
  });

  it("does not feed a prior AI identity back as user context and downgrades a contradictory same-evidence rerun", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant
      .mockResolvedValueOnce({
        success: true,
        reply: JSON.stringify({
          userEnteredName: "Not confirmed",
          scientificName: "",
          commonNames: "",
          candidates: [
            {
              scientificName: "Piper nigrum",
              commonNames: ["Black pepper"],
              rank: "species",
              confidence: "medium"
            }
          ],
          imageAnalysisPerformed: "true",
          imageQuality: "usable",
          visualConfidence: "medium"
        }),
        provider: "openai",
        evidenceUsed: ["evidence-1"],
        mediaAnalysis: { photosAnalyzed: 1 }
      })
      .mockResolvedValueOnce({
        success: true,
        reply: JSON.stringify({
          userEnteredName: "Not confirmed",
          scientificName: "",
          commonNames: "",
          candidates: [
            {
              scientificName: "Brassica oleracea",
              commonNames: ["Cabbage"],
              rank: "species",
              confidence: "medium"
            }
          ],
          imageAnalysisPerformed: "true",
          imageQuality: "usable",
          visualConfidence: "medium"
        }),
        provider: "openai",
        evidenceUsed: ["evidence-1"],
        mediaAnalysis: { photosAnalyzed: 1 }
      });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Identify Plant from Photos" })
      ).not.toBeDisabled()
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() => expect(mockAskPersonalAssistant).toHaveBeenCalledTimes(2));
    expect(mockAskPersonalAssistant.mock.calls[1][0].message).not.toContain(
      "Black pepper"
    );
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(2));
    expect(mockRunCalculator.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        userEnteredName: "",
        scientificName: "",
        commonNames: "",
        imageAnalysis: expect.objectContaining({
          quality: "limited",
          confidence: "low",
          limitations: expect.arrayContaining([
            expect.stringMatching(
              /same unchanged evidence produced a conflicting identity/i
            )
          ])
        }),
        identificationDraft: expect.objectContaining({
          counterEvidence: expect.arrayContaining([
            expect.stringMatching(
              /same unchanged evidence produced a conflicting identity/i
            )
          ])
        })
      })
    );
  });

  it("does not create a conflict when identical candidate identities are reordered", async () => {
    mockSearchParams = {};
    const candidateReply = (commonNames: string[]) => ({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Not confirmed",
        scientificName: "",
        commonNames: "",
        candidates: [
          {
            scientificName: "Piper nigrum",
            commonNames,
            rank: "species",
            confidence: "medium"
          }
        ],
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "medium"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 }
    });
    mockAskPersonalAssistant
      .mockResolvedValueOnce(candidateReply(["Black pepper", "Pepper vine"]))
      .mockResolvedValueOnce(candidateReply(["Pepper vine", "Black pepper"]));

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(2));
    expect(mockRunCalculator.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        imageAnalysis: expect.objectContaining({
          quality: "usable",
          confidence: "medium",
          limitations: expect.not.arrayContaining([
            expect.stringMatching(/same unchanged evidence/i)
          ])
        }),
        identificationDraft: expect.objectContaining({
          candidates: [expect.objectContaining({ confidence: "medium" })]
        })
      })
    );
  });

  it("hydrates a prior saved weak review and blocks an unchanged-evidence promotion after reload", async () => {
    mockSearchParams = {};
    mockListToolRuns.mockResolvedValueOnce([
      {
        id: "prior-run-1",
        toolName: "species-crop-id",
        createdAt: "2026-08-05T12:00:00.000Z",
        inputs: {
          evidenceAssetIds: ["evidence-1"],
          imageAnalysis: {
            requested: true,
            performed: true,
            quality: "limited",
            confidence: "low",
            evidenceUsed: ["evidence-1"],
            evidenceFingerprint: "evidence-1",
            reviewPolicyVersion: "plant-id-night-light-detail-v2",
            limitations: ["Direct flash hid diagnostic detail."]
          },
          identificationDraft: {
            candidates: [
              {
                scientificName: "Piper nigrum",
                commonNames: ["Black pepper"],
                confidence: "low"
              }
            ]
          }
        }
      }
    ]);
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Black pepper",
        scientificName: "Piper nigrum",
        commonNames: "Black pepper",
        candidates: [
          {
            scientificName: "Piper nigrum",
            commonNames: ["Black pepper"],
            rank: "species",
            confidence: "high"
          }
        ],
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "high"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() => expect(mockListToolRuns).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          userEnteredName: "",
          scientificName: "",
          imageAnalysis: expect.objectContaining({
            quality: "limited",
            confidence: "low",
            limitations: expect.arrayContaining([
              expect.stringMatching(/same unchanged evidence/i)
            ])
          })
        })
      )
    );
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("");
  });

  it("reevaluates a legacy lighting rejection once under the detail-aware policy", async () => {
    mockSearchParams = {};
    mockListToolRuns.mockResolvedValueOnce([
      {
        id: "prior-legacy-lighting-run",
        toolName: "species-crop-id",
        inputs: {
          evidenceAssetIds: ["evidence-1"],
          imageAnalysis: {
            requested: true,
            performed: true,
            quality: "limited",
            confidence: "low",
            evidenceUsed: ["evidence-1"],
            evidenceFingerprint: "evidence-1",
            limitations: ["Nighttime phone light was treated as unusable."]
          },
          identificationDraft: { candidates: [] }
        }
      }
    ]);
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Cannabis",
        scientificName: "Cannabis spp.",
        commonNames: "Cannabis",
        candidates: [
          {
            scientificName: "Cannabis spp.",
            commonNames: ["Cannabis"],
            rank: "genus",
            confidence: "high"
          }
        ],
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "high"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 },
      limitations: [
        "Phone-light illumination is present, but diagnostic bracts, pistils, and inflorescence structure remain sharp."
      ]
    });
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Cannabis",
        scientificName: "Cannabis spp.",
        confidence: "high",
        userConfirmationRequired: true,
        imageAnalysis: {
          requested: true,
          performed: true,
          quality: "usable",
          confidence: "high",
          photosAnalyzed: 1,
          reviewPolicyVersion: "plant-id-night-light-detail-v2",
          previousReviewPolicyVersion: "legacy",
          reassessedUnderUpdatedPolicy: true,
          limitations: [
            "This unchanged evidence was reassessed under an updated nighttime-lighting policy. Compare this result with the prior review and explicitly confirm or reject the new candidate."
          ]
        }
      },
      toolRun: { id: "legacy-reassessment-run", _id: "legacy-reassessment-run" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          userEnteredName: "Cannabis",
          scientificName: "Cannabis spp.",
          imageAnalysis: expect.objectContaining({
            quality: "usable",
            confidence: "high",
            reviewPolicyVersion: "plant-id-night-light-detail-v2",
            limitations: expect.not.arrayContaining([
              expect.stringMatching(/same unchanged evidence/i)
            ])
          })
        })
      )
    );
    expect(
      await screen.findByText(
        /same evidence was reevaluated under the corrected lighting policy/i
      )
    ).toBeTruthy();
  });

  it("keeps a user Rose claim separate from an identical saved and rerun Cabbage candidate", async () => {
    mockSearchParams = {};
    mockListToolRuns.mockResolvedValueOnce([
      {
        id: "prior-run-user-rose",
        toolName: "species-crop-id",
        inputs: {
          userEnteredName: "Rose",
          scientificName: "Rosa",
          commonNames: "Rose",
          identityInputProvenance: {
            source: "user_entry",
            providedFields: ["userEnteredName", "scientificName", "commonNames"],
            userEnteredName: "Rose",
            scientificName: "Rosa",
            commonNames: ["Rose"],
            cultivar: ""
          },
          evidenceAssetIds: ["evidence-1"],
          imageAnalysis: {
            requested: true,
            performed: true,
            quality: "usable",
            confidence: "medium",
            evidenceUsed: ["evidence-1"],
            evidenceFingerprint: "evidence-1",
            limitations: []
          },
          identificationDraft: {
            candidates: [
              {
                scientificName: "Brassica oleracea",
                commonNames: ["Cabbage"],
                confidence: "medium"
              }
            ]
          }
        }
      }
    ]);
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Cabbage",
        scientificName: "Brassica oleracea",
        commonNames: "Cabbage",
        candidates: [
          {
            scientificName: "Brassica oleracea",
            commonNames: ["Cabbage"],
            rank: "species",
            confidence: "medium"
          }
        ],
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "medium"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose"
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    const payload = mockRunCalculator.mock.calls[0][1];
    expect(payload).toEqual(
      expect.objectContaining({
        userEnteredName: "Rose",
        identityInputProvenance: expect.objectContaining({
          providedFields: ["userEnteredName"],
          userEnteredName: "Rose"
        }),
        imageAnalysis: expect.objectContaining({
          quality: "usable",
          confidence: "medium",
          limitations: expect.not.arrayContaining([
            expect.stringMatching(/same unchanged evidence/i)
          ])
        }),
        identificationDraft: expect.objectContaining({
          candidates: [
            expect.objectContaining({
              scientificName: "Brassica oleracea",
              commonNames: ["Cabbage"],
              confidence: "medium"
            })
          ]
        })
      })
    );
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("Rose");
  });

  it("prevents an unchanged weak result from being upgraded to a named medium-confidence run", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant
      .mockResolvedValueOnce({
        success: true,
        reply: JSON.stringify({
          userEnteredName: "Unknown crop",
          scientificName: "",
          commonNames: "",
          imageAnalysisPerformed: "true",
          imageQuality: "limited",
          visualConfidence: "low"
        }),
        provider: "openai",
        evidenceUsed: ["evidence-1"],
        mediaAnalysis: { photosAnalyzed: 1 }
      })
      .mockResolvedValueOnce({
        success: true,
        reply: JSON.stringify({
          userEnteredName: "Cabbage",
          scientificName: "Brassica oleracea",
          commonNames: "Cabbage",
          imageAnalysisPerformed: "true",
          imageQuality: "usable",
          visualConfidence: "medium"
        }),
        provider: "openai",
        evidenceUsed: ["evidence-1"],
        mediaAnalysis: { photosAnalyzed: 1 }
      });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Identify Plant from Photos" })
      ).not.toBeDisabled()
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(2));

    expect(mockRunCalculator.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        userEnteredName: "",
        imageAnalysis: expect.objectContaining({
          performed: true,
          quality: "limited",
          confidence: "low"
        })
      })
    );
  });

  it("shows a defensible non-cannabis common candidate when exact species is uncertain", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Not confirmed",
        scientificName: "",
        cultivar: "",
        commonNames: "Mint",
        identificationNotes:
          "Flower clusters and a leafy stem suggest a mint-family plant; exact species remains uncertain.",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "medium",
        identifyingVisualTraits:
          "Flower clusters on a leafy stem suggest a mint-family plant."
      }),
      provider: "openai",
      providerLabel: "OpenAI vision crop identity",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: {
        requested: true,
        photosAttached: 1,
        photosAnalyzed: 1,
        status: "completed",
        providerModel: "gpt-4o-mini"
      },
      limitations: ["Exact mint species cannot be confirmed from these views."]
    });
    mockRunCalculator.mockResolvedValue({
      outputs: {
        likelyCrop: "unknown crop",
        commonNames: [],
        scientificName: null,
        confidence: "medium",
        userConfirmationRequired: true,
        candidates: [
          {
            scientificName: null,
            commonNames: ["Mint"],
            rank: "working_candidate",
            confidence: "medium",
            evidence: ["Flower clusters on a leafy stem"],
            counterEvidence: ["Exact species is unresolved"],
            missingEvidence: ["Sharper flower and stem-node views"]
          }
        ],
        identifyingVisualTraits:
          "Flower clusters on a leafy stem suggest a mint-family plant.",
        imageAnalysis: {
          requested: true,
          performed: true,
          photosAnalyzed: 1,
          providerLabel: "OpenAI vision crop identity",
          providerModel: "gpt-4o-mini",
          confidence: "medium",
          quality: "usable",
          evidenceUsed: ["evidence-1"]
        }
      },
      toolRun: { id: "toolrun-mint-1", _id: "toolrun-mint-1" }
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          userEnteredName: "",
          scientificName: "",
          userConfirmed: false,
          identificationDraft: expect.objectContaining({
            candidates: [
              expect.objectContaining({
                commonNames: ["Mint"],
                rank: "working_candidate",
                confidence: "medium"
              })
            ]
          }),
          imageAnalysis: expect.objectContaining({
            performed: true,
            confidence: "medium"
          })
        })
      )
    );
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("");
    expect(await screen.findByText(/1\.\s*Mint/)).toBeTruthy();
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
  });

  it("does not submit a common-name phrase as a scientific name", async () => {
    mockSearchParams = {};
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Cotton plant",
        scientificName: "Rose plant",
        cultivar: "",
        commonNames: "Cotton plant",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "high",
        identifyingVisualTraits: "A woody branch and one pod-like structure.",
        candidates: [
          {
            scientificName: "Rose plant",
            commonNames: ["Cotton plant"],
            rank: "species",
            confidence: "medium"
          }
        ]
      }),
      provider: "openai",
      providerLabel: "OpenAI vision crop identity",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: {
        requested: true,
        photosAttached: 1,
        photosAnalyzed: 1,
        status: "completed",
        providerModel: "gpt-4o-mini"
      },
      limitations: ["Exact identity requires leaf, flower, and fruit detail."]
    });

    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          userEnteredName: "Cotton plant",
          scientificName: "",
          identificationDraft: expect.objectContaining({
            candidates: [
              expect.objectContaining({
                scientificName: "",
                rank: "working_candidate",
                confidence: "low",
                counterEvidence: expect.arrayContaining([
                  "The supplied scientific-name output was not a usable botanical name."
                ])
              })
            ]
          })
        })
      )
    );
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
  });

  it("creates crop identity tasks from species identification output", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Cannabis"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          growId: "grow-1",
          userEnteredName: "Cannabis",
          scientificName: ""
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Species / Crop Identification result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Crop Identity Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "species-crop-id",
          toolRunId: "toolrun-1",
          output: expect.objectContaining({
            likelyCrop: "Cannabis",
            userConfirmationRequired: true
          }),
          tasks: [
            expect.objectContaining({
              title: "Confirm crop identity",
              priority: "high",
              allDay: true,
              calendarType: "crop_identity_followup",
              sourceStage: "crop_identity_confirmation",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("cannabis-specific")
            }),
            expect.objectContaining({
              title: "Review crop-specific tool targets",
              sourceStage: "crop_tool_target_review",
              description: expect.stringContaining("VPD targets")
            }),
            expect.objectContaining({
              title: "Update grow or plant tags",
              sourceStage: "crop_profile_tag_update",
              description: expect.stringContaining("scientific name")
            })
          ]
        })
      )
    );
  });

  it("explicitly confirms and saves the result to the selected grow", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Cannabis"
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Scientific name, if known"),
      "Cannabis sativa"
    );
    fireEvent.changeText(
      screen.getByLabelText(
        "Species / Crop Identification Cultivar / variety from a label or source"
      ),
      "Bruce Banner"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          identityInputProvenance: {
            source: "user_entry",
            providedFields: ["userEnteredName", "scientificName", "cultivar"],
            userEnteredName: "Cannabis",
            scientificName: "Cannabis sativa",
            commonNames: [],
            cultivar: "Bruce Banner"
          }
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Confirm & Save to Grow")).toBeTruthy());
    fireEvent.press(screen.getByText("Confirm & Save to Grow"));

    await waitFor(() =>
      expect(mockSavePersonalGrowCropIdentity).toHaveBeenCalledWith(
        "grow-1",
        expect.objectContaining({
          cropCommonName: "Cannabis",
          scientificName: "Cannabis sativa",
          cultivar: "Bruce Banner",
          confidence: "user_confirmed",
          sourceToolRunId: "toolrun-1",
          userConfirmed: true
        })
      )
    );
    expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith("toolrun-1", {
      decision: "accepted"
    });
    expect(mockUpdatePlantIdCorrection.mock.invocationCallOrder[0]).toBeLessThan(
      mockSavePersonalGrowCropIdentity.mock.invocationCallOrder[0]
    );
    expect(screen.getByText("Confirmed crop identity saved to grow.")).toBeTruthy();
  });

  it("does not mutate a Personal grow when the authoritative Saved Run decision fails", async () => {
    mockUpdatePlantIdCorrection.mockResolvedValueOnce(null);
    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Cannabis"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));
    await waitFor(() => expect(screen.getByText("Confirm & Save to Grow")).toBeTruthy());

    fireEvent.press(screen.getByText("Confirm & Save to Grow"));

    expect(
      await screen.findByText("Unable to save this identification decision.")
    ).toBeTruthy();
    expect(mockSavePersonalGrowCropIdentity).not.toHaveBeenCalled();
    expect(mockSavePersonalPlantCropIdentity).not.toHaveBeenCalled();
    expect(mockUpdateGrowpathModuleRecord).not.toHaveBeenCalled();
    expect(screen.queryByText("Confirmed crop identity saved to grow.")).toBeNull();
  });

  it.each([
    ["Mark as Not Sure", "uncertain"],
    ["Mark as Doesn't Match", "rejected"]
  ])(
    "does not report success for %s when the Saved Run update returns null",
    async (label, decision) => {
      mockUpdatePlantIdCorrection.mockResolvedValueOnce(null);
      const screen = render(<SpeciesCropIdToolRoute />);
      fireEvent.changeText(
        screen.getByLabelText("Species / Crop Identification Plant or crop name"),
        "Cannabis"
      );
      fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));
      await waitFor(() => expect(screen.getByText(label)).toBeTruthy());

      fireEvent.press(screen.getByText(label));

      expect(
        await screen.findByText("Unable to save this identification decision.")
      ).toBeTruthy();
      expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith("toolrun-1", {
        decision
      });
      expect(mockUpdateGrowpathModuleRecord).not.toHaveBeenCalled();
      expect(screen.queryByText(/Saved as uncertain/i)).toBeNull();
      expect(screen.queryByText(/Saved as rejected/i)).toBeNull();
    }
  );

  it("submits click-based morphology and private observation context", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(
      screen.getByLabelText("Species / Crop Identification Growth habit: Herb")
    );
    fireEvent.press(
      screen.getByLabelText("Species / Crop Identification Wild or cultivated?: Wild")
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Location or region"),
      "Baltimore, Maryland"
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Habitat"),
      "Sunny disturbed roadside"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          morphology: expect.objectContaining({
            growthHabit: "herb"
          }),
          observationContext: expect.objectContaining({
            cultivationStatus: "wild",
            region: "Baltimore, Maryland",
            habitat: "Sunny disturbed roadside"
          })
        })
      )
    );
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
  });

  it("preserves user-entered protected context when AI returns conflicting values", async () => {
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Conflicting AI candidate",
        scientificName: "Rosa",
        cultivar: "Invented cultivar",
        cultivationStatus: "cultivated",
        region: "Invented region",
        observationDate: "2025-01-01",
        plantSize: "Invented size",
        sensoryTraits: "Invented smell",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "low"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 }
    });
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose bush"
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Scientific name, if known"),
      "Rosa"
    );
    fireEvent.changeText(
      screen.getByLabelText(
        "Species / Crop Identification Cultivar / variety from a label or source"
      ),
      "Nursery label 42"
    );
    fireEvent.press(
      screen.getByLabelText("Species / Crop Identification Wild or cultivated?: Wild")
    );
    fireEvent.press(
      screen.getByLabelText("Species / Crop Identification Growth habit: Shrub")
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Location or region"),
      "Baltimore County, Maryland"
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Habitat"),
      "Sunny roadside edge"
    );
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Approximate plant size"),
      "User measured 90 cm"
    );
    fireEvent.changeText(
      screen.getByLabelText(
        "Species / Crop Identification Smell, sap, texture, or other direct observations"
      ),
      "User observed thorny stems"
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          userEnteredName: "Rose bush",
          scientificName: "Rosa",
          cultivar: "Nursery label 42",
          observationContext: expect.objectContaining({
            cultivationStatus: "wild",
            region: "Baltimore County, Maryland",
            observationDate: "",
            habitat: "Sunny roadside edge",
            plantSize: "User measured 90 cm"
          }),
          morphology: expect.objectContaining({
            growthHabit: "shrub",
            sensoryTraits: ["User observed thorny stems"]
          })
        })
      )
    );
    expect(mockAskPersonalAssistant.mock.calls[0][0].message).toContain(
      "Do not populate cultivar, wild-versus-cultivated provenance, location or region"
    );
  });

  it("prefills defensible visible context but not measurements", async () => {
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Roadside flowering plant",
        scientificName: "",
        commonNames: "",
        setting: "outdoor",
        habitat: "disturbed roadside edge",
        substrate: "gravelly surface soil",
        associatedPlants: ["grasses", "broadleaf herbs"],
        plantSize: "about knee-high using the visible person for scale",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "low"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 }
    });
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          observationContext: expect.objectContaining({
            setting: "outdoor",
            habitat: "disturbed roadside edge",
            substrate: "gravelly surface soil",
            associatedPlants: ["grasses", "broadleaf herbs"],
            plantSize: ""
          })
        })
      )
    );
  });

  it("rejects prohibited fields from a noncompliant AI reply", async () => {
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: JSON.stringify({
        userEnteredName: "Roadside flowering plant",
        scientificName: "Rosa",
        cultivar: "Invented cultivar",
        cultivationStatus: "wild",
        region: "Invented exact location",
        observationDate: "2026-07-30",
        season: "summer",
        setting: "outdoor",
        habitat: "disturbed roadside edge",
        plantSize: "42 centimeters",
        sensoryTraits: "minty smell and milky sap",
        imageAnalysisPerformed: "true",
        imageQuality: "usable",
        visualConfidence: "low"
      }),
      provider: "openai",
      evidenceUsed: ["evidence-1"],
      mediaAnalysis: { photosAnalyzed: 1 }
    });
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          cultivar: "",
          observationContext: expect.objectContaining({
            cultivationStatus: "unknown",
            region: "",
            observationDate: "",
            setting: "outdoor",
            habitat: "disturbed roadside edge",
            plantSize: ""
          }),
          morphology: expect.objectContaining({ sensoryTraits: [] })
        })
      )
    );
  });

  it("invalidates AI results and restores manual-only fields when evidence changes", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Habitat"),
      "User-entered garden bed"
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(screen.getByText("Confirm & Save to Grow")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Replace test evidence"));

    await waitFor(() => expect(screen.queryByText("Confirm & Save to Grow")).toBeNull());
    expect(
      screen.getByLabelText("Species / Crop Identification Habitat").props.value
    ).toBe("User-entered garden bed");
    expect(
      screen.getByLabelText("Species / Crop Identification Plant or crop name").props
        .value
    ).toBe("");
  });

  it("discards an AI reply when the evidence changes during image analysis", async () => {
    let resolveAssistant!: (value: any) => void;
    mockAskPersonalAssistant.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAssistant = resolve;
      })
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockAskPersonalAssistant).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Replace test evidence"));
    await act(async () => {
      resolveAssistant({
        success: true,
        reply: JSON.stringify({
          userEnteredName: "Stale plant",
          imageAnalysisPerformed: "true"
        }),
        evidenceUsed: ["evidence-1"],
        mediaAnalysis: { photosAnalyzed: 1 }
      });
    });

    await waitFor(() => expect(mockRunCalculator).not.toHaveBeenCalled());
    expect(screen.queryByText("Confirm & Save to Grow")).toBeNull();
  });

  it("discards a calculator result when the evidence changes during calculation", async () => {
    let resolveCalculator!: (value: any) => void;
    mockRunCalculator.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCalculator = resolve;
      })
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Replace test evidence"));
    await act(async () => {
      resolveCalculator({
        outputs: { likelyCrop: "Stale plant", confidence: "high" },
        toolRun: { id: "stale-run" }
      });
    });

    await waitFor(() => expect(screen.queryByText("Confirm & Save to Grow")).toBeNull());
    expect(mockCreateGrowpathModuleRecord).not.toHaveBeenCalled();
  });

  it("does not start AI prefill while a manual calculator run is active", async () => {
    let resolveCalculator!: (value: any) => void;
    mockRunCalculator.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCalculator = resolve;
      })
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Manual candidate"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    expect(mockAskPersonalAssistant).not.toHaveBeenCalled();
    await act(async () => {
      resolveCalculator({
        outputs: {
          likelyCrop: "Manual candidate",
          confidence: "low",
          userConfirmationRequired: true
        },
        toolRun: { id: "manual-run", _id: "manual-run" }
      });
    });
  });

  it("does not start a manual calculator run while AI prefill is active", async () => {
    let resolveAssistant!: (value: any) => void;
    mockAskPersonalAssistant.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAssistant = resolve;
      })
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockAskPersonalAssistant).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));

    expect(mockRunCalculator).not.toHaveBeenCalled();
    await act(async () => {
      resolveAssistant({
        success: true,
        reply: JSON.stringify({
          userEnteredName: "AI candidate",
          imageAnalysisPerformed: "true",
          imageQuality: "usable",
          visualConfidence: "low"
        }),
        evidenceUsed: ["evidence-1"],
        mediaAnalysis: { photosAnalyzed: 1 }
      });
    });
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
  });

  it("classifies Cannabis genus without false-positive hemp common names", () => {
    expect(
      isCannabisGenusIdentification({
        likelyCrop: "Hemp dogbane",
        scientificName: "Apocynum cannabinum"
      })
    ).toBe(false);
    expect(isCannabisGenusIdentification({ scientificName: "Cannabis sativa L." })).toBe(
      true
    );
    expect(
      isCannabisGenusIdentification({
        likelyCrop: "unknown crop",
        candidates: [
          {
            scientificName: "Cannabis spp.",
            commonNames: ["Cannabis"],
            rank: "genus"
          }
        ]
      })
    ).toBe(true);
    expect(
      isCannabisGenusIdentification({
        likelyCrop: "Tomato",
        scientificName: "Solanum lycopersicum",
        candidates: [
          {
            scientificName: "Solanum lycopersicum",
            commonNames: ["Tomato"],
            rank: "species"
          },
          {
            scientificName: "Cannabis spp.",
            commonNames: ["Cannabis"],
            rank: "genus"
          }
        ]
      })
    ).toBe(false);
  });

  it("surfaces a possible genus ahead of a broader family candidate", () => {
    expect(
      bestStructuredPlantCandidateName({
        likelyCrop: "unknown crop",
        likelyFamily: "Cannabaceae",
        possibleGenera: ["Cannabis"]
      })
    ).toBe("Cannabis");
  });

  it("geolocates a Plant ID privately without opening or creating a Field Study", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    expect(screen.getByText("Private plant location")).toBeTruthy();
    expect(screen.getByText("Include Current Location Privately")).toBeTruthy();
    expect(screen.getByText("Identify Plant from Photos")).toBeTruthy();
    expect(mockListFieldStudies).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    expect(
      await screen.findByText(/Exact location is ready to save privately/)
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Identify Plant from Photos"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          capturedLocation: expect.objectContaining({
            latitude: 39.301234,
            longitude: -76.721234,
            privacy: "private",
            userAuthorized: true
          })
        })
      )
    );
    expect(mockCreateFieldObservation).not.toHaveBeenCalled();
    expect(mockCreateFieldStudy).not.toHaveBeenCalled();
  });

  it("does not start identification while a private location request is active", async () => {
    let resolveLocation: ((value: Record<string, number>) => void) | undefined;
    mockRequestCurrentCoordinates.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLocation = resolve;
      })
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose"
    );
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));

    expect(mockRunCalculator).not.toHaveBeenCalled();
    await act(async () => {
      resolveLocation?.({
        latitude: 39.301234,
        longitude: -76.721234,
        accuracyMeters: 24
      });
    });
    expect(
      await screen.findByText(/Exact location is ready to save privately/)
    ).toBeTruthy();
  });

  it("does not start location capture while identification is active", async () => {
    let resolveIdentification:
      | ((value: {
          outputs: Record<string, string>;
          toolRun: Record<string, string>;
        }) => void)
      | undefined;
    mockRunCalculator.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveIdentification = resolve;
      })
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Rose"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(1));
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );

    expect(mockRequestCurrentCoordinates).not.toHaveBeenCalled();
    await act(async () => {
      resolveIdentification?.({
        outputs: { likelyCrop: "Rose" },
        toolRun: { id: "toolrun-1", _id: "toolrun-1" }
      });
    });
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
  });

  it("opens Field Study location controls when launched from a study", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Raleigh park",
        slug: "raleigh-park",
        visibility: "private",
        accessRole: "owner"
      }
    ]);

    const screen = render(<SpeciesCropIdToolRoute />);

    expect(screen.getByText("Hide Field Study & Nature sharing")).toBeTruthy();
    expect(screen.getByText(/Field Study and Nature sharing/)).toBeTruthy();
    expect(await screen.findByText(/Raleigh park/)).toBeTruthy();
  });

  it("creates and selects a Field Study without leaving uploaded evidence", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    fireEvent.changeText(
      screen.getByLabelText("New Field Study name"),
      "Neighborhood plants"
    );
    fireEvent.press(screen.getByText("Create & select"));

    await waitFor(() =>
      expect(mockCreateFieldStudy).toHaveBeenCalledWith({
        title: "Neighborhood plants",
        visibility: "private",
        defaultLocationPrivacy: "private"
      })
    );
    expect(await screen.findByText(/Neighborhood plants/)).toBeTruthy();
  });

  it("requires study-wide confirmation before making a Field Study public", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Private roadside survey",
        slug: "private-roadside-survey",
        visibility: "private",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Private roadside survey/)).toBeTruthy());
    fireEvent.press(screen.getByText("Nature map — approximate pin"));
    fireEvent.press(screen.getByText("Review public Field Study sharing"));
    expect(
      screen.getByText(/Making this Field Study public affects the whole study/)
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Cancel"));
    expect(mockUpdateFieldStudy).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Review public Field Study sharing"));
    fireEvent.press(screen.getByText("Confirm public Field Study"));

    await waitFor(() =>
      expect(mockUpdateFieldStudy).toHaveBeenCalledWith("study-1", {
        visibility: "public"
      })
    );
  });

  it("publishes captured coordinates as an approximate Nature pin only when ready", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Roadside survey",
        slug: "roadside-survey",
        visibility: "public",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Roadside survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() =>
      expect(
        screen.getAllByText(/Exact location is ready to save privately/).length
      ).toBeGreaterThan(0)
    );
    fireEvent.press(screen.getByText("Nature map — approximate pin"));
    fireEvent.press(
      screen.getByText("This is Cannabis/hemp — review public-context sharing")
    );
    await waitFor(() =>
      expect(
        screen.getByText("Ready to create an approximate map pin after AI review.")
      ).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          capturedLocation: expect.objectContaining({
            latitude: 39.301234,
            longitude: -76.721234,
            privacy: "private",
            userAuthorized: true
          })
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Publish Approximate Pin to Nature")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Publish Approximate Pin to Nature"));

    await waitFor(() =>
      expect(mockCreateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        expect.objectContaining({
          identity: expect.objectContaining({
            commonName: "Cannabis",
            candidates: expect.arrayContaining([
              expect.objectContaining({
                commonName: "Cannabis",
                scientificName: "Cannabis sativa"
              })
            ]),
            evidence: expect.arrayContaining(["Visible bracts and pistils"])
          }),
          location: expect.objectContaining({
            latitude: 39.301234,
            longitude: -76.721234,
            accuracyMeters: 24,
            privacy: "public_approximate",
            exactLocationPublicConfirmed: false
          }),
          publication: expect.objectContaining({
            status: "published",
            cannabisContextConfirmed: true
          })
        })
      )
    );

    fireEvent.press(screen.getByText("Private draft"));
    expect(screen.getByText("Withdraw Nature Pin & Save Privately")).toBeTruthy();
    fireEvent.press(screen.getByText("Withdraw Nature Pin & Save Privately"));

    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        expect.objectContaining({
          location: expect.objectContaining({ privacy: "private" }),
          publication: expect.objectContaining({
            status: "withdrawn",
            cannabisContextConfirmed: false
          })
        })
      )
    );
  });

  it("creates a new observation after plant evidence changes instead of overwriting the prior pin", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Public roadside survey",
        slug: "public-roadside-survey",
        visibility: "public",
        accessRole: "owner"
      }
    ]);
    mockCreateFieldObservation
      .mockResolvedValueOnce({ observation: { id: "observation-1" } })
      .mockResolvedValueOnce({ observation: { id: "observation-2" } });
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Public roadside survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() =>
      expect(
        screen.getAllByText(/Exact location is ready to save privately/).length
      ).toBeGreaterThan(0)
    );
    fireEvent.press(screen.getByText("Nature map — approximate pin"));
    fireEvent.press(
      screen.getByText("This is Cannabis/hemp — review public-context sharing")
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Publish Approximate Pin to Nature")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Publish Approximate Pin to Nature"));
    await waitFor(() => expect(mockCreateFieldObservation).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByLabelText("Replace test evidence"));
    await waitFor(() =>
      expect(screen.queryByText("Update Approximate Nature Pin")).toBeNull()
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Publish Approximate Pin to Nature")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Publish Approximate Pin to Nature"));

    await waitFor(() => expect(mockCreateFieldObservation).toHaveBeenCalledTimes(2));
    expect(mockUpdateFieldObservation).not.toHaveBeenCalled();
  });

  it("removes a private Plant ID location without changing a published Nature observation", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Public survey",
        slug: "public-survey",
        visibility: "public",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Public survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await screen.findByText(/Exact location is ready to save privately/);
    fireEvent.press(screen.getByText("Nature map — approximate pin"));
    fireEvent.press(
      screen.getByText("This is Cannabis/hemp — review public-context sharing")
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Publish Approximate Pin to Nature")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Publish Approximate Pin to Nature"));
    await waitFor(() => expect(mockCreateFieldObservation).toHaveBeenCalledTimes(1));
    mockUpdateToolRun.mockClear();

    fireEvent.press(screen.getByLabelText("Remove private location from this Plant ID"));

    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "toolrun-1",
        expect.objectContaining({
          inputs: expect.objectContaining({ capturedLocation: null })
        })
      )
    );
    expect(mockUpdateFieldObservation).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "The private location was removed from this Plant ID only. Field Studies and Nature were not changed."
      )
    ).toBeTruthy();
    expect(screen.getByText("Include Current Location Privately")).toBeTruthy();
    expect(screen.getByText("Update Approximate Nature Pin")).toBeTruthy();
  });

  it("keeps both records unchanged when private Plant ID location removal fails", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Public survey",
        slug: "public-survey",
        visibility: "public",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Public survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await screen.findByText(/Exact location is ready to save privately/);
    fireEvent.press(screen.getByText("Nature map — approximate pin"));
    fireEvent.press(
      screen.getByText("This is Cannabis/hemp — review public-context sharing")
    );
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Publish Approximate Pin to Nature")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Publish Approximate Pin to Nature"));
    await waitFor(() => expect(mockCreateFieldObservation).toHaveBeenCalledTimes(1));
    mockUpdateToolRun.mockResolvedValueOnce(null);

    fireEvent.press(screen.getByLabelText("Remove private location from this Plant ID"));

    expect(
      await screen.findByText(
        "The location could not be removed from the Saved Run. Nothing changed."
      )
    ).toBeTruthy();
    expect(mockUpdateFieldObservation).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Remove private location from this Plant ID")
    ).toBeTruthy();
    expect(screen.getByText("Update Approximate Nature Pin")).toBeTruthy();
  });

  it("does not publish a Cannabis candidate without separate public-context consent", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Public cannabis survey",
        slug: "public-cannabis-survey",
        visibility: "public",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Public cannabis survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() =>
      expect(
        screen.getAllByText(/Exact location is ready to save privately/).length
      ).toBeGreaterThan(0)
    );
    fireEvent.press(screen.getByText("Nature map — approximate pin"));
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Publish Approximate Pin to Nature")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Publish Approximate Pin to Nature"));

    expect(
      await screen.findByText(
        "Confirm the Cannabis/hemp public-context choice before publishing this pin."
      )
    ).toBeTruthy();
    expect(mockCreateFieldObservation).not.toHaveBeenCalled();
  });

  it("shows a location-permission failure without blocking identification", async () => {
    mockRequestCurrentCoordinates.mockRejectedValueOnce(
      new Error("Location permission was not granted.")
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );

    expect(await screen.findByText("Location permission was not granted.")).toBeTruthy();
    expect(screen.getByText("Identify Plant from Photos")).toBeTruthy();
  });

  it("can remove captured coordinates before saving or sharing", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);
    openLocationAndSharing(screen);
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    expect(
      await screen.findByLabelText("Remove private location from this Plant ID")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Remove private location from this Plant ID"));
    await waitFor(() =>
      expect(screen.getByText("Include Current Location Privately")).toBeTruthy()
    );
    expect(
      screen.queryByLabelText("Remove private location from this Plant ID")
    ).toBeNull();
  });

  it("synchronizes location additions and removals to an existing Saved Run", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Species / Crop Identification result")).toBeTruthy()
    );
    openLocationAndSharing(screen);
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );

    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "toolrun-1",
        expect.objectContaining({
          inputs: expect.objectContaining({
            capturedLocation: expect.objectContaining({
              latitude: 39.301234,
              longitude: -76.721234,
              privacy: "private",
              userAuthorized: true
            })
          })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("Remove private location from this Plant ID"));
    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenLastCalledWith(
        "toolrun-1",
        expect.objectContaining({
          inputs: expect.objectContaining({ capturedLocation: null })
        })
      )
    );
    expect(screen.getByText("Include Current Location Privately")).toBeTruthy();

    const privateLocationControl = screen.getByLabelText(
      "Include or update current location privately with this Plant ID"
    );
    await waitFor(() => expect(privateLocationControl).toBeEnabled());
    fireEvent.press(privateLocationControl);
    await waitFor(() => expect(mockUpdateToolRun).toHaveBeenCalledTimes(3));
    expect(
      screen.queryByText(
        "The private location was removed from this Plant ID only. Field Studies and Nature were not changed."
      )
    ).toBeNull();
  });

  it("does not restore an invalidated Plant ID when a location update finishes late", async () => {
    let resolveLocationUpdate:
      | ((value: { id: string; _id: string; inputs: Record<string, any> }) => void)
      | undefined;
    mockUpdateToolRun.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLocationUpdate = resolve;
      })
    );
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() => expect(mockUpdateToolRun).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Replace test evidence"));
    await waitFor(() =>
      expect(screen.queryByText("Species / Crop Identification result")).toBeNull()
    );

    await act(async () => {
      resolveLocationUpdate?.({
        id: "toolrun-1",
        _id: "toolrun-1",
        inputs: {
          capturedLocation: {
            latitude: 39.301234,
            longitude: -76.721234,
            privacy: "private",
            userAuthorized: true
          }
        }
      });
    });
    expect(screen.queryByText("Species / Crop Identification result")).toBeNull();
    expect(screen.getByText("Update Private Location")).toBeTruthy();

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(2));
    expect(mockRunCalculator).toHaveBeenLastCalledWith(
      "species-crop-id",
      expect.objectContaining({
        capturedLocation: expect.objectContaining({
          latitude: 39.301234,
          longitude: -76.721234,
          privacy: "private",
          userAuthorized: true
        })
      })
    );
  });

  it("keeps an explicit location removal after evidence invalidates the saved result", async () => {
    let resolveLocationRemoval:
      | ((value: { id: string; _id: string; inputs: Record<string, any> }) => void)
      | undefined;
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() => expect(mockUpdateToolRun).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByLabelText("Remove private location from this Plant ID")
    ).toBeTruthy();

    mockUpdateToolRun.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLocationRemoval = resolve;
      })
    );
    fireEvent.press(screen.getByLabelText("Remove private location from this Plant ID"));
    await waitFor(() => expect(mockUpdateToolRun).toHaveBeenCalledTimes(2));
    fireEvent.press(screen.getByLabelText("Replace test evidence"));
    await waitFor(() =>
      expect(screen.queryByText("Species / Crop Identification result")).toBeNull()
    );

    await act(async () => {
      resolveLocationRemoval?.({
        id: "toolrun-1",
        _id: "toolrun-1",
        inputs: { capturedLocation: null }
      });
    });
    expect(screen.getByText("Include Current Location Privately")).toBeTruthy();

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(2));
    expect(mockRunCalculator).toHaveBeenLastCalledWith(
      "species-crop-id",
      expect.objectContaining({ capturedLocation: undefined })
    );
  });

  it("keeps the newest location instead of a stale coordinate after invalidation", async () => {
    let resolveLocationUpdate:
      | ((value: { id: string; _id: string; inputs: Record<string, any> }) => void)
      | undefined;
    const updatedCoordinates = {
      latitude: 40.7128,
      longitude: -74.006,
      accuracyMeters: 18
    };
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    expect(await screen.findByText("Species / Crop Identification result")).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() => expect(mockUpdateToolRun).toHaveBeenCalledTimes(1));

    mockRequestCurrentCoordinates.mockResolvedValueOnce(updatedCoordinates);
    mockUpdateToolRun.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLocationUpdate = resolve;
      })
    );
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() => expect(mockUpdateToolRun).toHaveBeenCalledTimes(2));
    fireEvent.press(screen.getByLabelText("Replace test evidence"));
    await waitFor(() =>
      expect(screen.queryByText("Species / Crop Identification result")).toBeNull()
    );

    await act(async () => {
      resolveLocationUpdate?.({
        id: "toolrun-1",
        _id: "toolrun-1",
        inputs: {
          capturedLocation: {
            ...updatedCoordinates,
            privacy: "private",
            userAuthorized: true
          }
        }
      });
    });

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalledTimes(2));
    expect(mockRunCalculator).toHaveBeenLastCalledWith(
      "species-crop-id",
      expect.objectContaining({
        capturedLocation: expect.objectContaining({
          latitude: 40.7128,
          longitude: -74.006,
          privacy: "private",
          userAuthorized: true
        })
      })
    );
  });

  it("does not mark or publish video-only evidence as map ready", async () => {
    mockEvidenceAssets = [
      {
        id: "video-evidence",
        _id: "video-evidence",
        assetType: "video",
        durableUrl: "https://example.com/plant.mp4",
        uploadStatus: "uploaded",
        purpose: "other",
        qualityWarnings: []
      }
    ];
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Public study",
        slug: "public-study",
        visibility: "public",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Public study/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText(
        "Include or update current location privately with this Plant ID"
      )
    );
    await waitFor(() =>
      expect(
        screen.getAllByText(/Exact location is ready to save privately/).length
      ).toBeGreaterThan(0)
    );
    fireEvent.press(screen.getByText("Nature map — approximate pin"));

    expect(screen.getByText("Needed: Uploaded photo evidence added")).toBeTruthy();
    expect(
      screen.queryByText("Ready to create an approximate map pin after AI review.")
    ).toBeNull();
  });

  it("does not mark an unfinished upload as map-ready evidence", async () => {
    mockEvidenceAssets = [
      {
        id: "uploading-evidence",
        _id: "uploading-evidence",
        assetType: "photo",
        durableUrl: "",
        uploadStatus: "uploading",
        purpose: "other",
        qualityWarnings: []
      }
    ];
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Public study",
        slug: "public-study",
        visibility: "public",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Public study/)).toBeTruthy());
    fireEvent.press(screen.getByText("Nature map — approximate pin"));

    expect(screen.getByText("Needed: Uploaded photo evidence added")).toBeTruthy();
  });

  it("records confirmation in Saved Runs when no grow is attached", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(screen.getByText("Confirm in Saved Run")).toBeTruthy());
    fireEvent.press(screen.getByText("Confirm in Saved Run"));

    await waitFor(() =>
      expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith("toolrun-1", {
        decision: "accepted"
      })
    );
  });

  it("saves the AI candidate and missing evidence to a selected Field Study", async () => {
    mockSearchParams = { fieldStudyId: "study-1" };
    mockListFieldStudies.mockResolvedValueOnce([
      {
        id: "study-1",
        _id: "study-1",
        title: "Roadside survey",
        slug: "roadside-survey",
        visibility: "private",
        accessRole: "owner"
      }
    ]);
    const screen = render(<SpeciesCropIdToolRoute />);

    openLocationAndSharing(screen);
    await waitFor(() => expect(screen.getByText(/Roadside survey/)).toBeTruthy());
    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Save Draft to Field Study")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Save Draft to Field Study"));

    await waitFor(() =>
      expect(mockCreateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        expect.objectContaining({
          sourceToolRunId: "toolrun-1",
          identity: expect.objectContaining({
            commonName: "Cannabis",
            scientificName: "Cannabis sativa",
            verificationStatus: "ai_candidate"
          }),
          evidenceAssets: [
            expect.objectContaining({
              assetId: "evidence-1",
              kind: "photo"
            })
          ],
          location: expect.objectContaining({
            privacy: "private",
            exactLocationPublicConfirmed: false
          }),
          publication: expect.objectContaining({
            status: "draft",
            sensitiveSpecies: false
          })
        })
      )
    );
  });

  it("renders low identity confidence as a separate high-severity warning", async () => {
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        likelyCrop: "Uncertain shrub",
        confidence: "low",
        userConfirmationRequired: true,
        imageAnalysis: { requested: true, performed: true, photosAnalyzed: 1 }
      },
      toolRun: { id: "toolrun-low", _id: "toolrun-low" }
    });
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Species / Crop Identification Plant or crop name"),
      "Unknown shrub"
    );
    fireEvent.press(screen.getByLabelText("Run Species / Crop Identification"));

    expect(
      await screen.findByText(
        "Low-confidence identity: do not rely on this plant name yet. Review the missing evidence and upload the requested views before confirming it."
      )
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Run Species / Crop Identification"
        })
      ).not.toBeDisabled()
    );
  });
});
