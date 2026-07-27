import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import SpeciesCropIdToolRoute from "@/app/home/personal/(tabs)/tools/species-crop-id";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockUpdateGrowpathModuleRecord = jest.fn();
const mockUpdateToolRun = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockSavePersonalGrowCropIdentity = jest.fn();
const mockSavePersonalPlantCropIdentity = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockAskPersonalAssistant = jest.fn();
let mockSearchParams: Record<string, string> = { growId: "grow-1" };

jest.mock("expo-router", () => ({
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
  const { View } = require("react-native");
  return function MockMediaEvidencePicker(props: any) {
    React.useEffect(() => {
      props.onChange?.([
        {
          id: "evidence-1",
          _id: "evidence-1",
          assetType: "photo",
          durableUrl: "https://example.com/cannabis-flower.jpg",
          uploadStatus: "uploaded",
          purpose: "other",
          qualityWarnings: []
        }
      ]);
    }, [props.onChange]);
    return React.createElement(View, { testID: "media-evidence-picker" });
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    plan: "pro",
    mode: "personal",
    can: () => true
  })
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
  runCalculator: (...args: any[]) => mockRunCalculator(...args),
  updateToolRun: (...args: any[]) => mockUpdateToolRun(...args)
}));

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args),
  savePersonalGrowCropIdentity: (...args: any[]) =>
    mockSavePersonalGrowCropIdentity(...args)
}));

jest.mock("@/api/plants", () => ({
  savePersonalPlantCropIdentity: (...args: any[]) =>
    mockSavePersonalPlantCropIdentity(...args)
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

  it("identifies a cannabis flower without requiring a grow", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    await waitFor(() =>
      expect(
        screen.getByText(/No grow is required. Upload photos or enter what you know/)
      ).toBeTruthy()
    );
    expect(screen.getByText("Step 1 — Add identification evidence")).toBeTruthy();
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
          evidenceAssetIds: ["evidence-1"],
          message: expect.stringContaining(
            'Never put an English common-name phrase such as "rose plant" in scientificName'
          )
        })
      )
    );
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "species-crop-id",
        expect.objectContaining({
          growId: "",
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
    expect(screen.getByText("Photos inspected")).toBeTruthy();
    expect(screen.getByText("External verification")).toBeTruthy();
    expect(screen.getByText("Candidate comparison")).toBeTruthy();
    expect(screen.getByText(/inspected 1 uploaded photo/i)).toBeTruthy();
    expect(screen.queryByText("Confirm & Save to Grow")).toBeNull();
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
        likelyCrop: "Mint",
        commonNames: ["Mint"],
        scientificName: null,
        confidence: "medium",
        userConfirmationRequired: true,
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
          userEnteredName: "Mint",
          scientificName: "",
          userConfirmed: false,
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
    ).toBe("Mint");
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
        visualConfidence: "medium",
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
    expect(screen.getByText("Confirmed crop identity saved to grow.")).toBeTruthy();
  });

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
  });

  it("records confirmation in Saved Runs when no grow is attached", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() => expect(screen.getByText("Confirm in Saved Run")).toBeTruthy());
    fireEvent.press(screen.getByText("Confirm in Saved Run"));

    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "toolrun-1",
        expect.objectContaining({
          outputs: expect.objectContaining({
            confidence: "user_confirmed",
            userConfirmationRequired: false,
            userDecision: expect.objectContaining({ value: "accepted" })
          })
        })
      )
    );
  });
});
