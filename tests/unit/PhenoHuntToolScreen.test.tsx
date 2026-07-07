import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PhenoHuntToolRoute from "@/app/home/personal/(tabs)/tools/pheno-hunt";

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

describe("PhenoHuntToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        projectName: "Summer hunt",
        comparisonMatrix: [
          {
            id: "p1",
            label: "Plant 1",
            score: 86,
            keeperCategory: "keeper",
            tags: ["high_vigor"]
          },
          {
            id: "p2",
            label: "Plant 2",
            score: 68,
            keeperCategory: "retest"
          }
        ],
        keeperRecommendations: [
          {
            id: "p1",
            label: "Plant 1",
            reason: "Best vigor, resin, aroma, and recovery profile."
          }
        ],
        retestRecommendations: [
          {
            id: "p2",
            label: "Plant 2",
            reason: "Aroma is strong but rooting and recovery lagged."
          }
        ]
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

  it("creates keeper and retest tasks from pheno hunt output", async () => {
    const screen = render(<PhenoHuntToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Pheno Hunting Project name"),
      "Summer hunt"
    );
    fireEvent.press(screen.getByLabelText("Run Pheno Hunting"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "pheno-hunt",
        expect.objectContaining({
          growId: "grow-1",
          projectName: "Summer hunt"
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Pheno Hunting result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Pheno Decision Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "pheno-hunt",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            projectName: "Summer hunt"
          }),
          output: expect.objectContaining({
            keeperRecommendations: expect.any(Array),
            retestRecommendations: expect.any(Array)
          }),
          tasks: [
            expect.objectContaining({
              title: "Preserve keeper candidate Plant 1",
              priority: "high",
              description: expect.stringContaining("Best vigor")
            }),
            expect.objectContaining({
              title: "Retest pheno Plant 2",
              description: expect.stringContaining("rooting and recovery lagged")
            }),
            expect.objectContaining({
              title: "Record pheno hunt decision notes",
              description: expect.stringContaining("Top scored plant: Plant 1")
            })
          ]
        })
      )
    );
  });
});
