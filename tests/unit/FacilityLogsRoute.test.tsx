import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityLogsRoute from "@/app/home/facility/(tabs)/logs";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
let mockFacilityRole = "STAFF";
let mockCanWriteLogs = true;
let mockSearchParams: Record<string, string> = {
  growId: "grow-1",
  contextName: "Summer crop"
};
let mockScreenBoundaryProps: any = null;

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockSearchParams
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
    ScreenBoundary: (props: any) => {
      mockScreenBoundaryProps = props;
      return React.createElement(View, null, props.children);
    }
  };
});
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

describe("FacilityLogsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityRole = "STAFF";
    mockCanWriteLogs = true;
    mockScreenBoundaryProps = null;
    mockSearchParams = { growId: "grow-1", contextName: "Summer crop" };
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

    expect(screen.getByLabelText("Loading facility journal").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });

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

    fireEvent.press(
      screen.getByRole("link", {
        name: "Open facility journal entry Morning observation"
      })
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/logs/[id]",
      params: { id: "log-1" }
    });

    fireEvent.press(screen.getByLabelText("Set facility journal type WATER"));
    expect(screen.getByLabelText("Set facility journal type WATER").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: true }
    });
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

  it("uses one accurate root-route heading and a structured empty state", async () => {
    mockSearchParams = {};
    mockFacilityRole = "VIEWER";
    mockCanWriteLogs = false;
    mockApiRequest.mockResolvedValue({ growlogs: [] });

    const screen = render(<FacilityLogsRoute />);

    await waitFor(() => expect(screen.getByText("No log entries yet")).toBeTruthy());
    expect(
      screen.getByRole("header", { name: "Facility Grow Journal" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getByRole("header", { name: "No log entries yet" }).props["aria-level"]
    ).toBe(2);
    expect(mockScreenBoundaryProps).toMatchObject({
      showBack: true,
      backFallbackHref: "/home/facility/dashboard"
    });
  });

  it("prevents duplicate journal saves while a request is pending", async () => {
    let finishSave: (() => void) | undefined;
    mockApiRequest.mockImplementation((_path: string, options?: any) => {
      if (options?.method === "POST") {
        return new Promise<void>((resolve) => {
          finishSave = resolve;
        });
      }
      return Promise.resolve({
        growlogs: [{ id: "log-1", title: "Morning observation" }]
      });
    });
    const screen = render(<FacilityLogsRoute />);
    await waitFor(() => expect(screen.getByText("Morning observation")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Facility journal title"), "Watered");
    const save = screen.getByLabelText("Save facility journal entry");

    fireEvent.press(save);
    fireEvent.press(save);

    expect(
      mockApiRequest.mock.calls.filter(([, options]) => options?.method === "POST")
    ).toHaveLength(1);
    expect(
      screen.getByLabelText("Save facility journal entry").props.accessibilityState
    ).toMatchObject({ busy: true, disabled: true });
    finishSave?.();
    await waitFor(() =>
      expect(screen.getByText("Journal entry saved to the grow timeline.")).toBeTruthy()
    );
    expect(
      screen.getByText("Journal entry saved to the grow timeline.").props
        .accessibilityLiveRegion
    ).toBe("polite");
  });
});
