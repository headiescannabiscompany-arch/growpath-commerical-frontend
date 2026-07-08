import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import NpkToolScreen from "@/app/home/personal/(tabs)/tools/npk";

const mockRunCalculator = jest.fn();
const mockListNutrientRecipes = jest.fn();
const mockCreateProduct = jest.fn();
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

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
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
  const { Pressable, Text, View } = require("react-native");
  return ({ title, actions = [] }: { title: string; actions?: any[] }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      ...actions.map((action) =>
        React.createElement(
          Pressable,
          { key: action.key, onPress: action.onPress },
          React.createElement(Text, null, action.label)
        )
      )
    );
});

jest.mock("@/features/personal/tools/nutrientContext", () => ({
  buildNutrientContextAssumption: () => null,
  buildNutrientContextNotices: () => []
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateTask: jest.fn(),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
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

async function renderNpkToolScreen() {
  const screen = render(<NpkToolScreen />);
  await act(async () => {});
  return screen;
}

describe("NpkToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListNutrientRecipes.mockResolvedValue([]);
    mockRunCalculator.mockResolvedValue({
      outputs: {
        formula: "Kelp meal recipe",
        totals: { Nppm: 20, Pppm: 4.36, Kppm: 8.3 },
        warnings: ["Verify source labels before publishing."],
        releaseTimeline: {
          days_7_21: [{ name: "Kelp meal", form: "meal", confidence: "medium" }]
        },
        sourceConfidence: { overall: "medium", counts: { high: 0, medium: 1, low: 0 } }
      },
      toolRun: {
        id: "toolrun-1",
        _id: "toolrun-1",
        inputs: {
          products: [
            {
              name: "Kelp meal",
              amount: 100,
              unit: "g",
              N: 3,
              P2O5: 1,
              K2O: 2
            }
          ]
        },
        outputs: {}
      }
    });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4", "task-5"]
    });
  });

  it("sends label P2O5/K2O and elemental P/K values to the NPK calculator", async () => {
    const screen = await renderNpkToolScreen();

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText(/Build up to 20 product rows/)).toBeTruthy();
    expect(screen.getByText(/Label N-P-K uses elemental N, P2O5, and K2O/)).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Product name"), "Kelp meal");
    fireEvent.changeText(screen.getByPlaceholderText("Amount"), "100");
    fireEvent.press(screen.getByText("ml"));
    expect(
      screen.getByText(/1 g\/ml is an assumption unless the label provides density/i)
    ).toBeTruthy();
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
              densityGml: 1,
              densityAssumption:
                "Liquid density is assumed at 1 g/ml unless label density is supplied.",
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

  it("builds an AI recipe brief from current labels without replacing calculator math", async () => {
    const screen = await renderNpkToolScreen();

    fireEvent.changeText(screen.getByPlaceholderText("e.g. Veg base"), "Kelp veg feed");
    fireEvent.changeText(screen.getByPlaceholderText("Product name"), "Kelp meal");
    fireEvent.changeText(screen.getByPlaceholderText("Amount"), "100");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 N percent"), "3");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 P2O5 percent"), "1");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 K2O percent"), "2");

    fireEvent.press(screen.getByLabelText("Ask AI to build NPK recipe"));

    expect(screen.getByText("AI recipe brief")).toBeTruthy();
    expect(screen.getByText(/Final nutrient totals, elemental P\/K conversion/)).toBeTruthy();
    expect(screen.getByText(/Recipe: Kelp veg feed/)).toBeTruthy();
    expect(screen.getByText(/1\. Kelp meal \| 100g \| label 3-1-2/)).toBeTruthy();
    expect(screen.getByText(/Ask me for label density/)).toBeTruthy();
  });

  it("creates a source-linked NPK recipe task plan from the saved ToolRun", async () => {
    const screen = await renderNpkToolScreen();

    fireEvent.changeText(screen.getByPlaceholderText("e.g. Veg base"), "Kelp veg feed");
    fireEvent.changeText(screen.getByPlaceholderText("Product name"), "Kelp meal");
    fireEvent.changeText(screen.getByPlaceholderText("Amount"), "100");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 N percent"), "3");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 P2O5 percent"), "1");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 K2O percent"), "2");

    fireEvent.press(screen.getByText("Calculate recipe"));

    await waitFor(() => expect(screen.getByText("NPK recipe result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Recipe Task Plan"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "npk-recipe",
          toolRunId: "toolrun-1",
          tasks: expect.arrayContaining([
            expect.objectContaining({ title: "Verify labels for Kelp veg feed" }),
            expect.objectContaining({
              title: "Mix Kelp veg feed",
              priority: "high"
            }),
            expect.objectContaining({
              title: "Apply Kelp veg feed",
              priority: "high"
            }),
            expect.objectContaining({ title: "Check response to Kelp veg feed" }),
            expect.objectContaining({ title: "Review next adjustment for Kelp veg feed" })
          ])
        })
      )
    );
  });

  it("converts calculated recipes into commercial-ready product draft fields", async () => {
    const screen = await renderNpkToolScreen();

    fireEvent.changeText(screen.getByPlaceholderText("e.g. Veg base"), "Kelp veg feed");
    fireEvent.changeText(screen.getByPlaceholderText("Product name"), "Kelp meal");
    fireEvent.changeText(screen.getByPlaceholderText("Amount"), "100");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 N percent"), "3");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 P2O5 percent"), "1");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 K2O percent"), "2");

    fireEvent.press(screen.getByText("Calculate recipe"));

    await waitFor(() => expect(screen.getByText("NPK recipe result")).toBeTruthy());

    fireEvent.press(screen.getByText("Convert to Product Draft"));

    await waitFor(() =>
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Kelp veg feed",
          category: "nutrient_recipe",
          status: "draft",
          linkedToolRunId: "toolrun-1",
          fullDescription: expect.stringContaining("Target N-P-K"),
          specs: expect.objectContaining({
            source: "npk_feed_recipe_builder",
            targetNpk: { N: undefined, P: undefined, K: undefined },
            ingredients: expect.arrayContaining([
              expect.objectContaining({
                name: "Kelp meal",
                guaranteedAnalysis: expect.objectContaining({
                  N: 3,
                  P2O5: 1,
                  K2O: 2
                }),
                elementalAnalysis: expect.objectContaining({
                  P: 0.4364,
                  K: 1.6602
                })
              })
            ]),
            guaranteedAnalysisEstimate: { Nppm: 20, Pppm: 4.36, Kppm: 8.3 },
            elementalEstimate: { Nppm: 20, Pppm: 4.36, Kppm: 8.3 },
            directions: expect.arrayContaining([
              "Kelp meal recipe",
              expect.stringContaining("Verify guaranteed analysis")
            ]),
            applicationRate: { batchVolume: 5, batchUnit: "gal" },
            releaseCurve: {
              days_7_21: [{ name: "Kelp meal", form: "meal", confidence: "medium" }]
            },
            warnings: expect.arrayContaining([
              "Verify source labels before publishing.",
              expect.stringContaining("Draft product created")
            ])
          }),
          growInterests: expect.arrayContaining(["soil", "NPK", "recipe building"])
        })
      )
    );
  });
});
