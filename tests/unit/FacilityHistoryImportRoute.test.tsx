import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityHistoryImportRoute, {
  canImportFacilityHistory,
  createFacilityHistoryImportStyles
} from "@/app/home/facility/(tabs)/tools/history-import";
import { getThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
let mockParams: Record<string, string> = {};
let mockFacilityRole = "OWNER";
let mockFacilityId: string | null = "facility-1";
const mockImporter = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/endpoints", () => ({
  endpoints: { grows: (facilityId: string) => `/api/facilities/${facilityId}/grows` }
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacilityId })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockFacilityRole })
}));
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/app/home/personal/(tabs)/tools/dew-point-guard", () => {
  const { Text } = require("react-native");
  return function MockImporter(props: any) {
    mockImporter(props);
    const { historyImportMode } = props;
    return <Text>{historyImportMode ? "History importer ready" : "Wrong mode"}</Text>;
  };
});

describe("Facility history import route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockFacilityRole = "OWNER";
    mockFacilityId = "facility-1";
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
      params: {
        growId: "grow-1",
        growName: "Flower Cycle 12",
        roomId: "",
        roomName: "Flower A"
      }
    });
    expect(
      screen.getByLabelText("Import history into Flower Cycle 12").props
    ).toMatchObject({ accessibilityRole: "link" });
  });

  it("announces the grow load before presenting valid destinations", async () => {
    let finishLoad: ((value: unknown) => void) | undefined;
    mockApiRequest.mockImplementationOnce(
      () => new Promise((resolve) => (finishLoad = resolve))
    );
    const screen = render(<FacilityHistoryImportRoute />);

    expect(
      screen.getByLabelText("Loading facility grows for history import").props
    ).toMatchObject({ accessibilityRole: "progressbar" });
    await waitFor(() => expect(finishLoad).toBeDefined());
    await act(async () => {
      finishLoad?.({
        grows: [
          { id: "grow-1", name: "Flower Cycle 12" },
          { name: "Invalid destination" }
        ]
      });
    });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Flower Cycle 12")).toBeTruthy();
    expect(screen.queryByText("Invalid destination")).toBeNull();
  });

  it("redirects to facility selection when no facility is active", async () => {
    mockFacilityId = null;
    const screen = render(<FacilityHistoryImportRoute />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/home/facility/select")
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(screen.getByText("A Facility is required for history import.")).toBeTruthy();
    expect(screen.queryByText("History importer ready")).toBeNull();
  });

  it("offers a working retry after grow loading fails", async () => {
    mockApiRequest
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ grows: [{ id: "grow-2", name: "Veg Cycle" }] });
    const screen = render(<FacilityHistoryImportRoute />);

    await waitFor(() => expect(screen.getByText("Network unavailable")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Retry loading facility grows"));

    await waitFor(() => expect(screen.getByText("Veg Cycle")).toBeTruthy());
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Network unavailable")).toBeNull();
  });

  it("opens the shared importer in history mode for the selected grow", () => {
    mockParams = {
      growId: "grow-1",
      growName: "Flower Cycle 12",
      roomId: "room-1",
      roomName: "Flower A"
    };
    const screen = render(<FacilityHistoryImportRoute />);
    expect(screen.getByText("History importer ready")).toBeTruthy();
    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(mockImporter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        historyImportMode: true,
        workspaceType: "facility",
        facilityId: "facility-1",
        growLabel: "Flower Cycle 12",
        initialRoomId: "room-1",
        initialRoomName: "Flower A"
      })
    );
  });
});
