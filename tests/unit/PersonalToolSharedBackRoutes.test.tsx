import React from "react";
import { render } from "@testing-library/react-native";

import BudRotRiskToolScreen from "@/app/home/personal/(tabs)/tools/bud-rot-risk";
import FeedingScheduleToolScreen from "@/app/home/personal/(tabs)/tools/feeding-schedule";
import HarvestEstimatorScreen from "@/app/home/personal/(tabs)/tools/harvest-estimator";
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
    DIAGNOSE_ADVANCED: "DIAGNOSE_ADVANCED",
    FEEDING_SCHEDULE: "FEEDING_SCHEDULE",
    TOOL_HARVEST_ESTIMATOR: "TOOL_HARVEST_ESTIMATOR"
  },
  useEntitlements: () => ({
    can: mockCan
  })
}));

jest.mock("@/api/feeding", () => ({
  generateSchedule: jest.fn()
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

  it("uses shared back behavior on AI Feeding Schedule", () => {
    const screen = render(<FeedingScheduleToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("AI Feeding Schedule")).toBeTruthy();
  });

  it("uses shared back behavior on Watering Planner", () => {
    const screen = render(<WateringToolScreen />);

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Watering Planner")).toBeTruthy();
  });
});
