import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import SoilNutrientBatchToolRoute from "@/app/home/personal/(tabs)/tools/soil-nutrient-batch";

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

describe("SoilNutrientBatchToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        recipeId: "Base Soil Mix",
        purpose: "seedling",
        purposeFit: "poor",
        bagCount: 72,
        guaranteedAnalysisEstimate: {
          N: 3,
          P2O5: 1,
          K2O: 1
        },
        costPerBag: 12.4,
        warnings: ["This mix may be too hot for seedlings."]
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

  it("creates production tasks from soil nutrient batch output", async () => {
    const screen = render(<SoilNutrientBatchToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Soil & Nutrient Batch Planner Purpose"),
      "seedling"
    );
    fireEvent.press(screen.getByLabelText("Run Soil & Nutrient Batch Planner"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "soil-nutrient-batch",
        expect.objectContaining({
          growId: "grow-1",
          purpose: "seedling",
          recipeId: "Base Soil Mix"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Soil & Nutrient Batch Planner result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Batch Task Plan"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "soil-nutrient-batch",
          toolRunId: "toolrun-1",
          output: expect.objectContaining({
            bagCount: 72,
            guaranteedAnalysisEstimate: expect.objectContaining({ N: 3 })
          }),
          tasks: [
            expect.objectContaining({
              title: "Pull ingredients for Base Soil Mix",
              description: expect.stringContaining("guaranteed analysis")
            }),
            expect.objectContaining({
              title: "Mix and record Base Soil Mix actuals",
              priority: "high",
              description: expect.stringContaining("Target bag count: 72")
            }),
            expect.objectContaining({
              title: "QA soil batch label and release notes",
              priority: "high",
              description: expect.stringContaining("release timing")
            }),
            expect.objectContaining({
              title: "Update inventory or product draft",
              description: expect.stringContaining("product batch/lot")
            })
          ]
        })
      )
    );
  });
});
