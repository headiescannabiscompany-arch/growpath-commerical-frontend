import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityDashboardTab from "@/app/home/facility/(tabs)/dashboard";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockToInlineError = jest.fn();
const mockRouter = { replace: mockReplace, push: mockPush };

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
    selectedId: "facility-1",
    selected: { id: "facility-1", name: "Test Facility" }
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: "OWNER" })
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
  getVerifications: jest.fn().mockResolvedValue([])
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({ toInlineError: mockToInlineError })
}));

describe("FacilityDashboardTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue([]);
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
