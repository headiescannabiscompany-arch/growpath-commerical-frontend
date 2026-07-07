import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CropSteeringProjectToolRoute from "@/app/home/personal/(tabs)/tools/crop-steering-project";

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

describe("CropSteeringProjectToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        steeringIntent: "generative",
        steeringOutcome: "on_track",
        pressureLevel: "high",
        phase: "P1",
        plantResponse: "turgor recovered by lights on",
        tasksToCreate: [
          {
            title: "Check morning dryback",
            priority: "high",
            dueInDays: 1,
            description: "Confirm dryback before first irrigation shot."
          },
          {
            title: "Compare runoff EC and pH",
            priority: "medium",
            dueInDays: 2,
            description: "Log input and runoff values before changing recipe."
          }
        ]
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2"]
    });
  });

  it("creates crop steering tasks from calculator task output", async () => {
    const screen = render(<CropSteeringProjectToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Crop Steering Projects Goal"),
      "generative"
    );
    fireEvent.press(screen.getByLabelText("Run Crop Steering Projects"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "crop-steering-project",
        expect.objectContaining({
          growId: "grow-1",
          steeringIntent: "generative"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Crop Steering Projects result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Steering Task Plan"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "crop-steering-project",
          toolRunId: "toolrun-1",
          output: expect.objectContaining({
            phase: "P1",
            tasksToCreate: expect.any(Array)
          }),
          tasks: [
            expect.objectContaining({
              title: "Check morning dryback",
              priority: "high",
              description: expect.stringContaining("dryback")
            }),
            expect.objectContaining({
              title: "Compare runoff EC and pH",
              priority: "medium",
              description: expect.stringContaining("runoff")
            })
          ]
        })
      )
    );
  });
});
