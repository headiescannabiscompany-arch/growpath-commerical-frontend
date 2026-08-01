import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityLogsRoute from "@/app/home/facility/(tabs)/logs";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
let mockFacilityRole = "STAFF";
let mockCanWriteLogs = true;

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ growId: "grow-1", contextName: "Summer crop" })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { GROWLOGS_WRITE: "growlogs_write" },
  useEntitlements: () => ({
    facilityRole: mockFacilityRole,
    can: () => mockCanWriteLogs
  })
}));
jest.mock("@/hooks/useApiErrorHandler", () => {
  const clearError = jest.fn();
  const handleApiError = jest.fn();
  return { useApiErrorHandler: () => ({ error: null, clearError, handleApiError }) };
});
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

describe("FacilityLogsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityRole = "STAFF";
    mockCanWriteLogs = true;
    mockApiRequest.mockImplementation((_path: string, options?: any) =>
      Promise.resolve(
        options?.method === "POST"
          ? { created: { id: "log-2" } }
          : {
              growlogs: [{ id: "log-1", title: "Morning observation" }]
            }
      )
    );
  });

  it("lets staff save a real grow-scoped journal entry", async () => {
    const screen = render(<FacilityLogsRoute />);

    await waitFor(() => expect(screen.getByText("Morning observation")).toBeTruthy());
    expect(
      screen.getByRole("header", { name: "Summer crop → Journal" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getByRole("header", { name: "Add journal entry" }).props["aria-level"]
    ).toBe(2);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility-1/growlogs?growId=grow-1"
    );

    fireEvent.press(screen.getByLabelText("Set facility journal type WATER"));
    fireEvent.changeText(
      screen.getByLabelText("Facility journal title"),
      "Watered row A"
    );
    fireEvent.changeText(
      screen.getByLabelText("Facility journal note"),
      "Recorded runoff"
    );
    fireEvent.press(screen.getByLabelText("Save facility journal entry"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facility/facility-1/growlogs",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Watered row A",
            note: "Recorded runoff",
            type: "WATER",
            growId: "grow-1"
          })
        })
      )
    );
  });

  it("keeps a viewer read-only even if a stale capability claims write access", async () => {
    mockFacilityRole = "VIEWER";
    mockCanWriteLogs = true;

    const screen = render(<FacilityLogsRoute />);

    await waitFor(() => expect(screen.getByText("Morning observation")).toBeTruthy());
    expect(screen.queryByLabelText("Facility journal title")).toBeNull();
    expect(screen.queryByLabelText("Save facility journal entry")).toBeNull();
  });

  it("keeps staff read-only when the grow-log write capability is unavailable", async () => {
    mockCanWriteLogs = false;

    const screen = render(<FacilityLogsRoute />);

    await waitFor(() => expect(screen.getByText("Morning observation")).toBeTruthy());
    expect(screen.queryByLabelText("Facility journal title")).toBeNull();
    expect(screen.queryByLabelText("Save facility journal entry")).toBeNull();
  });
});
