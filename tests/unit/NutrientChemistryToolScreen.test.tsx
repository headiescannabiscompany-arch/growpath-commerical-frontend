import fs from "fs";
import path from "path";
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import NutrientChemistryToolScreen, {
  createNutrientChemistryStyles
} from "@/app/home/personal/(tabs)/tools/nutrient-chemistry";
import { getThemePalette } from "@/theme/appTheme";

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
    ScreenBoundary: function MockScreenBoundary({
      children,
      showBack,
      backFallbackHref
    }: any) {
      return React.createElement(
        View,
        null,
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      );
    }
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockPersonalFeedPlacement() {
    return React.createElement(View, { testID: "personal-feed-placement" });
  };
});

jest.mock("@/features/personal/tools/ToolPlantContextPicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ToolPlantContextPicker: function MockToolPlantContextPicker() {
      return React.createElement(View, { testID: "plant-picker" });
    },
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

  it("themes all major Nutrient Chemistry surfaces in Night and Day modes", () => {
    const nightPalette = getThemePalette("night", "dark");
    const dayPalette = getThemePalette("day", "light");
    const nightStyles = createNutrientChemistryStyles(nightPalette);
    const dayStyles = createNutrientChemistryStyles(dayPalette);

    expect(nightStyles.container.backgroundColor).toBe(nightPalette.page);
    expect(nightStyles.panel).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(nightStyles.pill.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.pillOn.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(nightStyles.toggleOn.backgroundColor).toBe(nightPalette.accentSoft);
    expect(nightStyles.summaryCard.backgroundColor).toBe(nightPalette.accentSoft);
    expect(nightStyles.warning.color).toBe(nightPalette.warning);
    expect(nightStyles.compatibilityIssue.backgroundColor).toBe(
      nightPalette.surfaceStrong
    );
    expect(nightStyles.recommendationCard.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.recommendationCardOn.borderColor).toBe(nightPalette.accent);
    expect(nightStyles.rateInput.color).toBe(nightPalette.text);
    expect(nightStyles.referenceInput.color).toBe(nightPalette.text);
    expect(nightStyles.labInput.color).toBe(nightPalette.text);
    expect(nightStyles.formCard.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.secondaryButton.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.feedbackError.color).toBe(nightPalette.danger);

    expect(dayStyles.container.backgroundColor).toBe(dayPalette.page);
    expect(dayStyles.panel.backgroundColor).toBe(dayPalette.surfaceMuted);
    expect(dayStyles.summaryName.color).toBe(dayPalette.text);
    expect(dayStyles.secondaryButtonText.color).toBe(dayPalette.link);
  });

  it("keeps every input and source color palette-aware", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/home/personal/(tabs)/tools/nutrient-chemistry.tsx"
      ),
      "utf8"
    );
    const fields = source.match(/<TextInput\b/g) || [];

    expect(source.match(/placeholderTextColor={palette\.textMuted}/g) || []).toHaveLength(
      fields.length
    );
    expect(source.match(/selectionColor={palette\.accent}/g) || []).toHaveLength(
      fields.length
    );
    expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
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
