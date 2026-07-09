import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import NutrientChemistryToolScreen from "@/app/home/personal/(tabs)/tools/nutrient-chemistry";

const mockSaveToolRunAndCreateTask = jest.fn();
const mockSaveToolRunAndOpenJournal = jest.fn();

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
  CAPABILITY_KEYS: {
    TOOL_NPK: "TOOL_NPK"
  },
  useEntitlements: () => ({
    can: () => true
  })
}));

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

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
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

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args),
  saveToolRunAndOpenJournal: (...args: any[]) => mockSaveToolRunAndOpenJournal(...args)
}));

describe("NutrientChemistryToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSaveToolRunAndCreateTask.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskId: "task-1"
    });
    mockSaveToolRunAndOpenJournal.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1"
    });
  });

  it("creates nutrient review tasks with shared Schedule metadata", async () => {
    const screen = render(<NutrientChemistryToolScreen />);

    fireEvent.press(screen.getByText("Create Review Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "nutrient-chemistry",
          title: "Review nutrient chemistry recommendation",
          priority: "high",
          allDay: true,
          calendarType: "nutrient_chemistry_review",
          sourceStage: "nutrient_compatibility_warning_review",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -720 })]
          }),
          description: expect.stringContaining("Best current fit")
        })
      )
    );
  });
});
