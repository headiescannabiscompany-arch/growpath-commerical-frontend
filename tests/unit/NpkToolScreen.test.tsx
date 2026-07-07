import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import NpkToolScreen from "@/app/home/personal/(tabs)/tools/npk";

const mockRunCalculator = jest.fn();
const mockListNutrientRecipes = jest.fn();
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
  CAPABILITY_KEYS: { TOOL_NPK: "tool_npk" },
  useEntitlements: () => ({
    plan: "pro",
    mode: "personal",
    can: () => true
  })
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/components/nav/BackButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Back");
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
      selectedPlantContext: null,
      setPlantId: jest.fn(),
      toolRunContext: { selectedPlantContext: null }
    })
  };
});

jest.mock("@/features/personal/tools/ToolResultSurface", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title }: { title: string }) =>
    React.createElement(View, null, React.createElement(Text, null, title));
});

jest.mock("@/features/personal/tools/nutrientContext", () => ({
  buildNutrientContextAssumption: () => null,
  buildNutrientContextNotices: () => []
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateTask: jest.fn()
}));

jest.mock("@/api/toolRuns", () => ({
  runCalculator: (...args: any[]) => mockRunCalculator(...args),
  saveToolRunToLog: jest.fn()
}));

jest.mock("@/api/nutrientRecipes", () => ({
  listNutrientRecipes: (...args: any[]) => mockListNutrientRecipes(...args),
  createNutrientRecipe: jest.fn(),
  reviseNutrientRecipe: jest.fn(),
  updateNutrientRecipe: jest.fn(),
  archiveNutrientRecipe: jest.fn(),
  cloneNutrientRecipe: jest.fn(),
  recordNutrientRecipeUse: jest.fn()
}));

jest.mock("@/api/products", () => ({
  createProduct: (...args: any[]) => mockCreateProduct(...args)
}));

describe("NpkToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListNutrientRecipes.mockResolvedValue([]);
    mockRunCalculator.mockResolvedValue({
      outputs: {
        formula: "Kelp meal recipe",
        totals: { Nppm: 20, Pppm: 4.36, Kppm: 8.3 },
        warnings: [],
        releaseTimeline: {}
      },
      toolRun: {
        id: "toolrun-1",
        _id: "toolrun-1",
        inputs: {},
        outputs: {}
      }
    });
  });

  it("sends label P2O5/K2O and elemental P/K values to the NPK calculator", async () => {
    const screen = render(<NpkToolScreen />);

    expect(screen.getByText(/Build up to 20 product rows/)).toBeTruthy();
    expect(screen.getByText(/Label N-P-K uses elemental N, P2O5, and K2O/)).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Product name"), "Kelp meal");
    fireEvent.changeText(screen.getByPlaceholderText("Amount"), "100");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 N percent"), "3");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 P2O5 percent"), "1");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 K2O percent"), "2");

    fireEvent.press(screen.getByText("Calculate recipe"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "npk-recipe",
        expect.objectContaining({
          growId: "grow-1",
          products: [
            expect.objectContaining({
              name: "Kelp meal",
              amount: 100,
              N: 3,
              P: 1,
              K: 2,
              P2O5: 1,
              K2O: 2,
              elementalP: 0.4364,
              elementalK: 1.6602,
              guaranteedAnalysis: expect.objectContaining({
                N: 3,
                P2O5: 1,
                K2O: 2
              }),
              elementalAnalysis: expect.objectContaining({
                N: 3,
                P: 0.4364,
                K: 1.6602
              })
            })
          ]
        })
      )
    );

    await waitFor(() => expect(screen.getByText("NPK recipe result")).toBeTruthy());
  });
});
