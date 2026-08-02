import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import CommercialContextualTools from "@/components/commercial/CommercialContextualTools";
import { getThemePalette } from "@/theme/appTheme";

const mockOpen = jest.fn();
let mockThemeMode: "day" | "night" = "night";

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  return {
    Link: ({ children, href }: any) =>
      React.cloneElement(children, {
        href,
        onPress: () => mockOpen(href)
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

describe("CommercialContextualTools theme", () => {
  beforeEach(() => {
    mockOpen.mockReset();
  });

  it.each(["day", "night"] as const)(
    "mounts reachable record tools with the active %s palette",
    (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const screen = render(
        <CommercialContextualTools
          title="Tools for batch 12"
          tools={["environment"]}
          source="commercial_batch_detail"
          batchId="batch-12"
        />
      );

      const container = screen.getByTestId("commercial-contextual-tools");
      const title = screen.getByText("Tools for batch 12");
      const helper = screen.getByText(/Context is carried into the shared tool/);
      const actionText = screen.getByText("Environment Review");
      const action = screen.getByLabelText(
        "Environment Review for commercial_batch_detail"
      );

      expect(StyleSheet.flatten(container.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border
        })
      );
      expect(StyleSheet.flatten(title.props.style).color).toBe(palette.text);
      expect(StyleSheet.flatten(helper.props.style).color).toBe(palette.textMuted);
      expect(StyleSheet.flatten(action.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.accent
        })
      );
      expect(StyleSheet.flatten(actionText.props.style).color).toBe(palette.link);
      expect(action.props.href).toContain(
        "/home/commercial/tools/environment?source=commercial_batch_detail"
      );

      fireEvent.press(action);
      expect(mockOpen).toHaveBeenCalledWith(action.props.href);

      if (mode === "night") {
        expect(StyleSheet.flatten(container.props.style).backgroundColor).not.toBe(
          "#F8FAFC"
        );
        expect(StyleSheet.flatten(action.props.style).backgroundColor).not.toBe(
          "#FFFFFF"
        );
      }
    }
  );
});
