import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import SpeciesCropIdToolRoute, {
  isCannabisGenusIdentification
} from "@/app/home/personal/(tabs)/tools/species-crop-id";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockUpdateGrowpathModuleRecord = jest.fn();
const mockUpdateToolRun = jest.fn();
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
let mockSearchParams: Record<string, string> = { growId: "grow-1" };
let mockEvidenceAssets: any[] = [];

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
    React.useEffect(() => {
      props.onChange?.(mockEvidenceAssets);
    }, [props.onChange]);
    return React.createElement(
      View,
      { testID: "media-evidence-picker" },
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Replace test evidence",
          onPress: () =>
            props.onChange?.([
              {
                ...mockEvidenceAssets[0],
                id: "evidence-2",
                _id: "evidence-2",
                durableUrl: "https://example.com/replacement-plant.jpg"
              }
            ])
        },
        React.createElement(Text, null, "Replace test evidence")
      )
    );
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
  }, 10_000);

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

  it("preserves user-entered context when AI returns only identification fields", async () => {
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
            habitat: "Sunny roadside edge"
          }),
          morphology: expect.objectContaining({ growthHabit: "shrub" })
        })
      )
    );
    expect(mockAskPersonalAssistant.mock.calls[0][0].message).toContain(
      "Do not guess exact location, observation date, sensory traits"
    );
  });

  it("prefills defensible setting and habitat details visible in the photos", async () => {
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
            plantSize: "about knee-high using the visible person for scale"
          })
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
  });

  it("creates and selects a Field Study without leaving uploaded evidence", async () => {
    mockSearchParams = {};
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    await waitFor(() => expect(screen.getByText(/Roadside survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
    );
    await waitFor(() =>
      expect(screen.getAllByText(/Location captured/).length).toBeGreaterThan(0)
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    await waitFor(() => expect(screen.getByText(/Public roadside survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
    );
    await waitFor(() =>
      expect(screen.getAllByText(/Location captured/).length).toBeGreaterThan(0)
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

  it("withdraws a public Nature pin before removing its Saved Run location", async () => {
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    await waitFor(() => expect(screen.getByText(/Public survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
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
    mockUpdateToolRun.mockClear();

    fireEvent.press(screen.getByLabelText("Remove location from this plant observation"));

    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        expect.objectContaining({
          location: expect.objectContaining({ privacy: "private" }),
          publication: expect.objectContaining({ status: "withdrawn" })
        })
      )
    );
    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "toolrun-1",
        expect.objectContaining({
          inputs: expect.objectContaining({ capturedLocation: null })
        })
      )
    );
    expect(mockUpdateFieldObservation.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdateToolRun.mock.invocationCallOrder[0]
    );
    expect(screen.getByText("Use Current Location")).toBeTruthy();
  });

  it("keeps the public-location UI truthful when pin withdrawal fails", async () => {
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    await waitFor(() => expect(screen.getByText(/Public survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
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
    mockUpdateToolRun.mockClear();
    mockUpdateFieldObservation.mockRejectedValueOnce(new Error("network down"));

    fireEvent.press(screen.getByLabelText("Remove location from this plant observation"));

    expect(
      await screen.findByText(
        "The public Nature pin could not be withdrawn, so the captured location was not removed. The pin may still be public."
      )
    ).toBeTruthy();
    expect(mockUpdateToolRun).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Remove location from this plant observation")
    ).toBeTruthy();
    expect(screen.getByText("Update Approximate Nature Pin")).toBeTruthy();
  });

  it("shows a withdrawn pin as private when Saved Run location removal fails afterward", async () => {
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    await waitFor(() => expect(screen.getByText(/Public survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
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
    mockUpdateToolRun.mockResolvedValueOnce(null);

    fireEvent.press(screen.getByLabelText("Remove location from this plant observation"));

    expect(
      await screen.findByText(
        /The public Nature pin was withdrawn, but the private Saved Run location could not be removed/
      )
    ).toBeTruthy();
    expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
      "study-1",
      "observation-1",
      expect.objectContaining({
        publication: expect.objectContaining({ status: "withdrawn" })
      })
    );
    expect(
      screen.getByLabelText("Remove location from this plant observation")
    ).toBeTruthy();
    expect(screen.getByText("Update Field Study Draft")).toBeTruthy();
    expect(screen.queryByText("Update Approximate Nature Pin")).toBeNull();
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    await waitFor(() => expect(screen.getByText(/Public cannabis survey/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
    );
    await waitFor(() =>
      expect(screen.getAllByText(/Location captured/).length).toBeGreaterThan(0)
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
    );

    expect(await screen.findByText("Location permission was not granted.")).toBeTruthy();
    expect(screen.getByText("Identify Plant from Photos")).toBeTruthy();
  });

  it("can remove captured coordinates before saving or sharing", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);
    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
    );
    expect(
      await screen.findByLabelText("Remove location from this plant observation")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Remove location from this plant observation"));
    await waitFor(() => expect(screen.getByText("Use Current Location")).toBeTruthy());
    expect(
      screen.queryByLabelText("Remove location from this plant observation")
    ).toBeNull();
  });

  it("synchronizes location additions and removals to an existing Saved Run", async () => {
    const screen = render(<SpeciesCropIdToolRoute />);

    fireEvent.press(screen.getByText("Identify Plant from Photos"));
    await waitFor(() =>
      expect(screen.getByText("Species / Crop Identification result")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
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

    fireEvent.press(screen.getByLabelText("Remove location from this plant observation"));
    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenLastCalledWith(
        "toolrun-1",
        expect.objectContaining({
          inputs: expect.objectContaining({ capturedLocation: null })
        })
      )
    );
    expect(screen.getByText("Use Current Location")).toBeTruthy();
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
    await waitFor(() => expect(screen.getByText(/Public study/)).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use current location for this plant observation")
    );
    await waitFor(() =>
      expect(screen.getAllByText(/Location captured/).length).toBeGreaterThan(0)
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
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

    fireEvent.press(screen.getByText("Optional: add location or share to Nature"));
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
  });
});
