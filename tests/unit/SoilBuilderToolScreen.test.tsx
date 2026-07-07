import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import SoilBuilderToolScreen from "@/app/home/personal/(tabs)/tools/soil-builder";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
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

jest.mock("@/api/products", () => ({
  createProduct: (...args: any[]) => mockCreateProduct(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: jest.fn()
}));

describe("SoilBuilderToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        mixName: "Living soil mix",
        totalGallons: 30,
        totalCubicFeet: 4.01,
        bagCountEstimate: 0,
        purposeFit: "veg",
        recipe: { recipeType: "soil" },
        restCookDays: 21,
        releaseCurve: { summary: "fast N plus slow P base" }
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockCreateProduct.mockResolvedValue({ id: "product-1", status: "draft" });
  });

  it("sends target profile, release timing, and rest/cook assumptions to the soil calculator", async () => {
    const screen = render(<SoilBuilderToolScreen />);

    fireEvent.changeText(screen.getByLabelText("Soil Builder Target N-P-K"), "3-1-1");
    fireEvent.changeText(
      screen.getByLabelText("Soil Builder Target release curve"),
      "1-1-1 slow base plus fast nitrogen"
    );
    fireEvent.changeText(
      screen.getByLabelText("Soil Builder Compost uncertainty"),
      "high - compost only estimated"
    );
    fireEvent.changeText(screen.getByLabelText("Soil Builder Rest/cook days"), "28");

    fireEvent.press(screen.getByLabelText("Run Soil Builder"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "soil-builder",
        expect.objectContaining({
          growId: "grow-1",
          goal: "medium veg soil",
          targetNpk: "3-1-1",
          targetReleaseCurve: "1-1-1 slow base plus fast nitrogen",
          compostUncertainty: "high - compost only estimated",
          restCookDays: 28,
          mineralSupport: "gypsum, basalt, oyster shell",
          biologySupport: "worm castings, microbial inoculant, moisture activation",
          amendments: expect.arrayContaining([
            expect.objectContaining({
              name: "Alfalfa meal",
              releaseClass: "fast",
              guaranteedAnalysis: { N: 3, P2O5: 1, K2O: 2 }
            }),
            expect.objectContaining({
              name: "Fish bone meal",
              releaseClass: "slow",
              guaranteedAnalysis: { N: 3, P2O5: 16, K2O: 0 }
            })
          ])
        })
      )
    );

    await waitFor(() => expect(screen.getByText("Soil Builder result")).toBeTruthy());
    expect(
      screen.getByText(
        "Soil nutrient availability is an estimate until lab-tested; compost/castings add uncertainty."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Convert to Product Draft"));

    await waitFor(() =>
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Living soil mix",
          category: "soil_mix",
          status: "draft",
          linkedToolRunId: "toolrun-1",
          growInterests: ["living soil", "soil builder", "dry amendments"],
          specs: expect.objectContaining({
            sourceTool: "soil-builder",
            recipe: { recipeType: "soil" },
            targetNpk: "3-1-1",
            releaseCurve: { summary: "fast N plus slow P base" },
            restCookDays: 21,
            compostUncertainty: "high - compost only estimated",
            ingredients: expect.arrayContaining([
              expect.objectContaining({ name: "Alfalfa meal" }),
              expect.objectContaining({ name: "Fish bone meal" })
            ])
          })
        })
      )
    );
  });
});
