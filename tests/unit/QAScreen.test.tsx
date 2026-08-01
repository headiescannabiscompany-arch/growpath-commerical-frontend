import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import QAScreen, { createQAStyles } from "@/screens/QAScreen";
import { getThemePalette } from "@/theme/appTheme";

let mockThemeMode: "day" | "night" = "night";
let mockEntitlements: {
  ready: boolean;
  bootstrapError: string;
  mode: string;
  plan: string;
  facilityId: string | null;
  facilityRole: string | null;
  capabilities: Record<string, boolean>;
} = {
  ready: true,
  bootstrapError: "",
  mode: "personal",
  plan: "pro",
  facilityId: null,
  facilityRole: null,
  capabilities: { AI_ASSISTANT: true, INTERNAL_ONLY: false }
};

jest.mock("../../src/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette(
        mockThemeMode,
        mockThemeMode === "night" ? "dark" : "light"
      )
    })
  };
});

describe("QAScreen", () => {
  beforeEach(() => {
    mockThemeMode = "night";
    mockEntitlements = {
      ready: true,
      bootstrapError: "",
      mode: "personal",
      plan: "pro",
      facilityId: null,
      facilityRole: null,
      capabilities: { AI_ASSISTANT: true, INTERNAL_ONLY: false }
    };
  });

  it.each(["day", "night"] as const)(
    "renders diagnostics, cards, and capability states with the active %s palette",
    (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const styles = createQAStyles(palette);
      const screen = render(<QAScreen />);

      expect(
        StyleSheet.flatten(
          screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle
        ).backgroundColor
      ).toBe(palette.page);
      expect(
        StyleSheet.flatten(screen.getByText("QA & Debug Tools").props.style).color
      ).toBe(palette.link);
      expect(
        StyleSheet.flatten(screen.getByText("Entitlements ready").props.style).color
      ).toBe(palette.textSoft);
      expect(StyleSheet.flatten(screen.getByText("pro").props.style).color).toBe(
        palette.text
      );
      expect(StyleSheet.flatten(screen.getByText("AI_ASSISTANT").props.style).color).toBe(
        palette.text
      );
      expect(StyleSheet.flatten(styles.section)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(styles.featureRow.borderBottomColor).toBe(palette.borderSoft);
      expect(styles.featureDescription.color).toBe(palette.textMuted);
      expect(styles.status.color).toBe(palette.link);
    }
  );

  it("shows the explicit empty capability state without inventing enabled flags", () => {
    mockEntitlements = { ...mockEntitlements, capabilities: {} };
    const screen = render(<QAScreen />);

    expect(
      screen.getByText("No capability flags are enabled for this session.")
    ).toBeTruthy();
    expect(screen.queryByText("AI_ASSISTANT")).toBeNull();
  });
});
