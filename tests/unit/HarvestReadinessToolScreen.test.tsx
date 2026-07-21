import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import HarvestReadinessToolRoute from "@/app/home/personal/(tabs)/tools/harvest-readiness";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockGetHarvestBatch = jest.fn();
const mockUpdateHarvestBatch = jest.fn();
const mockAnalyzeTrichomePhotos = jest.fn();
const mockListPersonalGrows = jest.fn();
let mockRouteParams: Record<string, string> = { growId: "grow-1" };

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
    source: "library",
    purpose: "harvest",
    uploadStatus: "uploaded",
    aiUsable: true,
    qualityWarnings: []
  });
  return ({ onChange }: any) =>
    React.createElement(
      View,
      { accessibilityLabel: "Media evidence picker" },
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Add one harvest evidence photo",
          onPress: () => onChange([asset(1)])
        },
        React.createElement(Text, null, "Add One Photo")
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: "Add complete harvest photo set",
          onPress: () => onChange([asset(1), asset(2), asset(3), asset(4)])
        },
        React.createElement(Text, null, "Add Complete Photo Set")
      )
    );
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
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

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
  updateHarvestBatch: (...args: any[]) => mockUpdateHarvestBatch(...args)
}));

jest.mock("@/api/harvestVision", () => ({
  analyzeTrichomePhotos: (...args: any[]) => mockAnalyzeTrichomePhotos(...args)
}));

describe("HarvestReadinessToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRouteParams = { growId: "grow-1" };
    mockListPersonalGrows.mockImplementation(() => new Promise(() => {}));
    mockRunCalculator.mockResolvedValue({
      outputs: {
        readinessStatus: "approaching_window",
        estimatedWindow: {
          startDay: 60,
          targetDay: 63,
          endDay: 66
        },
        wholePlantMaturity: {
          pistilStatus: "mixed",
          budSwellStatus: "mostly_swollen"
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
      visibleTraits: ["Intact opaque gland heads"],
      evidence: ["Mostly opaque gland heads"],
      recommendation: "Confirm across additional bud sites.",
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
      analysisId: "usage-harvest-1",
      aiCreditsUsed: 1,
      aiTokensRemaining: 58,
      creditStatus: "charged"
    });
  });

  it("lets a user select a grow before choosing trichome photos", async () => {
    mockRouteParams = {};
    mockListPersonalGrows.mockResolvedValue([
      { id: "grow-1", name: "Flower Tent" },
      { id: "grow-2", name: "Second Run" }
    ]);
    const screen = render(<HarvestReadinessToolRoute />);

    await waitFor(() => expect(screen.getByText("Flower Tent")).toBeTruthy());
    expect(screen.getByText("Select a grow before analyzing a photo.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select grow Flower Tent"));
    await waitFor(() =>
      expect(screen.queryByText("Select a grow before analyzing a photo.")).toBeNull()
    );
  });

  it("shows actionable photo requirements before the user chooses media", () => {
    const screen = render(<HarvestReadinessToolRoute />);

    expect(screen.getByText("Photo checklist before analysis")).toBeTruthy();
    expect(screen.getByText(/at least 3 sharp macro photos/i)).toBeTruthy();
    expect(screen.getByText(/trichome gland heads on bud calyxes/i)).toBeTruthy();
    expect(screen.getByText(/neutral white light/i)).toBeTruthy();
    expect(screen.getByText(/No trichome evidence is ready/i)).toBeTruthy();
  });

  it("blocks an incomplete photo set without spending a credit", () => {
    const screen = render(<HarvestReadinessToolRoute />);

    fireEvent.press(screen.getByLabelText("Add one harvest evidence photo"));

    expect(screen.getByText(/Add 3 more photos/i)).toBeTruthy();
    expect(screen.getByText(/no AI credit will be used yet/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));
    expect(mockAnalyzeTrichomePhotos).not.toHaveBeenCalled();
  });

  it("analyzes a complete evidence set before filling trichome percentages", async () => {
    const screen = render(<HarvestReadinessToolRoute />);

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));

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
    expect(screen.getByText(/run the rule-based readiness estimate/)).toBeTruthy();
    expect(screen.getByText(/1 charged · 58 remaining/i)).toBeTruthy();
    expect(screen.getByText(/usage-harvest-1/i)).toBeTruthy();
  });

  it("explains when better photos are needed without filling readiness fields", async () => {
    mockAnalyzeTrichomePhotos.mockResolvedValue({
      photoUsable: false,
      imageQuality: "limited",
      clear: null,
      cloudy: null,
      amber: null,
      confidence: 0.24,
      dominant: "uncertain",
      visibleTraits: ["Pistils visible; gland heads blurred"],
      evidence: [],
      recommendation: "Move closer and stabilize the camera.",
      limitations: ["Trichome heads are out of focus."],
      provider: "openai",
      providerLabel: "OpenAI trichome image review",
      providerModel: "gpt-4o-mini",
      imagesAnalyzed: 4,
      evidenceUsed: ["64b000000000000000000001"],
      analysisId: "usage-harvest-2",
      aiCreditsUsed: 1,
      aiTokensRemaining: 57,
      creditStatus: "charged"
    });
    const screen = render(<HarvestReadinessToolRoute />);

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(
        screen.getByText("Better photos needed — no percentages filled")
      ).toBeTruthy()
    );
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
  });

  it("turns analysis-service failures into retake guidance without filling fields", async () => {
    mockAnalyzeTrichomePhotos.mockRejectedValue(
      new Error("The photo-analysis service is unavailable.")
    );
    const screen = render(<HarvestReadinessToolRoute />);

    fireEvent.press(screen.getByLabelText("Add complete harvest photo set"));
    fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));

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
    const screen = render(<HarvestReadinessToolRoute />);

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

    fireEvent.press(screen.getByText("Create Harvest Decision Tasks"));

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
    const screen = render(<HarvestReadinessToolRoute />);

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
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness Estimate Harvest batch ID (optional)"),
      "harvest-1"
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness Estimate"));

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
});
