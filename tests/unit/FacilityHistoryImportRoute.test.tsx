import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityHistoryImportRoute, {
  canImportFacilityHistory,
  createFacilityHistoryImportStyles
} from "@/app/home/facility/(tabs)/tools/history-import";
import { getThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
let mockFacilityRole = "OWNER";

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/endpoints", () => ({
  endpoints: { grows: (facilityId: string) => `/api/facilities/${facilityId}/grows` }
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockFacilityRole })
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockParams
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/app/home/personal/(tabs)/tools/dew-point-guard", () => {
  const { Text } = require("react-native");
  return function MockImporter({ historyImportMode }: any) {
    return <Text>{historyImportMode ? "History importer ready" : "Wrong mode"}</Text>;
  };
});

describe("Facility history import route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockFacilityRole = "OWNER";
    mockApiRequest.mockResolvedValue({
      grows: [
        { id: "grow-1", name: "Flower Cycle 12", roomName: "Flower A" },
        { id: "grow-2", name: "Veg Cycle", roomName: "Veg" }
      ]
    });
  });

  it("uses the active Night palette and restricts import to owners and managers", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityHistoryImportStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.growCard.backgroundColor).toBe(palette.card);
    expect(styles.copy.color).toBe(palette.textMuted);
    expect(canImportFacilityHistory("OWNER")).toBe(true);
    expect(canImportFacilityHistory("MANAGER")).toBe(true);
    expect(canImportFacilityHistory("VIEWER")).toBe(false);
  });

  it("does not load grows or expose the importer to a Viewer", () => {
    mockFacilityRole = "VIEWER";
    mockParams = { growId: "grow-1", growName: "Flower Cycle 12" };
    const screen = render(<FacilityHistoryImportRoute />);

    expect(screen.getByText("Grow history import is read-only")).toBeTruthy();
    expect(screen.queryByText("History importer ready")).toBeNull();
    expect(mockApiRequest).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Return to Facility integrations"));
    expect(mockPush).toHaveBeenCalledWith("/home/facility/integrations");
  });

  it("requires a destination grow before opening the importer", async () => {
    const screen = render(<FacilityHistoryImportRoute />);
    await waitFor(() => expect(screen.getByText("Flower Cycle 12")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Import history into Flower Cycle 12"));

    expect(mockApiRequest).toHaveBeenCalledWith("/api/facilities/facility-1/grows");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/tools/history-import",
      params: { growId: "grow-1", growName: "Flower Cycle 12" }
    });
  });

  it("opens the shared importer in history mode for the selected grow", () => {
    mockParams = { growId: "grow-1", growName: "Flower Cycle 12" };
    const screen = render(<FacilityHistoryImportRoute />);
    expect(screen.getByText("History importer ready")).toBeTruthy();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
