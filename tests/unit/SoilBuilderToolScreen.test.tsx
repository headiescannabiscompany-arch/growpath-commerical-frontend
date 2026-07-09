import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import SoilBuilderToolScreen from "@/app/home/personal/(tabs)/tools/soil-builder";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
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
  saveToolRunAndCreateTask: jest.fn(),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
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
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
  });

  it("sends target profile, release timing, and rest/cook assumptions to the soil calculator", async () => {
    const screen = render(<SoilBuilderToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Soil Builder Target label N-P2O5-K2O"),
      "3-1-1"
    );
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
            directions: expect.arrayContaining([
              expect.stringContaining("Confirm base media"),
              expect.stringContaining("complete rest/cook review")
            ]),
            warnings: expect.arrayContaining([
              expect.stringContaining("Draft product requires image")
            ]),
            ingredients: expect.arrayContaining([
              expect.objectContaining({ name: "Alfalfa meal" }),
              expect.objectContaining({ name: "Fish bone meal" })
            ])
          })
        })
      )
    );
  });

  it("creates a soil recipe task timeline from the saved ToolRun", async () => {
    const screen = render(<SoilBuilderToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Soil Builder Target label N-P2O5-K2O"),
      "3-1-1"
    );
    fireEvent.changeText(screen.getByLabelText("Soil Builder Rest/cook days"), "28");
    fireEvent.press(screen.getByLabelText("Run Soil Builder"));

    await waitFor(() => expect(screen.getByText("Soil Builder result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Recipe Timeline Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "soil-builder",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            mixName: "Living soil mix",
            targetNpk: "3-1-1",
            restCookDays: 28
          }),
          output: expect.objectContaining({
            releaseCurve: { summary: "fast N plus slow P base" }
          }),
          tasks: expect.arrayContaining([
            expect.objectContaining({
              title: "Mix Living soil mix",
              allDay: true,
              calendarType: "soil_recipe_timeline",
              sourceStage: "soil_mix",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -1440 })]
              })
            }),
            expect.objectContaining({
              title: "Moisten and activate Living soil mix",
              sourceStage: "soil_activation"
            }),
            expect.objectContaining({
              title: "Check soil cook for Living soil mix",
              sourceStage: "soil_cook_check"
            }),
            expect.objectContaining({
              title: "Living soil mix ready/transplant review",
              priority: "high",
              sourceStage: "soil_ready_review"
            })
          ])
        })
      )
    );
  });

  it("builds an AI soil recipe brief without replacing calculator math", () => {
    const screen = render(<SoilBuilderToolScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Soil Builder Target label N-P2O5-K2O"),
      "3-1-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Soil Builder Target release curve"),
      "1-1-1 slow base plus fast nitrogen"
    );
    fireEvent.changeText(
      screen.getByLabelText("Soil Builder Compost uncertainty"),
      "high - lab test missing"
    );

    fireEvent.press(screen.getByLabelText("Ask AI to build soil recipe"));

    expect(screen.getByText("AI soil recipe brief")).toBeTruthy();
    expect(screen.getByText(/Target label N-P2O5-K2O: 3-1-1/)).toBeTruthy();
    expect(
      screen.getByText(/Target release logic: 1-1-1 slow base plus fast nitrogen/)
    ).toBeTruthy();
    expect(screen.getByText(/Compost uncertainty: high - lab test missing/)).toBeTruthy();
    expect(
      screen.getByText(/call the Soil Builder calculator for final nutrient estimates/)
    ).toBeTruthy();
  });
});
