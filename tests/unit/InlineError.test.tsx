import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { createInlineErrorStyles, InlineError } from "../../src/components/InlineError";
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

describe("InlineError", () => {
  it("renders nothing for empty error state", () => {
    const screen = render(<InlineError error={null} />);

    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("renders the default title when an error object is present", () => {
    const screen = render(<InlineError error={{}} />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it.each(["day", "night"] as const)(
    "renders metadata and retry behavior with the active %s palette",
    (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const onRetry = jest.fn();
      const screen = render(
        <InlineError
          title="Connection failed"
          message="The live records could not be loaded."
          requestId="request-123"
          onRetry={onRetry}
        />
      );

      const title = screen.getByText("Connection failed");
      const message = screen.getByText("The live records could not be loaded.");
      const meta = screen.getByText("Request: request-123");
      const retry = screen.getByText("Retry");
      const styles = createInlineErrorStyles(palette);

      expect(StyleSheet.flatten(styles.box)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.danger
        })
      );
      expect(StyleSheet.flatten(title.props.style).color).toBe(palette.danger);
      expect(StyleSheet.flatten(message.props.style).color).toBe(palette.text);
      expect(StyleSheet.flatten(meta.props.style).color).toBe(palette.textMuted);
      expect(StyleSheet.flatten(styles.retryBtn)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.accent
        })
      );
      expect(StyleSheet.flatten(retry.props.style).color).toBe(palette.link);

      fireEvent.press(retry);
      expect(onRetry).toHaveBeenCalledTimes(1);
    }
  );
});
