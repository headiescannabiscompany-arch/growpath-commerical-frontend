import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FirstSetupRooms, {
  createFirstSetupRoomsStyles
} from "@/features/rooms/screens/FirstSetupRooms";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseRooms = jest.fn();
let mockEntitlements: any;

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/features/rooms/hooks", () => ({
  useRooms: () => mockUseRooms(),
  useBulkCreateRooms: () => ({ mutateAsync: mockMutateAsync })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

describe("FirstSetupRooms", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockEntitlements = { ready: true, facilityRole: "OWNER" };
    mockUseRooms.mockReturnValue({ data: [], isLoading: false });
    mockMutateAsync.mockResolvedValue([
      { success: true },
      { success: true },
      { success: true },
      { success: true },
      { success: true }
    ]);
  });

  it("starts facility onboarding with flower, veg, mother, greenhouse, and dry/cure spaces", async () => {
    const screen = render(<FirstSetupRooms />);

    expect(screen.getByDisplayValue("Flower Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Veg Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Mother Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Greenhouse")).toBeTruthy();
    expect(screen.getByDisplayValue("Dry/Cure Room")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Create rooms"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith([
        { name: "Flower Room", roomType: "flower", trackingMode: "batch" },
        { name: "Veg Room", roomType: "vegetative", trackingMode: "batch" },
        { name: "Mother Room", roomType: "mother", trackingMode: "batch" },
        { name: "Greenhouse", roomType: "greenhouse", trackingMode: "batch" },
        { name: "Dry/Cure Room", roomType: "drying", trackingMode: "batch" }
      ])
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/onboarding/start-grow")
    );
  });

  it("keeps Viewers out of the direct room-creation route", () => {
    mockEntitlements = { ready: true, facilityRole: "VIEWER" };

    const screen = render(<FirstSetupRooms />);

    expect(screen.getByRole("header", { name: "Room setup is read-only" })).toBeTruthy();
    expect(screen.queryByDisplayValue("Flower Room")).toBeNull();
    expect(screen.queryByLabelText("Create rooms")).toBeNull();
    expect(screen.getByLabelText("Back to facility rooms")).toBeTruthy();
  });

  it("uses the active Night palette for protected and writable states", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFirstSetupRoomsStyles(palette);

    expect(styles.page.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.surface);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surface);
  });
});
