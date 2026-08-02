import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import LegacyFacilityInventoryRoute from "@/app/facilities/[facilityId]/inventory";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockSelectFacility = jest.fn();
let mockThemeMode: "day" | "night" = "night";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ facilityId: "facility-1" }),
  useRootNavigationState: () => ({ key: "root-navigation" }),
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/state/useAccountMode", () => ({
  useAccountMode: () => ({ mode: "facility" })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: "facility-1",
    selectFacility: mockSelectFacility
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    facilityId: "facility-1",
    ready: true
  })
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

describe("LegacyFacilityRouteShim theme", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSelectFacility.mockReset();
  });

  it.each(["day", "night"] as const)(
    "mounts the reachable legacy inventory route with the active %s palette",
    async (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const screen = render(<LegacyFacilityInventoryRoute />);

      const surface = screen.getByTestId("legacy-facility-route-shim");
      const spinner = screen.getByTestId("legacy-facility-route-spinner");

      expect(StyleSheet.flatten(surface.props.style).backgroundColor).toBe(palette.page);
      expect(spinner.props.color).toBe(palette.accent);
      expect(spinner.props.color).toBeTruthy();

      if (mode === "night") {
        expect(StyleSheet.flatten(surface.props.style).backgroundColor).not.toBe(
          "#FFFFFF"
        );
      }

      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/home/facility/inventory")
      );
      expect(mockSelectFacility).not.toHaveBeenCalled();
    }
  );
});
