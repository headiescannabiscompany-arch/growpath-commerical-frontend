import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import NpkToolScreen from "@/app/home/personal/(tabs)/tools/npk";

const mockRunCalculator = jest.fn();
const mockListNutrientRecipes = jest.fn();
const mockCreateProduct = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: (...args: any[]) => mockRouterPush(...args),
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
    expect(screen.getByText(/Label N-P2O5-K2O uses elemental N/)).toBeTruthy();

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

  it("opens grow-aware Ask AI with current labels and deterministic calculator instructions", async () => {
    const screen = await renderNpkToolScreen();

    fireEvent.changeText(screen.getByPlaceholderText("e.g. Veg base"), "Kelp veg feed");
    fireEvent.changeText(screen.getByPlaceholderText("Product name"), "Kelp meal");
    fireEvent.changeText(screen.getByPlaceholderText("Amount"), "100");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 N percent"), "3");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 P2O5 percent"), "1");
    fireEvent.changeText(screen.getByLabelText("NPK ingredient 1 K2O percent"), "2");

    fireEvent.press(screen.getByLabelText("Ask AI to build NPK recipe"));

    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringMatching(/^\/home\/personal\/ai\?prompt=/)
    );
    const href = String(mockRouterPush.mock.calls[0][0]);
    const prompt = decodeURIComponent(href.split("prompt=")[1].split("&growId=")[0]);
    expect(prompt).toContain("Recipe: Kelp veg feed");
    expect(prompt).toContain("1. Kelp meal | 100g | label 3-1-2");
    expect(prompt).toContain("nutrients.computeDeliveredNPK");
    expect(href).toContain("growId=grow-1");
  });

  it("loads GrowPath locked amendment presets with exact densities and label values", async () => {
    const screen = await renderNpkToolScreen();

    fireEvent.press(screen.getByLabelText("Load Flower amendment preset"));

    expect(screen.getByText(/Flower loaded/)).toBeTruthy();
    expect(screen.getByText(/Dry mix size is 2 lb/)).toBeTruthy();
    expect(screen.getByDisplayValue("GrowPath 2-6-4 Flower")).toBeTruthy();

    fireEvent.press(screen.getByText("Calculate recipe"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "npk-recipe",
        expect.objectContaining({
          batchVolume: 5,
          batchUnit: "gal",
          dryMixWeightLb: 2,
          stage: "flower",
          medium: "living_soil",
          recipeMode: "build_dry_blend",
          targetNpk: { N: 2, P: 6, K: 4 },
          releaseEnvironment: expect.objectContaining({ livingSoil: true }),
          products: expect.arrayContaining([
            expect.objectContaining({
              name: "Langbeinite",
              amount: 226.8,
              unit: "g",
              densityGml: 1.9172,
              K2O: 22,
              Mg: 10.8,
              S: 22
            }),
            expect.objectContaining({
              name: "Bone Meal",
              amount: 198.45,
              densityGml: 0.9586,
              N: 3,
              P2O5: 15,
              Ca: 18
            }),
            expect.objectContaining({
              name: "Greenstone",
              N: 0,
              P2O5: 0,
              K2O: 0,
              Ca: 2,
              Mg: 4,
              Fe: 4
            })
          ])
        })
      )
    );
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
            expect.objectContaining({
              title: "Verify labels for Kelp veg feed",
              allDay: true,
              calendarType: "npk_recipe_followup",
              sourceStage: "npk_label_verification",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              })
            }),
            expect.objectContaining({
              title: "Mix Kelp veg feed",
              priority: "high",
              sourceStage: "npk_recipe_mixing"
            }),
            expect.objectContaining({
              title: "Apply Kelp veg feed",
              priority: "high",
              sourceStage: "npk_recipe_application"
            }),
            expect.objectContaining({
              title: "Check response to Kelp veg feed",
              sourceStage: "npk_recipe_response_check"
            }),
            expect.objectContaining({
              title: "Review next adjustment for Kelp veg feed",
              sourceStage: "npk_recipe_adjustment_review"
            })
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
          fullDescription: expect.stringContaining("Target label N-P2O5-K2O"),
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
