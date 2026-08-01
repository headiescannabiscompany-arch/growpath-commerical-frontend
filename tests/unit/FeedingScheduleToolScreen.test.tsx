import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FeedingScheduleToolScreen, {
  createFeedingScheduleStyles
} from "@/app/home/personal/(tabs)/tools/feeding-schedule";
import { getThemePalette } from "@/theme/appTheme";

const mockGenerateSchedule = jest.fn();
const mockSaveToolRunAndCreateLog = jest.fn();
const mockSaveToolRunAndCreateTask = jest.fn();

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
    FEEDING_SCHEDULE: "FEEDING_SCHEDULE"
  },
  useEntitlements: () => ({
    can: () => true,
    mode: "facility"
  })
}));

jest.mock("@/api/feeding", () => ({
  generateSchedule: (...args: any[]) => mockGenerateSchedule(...args)
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

jest.mock("@/features/personal/tools/LockedToolCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ title }: { title: string }) => React.createElement(Text, null, title);
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
  return ({
    title,
    actions = [],
    askAiBaseHref
  }: {
    title: string;
    actions?: any[];
    askAiBaseHref?: string;
  }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, `AI destination: ${askAiBaseHref}`),
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
  saveToolRunAndCreateLog: (...args: any[]) => mockSaveToolRunAndCreateLog(...args),
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args)
}));

describe("FeedingScheduleToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGenerateSchedule.mockResolvedValue({
      data: {
        schedule: {
          schedule: [
            {
              week: 1,
              stage: "veg",
              feed: { amountPerGallon: "5 ml/gal" }
            }
          ],
          notes: "Start low and watch runoff."
        }
      }
    });
    mockSaveToolRunAndCreateLog.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      logId: "log-1"
    });
    mockSaveToolRunAndCreateTask.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskId: "task-1"
    });
  });

  it("uses the active Night palette for the planner", () => {
    const palette = getThemePalette("night", "dark");
    const screenStyles = createFeedingScheduleStyles(palette);

    expect(screenStyles.container.backgroundColor).toBe(palette.page);
    expect(screenStyles.title.color).toBe(palette.text);
    expect(screenStyles.input.backgroundColor).toBe(palette.surface);
    expect(screenStyles.input.color).toBe(palette.text);
    expect(screenStyles.aiCard.backgroundColor).toBe(palette.surfaceMuted);
  });

  it("keeps shared result follow-up inside Facility AI", () => {
    const screen = render(<FeedingScheduleToolScreen />);

    expect(screen.getByText("AI destination: /home/facility/ai-ask")).toBeTruthy();
  });

  it("creates feeding review tasks with shared Schedule metadata", async () => {
    const screen = render(<FeedingScheduleToolScreen />);

    fireEvent.press(screen.getByLabelText("Generate feeding schedule"));

    await waitFor(() =>
      expect(mockGenerateSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          growMedium: "Soil",
          stage: "veg",
          inputEC: undefined,
          runoffEC: undefined,
          inputPH: undefined,
          runoffPH: undefined
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Create Feeding Review Task")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Feeding Review Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "feeding-schedule",
          title: "Review generated feeding schedule",
          priority: "medium",
          allDay: true,
          calendarType: "feeding_schedule_review",
          sourceStage: "feeding_schedule_review",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -720 })]
          }),
          description: expect.stringContaining("Product: Base nutrient")
        })
      )
    );
  });
});
