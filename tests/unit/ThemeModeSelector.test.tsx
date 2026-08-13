import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import ThemeModeSelector from "@/components/ThemeModeSelector";

const mockSetThemeMode = jest.fn();
const mockEnableLocationAuto = jest.fn();
const mockDisableLocationAuto = jest.fn();

const palette = {
  accent: "#78AAFF",
  accentText: "#0E141B",
  border: "#283545",
  surface: "#151D27",
  surfaceMuted: "#1B2532",
  text: "#F4F7FB",
  textMuted: "#AAB6C5",
  textSoft: "#CDD6E1"
};

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    mode: "auto",
    resolvedMode: "night",
    setThemeMode: mockSetThemeMode,
    palette,
    autoUsesLocation: false,
    themeLocation: null,
    enableLocationAuto: mockEnableLocationAuto,
    disableLocationAuto: mockDisableLocationAuto
  })
}));

describe("ThemeModeSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableLocationAuto.mockResolvedValue(undefined);
    mockDisableLocationAuto.mockResolvedValue(undefined);
  });

  it("exposes appearance modes as one selected radio group", () => {
    const screen = render(<ThemeModeSelector />);
    expect(screen.getByLabelText("Set appearance to Day").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })])
    );

    expect(screen.getByLabelText("Appearance mode").props.accessibilityRole).toBe(
      "radiogroup"
    );
    expect(screen.getByLabelText("Set appearance to Auto").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: true }
    });
    expect(screen.getByLabelText("Set appearance to Day").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: false }
    });
    expect(screen.getByLabelText("Set appearance to Night").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: false }
    });

    fireEvent.press(screen.getByLabelText("Set appearance to Day"));
    expect(mockSetThemeMode).toHaveBeenCalledWith("day");
  });

  it("prevents duplicate auto-location actions and announces completion", async () => {
    let finishLocation: (() => void) | undefined;
    mockEnableLocationAuto.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishLocation = resolve;
        })
    );
    const screen = render(<ThemeModeSelector />);
    expect(screen.getByLabelText("Use my location for auto theme").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })])
    );

    fireEvent.press(screen.getByLabelText("Use my location for auto theme"));

    await waitFor(() =>
      expect(screen.getByText("Requesting your location...")).toBeTruthy()
    );
    expect(
      screen.getByLabelText("Use my location for auto theme").props.accessibilityState
    ).toEqual({ disabled: true });
    expect(
      screen.getByLabelText("Use local clock time for auto theme").props
        .accessibilityState
    ).toEqual({ disabled: true });

    fireEvent.press(screen.getByLabelText("Use my location for auto theme"));
    expect(mockEnableLocationAuto).toHaveBeenCalledTimes(1);

    await act(async () => finishLocation?.());

    await waitFor(() =>
      expect(
        screen.getByText("Location saved. Auto now follows sunrise and sunset.")
      ).toBeTruthy()
    );
    expect(
      screen.getByText("Location saved. Auto now follows sunrise and sunset.").props
        .accessibilityLiveRegion
    ).toBe("polite");
    expect(
      screen.getByLabelText("Use my location for auto theme").props.accessibilityState
    ).toEqual({ disabled: false });
  });
});
