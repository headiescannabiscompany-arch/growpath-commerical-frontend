import React from "react";
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "qa-user" }, token: "qa-session" })
}));
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { RefreshControl } from "react-native";

import FacilityGrowsTab from "@/app/home/facility/(tabs)/grows";

const mockApiRequest = jest.fn();
const mockFetchRooms = jest.fn();
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
jest.mock("@/api/rooms", () => ({
  fetchRooms: (...args: any[]) => mockFetchRooms(...args)
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
    mockFetchRooms.mockResolvedValue([]);
  });

  it("shows the matching saved room name and a readable start date", async () => {
    mockParams = {};
    mockFetchRooms.mockResolvedValue([{ id: "room-1", name: "Flower Room" }]);
    mockApiRequest.mockResolvedValue({
      grows: [
        { id: "grow-1", name: "Summer crop", roomId: "room-1", startDate: "2026-07-20" }
      ]
    });
    const screen = render(<FacilityGrowsTab />);
    await waitFor(() =>
      expect(screen.getByText("Room: Flower Room · Started: Jul 20, 2026")).toBeTruthy()
    );
    expect(mockFetchRooms).toHaveBeenCalledWith("facility-1");
    expect(screen.queryByText(/room-1/)).toBeNull();
  });

  it("keeps grows readable on room-name failure and restores names with Refresh", async () => {
    mockParams = {};
    mockFetchRooms.mockRejectedValueOnce(new Error("Room read unavailable"));
    mockApiRequest.mockResolvedValue({
      grows: [{ id: "grow-1", name: "Summer crop", roomId: "room-1" }]
    });
    const screen = render(<FacilityGrowsTab />);
    await waitFor(() =>
      expect(screen.getByText("Room names unavailable. Refresh to retry.")).toBeTruthy()
    );
    expect(screen.getByText("Summer crop")).toBeTruthy();
    expect(screen.getByText("Room: Linked room · Started: Not set")).toBeTruthy();
    mockFetchRooms.mockResolvedValue([{ id: "room-1", name: "Flower Room" }]);
    fireEvent.press(screen.getByLabelText("Refresh facility grows"));
    await waitFor(() =>
      expect(screen.getByText("Room: Flower Room · Started: Not set")).toBeTruthy()
    );
    expect(screen.queryByText("Room names unavailable. Refresh to retry.")).toBeNull();
  });

  it("opens supported grow setup for the exact room from the empty state", async () => {
    const screen = render(<FacilityGrowsTab />);

    expect(screen.getByLabelText("Loading facility grows").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });

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

  it("ignores old room-name results after the route context changes", async () => {
    mockParams = {};
    let finishRooms: (value: any) => void = () => {};
    mockFetchRooms.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRooms = resolve;
        })
    );
    mockApiRequest.mockResolvedValueOnce({
      grows: [{ id: "grow-old", name: "Old grow", roomId: "room-1" }]
    });
    const screen = render(<FacilityGrowsTab />);
    mockParams = { roomId: "room-2", roomName: "Current room" };
    mockApiRequest.mockResolvedValue({
      grows: [{ id: "grow-new", name: "Current grow", roomId: "room-2" }]
    });
    mockFetchRooms.mockResolvedValue([{ id: "room-2", name: "Current room" }]);
    screen.rerender(<FacilityGrowsTab />);
    await screen.findByText("Room: Current room · Started: Not set");
    await act(async () => finishRooms([{ id: "room-1", name: "Old room" }]));
    expect(screen.getByText("Current grow")).toBeTruthy();
    expect(screen.queryByText("Old grow")).toBeNull();
    expect(screen.queryByText(/Room: Old room/)).toBeNull();
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

    const growLink = await screen.findByRole("link", {
      name: "Open facility grow Summer crop"
    });
    fireEvent.press(growLink);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/grows/[id]",
      params: { id: "grow-1" }
    });
  });

  it("does not issue duplicate refresh requests while a grow load is pending", async () => {
    mockParams = {};
    const screen = render(<FacilityGrowsTab />);
    await waitFor(() => expect(screen.getByText("No facility grows yet")).toBeTruthy());
    const callsBeforeRefresh = mockApiRequest.mock.calls.length;
    mockApiRequest.mockImplementation(() => new Promise(() => {}));
    const refreshControl = screen.UNSAFE_getByType(RefreshControl);

    act(() => {
      refreshControl.props.onRefresh();
      refreshControl.props.onRefresh();
    });

    expect(mockApiRequest).toHaveBeenCalledTimes(callsBeforeRefresh + 1);
    expect(mockFetchRooms).toHaveBeenCalledTimes(callsBeforeRefresh + 1);
    screen.unmount();
  });
});
