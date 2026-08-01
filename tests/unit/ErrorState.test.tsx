import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import ErrorState, { createErrorStateStyles } from "@/components/ErrorState";
import { getThemePalette } from "@/theme/appTheme";

let mockThemeMode: "day" | "night" = "night";

jest.mock("@expo/vector-icons", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");

  return {
    MaterialCommunityIcons: ({
      name,
      color,
      style
    }: {
      name: string;
      color?: string;
      style?: import("react-native").StyleProp<import("react-native").TextStyle>;
    }) =>
      React.createElement(Text, {
        accessibilityLabel: `icon-${name}`,
        style: [style, { color }]
      })
  };
});

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

describe("ErrorState", () => {
  it.each(["day", "night"] as const)(
    "renders its message and retry behavior with the active %s palette",
    (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const onRetry = jest.fn();
      const screen = render(
        <ErrorState
          title="Unable to load compliance logs"
          message="Try the request again."
          onRetry={onRetry}
        />
      );

      const title = screen.getByText("Unable to load compliance logs");
      const message = screen.getByText("Try the request again.");
      const retry = screen.getByText("Retry");
      const styles = createErrorStateStyles(palette);

      expect(StyleSheet.flatten(styles.container)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.danger
        })
      );
      expect(StyleSheet.flatten(title.props.style).color).toBe(palette.danger);
      expect(StyleSheet.flatten(message.props.style).color).toBe(palette.textMuted);
      expect(StyleSheet.flatten(styles.retryBtn).backgroundColor).toBe(palette.accent);
      expect(StyleSheet.flatten(retry.props.style).color).toBe(palette.accentText);

      fireEvent.press(retry);
      expect(onRetry).toHaveBeenCalledTimes(1);
    }
  );
});
