import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DryAmendmentMixToolScreen from "@/app/home/personal/(tabs)/tools/dry-amendment-mix";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockCreateProduct = jest.fn();

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

jest.mock("@/api/products", () => ({
  createProduct: (...args: any[]) => mockCreateProduct(...args)
}));

describe("DryAmendmentMixToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        recipeName: "Veg topdress blend",
        totalAnalysis: { N: 3, P2O5: 8, K2O: 1 },
        achievedRatio: { N: 3, P: 8, K: 1 },
        batchWeight: 1000,
        dosePerCubicFoot: 75,
        stageFit: "veg",
        deliveryCurve: { explanation: "medium N with slow phosphorus tail" },
        stageTimingWarnings: ["Too strong for seedlings."],
        compatibilityWarnings: ["Confirm Ca/P balance before label use."]
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockCreateProduct.mockResolvedValue({ id: "product-1", status: "draft" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
  });

  it("creates source-linked dry amendment batch tasks from the saved ToolRun", async () => {
    const screen = render(<DryAmendmentMixToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Dry Amendment Mix Builder Recipe name"),
      "Veg topdress blend"
    );
    fireEvent.press(screen.getByLabelText("Run Dry Amendment Mix Builder"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "dry-amendment-mix",
        expect.objectContaining({
          growId: "grow-1",
          recipeName: "Veg topdress blend",
          ingredients: expect.arrayContaining([
            expect.objectContaining({
              name: "Alfalfa meal",
              releaseClass: "medium",
              analysisBasis: "label_guaranteed_analysis_n_p2o5_k2o"
            }),
            expect.objectContaining({
              name: "Bone meal",
              releaseClass: "slow",
              analysisBasis: "label_guaranteed_analysis_n_p2o5_k2o"
            })
          ])
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Dry Amendment Mix Builder result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Blend Batch Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "dry-amendment-mix",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({ recipeName: "Veg topdress blend" }),
          output: expect.objectContaining({ dosePerCubicFoot: 75 }),
          tasks: expect.arrayContaining([
            expect.objectContaining({
              title: "Source ingredients for Veg topdress blend",
              allDay: true,
              calendarType: "dry_amendment_batch",
              sourceStage: "dry_blend_ingredient_pull",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -1440 })]
              })
            }),
            expect.objectContaining({
              title: "Weigh and mix Veg topdress blend",
              priority: "high",
              sourceStage: "dry_blend_mixing"
            }),
            expect.objectContaining({
              title: "Label Veg topdress blend batch",
              sourceStage: "dry_blend_label_review"
            }),
            expect.objectContaining({
              title: "Review Veg topdress blend application result",
              sourceStage: "dry_blend_result_review"
            })
          ])
        })
      )
    );
  });

  it("converts dry amendment blends into commercial product drafts", async () => {
    const screen = render(<DryAmendmentMixToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Dry Amendment Mix Builder Recipe name"),
      "Veg topdress blend"
    );
    fireEvent.press(screen.getByLabelText("Run Dry Amendment Mix Builder"));

    await waitFor(() =>
      expect(screen.getByText("Dry Amendment Mix Builder result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Convert to Product Draft"));

    await waitFor(() =>
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Veg topdress blend",
          category: "dry_amendment",
          status: "draft",
          linkedToolRunId: "toolrun-1",
          growInterests: ["dry amendments", "living soil", "recipe building"],
          fullDescription: expect.stringContaining("Suggested rate: 75 g per cubic foot"),
          specs: expect.objectContaining({
            sourceTool: "dry-amendment-mix",
            recipeType: "dry_amendment_blend",
            targetStage: "veg",
            analysisBasis: "label_guaranteed_analysis_n_p2o5_k2o",
            ingredients: expect.arrayContaining([
              expect.objectContaining({
                name: "Alfalfa meal",
                amount: 500,
                analysisBasis: "label_guaranteed_analysis_n_p2o5_k2o"
              }),
              expect.objectContaining({
                name: "Bone meal",
                releaseClass: "slow",
                analysisBasis: "label_guaranteed_analysis_n_p2o5_k2o"
              })
            ]),
            guaranteedAnalysisEstimate: { N: 3, P2O5: 8, K2O: 1 },
            achievedRatio: { N: 3, P: 8, K: 1 },
            batchWeightGrams: 1000,
            applicationRate: {
              dosePerCubicFoot: 75,
              dosePerGallonSoil: 10
            },
            releaseCurve: { explanation: "medium N with slow phosphorus tail" },
            directions: expect.arrayContaining([
              expect.stringContaining("Confirm each ingredient label"),
              expect.stringContaining("Apply around 75 g per cubic foot")
            ]),
            warnings: expect.arrayContaining([
              "Too strong for seedlings.",
              "Confirm Ca/P balance before label use.",
              expect.stringContaining("Draft product requires image")
            ])
          })
        })
      )
    );
  });

  it("builds an AI dry amendment brief without replacing calculator math", () => {
    const screen = render(<DryAmendmentMixToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Dry Amendment Mix Builder Recipe name"),
      "Veg topdress blend"
    );
    fireEvent.changeText(
      screen.getByLabelText("Dry Amendment Mix Builder Desired stage"),
      "veg"
    );
    fireEvent.changeText(
      screen.getByLabelText(
        "Dry Amendment Mix Builder Ingredient A guaranteed analysis N-P2O5-K2O"
      ),
      "3-1-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Dry Amendment Mix Builder Ingredient B release"),
      "slow"
    );

    fireEvent.press(screen.getByLabelText("Ask AI to build dry amendment blend"));

    expect(screen.getByText("AI dry amendment brief")).toBeTruthy();
    expect(
      screen.getByText(/source of truth for label N-P2O5-K2O math, release timing/)
    ).toBeTruthy();
    expect(screen.getByText(/Recipe: Veg topdress blend/)).toBeTruthy();
    expect(screen.getByText(/Target stage: veg/)).toBeTruthy();
    expect(screen.getByText(/Alfalfa meal: 500 grams, label 3-1-2/)).toBeTruthy();
    expect(
      screen.getByText(
        /call the Dry Amendment Mix Builder for final guaranteed-analysis math/
      )
    ).toBeTruthy();
  });
});
