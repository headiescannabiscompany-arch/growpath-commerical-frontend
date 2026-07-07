import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TopdressToolScreen from "@/app/home/personal/(tabs)/tools/topdress";

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

describe("TopdressToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        productName: "Bloom topdress",
        amountPerPlant: 20,
        amountUnit: "tbsp",
        totalAmount: 80,
        plantCount: 4,
        plannedApplyDate: "2026-07-10",
        releaseWindowDays: { min: 7, max: 21 },
        purposeFit: "flower",
        taskToCreate: {
          title: "Apply Bloom topdress",
          priority: "high"
        },
        logSummary: "Apply bloom topdress and monitor response."
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4", "task-5"]
    });
  });

  it("creates a topdress application and follow-up task schedule", async () => {
    const screen = render(<TopdressToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Topdress Planner Product or recipe name"),
      "Bloom topdress"
    );
    fireEvent.changeText(
      screen.getByLabelText("Topdress Planner Planned apply date"),
      "2026-07-10"
    );
    fireEvent.press(screen.getByLabelText("Run Topdress Planner"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "topdress-plan",
        expect.objectContaining({
          growId: "grow-1",
          productName: "Bloom topdress",
          plantCount: 4,
          plannedApplyDate: "2026-07-10",
          waterInAfterApply: true
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Topdress Planner result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Topdress Follow-up Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "topdress-plan",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            productName: "Bloom topdress",
            plannedApplyDate: "2026-07-10"
          }),
          output: expect.objectContaining({
            amountPerPlant: 20,
            releaseWindowDays: { min: 7, max: 21 }
          }),
          tasks: [
            expect.objectContaining({
              title: "Apply Bloom topdress",
              priority: "high",
              dueDate: "2026-07-10"
            }),
            expect.objectContaining({
              title: "Water in Bloom topdress",
              priority: "high",
              dueDate: "2026-07-10"
            }),
            expect.objectContaining({
              title: "Check Bloom topdress response after 3 days",
              dueDate: "2026-07-13"
            }),
            expect.objectContaining({
              title: "Recheck Bloom topdress response after 7 days",
              dueDate: "2026-07-17"
            }),
            expect.objectContaining({
              title: "Review next re-amend timing for Bloom topdress",
              dueDate: "2026-07-31"
            })
          ]
        })
      )
    );
  });

  it("builds an AI topdress brief without replacing rate and task math", () => {
    const screen = render(<TopdressToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Topdress Planner Product or recipe name"),
      "Bloom topdress"
    );
    fireEvent.changeText(screen.getByLabelText("Topdress Planner Stage"), "flower");
    fireEvent.changeText(
      screen.getByLabelText("Topdress Planner Days until harvest"),
      "42"
    );
    fireEvent.changeText(
      screen.getByLabelText("Topdress Planner Planned apply date"),
      "2026-07-10"
    );

    fireEvent.press(screen.getByLabelText("Ask AI to build topdress plan"));

    expect(screen.getByText("AI topdress plan brief")).toBeTruthy();
    expect(screen.getByText(/Product\/recipe: Bloom topdress/)).toBeTruthy();
    expect(screen.getByText(/Stage: flower/)).toBeTruthy();
    expect(screen.getByText(/Days until harvest: 42/)).toBeTruthy();
    expect(
      screen.getByText(/call the Topdress Planner for final rate, total amount/)
    ).toBeTruthy();
  });
});
