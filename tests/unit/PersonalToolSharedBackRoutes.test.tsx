import React from "react";
import { render } from "@testing-library/react-native";

import BudRotRiskToolScreen from "@/app/home/personal/(tabs)/tools/bud-rot-risk";
import EnvironmentAnalysisToolScreen from "@/app/home/personal/(tabs)/tools/environment-analysis";
import FeedingScheduleToolScreen from "@/app/home/personal/(tabs)/tools/feeding-schedule";
import HarvestEstimatorScreen from "@/app/home/personal/(tabs)/tools/harvest-estimator";
import NutrientChemistryToolScreen from "@/app/home/personal/(tabs)/tools/nutrient-chemistry";
import PdfExportScreen from "@/app/home/personal/(tabs)/tools/pdf-export";
import PpfdToolScreen from "@/app/home/personal/(tabs)/tools/ppfd";
import TimelinePlannerScreen from "@/app/home/personal/(tabs)/tools/timeline-planner";
import VpdToolScreen from "@/app/home/personal/(tabs)/tools/vpd";
import WateringToolScreen from "@/app/home/personal/(tabs)/tools/watering";

const mockCan = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn()
  })
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) =>
      React.createElement(
        View,
        { accessibilityLabel: `screen-${title}` },
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { accessibilityLabel: "personal-feed" });
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    AI_ASSISTANT: "AI_ASSISTANT",
    DIAGNOSE_ADVANCED: "DIAGNOSE_ADVANCED",
    FEEDING_SCHEDULE: "FEEDING_SCHEDULE",
    TOOL_HARVEST_ESTIMATOR: "TOOL_HARVEST_ESTIMATOR",
    TOOL_NPK: "TOOL_NPK",
    TOOL_PDF_EXPORT: "TOOL_PDF_EXPORT",
    TOOLS_VPD: "TOOLS_VPD",
    TOOL_TIMELINE_PLANNER: "TOOL_TIMELINE_PLANNER"
  },
  useEntitlements: () => ({
    can: mockCan
  })
}));

jest.mock("@/api/feeding", () => ({
  generateSchedule: jest.fn()
}));

jest.mock("@/api/environment", () => ({
  analyzeEnvironment: jest.fn()
}));

jest.mock("@/api/logs", () => ({
  listPersonalLogs: jest.fn(() => Promise.resolve([]))
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: jest.fn(() => Promise.resolve([]))
}));

jest.mock("@/api/tasks", () => ({
  listPersonalTasks: jest.fn(() => Promise.resolve([]))
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: jest.fn(() => Promise.resolve([]))
}));

jest.mock("@/features/personal/tools/ToolPlantContextPicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ToolPlantContextPicker: () =>
      React.createElement(View, { accessibilityLabel: "plant-context-picker" }),
    useToolPlantContext: () => ({
      plants: [],
      plantId: "",
      selectedPlant: null,
      setPlantId: jest.fn(),
      toolRunContext: {}
    })
  };
});

jest.mock("@/features/personal/tools/LockedToolCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ title }: { title: string }) =>
    React.createElement(Text, null, `Locked ${title}`);
});

describe("legacy personal tool shared back routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(false);
  });

  it("uses shared back behavior on Bud Rot Risk", () => {
    const screen = render(<BudRotRiskToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Bud Rot Risk")).toBeTruthy();
  });

  it("uses shared back behavior on Harvest Estimator", () => {
    const screen = render(<HarvestEstimatorScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Harvest Estimator")).toBeTruthy();
  });

  it("uses shared back behavior on Feeding Schedule Planner", () => {
    const screen = render(<FeedingScheduleToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Feeding Schedule Planner")).toBeTruthy();
  });

  it("uses shared back behavior on Watering Planner", () => {
    const screen = render(<WateringToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Watering Planner")).toBeTruthy();
  });

  it("uses shared back behavior on PPFD / DLI Planner", () => {
    const screen = render(<PpfdToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("PPFD / DLI Planner")).toBeTruthy();
  });

  it("uses shared back behavior on Timeline Planner", () => {
    const screen = render(<TimelinePlannerScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Timeline Planner")).toBeTruthy();
  });

  it("uses shared back behavior on Environment Review", () => {
    const screen = render(<EnvironmentAnalysisToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Environment Review")).toBeTruthy();
  });

  it("uses shared back behavior on PDF / Export", () => {
    const screen = render(<PdfExportScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("PDF / Export")).toBeTruthy();
  });

  it("uses shared back behavior on VPD Calculator", () => {
    const screen = render(<VpdToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("VPD Calculator")).toBeTruthy();
  });

  it("uses shared back behavior on Nutrient Chemistry", () => {
    const screen = render(<NutrientChemistryToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Nutrient Chemistry")).toBeTruthy();
  });
});
