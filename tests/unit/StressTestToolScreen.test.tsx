import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import StressTestToolRoute from "@/app/home/personal/(tabs)/tools/stress-test";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTask = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();

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
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

describe("StressTestToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        stressType: "dryback",
        riskLevel: "high",
        recoveryStatus: "slow",
        stressResponseScore: 62,
        recoveryScore: 58,
        stabilityScore: 70,
        keeperImpact: "watch",
        taskSuggestion: {
          title: "Inspect recovery photos",
          priority: "high",
          dueInDays: 1
        },
        selectionSignals: {
          rejectOrRetest: true,
          cropSteeringCandidate: true
        }
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTask.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskId: "task-1"
    });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
  });

  it("creates stress follow-up tasks from pheno selection output", async () => {
    const screen = render(<StressTestToolRoute />);

    fireEvent.changeText(screen.getByLabelText("Stress Testing Stress type"), "dryback");
    fireEvent.press(screen.getByLabelText("Run Stress Testing"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "stress-test",
        expect.objectContaining({
          growId: "grow-1",
          stressType: "dryback"
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Stress Testing result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Stress Follow-up Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "stress-test",
          toolRunId: "toolrun-1",
          output: expect.objectContaining({
            keeperImpact: "watch",
            selectionSignals: expect.objectContaining({
              rejectOrRetest: true,
              cropSteeringCandidate: true
            })
          }),
          tasks: [
            expect.objectContaining({
              title: "Inspect recovery photos",
              priority: "high",
              allDay: true,
              calendarType: "stress_test_followup",
              sourceStage: "stress_recovery",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("keeper decisions")
            }),
            expect.objectContaining({
              title: "Update pheno stress score",
              priority: "high",
              sourceStage: "pheno_stress_score",
              description: expect.stringContaining("stress response score (62)")
            }),
            expect.objectContaining({
              title: "Compare stress response to selection plan",
              priority: "high",
              sourceStage: "keeper_retest_decision",
              description: expect.stringContaining("keeper/watch/reject")
            }),
            expect.objectContaining({
              title: "Flag crop steering candidate notes",
              priority: "medium",
              sourceStage: "crop_steering_candidate",
              description: expect.stringContaining("crop steering")
            })
          ]
        })
      )
    );
  });

  it("creates default stress follow-up task with shared Schedule metadata", async () => {
    const screen = render(<StressTestToolRoute />);

    fireEvent.press(screen.getByLabelText("Run Stress Testing"));

    await waitFor(() => expect(screen.getByText("Stress Testing result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Follow-up Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "stress-test",
          toolRunId: "toolrun-1",
          title: "Inspect recovery photos",
          priority: "high",
          allDay: true,
          calendarType: "stress_test_followup",
          sourceStage: "stress_recovery",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -720 })]
          }),
          description: expect.stringContaining("Review recovery")
        })
      )
    );
  });
});
