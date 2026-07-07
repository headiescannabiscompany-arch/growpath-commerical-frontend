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
        riskLevel: "high",
        rootingProgress: "behind",
        daysSinceCut: 9,
        clonePerformanceSummary: { rootingPercent: 20 },
        likelyBottlenecks: [{ issue: "humidity dipping too low" }],
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
      screen.getByLabelText("Clone Rooting Troubleshooter Rooted count"),
      "3"
    );
    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "clone-rooting",
        expect.objectContaining({
          growId: "grow-1",
          daysSinceCut: "9",
          rootedCount: "3"
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
            daysSinceCut: "9",
            rootedCount: "3"
          }),
          output: expect.objectContaining({
            riskLevel: "high",
            rootingProgress: "behind"
          }),
          tasks: [
            expect.objectContaining({
              title: "Recheck clone tray",
              priority: "high",
              description: expect.stringContaining("humidity dipping too low")
            }),
            expect.objectContaining({
              title: "Photograph clone tray and weak cuts"
            }),
            expect.objectContaining({
              title: "Adjust clone environment if needed",
              priority: "high"
            }),
            expect.objectContaining({
              title: "Update clone survival and transplant decision"
            })
          ]
        })
      )
    );
  });
});
