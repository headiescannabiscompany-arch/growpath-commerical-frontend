import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import WateringToolScreen from "@/app/home/personal/(tabs)/tools/watering";

const mockSaveToolRunAndCreateTask = jest.fn();
const mockSaveToolRunResult = jest.fn();
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
  saveToolRunAndOpenJournal: (...args: any[]) => mockSaveToolRunAndOpenJournal(...args),
  saveToolRunResult: (...args: any[]) => mockSaveToolRunResult(...args)
}));

describe("WateringToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSaveToolRunAndCreateTask.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskId: "task-1"
    });
    mockSaveToolRunResult.mockResolvedValue({ ok: true, toolRunId: "toolrun-1" });
    mockSaveToolRunAndOpenJournal.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1"
    });
  });

  it("creates watering tasks with shared Schedule metadata", async () => {
    const screen = render(<WateringToolScreen />);

    fireEvent.changeText(screen.getByLabelText("Watering interval days"), "3");
    fireEvent.press(screen.getByText("Create Watering Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "watering",
          title: "Water plants",
          priority: "medium",
          allDay: true,
          calendarType: "watering_followup",
          sourceStage: "watering_application",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -720 })]
          }),
          description: expect.stringContaining("Target")
        })
      )
    );
  });
});
