import React from "react";
import { ActivityIndicator, Alert, StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import LinksScreen, { createLinksStyles } from "@/screens/LinksScreen";
import { getThemePalette } from "@/theme/appTheme";

const mockGetLinks = jest.fn();
const mockAddLink = jest.fn();
const mockUpdateLink = jest.fn();
const mockRemoveLink = jest.fn();
let mockThemeMode: "day" | "night" = "night";

jest.mock("../../src/api/links.js", () => ({
  getLinks: (...args: unknown[]) => mockGetLinks(...args),
  addLink: (...args: unknown[]) => mockAddLink(...args),
  updateLink: (...args: unknown[]) => mockUpdateLink(...args),
  removeLink: (...args: unknown[]) => mockRemoveLink(...args)
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

const savedLink = {
  id: "link-1",
  label: "Grow guide",
  url: "https://example.com/grow-guide"
};

describe("LinksScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThemeMode = "night";
    mockGetLinks.mockResolvedValue([savedLink]);
    mockAddLink.mockResolvedValue({ id: "link-2" });
    mockUpdateLink.mockResolvedValue({ updated: true });
    mockRemoveLink.mockResolvedValue({ deleted: true });
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(["day", "night"] as const)(
    "uses the active %s palette for links, modal states, and inputs",
    async (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const styles = createLinksStyles(palette);
      const screen = render(<LinksScreen />);

      expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe(palette.accent);
      await waitFor(() => expect(screen.getByText("Grow guide")).toBeTruthy());

      expect(StyleSheet.flatten(screen.getByText("Public Links").props.style).color).toBe(
        palette.text
      );
      expect(
        screen.getByRole("header", { name: "Public Links" }).props["aria-level"]
      ).toBe(1);
      expect(StyleSheet.flatten(screen.getByText("Grow guide").props.style).color).toBe(
        palette.text
      );
      expect(StyleSheet.flatten(styles.container).backgroundColor).toBe(palette.page);
      expect(StyleSheet.flatten(styles.error)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.danger,
          color: palette.danger
        })
      );
      expect(StyleSheet.flatten(styles.modalContent)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(styles.empty.color).toBe(palette.textMuted);

      fireEvent.press(screen.getByText("Add Link"));
      const labelInput = screen.getByPlaceholderText("Label");
      const urlInput = screen.getByPlaceholderText(
        "URL, for example https://example.com"
      );
      [labelInput, urlInput].forEach((input) => {
        expect(input.props.placeholderTextColor).toBe(palette.textMuted);
        expect(input.props.selectionColor).toBe(palette.accent);
        expect(StyleSheet.flatten(input.props.style)).toEqual(
          expect.objectContaining({
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text
          })
        );
      });
    }
  );

  it("preserves create, edit, and confirmed delete mutations", async () => {
    const screen = render(<LinksScreen />);
    await waitFor(() => expect(screen.getByText("Grow guide")).toBeTruthy());

    fireEvent.press(screen.getByText("Add Link"));
    fireEvent.changeText(screen.getByPlaceholderText("Label"), "IPM reference");
    fireEvent.changeText(
      screen.getByPlaceholderText("URL, for example https://example.com"),
      "https://example.com/ipm"
    );
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() =>
      expect(mockAddLink).toHaveBeenCalledWith({
        label: "IPM reference",
        url: "https://example.com/ipm"
      })
    );

    await waitFor(() => expect(screen.queryByText("Saving...")).toBeNull());
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.changeText(screen.getByPlaceholderText("Label"), "Updated grow guide");
    fireEvent.changeText(
      screen.getByPlaceholderText("URL, for example https://example.com"),
      "https://example.com/updated"
    );
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() =>
      expect(mockUpdateLink).toHaveBeenCalledWith("link-1", {
        label: "Updated grow guide",
        url: "https://example.com/updated"
      })
    );

    await waitFor(() => expect(screen.queryByText("Edit Link")).toBeNull());
    fireEvent.press(screen.getByText("Remove"));
    const removePrompt = jest
      .mocked(Alert.alert)
      .mock.calls.find(([title]) => title === "Remove link?");
    expect(removePrompt).toBeTruthy();

    await act(async () => {
      await removePrompt?.[2]?.[1]?.onPress?.();
    });
    expect(mockRemoveLink).toHaveBeenCalledWith("link-1");
  });
});
