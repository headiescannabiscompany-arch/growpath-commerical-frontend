import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import HarvestReadinessToolRoute from "@/app/home/personal/(tabs)/tools/harvest-readiness";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockGetHarvestBatch = jest.fn();
const mockUpdateHarvestBatch = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn()
  })
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

describe("HarvestReadinessToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
