import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { createLockedScreenStyles, LockedScreen } from "@/entitlements/LockedScreen";
import { getThemePalette } from "@/theme/appTheme";

let mockThemeMode: "day" | "night" = "night";

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

describe("LockedScreen", () => {
  it.each(["day", "night"] as const)(
    "renders its access copy and action with the active %s palette",
    (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const onAction = jest.fn();
      const screen = render(
        <LockedScreen
          title="Forum posting unavailable"
          message="Upgrade access is required."
          actionLabel="Back to Forum"
          onAction={onAction}
        />
      );

      const title = screen.getByText("Forum posting unavailable");
      const message = screen.getByText("Upgrade access is required.");
      const action = screen.getByText("Back to Forum");
      const styles = createLockedScreenStyles(palette);

      expect(StyleSheet.flatten(styles.container).backgroundColor).toBe(palette.page);
      expect(StyleSheet.flatten(title.props.style).color).toBe(palette.text);
      expect(StyleSheet.flatten(message.props.style).color).toBe(palette.textMuted);
      expect(StyleSheet.flatten(styles.action)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.accent
        })
      );
      expect(StyleSheet.flatten(action.props.style).color).toBe(palette.link);

      fireEvent.press(action);
      expect(onAction).toHaveBeenCalledTimes(1);
    }
  );
});
