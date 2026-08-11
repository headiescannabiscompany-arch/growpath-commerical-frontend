import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityGrowsTab from "@/app/home/facility/(tabs)/grows";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockApiErrorHandler = {
  error: null,
  clearError: mockClearError,
  handleApiError: mockHandleApiError
};
const mockRouter = { push: mockPush, replace: mockReplace };
let mockParams: Record<string, string> = {};
let mockFacilityRole = "MANAGER";
let mockCanWriteGrows = true;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    grows: (facilityId: string) => `/api/facility/${facilityId}/grows`
  }
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { GROWS_WRITE: "GROWS_WRITE" },
  useEntitlements: () => ({
    facilityRole: mockFacilityRole,
    can: () => mockCanWriteGrows
  })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorHandler
}));

describe("FacilityGrowsTab", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFacilityRole = "MANAGER";
    mockCanWriteGrows = true;
    mockParams = { roomId: "room-1", roomName: "Flower Room" };
    mockApiRequest.mockResolvedValue({ grows: [] });
  });

  it("opens supported grow setup for the exact room from the empty state", async () => {
    const screen = render(<FacilityGrowsTab />);

    await waitFor(() =>
      expect(screen.getByText("No grows in this room yet")).toBeTruthy()
    );
    expect(
      screen.getByText(
        "Start a grow in Flower Room to connect its plants, tasks, logs, and AI context."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Start grow in Flower Room"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/onboarding/start-grow",
      params: { roomId: "room-1", roomName: "Flower Room" }
    });
  });

  it("owns the page heading and hides grow creation from a Viewer", async () => {
    mockParams = {};
    mockFacilityRole = "VIEWER";
    mockCanWriteGrows = false;
    const screen = render(<FacilityGrowsTab />);

    await waitFor(() => expect(screen.getByText("No facility grows yet")).toBeTruthy());
    expect(
      screen.getByRole("header", { name: "Facility Grows" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getByRole("header", { name: "No facility grows yet" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByText("Only facility owners and managers can start grows.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Start facility grow")).toBeNull();
  });

  it("names the exact grow that will open", async () => {
    mockParams = {};
    mockApiRequest.mockResolvedValue({
      grows: [{ id: "grow-1", name: "Summer crop", stage: "Flower" }]
    });
    const screen = render(<FacilityGrowsTab />);

    const growLink = await screen.findByRole("button", {
      name: "Open facility grow Summer crop"
    });
    fireEvent.press(growLink);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/grows/[id]",
      params: { id: "grow-1" }
    });
  });
});
