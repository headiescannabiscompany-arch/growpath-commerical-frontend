import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AutoGrowCalendarToolRoute from "@/app/home/personal/(tabs)/tools/auto-grow-calendar";

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

describe("AutoGrowCalendarToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        stageTimeline: {
          flipDate: "2026-08-04",
          expectedHarvestStart: "2026-10-06",
          expectedHarvestEnd: "2026-10-13"
        },
        taskSchedule: [
          {
            title: "Transplant into final containers",
            dueDate: "2026-07-14",
            priority: "medium",
            stage: "veg",
            description: "Move rooted plants and water in gently."
          },
          {
            title: "Flip to flower",
            dueDate: "2026-08-04",
            priority: "high",
            stage: "transition",
            notes: "Confirm canopy is even before changing photoperiod."
          },
          {
            title: "Start harvest readiness checks",
            dueDate: "2026-09-29",
            priority: "medium",
            stage: "late flower"
          }
        ],
        reminders: ["Review dates after transplant."]
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3"]
    });
  });

  it("creates tasks from the generated grow calendar schedule", async () => {
    const screen = render(<AutoGrowCalendarToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Auto Grow Calendar Start date YYYY-MM-DD"),
      "2026-07-07"
    );
    fireEvent.press(screen.getByLabelText("Run Auto Grow Calendar"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "auto-grow-calendar",
        expect.objectContaining({
          growId: "grow-1",
          startDate: "2026-07-07",
          plantCount: "4"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Auto Grow Calendar result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Calendar Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "auto-grow-calendar",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            startDate: "2026-07-07",
            plantCount: "4"
          }),
          output: expect.objectContaining({
            taskSchedule: expect.any(Array)
          }),
          tasks: [
            expect.objectContaining({
              title: "Transplant into final containers",
              dueDate: "2026-07-14",
              description: expect.stringContaining("Stage: veg")
            }),
            expect.objectContaining({
              title: "Flip to flower",
              dueDate: "2026-08-04",
              priority: "high",
              description: expect.stringContaining("Confirm canopy is even")
            }),
            expect.objectContaining({
              title: "Start harvest readiness checks",
              dueDate: "2026-09-29"
            })
          ]
        })
      )
    );
  });
});
