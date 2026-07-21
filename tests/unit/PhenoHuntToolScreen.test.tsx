import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PhenoHuntToolRoute from "@/app/home/personal/(tabs)/tools/pheno-hunt";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockAskPersonalAssistant = jest.fn();

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

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
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
            tags: ["high_vigor"],
            traits: { tissueCultureSuitability: 8 }
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
            plantId: "p1",
            label: "Plant 1",
            decisionLanes: {
              flowerKeeper: true,
              cloneKeeper: true,
              motherKeeper: true,
              commercialCandidate: true
            },
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
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: JSON.stringify({
        projectName: "Summer hunt",
        plants: [
          {
            id: "p1",
            plantId: "p1",
            label: "Plant 1",
            vigor: 9,
            morphology: 8,
            stressResistance: 9,
            pestResistance: 8,
            aroma: 9,
            taste: 9,
            resin: 9,
            finalProduct: 9,
            sexWeek: 4,
            intersexSigns: "none",
            hermObservationCount: 0,
            sexObservationCount: 3
          }
        ],
        additionalInformation: "Taste score came from the saved harvest review."
      }),
      missingInformation: ["clone performance"]
    });
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

  it("creates linked genetics records for keeper lanes", async () => {
    const screen = render(<PhenoHuntToolRoute />);

    fireEvent.press(screen.getByLabelText("Run Pheno Hunting"));
    await waitFor(() => expect(screen.getByText("Pheno Hunting result")).toBeTruthy());
    fireEvent.press(screen.getByText("Create Keeper Genetics Records"));

    await waitFor(() =>
      expect(mockCreateGrowpathModuleRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          recordType: "genetics_note",
          title: "Keeper candidate: Plant 1",
          growId: "grow-1",
          plantId: "p1",
          phenoPlantId: "p1",
          linkedToolRunId: "toolrun-1",
          payload: expect.objectContaining({
            commercialCandidate: true,
            cloneCandidate: true,
            motherCandidate: true,
            tissueCultureCandidate: true
          }),
          tags: expect.arrayContaining([
            "pheno_keeper_candidate",
            "flowerKeeper",
            "commercialCandidate"
          ])
        })
      )
    );
  });

  it("fills the full pheno record from selected grow evidence before calculating", async () => {
    const screen = render(<PhenoHuntToolRoute />);

    fireEvent.press(screen.getByText("Fill pheno hunt from grow"));
    await waitFor(() =>
      expect(
        screen.getByText(/AI filled 3 non-empty fields from available evidence/)
      ).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Run Pheno Hunting"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "pheno-hunt",
        expect.objectContaining({
          projectName: "Summer hunt",
          plants: [
            expect.objectContaining({
              plantId: "p1",
              morphology: 8,
              pestResistance: 8,
              taste: 9,
              finalProduct: 9,
              sexWeek: 4,
              intersexSigns: "none",
              hermObservationCount: 0,
              sexObservationCount: 3
            })
          ],
          additionalInformation: "Taste score came from the saved harvest review."
        })
      )
    );
    expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        context: expect.objectContaining({ workflow: "pheno-hunt" })
      })
    );
  });
});
