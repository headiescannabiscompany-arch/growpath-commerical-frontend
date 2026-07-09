import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TimelinePlannerScreen from "@/app/home/personal/(tabs)/tools/timeline-planner";

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

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    TOOL_TIMELINE_PLANNER: "TOOL_TIMELINE_PLANNER"
  },
  useEntitlements: () => ({
    can: () => true
  })
}));

jest.mock("@/features/personal/tools/ToolPlantContextPicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ToolPlantContextPicker: () => React.createElement(View, { testID: "plant-picker" }),
    useToolPlantContext: () => ({
      plants: [],
      plantId: "",
      selectedPlant: null,
      selectedPlantContext: {
        name: "Plant A",
        scientificName: "Cannabis sativa"
      },
      setPlantId: jest.fn(),
      toolRunContext: {
        selectedPlantContext: {
          name: "Plant A",
          scientificName: "Cannabis sativa"
        }
      }
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
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

describe("TimelinePlannerScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
  });

  it("creates milestone tasks with shared Schedule metadata", async () => {
    const screen = render(<TimelinePlannerScreen />);

    fireEvent.changeText(screen.getByLabelText("Timeline start date"), "2026-07-01");
    fireEvent.changeText(screen.getByLabelText("Timeline veg weeks"), "4");
    fireEvent.changeText(screen.getByLabelText("Timeline flower weeks"), "9");
    fireEvent.changeText(screen.getByLabelText("Timeline dry days"), "10");
    fireEvent.changeText(screen.getByLabelText("Timeline cure weeks"), "4");

    fireEvent.press(screen.getByText("Create Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "timeline-planner",
          input: expect.objectContaining({
            startDate: "2026-07-01",
            vegWeeks: 4,
            flowerWeeks: 9,
            dryDays: 10,
            cureWeeks: 4
          }),
          output: expect.objectContaining({
            milestoneCount: 5,
            harvestWindow: "2026-09-30"
          }),
          tasks: [
            expect.objectContaining({
              title: "Flip or flower start",
              dueDate: "2026-07-29",
              allDay: true,
              calendarType: "timeline_planner",
              sourceStage: "flip",
              reminderPlan: {
                label: "24 hours before",
                channels: ["in_app"],
                reminders: [{ offsetMinutes: -1440 }]
              },
              description: expect.stringContaining("Plant context: Plant A")
            }),
            expect.objectContaining({
              title: "Harvest window",
              dueDate: "2026-09-30",
              sourceStage: "harvest-window"
            }),
            expect.objectContaining({
              title: "Dry complete",
              sourceStage: "dry-complete"
            }),
            expect.objectContaining({
              title: "Cure check",
              sourceStage: "cure-check"
            })
          ]
        })
      )
    );
  });
});
