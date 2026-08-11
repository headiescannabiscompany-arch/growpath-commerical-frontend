import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityReportsTab from "@/app/home/facility/(tabs)/reports";
import { getFacilityComplianceExport } from "@/api/complianceExport";

const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockApiErrorState = {
  error: null,
  clearError: mockClearError,
  handleApiError: mockHandleApiError
};
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockCanExport = false;
let mockScreenBoundaryProps: any = null;

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: "facility-1",
    selected: { id: "facility-1", name: "Viewer Facility" }
  })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { EXPORT_COMPLIANCE: "EXPORT_COMPLIANCE" },
  useEntitlements: () => ({ can: () => mockCanExport, facilityRole: "VIEWER" })
}));

jest.mock("@/api/reports", () => ({
  getFacilityReport: jest.fn(async () => ({
    summary: {},
    growsByStatus: [],
    tasksByStatus: [],
    inventoryLowStock: []
  }))
}));

jest.mock("@/api/complianceExport", () => ({
  getFacilityComplianceExport: jest.fn()
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorState
}));

jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));
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

describe("FacilityReportsTab viewer access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanExport = false;
    mockScreenBoundaryProps = null;
  });

  it("keeps compliance export hidden for a viewer", async () => {
    const screen = render(<FacilityReportsTab />);
    expect(screen.getByLabelText("Loading facility reports").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        screen.getByRole("header", { name: "Facility Reports" }).props["aria-level"]
      ).toBe(1)
    );
    expect(screen.queryByLabelText("Export compliance packet")).toBeNull();
    expect(
      screen.getByLabelText("Refresh facility reports").props.accessibilityState
    ).toMatchObject({ busy: false, disabled: false });
    expect(mockScreenBoundaryProps).toMatchObject({
      showBack: true,
      backFallbackHref: "/home/facility/dashboard"
    });
  });

  it("prevents duplicate compliance exports and announces the completed packet", async () => {
    mockCanExport = true;
    let finishExport: ((value: any) => void) | undefined;
    jest.mocked(getFacilityComplianceExport).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishExport = resolve;
        })
    );
    const screen = render(<FacilityReportsTab />);
    await waitFor(() =>
      expect(screen.getByRole("header", { name: "Facility Reports" })).toBeTruthy()
    );
    const exportButton = screen.getByLabelText("Export compliance packet");

    fireEvent.press(exportButton);
    fireEvent.press(exportButton);

    expect(getFacilityComplianceExport).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Export compliance packet").props.accessibilityState
    ).toMatchObject({ busy: true, disabled: true });
    finishExport?.({
      facilityName: "Viewer Facility",
      generatedAt: "2026-08-11T00:00:00.000Z",
      counts: { auditLogs: 1, sopRuns: 1 },
      evidenceSummary: {
        sopRuns: {
          totalRuns: 1,
          completedRuns: 1,
          inProgressRuns: 0,
          totalSteps: 1,
          doneSteps: 1,
          skippedSteps: 0,
          pendingSteps: 0,
          runsMissingSteps: 0
        },
        deviations: {
          totalDeviations: 0,
          openDeviations: 0,
          resolvedDeviations: 0,
          cancelledDeviations: 0
        }
      }
    });

    const feedback = await screen.findByText("Export ready with 2 records.");
    expect(feedback.props.accessibilityLiveRegion).toBe("polite");
    expect(screen.getByRole("header", { name: "Export packet coverage" })).toBeTruthy();
  });
});
