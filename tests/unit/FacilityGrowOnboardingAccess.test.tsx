import React from "react";
import { render } from "@testing-library/react-native";

import AssignPlantsToGrow, {
  createAssignPlantsStyles
} from "@/features/grows/screens/AssignPlantsToGrow";
import { createStartGrowStyles } from "@/features/grows/screens/StartGrowWizard";
import { getThemePalette } from "@/theme/appTheme";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ replace: jest.fn() })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: true,
    facilityId: "facility-1",
    facilityRole: "VIEWER"
  })
}));

jest.mock("@/features/plants/hooks", () => ({
  usePlants: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
  useCreatePlant: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUpdatePlant: () => ({ isPending: false, mutateAsync: jest.fn() })
}));

describe("Facility grow onboarding access", () => {
  it("removes plant creation and assignment controls from a Viewer direct route", () => {
    const screen = render(<AssignPlantsToGrow />);

    expect(
      screen.getByRole("header", { name: "Plant assignment is read-only" })
    ).toBeTruthy();
    expect(screen.queryByPlaceholderText("Plant name or tag")).toBeNull();
    expect(screen.queryByLabelText("Add plant to grow")).toBeNull();
    expect(screen.queryByLabelText("Assign selected plants to grow")).toBeNull();
    expect(screen.getByLabelText("Continue to facility grows")).toBeTruthy();
  });

  it("uses the active Night palette for protected and authorized states", () => {
    const palette = getThemePalette("night", "dark");
    const start = createStartGrowStyles(palette);
    const assign = createAssignPlantsStyles(palette);

    for (const styles of [start, assign]) {
      expect(styles.page.backgroundColor).toBe(palette.page);
      expect(styles.title.color).toBe(palette.text);
      expect(styles.subtitle.color).toBe(palette.textSoft);
      expect(styles.card.backgroundColor).toBe(palette.surface);
      expect(styles.input.backgroundColor).toBe(palette.surface);
      expect(styles.input.color).toBe(palette.text);
      expect(styles.secondaryButton.backgroundColor).toBe(palette.surface);
    }
  });
});
