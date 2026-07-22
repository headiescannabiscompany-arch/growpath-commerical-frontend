import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import SoilNutrientBatchToolRoute from "@/app/home/commercial/tools/soil-nutrient-batch";
import LegacyPersonalSoilNutrientBatchRoute from "@/app/home/personal/(tabs)/tools/soil-nutrient-batch";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockCreateSoilNutrientBatch = jest.fn();
const mockCreateCommercialTask = jest.fn();

jest.setTimeout(20000);

jest.mock("expo-router", () => ({
  Redirect: ({ href }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, `Redirect ${href}`);
  },
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn()
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ plan: "commercial", mode: "commercial", can: () => true })
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

jest.mock("@/api/grows", () => ({ listPersonalGrows: () => new Promise(() => {}) }));

jest.mock("@/api/commercialWorkflows", () => ({
  createSoilNutrientBatch: (...args: any[]) => mockCreateSoilNutrientBatch(...args),
  createCommercialTask: (...args: any[]) => mockCreateCommercialTask(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: jest.fn()
}));

function enterRequiredBatchFields(screen: ReturnType<typeof render>) {
  fireEvent.changeText(
    screen.getByLabelText("Soil & Nutrient Batch Planner Production batch name"),
    "Starter Mix 2026-07"
  );
  fireEvent.changeText(
    screen.getByLabelText("Soil & Nutrient Batch Planner Purpose"),
    "seedling"
  );
  fireEvent.changeText(
    screen.getByLabelText("Soil & Nutrient Batch Planner Batch volume"),
    "120"
  );
  fireEvent.changeText(
    screen.getByLabelText("Soil & Nutrient Batch Planner Batch and bag volume unit"),
    "gal"
  );
  fireEvent.changeText(
    screen.getByLabelText("Soil & Nutrient Batch Planner Bag size"),
    "1.5"
  );
  fireEvent.changeText(
    screen.getByLabelText(/Soil & Nutrient Batch Planner Ingredients:/),
    "Verified compost, 40, gal, 80, 1, 1, 1, slow, high, compost"
  );
}

describe("SoilNutrientBatchToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        batchName: "Starter Mix 2026-07",
        recipeId: "Base Soil Mix",
        purpose: "seedling",
        purposeFit: "review_before_use",
        bagCount: 72,
        guaranteedAnalysisEstimate: {
          status: "calculated_from_compatible_label_units",
          N: 3,
          P2O5: 1,
          K2O: 1
        },
        costPerBag: 12.4,
        warnings: ["This mix may be too hot for seedlings."],
        missingInformation: [],
        inventoryReview: [],
        inventoryShortages: [],
        ingredientPullSheet: [{ name: "Verified compost", quantity: 40, unit: "gal" }],
        tasksToCreate: [
          {
            title: "Pull ingredients and verify lots",
            dueInDays: 0,
            priority: "medium"
          },
          {
            title: "Mix production batch and record actuals",
            dueInDays: 1,
            priority: "high"
          }
        ],
        aiCreditsUsed: 0
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockCreateSoilNutrientBatch.mockResolvedValue({ id: "batch-1" });
    mockCreateCommercialTask.mockResolvedValue({ id: "commercial-task-1" });
  });

  it("redirects the retired Personal route to the Commercial tool", () => {
    const screen = render(<LegacyPersonalSoilNutrientBatchRoute />);
    expect(
      screen.getByText("Redirect /home/commercial/tools/soil-nutrient-batch")
    ).toBeTruthy();
  });

  it("saves a durable Commercial production batch and linked task plan", async () => {
    const screen = render(<SoilNutrientBatchToolRoute />);
    enterRequiredBatchFields(screen);
    fireEvent.press(screen.getByLabelText("Run Soil & Nutrient Batch Planner"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "soil-nutrient-batch",
        expect.objectContaining({
          batchName: "Starter Mix 2026-07",
          purpose: "seedling",
          batchVolume: 120,
          batchVolumeUnit: "gal",
          bagSize: 1.5,
          ingredients: [
            expect.objectContaining({
              name: "Verified compost",
              quantity: 40,
              cost: 80,
              N: 1
            })
          ]
        })
      )
    );

    fireEvent.press(screen.getByText("Save Production Batch & Tasks"));

    await waitFor(() =>
      expect(mockCreateSoilNutrientBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          batchName: "Starter Mix 2026-07",
          linkedToolRunId: "toolrun-1",
          bagCount: 72,
          guaranteedAnalysisEstimate: expect.objectContaining({ N: 3 }),
          calculatorOutput: expect.objectContaining({ bagCount: 72 }),
          status: "planned"
        })
      )
    );
    expect(mockCreateCommercialTask).toHaveBeenCalledTimes(2);
    expect(mockCreateCommercialTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Pull ingredients and verify lots",
        sourceType: "product_batch",
        sourceId: "batch-1",
        linkedProductBatchId: "batch-1",
        linkedToolRunId: "toolrun-1"
      })
    );
  });

  it("keeps the optional AI brief separate from deterministic production math", () => {
    const screen = render(<SoilNutrientBatchToolRoute />);
    enterRequiredBatchFields(screen);
    fireEvent.changeText(
      screen.getByLabelText("Soil & Nutrient Batch Planner Crop stage"),
      "seedling"
    );
    fireEvent.changeText(
      screen.getByLabelText("Soil & Nutrient Batch Planner Recipe ID or version"),
      "Base Soil Mix"
    );

    fireEvent.press(screen.getByLabelText("Ask AI to plan soil nutrient batch"));

    expect(screen.getByText("AI soil batch brief")).toBeTruthy();
    expect(screen.getByText(/Purpose\/stage: seedling \/ seedling/)).toBeTruthy();
    expect(screen.getByText(/Recipe: Base Soil Mix/)).toBeTruthy();
    expect(
      screen.getByText(/Verified compost: 40 gal, cost 80, label 1-1-1/)
    ).toBeTruthy();
  });
});
