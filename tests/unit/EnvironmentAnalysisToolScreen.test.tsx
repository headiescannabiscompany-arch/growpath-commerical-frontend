import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import EnvironmentAnalysisToolScreen, {
  createEnvironmentAnalysisStyles
} from "@/app/home/personal/(tabs)/tools/environment-analysis";
import { getThemePalette } from "@/theme/appTheme";

const mockAnalyzeEnvironment = jest.fn();
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
    AI_ASSISTANT: "AI_ASSISTANT"
  },
  useEntitlements: () => ({
    can: () => true
  })
}));

jest.mock("@/api/environment", () => ({
  analyzeEnvironment: (...args: any[]) => mockAnalyzeEnvironment(...args)
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
  saveToolRunAndCreateLog: (...args: any[]) => mockSaveToolRunAndCreateLog(...args),
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args)
}));

describe("EnvironmentAnalysisToolScreen", () => {
  it("uses the active Night palette for the shared Personal and Facility tool", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createEnvironmentAnalysisStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.aiCard.backgroundColor).toBe(palette.accentSoft);
    expect(styles.button.backgroundColor).toBe(palette.accent);
  });

  it("owns one accurate semantic page heading", () => {
    const screen = render(<EnvironmentAnalysisToolScreen />);

    expect(screen.getByRole("header", { name: "Environment Review" })).toHaveProp(
      "aria-level",
      1
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockAnalyzeEnvironment.mockResolvedValue({
      data: {
        notes: "Humidity is above target after lights out.",
        targets: {
          tempDayC: 26,
          humidityMin: 55,
          humidityMax: 65,
          vpdIdeal: 1.1
        },
        currentAssessment: {
          status: "risk",
          issues: ["Humidity is high"],
          riskFlags: ["Bud rot pressure"]
        },
        recommendations: {
          actions: [{ title: "Increase dehumidification", priority: "high" }]
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

  it("creates environment review tasks with shared Schedule metadata", async () => {
    const screen = render(<EnvironmentAnalysisToolScreen />);

    fireEvent.press(screen.getByLabelText("Analyze environment"));

    await waitFor(() =>
      expect(mockAnalyzeEnvironment).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          stage: "Veg"
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Create Environment Task")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Environment Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "environment-analysis",
          title: "Review environment analysis",
          priority: "high",
          allDay: true,
          calendarType: "environment_analysis_followup",
          sourceStage: "environment_risk_inspection",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -720 })]
          }),
          description: expect.stringContaining("Risk flags: Bud rot pressure")
        })
      )
    );
  });
});
