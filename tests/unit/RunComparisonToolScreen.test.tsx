import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RunComparisonToolRoute from "@/app/home/personal/(tabs)/tools/run-comparison";

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

describe("RunComparisonToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        bestRun: { name: "Run 2" },
        worstRun: { name: "Run 1" },
        differences: {
          yieldSpread: 4,
          qualitySpread: 1
        },
        missingData: ["dry/cure notes", "smoke notes"],
        structuredSummary: {
          sameCultivar: false
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

  it("creates next-run tasks from run comparison output", async () => {
    const screen = render(<RunComparisonToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Run-To-Run Comparison Runs as lines: name, cultivar, yield, quality 0-10, issue count, days, avg VPD, avg DLI, dry days"),
      "Run 1, Sour Diesel, 14, 7, 3, 120, 1.1, 36, 12\nRun 2, Chem D, 18, 8, 1, 112, 1.3, 40, 8"
    );
    fireEvent.press(screen.getByLabelText("Run Run-To-Run Comparison"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "run-comparison",
        expect.objectContaining({
          growId: "grow-1",
          runs: expect.arrayContaining([
            expect.objectContaining({ name: "Run 1", cultivar: "Sour Diesel" }),
            expect.objectContaining({ name: "Run 2", cultivar: "Chem D" })
          ])
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Run-To-Run Comparison result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Next-Run Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "run-comparison",
          toolRunId: "toolrun-1",
          output: expect.objectContaining({
            bestRun: expect.objectContaining({ name: "Run 2" }),
            missingData: expect.any(Array)
          }),
          tasks: [
            expect.objectContaining({
              title: "Record run comparison decisions",
              description: expect.stringContaining("Run 2")
            }),
            expect.objectContaining({
              title: "Update next-run task template",
              description: expect.stringContaining("VPD")
            }),
            expect.objectContaining({
              title: "Fill missing comparison data",
              priority: "high",
              description: expect.stringContaining("missing yield")
            }),
            expect.objectContaining({
              title: "Separate cultivar and environment effects",
              description: expect.stringContaining("genetics/pheno")
            })
          ]
        })
      )
    );
  });
});
