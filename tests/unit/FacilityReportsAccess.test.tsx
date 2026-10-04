import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityReportsTab from "@/app/home/facility/(tabs)/reports";
import { getFacilityComplianceExport } from "@/api/complianceExport";
import { getFacilityReport } from "@/api/reports";

const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockApiErrorState = {
  error: null,
  clearError: mockClearError,
  handleApiError: mockHandleApiError,
  toInlineError: (error: any) => ({ message: error.message || "Unavailable" })
};
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockCanExport = false;
let mockScreenBoundaryProps: any = null;
let mockAuth = { user: { id: "qa-owner" }, token: "test-token" };
let mockFacilityId = "facility-1";
let mockRole = "VIEWER";
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));

const reportFixture = (facilityId = "facility-1") => ({
  facilityId,
  tasks: { total: 11, open: 10, overdue: 0, completedLast7d: 0 },
  compliance: { totalLogs: 0, missedLast7d: null, byType: {} },
  team: { totalMembers: 5, byRole: {} },
  automation: { policiesEnabled: 0, triggersLast7d: 0 }
});
const packetFixture = () => ({
  success: true as const,
  exportType: "facility_compliance_packet" as const,
  facilityId: "facility-1",
  facilityName: "Viewer Facility",
  generatedAt: "2026-10-04T00:00:00.000Z",
  counts: { auditLogs: 1, sopRuns: 1 },
  filters: {},
  collections: { auditLogs: [{}], sopRuns: [{}] }
});

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: mockFacilityId,
    selected: { id: mockFacilityId, name: "Viewer Facility" }
  })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { EXPORT_COMPLIANCE: "EXPORT_COMPLIANCE" },
  useEntitlements: () => ({ can: () => mockCanExport, facilityRole: mockRole })
}));

jest.mock("@/api/reports", () => ({
  getFacilityReport: jest.fn()
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
    mockAuth = { user: { id: "qa-owner" }, token: "test-token" };
    mockFacilityId = "facility-1";
    mockRole = "VIEWER";
    jest.mocked(getFacilityReport).mockReset().mockResolvedValue(reportFixture());
    jest
      .mocked(getFacilityComplianceExport)
      .mockReset()
      .mockResolvedValue(packetFixture());
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

  it("keeps a dispatched web file alive and releases it on replacement, scope exit and failure", async () => {
    mockCanExport = true;
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    const previousCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const previousRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    const revoke = jest.fn();
    const click = jest.fn();
    const remove = jest.fn();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: () => ({ href: "", download: "", click, remove }),
        body: { appendChild: jest.fn() }
      }
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest
        .fn()
        .mockReturnValueOnce("blob:packet-1")
        .mockReturnValueOnce("blob:packet-2")
        .mockReturnValueOnce("blob:packet-3")
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    let screen: ReturnType<typeof render> | undefined;
    try {
      screen = render(<FacilityReportsTab />);
      await screen.findByText("Tasks");
      fireEvent.press(screen.getByLabelText("Export compliance packet"));
      await screen.findByText(/Download requested:/);
      expect(click).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(revoke).not.toHaveBeenCalled();
      expect(screen.queryByText(/Export ready/)).toBeNull();
      fireEvent.press(screen.getByLabelText("Export compliance packet"));
      await waitFor(() => expect(click).toHaveBeenCalledTimes(2));
      expect(revoke.mock.calls).toEqual([["blob:packet-1"]]);
      mockAuth = { user: { id: "another-owner" }, token: "another-session" };
      screen.rerender(<FacilityReportsTab />);
      expect(revoke.mock.calls).toEqual([["blob:packet-1"], ["blob:packet-2"]]);
      expect(screen.queryByText(/Download requested:/)).toBeNull();
      click.mockImplementationOnce(() => {
        throw new Error("Browser download unavailable");
      });
      fireEvent.press(screen.getByLabelText("Export compliance packet"));
      await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:packet-3"));
      expect(revoke.mock.calls).toEqual([
        ["blob:packet-1"],
        ["blob:packet-2"],
        ["blob:packet-3"]
      ]);
      expect(screen.queryByText(/Download requested:/)).toBeNull();
      expect(screen.queryByRole("header", { name: "Export packet coverage" })).toBeNull();
    } finally {
      screen?.unmount();
      for (const [target, key, descriptor] of [
        [globalThis, "document", previousDocument],
        [URL, "createObjectURL", previousCreate],
        [URL, "revokeObjectURL", previousRevoke]
      ] as const) {
        if (descriptor) Object.defineProperty(target, key, descriptor);
        else Reflect.deleteProperty(target, key);
      }
    }
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
      ...packetFixture(),
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

  it("keeps first-load failure unknown and recovers through single-flight Retry", async () => {
    jest.mocked(getFacilityReport).mockRejectedValueOnce(new Error("offline"));
    const screen = render(<FacilityReportsTab />);
    await screen.findByText("Report unavailable");
    expect(screen.queryByText("No report available")).toBeNull();
    expect(screen.queryByRole("header", { name: "Tasks" })).toBeNull();
    let finish: any;
    jest.mocked(getFacilityReport).mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        })
    );
    fireEvent.press(screen.getByLabelText("Refresh facility reports"));
    fireEvent.press(screen.getByLabelText("Refresh facility reports"));
    expect(getFacilityReport).toHaveBeenCalledTimes(2);
    await act(async () => {
      finish(reportFixture());
    });
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.queryByText("Report unavailable")).toBeNull();
  });

  it("retains a labeled summary after failed refresh and clears the label on recovery", async () => {
    const screen = render(<FacilityReportsTab />);
    await screen.findByText("11");
    jest.mocked(getFacilityReport).mockRejectedValueOnce(new Error("offline"));
    fireEvent.press(screen.getByLabelText("Refresh facility reports"));
    await screen.findByText("Retry");
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText(/Previously loaded report/)).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByLabelText("Refresh facility reports").props.accessibilityState.busy
      ).toBe(false)
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Refresh facility reports"));
    });
    await waitFor(() =>
      expect(screen.queryByText(/Previously loaded report/)).toBeNull()
    );
  });

  it.each([
    {},
    { ...reportFixture(), facilityId: "other" },
    { ...reportFixture(), tasks: { total: -1 } }
  ])("rejects malformed or wrong-Facility summaries", async (value) => {
    jest.mocked(getFacilityReport).mockResolvedValueOnce(value as any);
    const screen = render(<FacilityReportsTab />);
    await screen.findByText("Report unavailable");
    expect(screen.queryByRole("header", { name: "Tasks" })).toBeNull();
  });

  it.each(["account", "session", "facility", "role", "capability"])(
    "discards late reads and exports after a %s change",
    async (kind) => {
      mockCanExport = true;
      let finishReport: any;
      let finishExport: any;
      jest.mocked(getFacilityReport).mockImplementationOnce(
        () =>
          new Promise((r) => {
            finishReport = r;
          })
      );
      jest.mocked(getFacilityComplianceExport).mockImplementationOnce(
        () =>
          new Promise((r) => {
            finishExport = r;
          })
      );
      const screen = render(<FacilityReportsTab />);
      fireEvent.press(screen.getByLabelText("Export compliance packet"));
      if (kind === "account") mockAuth = { ...mockAuth, user: { id: "new-user" } };
      if (kind === "session") mockAuth = { ...mockAuth, token: "new-token" };
      if (kind === "facility") mockFacilityId = "facility-2";
      if (kind === "role") mockRole = "STAFF";
      if (kind === "capability") mockCanExport = false;
      jest.mocked(getFacilityReport).mockResolvedValue({
        ...reportFixture(mockFacilityId),
        tasks: { ...reportFixture().tasks, total: 22 }
      });
      screen.rerender(<FacilityReportsTab />);
      await screen.findByText("22");
      await act(async () => {
        finishReport(reportFixture());
        finishExport(packetFixture());
      });
      expect(screen.queryByText("11")).toBeNull();
      expect(screen.queryByRole("header", { name: "Export packet coverage" })).toBeNull();
      expect(screen.queryByText(/Export ready/)).toBeNull();
    }
  );

  it("removes earlier export success during a retry and does not retain it after failure", async () => {
    mockCanExport = true;
    const screen = render(<FacilityReportsTab />);
    await screen.findByText("11");
    fireEvent.press(screen.getByLabelText("Export compliance packet"));
    await screen.findByText("Export ready with 2 records.");
    jest.mocked(getFacilityComplianceExport).mockRejectedValueOnce(new Error("offline"));
    fireEvent.press(screen.getByLabelText("Export compliance packet"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Export compliance packet").props.accessibilityState.busy
      ).toBe(false)
    );
    expect(screen.queryByText(/Export ready/)).toBeNull();
    expect(screen.queryByRole("header", { name: "Export packet coverage" })).toBeNull();
    expect(screen.getByText("11")).toBeTruthy();
  });

  it.each([
    {},
    { ...packetFixture(), facilityId: "other" },
    { ...packetFixture(), generatedAt: "bad" },
    { ...packetFixture(), counts: { auditLogs: -1 } }
  ])("rejects invalid export metadata", async (packet) => {
    mockCanExport = true;
    jest.mocked(getFacilityComplianceExport).mockResolvedValueOnce(packet as any);
    const screen = render(<FacilityReportsTab />);
    await screen.findByText("11");
    fireEvent.press(screen.getByLabelText("Export compliance packet"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Export compliance packet").props.accessibilityState.busy
      ).toBe(false)
    );
    expect(screen.queryByText(/Export ready/)).toBeNull();
  });
});
