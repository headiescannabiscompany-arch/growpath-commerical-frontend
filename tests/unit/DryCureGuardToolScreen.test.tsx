import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DryCureGuardToolScreen from "@/app/home/personal/(tabs)/tools/dry-cure-guard";

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

describe("DryCureGuardToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        moldRisk: "medium",
        overdryRisk: "low",
        dewPointF: 53.2,
        dewPointSpreadC: 6.1,
        nextAction: "Keep airflow gentle and verify jar RH before sealing.",
        taskSuggestions: [{ title: "Check dry room tomorrow", priority: "high" }]
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
      name: "Harvest 1",
      status: "drying",
      dryCureRecords: [
        {
          stage: "drying",
          rh: 58,
          linkedToolRunId: "toolrun-old"
        }
      ],
      linkedToolRunIds: ["toolrun-old"]
    });
    mockUpdateHarvestBatch.mockResolvedValue({
      id: "harvest-1",
      status: "curing"
    });
  });

  it("creates dry/cure monitoring tasks from the saved ToolRun", async () => {
    const screen = render(<DryCureGuardToolScreen />);

    fireEvent.changeText(screen.getByLabelText("Dry / Cure Guard Mode"), "curing");
    fireEvent.changeText(
      screen.getByLabelText("Dry / Cure Guard Jar RH (optional)"),
      "63"
    );
    fireEvent.press(screen.getByLabelText("Run Dry / Cure Guard"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "dry-cure-guard",
        expect.objectContaining({
          growId: "grow-1",
          mode: "curing",
          jarRH: 63
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Dry / Cure Guard result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Dry/Cure Monitoring Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "dry-cure-guard",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            mode: "curing",
            jarRH: 63
          }),
          output: expect.objectContaining({
            moldRisk: "medium",
            nextAction: "Keep airflow gentle and verify jar RH before sealing."
          }),
          tasks: [
            expect.objectContaining({
              title: "Check dry room tomorrow",
              priority: "high",
              allDay: true,
              calendarType: "dry_cure_monitoring",
              sourceStage: "dry_cure_condition_check",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("Mold risk: medium")
            }),
            expect.objectContaining({
              title: "Inspect buds for dry/cure quality",
              sourceStage: "dry_cure_bud_inspection"
            }),
            expect.objectContaining({
              title: "Check jar RH and burp response",
              sourceStage: "dry_cure_jar_rh_review"
            }),
            expect.objectContaining({
              title: "Record dry/cure outcome notes",
              sourceStage: "dry_cure_outcome_notes"
            })
          ]
        })
      )
    );
  });

  it("saves dry/cure readings to a harvest batch record", async () => {
    const screen = render(<DryCureGuardToolScreen />);

    fireEvent.changeText(screen.getByLabelText("Dry / Cure Guard Mode"), "curing");
    fireEvent.changeText(
      screen.getByLabelText("Dry / Cure Guard Jar RH (optional)"),
      "63"
    );
    fireEvent.changeText(
      screen.getByLabelText("Dry / Cure Guard Harvest batch ID (optional)"),
      "harvest-1"
    );
    fireEvent.press(screen.getByLabelText("Run Dry / Cure Guard"));

    await waitFor(() => expect(screen.getByText("Dry / Cure Guard result")).toBeTruthy());

    fireEvent.press(screen.getByText("Save to Harvest Batch"));

    await waitFor(() => expect(mockGetHarvestBatch).toHaveBeenCalledWith("harvest-1"));
    expect(mockUpdateHarvestBatch).toHaveBeenCalledWith(
      "harvest-1",
      expect.objectContaining({
        status: "curing",
        linkedToolRunIds: ["toolrun-old", "toolrun-1"],
        dryCureRecords: [
          expect.objectContaining({
            stage: "drying",
            rh: 58,
            linkedToolRunId: "toolrun-old"
          }),
          expect.objectContaining({
            stage: "curing",
            tempF: 68,
            rh: 60,
            jarRh: 63,
            dewPointF: 53.2,
            linkedToolRunId: "toolrun-1",
            qualityNotes: expect.stringContaining("Mold risk: medium")
          })
        ]
      })
    );
    await waitFor(() =>
      expect(screen.getByText("Saved dry/cure record to harvest batch.")).toBeTruthy()
    );
  });
});
