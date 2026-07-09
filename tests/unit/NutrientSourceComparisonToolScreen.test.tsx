import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import NutrientSourceComparisonToolScreen from "@/app/home/personal/(tabs)/tools/nutrient-source-comparison";

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

describe("NutrientSourceComparisonToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        nutrient: "calcium",
        bestChoiceByIntent: "gypsum",
        desiredSpeed: "medium",
        fastSources: ["calcium nitrate"],
        mediumSources: ["gypsum", "calcium acetate"],
        slowSources: ["oyster shell"],
        timingWarnings: ["Oyster shell is too slow for immediate correction."],
        pHEffectWarnings: ["Lime sources may push pH upward."]
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

  it("creates source review tasks from nutrient comparison output", async () => {
    const screen = render(<NutrientSourceComparisonToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Nutrient Source Comparison Nutrient"),
      "calcium"
    );
    fireEvent.press(screen.getByLabelText("Run Nutrient Source Comparison"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "nutrient-source-comparison",
        expect.objectContaining({
          growId: "grow-1",
          nutrient: "calcium"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Nutrient Source Comparison result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Source Review Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "nutrient-source-comparison",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            nutrient: "calcium"
          }),
          output: expect.objectContaining({
            bestChoiceByIntent: "gypsum"
          }),
          tasks: [
            expect.objectContaining({
              title: "Review calcium source choice",
              priority: "high",
              allDay: true,
              calendarType: "nutrient_source_review",
              sourceStage: "source_fit_review",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("gypsum")
            }),
            expect.objectContaining({
              title: "Compare available calcium inputs",
              sourceStage: "source_speed_comparison",
              description: expect.stringContaining("Medium sources: gypsum")
            }),
            expect.objectContaining({
              title: "Log calcium source result after application",
              sourceStage: "source_application_review"
            })
          ]
        })
      )
    );
  });
});
