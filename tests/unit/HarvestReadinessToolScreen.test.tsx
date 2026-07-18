import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import HarvestReadinessToolRoute from "@/app/home/personal/(tabs)/tools/harvest-readiness";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockGetHarvestBatch = jest.fn();
const mockUpdateHarvestBatch = jest.fn();
const mockUploadImage = jest.fn();
const mockAnalyzeTrichomePhotos = jest.fn();
const mockRequestPhotoPermission = jest.fn();
const mockLaunchPhotoLibrary = jest.fn();
const mockListPersonalGrows = jest.fn();
let mockRouteParams: Record<string, string> = { growId: "grow-1" };

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestPhotoPermission(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchPhotoLibrary(...args)
}));

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

jest.mock("@/api/uploads", () => ({
  uploadImage: (...args: any[]) => mockUploadImage(...args)
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
    mockRequestPhotoPermission.mockResolvedValue({ granted: true });
    mockLaunchPhotoLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///trichomes.jpg" }]
    });
    mockUploadImage.mockResolvedValue({ url: "/uploads/trichomes.jpg" });
    mockAnalyzeTrichomePhotos.mockResolvedValue({
      photoUsable: true,
      clear: 0.12,
      cloudy: 0.73,
      amber: 0.15,
      confidence: 0.81,
      dominant: "cloudy",
      evidence: ["Mostly opaque gland heads"],
      recommendation: "Confirm across additional bud sites.",
      limitations: [],
      provider: "openai_vision",
      imagesAnalyzed: 1
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

  it("uploads and analyzes a photo before filling trichome percentages", async () => {
    const screen = render(<HarvestReadinessToolRoute />);

    fireEvent.press(screen.getByLabelText("Choose harvest trichome photo"));
    await waitFor(() =>
      expect(mockUploadImage).toHaveBeenCalledWith("file:///trichomes.jpg")
    );
    fireEvent.press(screen.getByLabelText("Analyze harvest trichome photo"));

    await waitFor(() =>
      expect(mockAnalyzeTrichomePhotos).toHaveBeenCalledWith(
        expect.objectContaining({ growId: "grow-1", images: ["/uploads/trichomes.jpg"] })
      )
    );
    expect(screen.getByDisplayValue("73")).toBeTruthy();
    expect(screen.getByDisplayValue("15")).toBeTruthy();
    expect(screen.getByDisplayValue("12")).toBeTruthy();
  });

  it("creates harvest decision tasks from the saved readiness ToolRun", async () => {
    const screen = render(<HarvestReadinessToolRoute />);

    fireEvent.changeText(screen.getByLabelText("Harvest Readiness AI Flower day"), "56");
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness AI Trichome sample location"),
      "top and lower buds"
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness AI"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          growId: "grow-1",
          flowerDay: "56",
          sampleLocation: "top and lower buds"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Harvest Readiness AI result")).toBeTruthy()
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

    fireEvent.changeText(screen.getByLabelText("Harvest Readiness AI Flower day"), "56");
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness AI Trichome sample location"),
      "top and lower buds"
    );
    fireEvent.changeText(
      screen.getByLabelText("Harvest Readiness AI Harvest batch ID (optional)"),
      "harvest-1"
    );
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness AI"));

    await waitFor(() =>
      expect(screen.getByText("Harvest Readiness AI result")).toBeTruthy()
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
