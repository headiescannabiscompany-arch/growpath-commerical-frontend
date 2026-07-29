import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CloneRootingToolRoute from "@/app/home/personal/(tabs)/tools/clone-rooting";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
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
  saveToolRunAndCreateTask: jest.fn(),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

describe("CloneRootingToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        assessmentStatus: "measured_batch_review",
        riskLevel: "high",
        rootingProgress: "mixed_progress_with_losses",
        daysSinceCut: 9,
        batchCounts: { total: 12, rooted: 3, failed: 2, pending: 7 },
        clonePerformanceSummary: { rootingPercent: 25, failurePercent: 16.7 },
        environmentSnapshot: { humidityRh: 78, lightPpfd: 110 },
        mediaAnalysis: {
          requested: false,
          performed: false,
          status: "not_requested",
          limitations: ["No clone images were submitted for visual review."]
        },
        missingInformation: ["plug or root-zone temperature"],
        likelyBottlenecks: [
          {
            key: "failed-cuts",
            severity: "high",
            issue: "Failed cuts are present.",
            evidence: "2 of 12 cuts were failed or culled.",
            recommendations: ["Inspect the failed cuts and review sanitation."]
          }
        ],
        followUpTask: {
          title: "Recheck clone tray",
          priority: "high",
          dueInDays: 2
        }
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
  });

  it("creates clone rooting follow-up tasks from the saved ToolRun", async () => {
    const screen = render(<CloneRootingToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Days since cut"),
      "9"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Total cuts in batch"),
      "12"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Visibly rooted count"),
      "3"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Failed or culled count"),
      "2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Direct root evidence"),
      "mixed"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Propagation humidity (% RH)"),
      "78"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter PPFD at cutting height"),
      "110"
    );
    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "clone-rooting",
        expect.objectContaining({
          growId: "grow-1",
          daysSinceCut: 9,
          cloneCount: 12,
          rootedCount: 3,
          failedCount: 2,
          rootEvidence: "mixed",
          humidity: 78,
          lightPpfd: 110
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Clone Rooting Troubleshooter result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Clone Follow-up Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "clone-rooting",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            daysSinceCut: 9,
            cloneCount: 12,
            rootedCount: 3,
            failedCount: 2,
            rootEvidence: "mixed"
          }),
          output: expect.objectContaining({
            riskLevel: "high",
            rootingProgress: "mixed_progress_with_losses"
          }),
          tasks: [
            expect.objectContaining({
              title: "Recheck clone tray",
              priority: "high",
              allDay: true,
              calendarType: "clone_rooting_followup",
              sourceStage: "clone_rooting",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("Failed cuts are present")
            }),
            expect.objectContaining({
              title: "Photograph tray, stem bases, and visible roots",
              sourceStage: "clone_photo_review"
            }),
            expect.objectContaining({
              title: "Isolate affected cuts and verify clone conditions",
              priority: "high",
              sourceStage: "clone_environment_review"
            }),
            expect.objectContaining({
              title: "Update clone survival and transplant decision",
              sourceStage: "clone_transplant_decision"
            })
          ]
        })
      )
    );
  });

  it("blocks a run until real batch counts and direct root evidence are entered", async () => {
    const screen = render(<CloneRootingToolRoute />);

    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Complete the required fields: Days since cut, Total cuts in batch, Visibly rooted count, Failed or culled count, Direct root evidence."
        )
      ).toBeTruthy()
    );
    expect(mockRunCalculator).not.toHaveBeenCalled();
  });

  it("rejects counts that cannot fit inside the batch", async () => {
    const screen = render(<CloneRootingToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Days since cut"),
      "8"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Total cuts in batch"),
      "10"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Visibly rooted count"),
      "8"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Failed or culled count"),
      "3"
    );
    fireEvent.changeText(
      screen.getByLabelText("Clone Rooting Troubleshooter Direct root evidence"),
      "roots_visible"
    );
    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Visibly rooted count plus failed count cannot exceed the total cuts."
        )
      ).toBeTruthy()
    );
    expect(mockRunCalculator).not.toHaveBeenCalled();
  });
});
