import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityDashboardTab from "@/app/home/facility/(tabs)/dashboard";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockToInlineError = jest.fn();
const mockRouter = { replace: mockReplace, push: mockPush };
let mockFacilityId = "facility-1";
let mockRole = "OWNER";
let mockToken = "session-1";
const mockGetVerifications = jest.fn();

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "qa-user" }, token: mockToken })
}));

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: mockFacilityId,
    selected: { id: mockFacilityId, name: "Test Facility" }
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockRole })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/insights", () => ({
  fetchFacilityInsightsSummary: jest.fn().mockResolvedValue(null)
}));

jest.mock("@/api/audit", () => ({
  listAuditLogs: jest.fn().mockResolvedValue({ success: true, data: [] })
}));

jest.mock("@/api/facilityWorkflows", () => ({
  listBatchCycles: jest.fn().mockResolvedValue([])
}));

jest.mock("@/api/reports", () => ({
  getFacilityReport: jest.fn().mockResolvedValue(null)
}));

jest.mock("@/api/sop", () => ({
  getSOPTemplates: jest.fn().mockResolvedValue([])
}));

jest.mock("@/api/team", () => ({
  listTeamMembers: jest.fn().mockResolvedValue([])
}));

jest.mock("@/api/verification", () => ({
  getVerifications: (...args: any[]) => mockGetVerifications(...args)
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({ toInlineError: mockToInlineError })
}));

describe("FacilityDashboardTab", () => {
  it("counts the actual hosted plants envelope instead of reporting zero", async () => {
    mockApiRequest.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/plants")
          ? { plants: Array.from({ length: 12 }, (_, id) => ({ id })) }
          : []
      )
    );
    const screen = render(<FacilityDashboardTab />);
    await screen.findByText("No pending checks");
    expect(
      screen
        .getByLabelText("Open Plants")
        .findAllByType(require("react-native").Text)
        .map((node: any) => node.props.children)
    ).toContain("12");
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityId = "facility-1";
    mockRole = "OWNER";
    mockToken = "session-1";
    mockGetVerifications.mockResolvedValue([]);
    mockApiRequest.mockResolvedValue([]);
  });

  it("does not call unknown initial or failed counts Clear", async () => {
    mockApiRequest.mockRejectedValue(new Error("unavailable"));
    const screen = render(<FacilityDashboardTab />);
    expect(screen.queryByText("Clear")).toBeNull();
    expect(screen.queryByText("No pending checks")).toBeNull();
    await screen.findByText(
      "Facility dashboard unavailable. Retry to load current records."
    );
    expect(screen.queryByText("Clear")).toBeNull();
    expect(screen.queryByText("0 events captured")).toBeNull();
    mockApiRequest.mockResolvedValue([]);
    fireEvent.press(screen.getByLabelText("Refresh facility dashboard"));
    await screen.findByText("No pending checks");
  });

  it("keeps failed verification evidence unknown without hiding other reads", async () => {
    mockGetVerifications.mockRejectedValue(new Error("not readable"));
    const screen = render(<FacilityDashboardTab />);
    await screen.findByText(
      "Some dashboard records are unavailable. Refresh to retry; unavailable counts are not zero."
    );
    expect(screen.queryByText("Clear")).toBeNull();
    expect(screen.queryByText("No pending checks")).toBeNull();
    expect(screen.getByText("0 events captured")).toBeTruthy();
    mockGetVerifications.mockResolvedValue([]);
    fireEvent.press(screen.getByLabelText("Refresh facility dashboard"));
    await screen.findByText("No pending checks");
  });

  it("labels retained snapshots during refresh and after refresh failure", async () => {
    const screen = render(<FacilityDashboardTab />);
    await screen.findByText("No pending checks");
    let rejectRead!: (error: Error) => void;
    mockApiRequest.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRead = reject;
        })
    );
    fireEvent.press(screen.getByLabelText("Refresh facility dashboard"));
    expect(
      screen.getByText("Previously loaded dashboard — refreshing current records.")
    ).toBeTruthy();
    await act(async () => rejectRead(new Error("offline")));
    await screen.findByText(
      "Previously loaded dashboard — refresh failed. These are not current verified counts."
    );
  });

  it.each(["facility", "role", "session"])(
    "discards old counts and late reads after a %s change",
    async (change) => {
      let resolveOld!: (rows: any[]) => void;
      const oldRead = new Promise((resolve) => {
        resolveOld = resolve;
      });
      mockApiRequest.mockImplementation(() => oldRead);
      const screen = render(<FacilityDashboardTab />);
      if (change === "facility") mockFacilityId = "facility-2";
      if (change === "role") mockRole = "VIEWER";
      if (change === "session") mockToken = "session-2";
      mockApiRequest.mockRejectedValue(new Error("new scope unavailable"));
      screen.rerender(<FacilityDashboardTab />);
      await screen.findByText(
        "Facility dashboard unavailable. Retry to load current records."
      );
      await act(async () => resolveOld([]));
      expect(screen.queryByText("Clear")).toBeNull();
      if (change === "role") expect(screen.queryByLabelText("Open Team")).toBeNull();
    }
  );

  it("clears already loaded totals before a new Facility read resolves", async () => {
    mockApiRequest.mockResolvedValue([{ id: "record" }]);
    const screen = render(<FacilityDashboardTab />);
    await screen.findByText("1 tasks / 1 logs");
    mockFacilityId = "facility-2";
    mockApiRequest.mockImplementation(() => new Promise(() => {}));
    screen.rerender(<FacilityDashboardTab />);
    expect(screen.queryByText("1 tasks / 1 logs")).toBeNull();
    expect(screen.getByText("Task and log counts unavailable")).toBeTruthy();
    screen.unmount();
  });

  it("keeps read-only navigation and existing Viewer exclusions unchanged", async () => {
    mockRole = "VIEWER";
    mockGetVerifications.mockRejectedValue(new Error("unavailable"));
    const screen = render(<FacilityDashboardTab />);
    await screen.findByText("Verification records unavailable");
    expect(screen.queryByLabelText("Open Team")).toBeNull();
    expect(screen.queryByLabelText("Open Inventory")).toBeNull();
    fireEvent.press(screen.getByLabelText("Open Rooms"));
    expect(mockPush).toHaveBeenCalledWith("/home/facility/rooms");
    fireEvent.press(screen.getByLabelText("Open Export packet"));
    expect(mockPush).toHaveBeenLastCalledWith("/home/facility/reports");
  });

  it("announces loading, exposes navigation as links, and prevents duplicate refreshes", async () => {
    const screen = render(<FacilityDashboardTab />);

    expect(screen.getByLabelText("Loading facility dashboard").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });

    const refresh = await screen.findByLabelText("Refresh facility dashboard");
    await waitFor(() =>
      expect(refresh.props.accessibilityState).toMatchObject({
        busy: false,
        disabled: false
      })
    );
    expect(screen.getByLabelText("Open forum").props.accessibilityRole).toBe("link");
    expect(screen.getByLabelText("Open AI Tools").props.accessibilityRole).toBe("link");

    const callsBeforeRefresh = mockApiRequest.mock.calls.length;
    mockApiRequest.mockImplementation(() => new Promise(() => {}));
    fireEvent.press(refresh);
    fireEvent.press(refresh);

    await waitFor(() =>
      expect(
        screen.getByLabelText("Refresh facility dashboard").props.accessibilityState
      ).toMatchObject({ busy: true, disabled: true })
    );
    expect(mockApiRequest).toHaveBeenCalledTimes(callsBeforeRefresh + 6);
    screen.unmount();
  });
});
