import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import BudRotRiskToolScreen from "@/app/home/personal/(tabs)/tools/bud-rot-risk";

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
    DIAGNOSE_ADVANCED: "DIAGNOSE_ADVANCED"
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
          { key: action.key, onPress: action.onPress, disabled: action.disabled },
          React.createElement(Text, null, action.label)
        )
      )
    );
});

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args),
  saveToolRunAndOpenJournal: (...args: any[]) => mockSaveToolRunAndOpenJournal(...args)
}));

describe("BudRotRiskToolScreen", () => {
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

  it("creates canopy inspection tasks with shared Schedule metadata", async () => {
    const screen = render(<BudRotRiskToolScreen />);

    fireEvent.press(screen.getByText("Create Inspection Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "bud-rot-risk",
          title: "Inspect canopy for bud rot risk",
          priority: "medium",
          allDay: true,
          calendarType: "bud_rot_risk_followup",
          sourceStage: "bud_rot_canopy_inspection",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -720 })]
          }),
          description: expect.stringContaining("Heuristic risk screen")
        })
      )
    );
  });
});
