import React from "react";
import { render } from "@testing-library/react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/facility/FacilityProvider", () => ({
  useFacility: () => ({
    isLoading: false,
    facilities: [
      {
        id: "facility-1",
        name: "Test Facility",
        tier: null
      }
    ],
    selectedId: "facility-1",
    error: "",
    selectFacility: jest.fn()
  })
}));

import FacilitiesScreen, { createStyles } from "@/app/facilities";
import { getThemePalette } from "@/theme/appTheme";

describe("legacy Facilities route", () => {
  it("uses the active palette and exposes one page heading", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createStyles(palette);
    const screen = render(<FacilitiesScreen />);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.facilityCard.backgroundColor).toBe(palette.surface);
    expect(styles.facilityCardSelected.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.facilityName.color).toBe(palette.text);
    expect(
      screen.getByRole("header", { name: "Your Facility" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByText("Test Facility")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByLabelText("Create facility")).toBeNull();
  });
});
