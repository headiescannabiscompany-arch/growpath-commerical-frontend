import React from "react";
import { RefreshControl } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityComplianceTab from "@/app/home/facility/(tabs)/compliance";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockGetSOPTemplates = jest.fn();
const mockCreateDeviation = jest.fn();
const mockGetDeviations = jest.fn();
const mockResolveDeviation = jest.fn();
const mockApproveVerification = jest.fn();
const mockGetVerifications = jest.fn();
const mockRejectVerification = jest.fn();
const mockCreateAuditLog = jest.fn();
const mockListAuditLogs = jest.fn();
const mockEntitlementState = {
  can: jest.fn((_capability?: string) => true),
  facilityRole: "OWNER"
};
let mockFacilityState: any;
let mockAuth = { user: { id: "qa-owner" }, token: "test-token" };
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => mockFacilityState
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COMPLIANCE_READ: "COMPLIANCE_READ",
    COMPLIANCE_WRITE: "COMPLIANCE_WRITE",
    AUDIT_READ: "AUDIT_READ"
  },
  useEntitlements: () => mockEntitlementState
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({
    error: null,
    handleApiError: mockHandleApiError,
    clearError: mockClearError,
    toInlineError: (error: any) => ({ message: error.message || "Unavailable" })
  })
}));

jest.mock("@/api/deviations", () => ({
  createDeviation: (...args: any[]) => mockCreateDeviation(...args),
  getDeviations: (...args: any[]) => mockGetDeviations(...args),
  resolveDeviation: (...args: any[]) => mockResolveDeviation(...args)
}));

jest.mock("@/api/verification", () => ({
  approveVerification: (...args: any[]) => mockApproveVerification(...args),
  getVerifications: (...args: any[]) => mockGetVerifications(...args),
  rejectVerification: (...args: any[]) => mockRejectVerification(...args)
}));

jest.mock("@/api/sop", () => ({
  createSOPTemplate: jest.fn(),
  getSOPTemplates: (...args: any[]) => mockGetSOPTemplates(...args)
}));

jest.mock("@/api/audit", () => ({
  createAuditLog: (...args: any[]) => mockCreateAuditLog(...args),
  listAuditLogs: (...args: any[]) => mockListAuditLogs(...args)
}));

describe("Facility Compliance facility label", () => {
  const deferred = () => {
    let resolve!: (value: any) => void;
    let reject!: (error: any) => void;
    const promise = new Promise<any>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    return { promise, resolve, reject };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: { id: "qa-owner" }, token: "test-token" };
    mockEntitlementState.can.mockReturnValue(true);
    mockEntitlementState.facilityRole = "OWNER";
    mockGetSOPTemplates.mockResolvedValue([]);
    mockGetDeviations.mockResolvedValue([]);
    mockGetVerifications.mockResolvedValue([]);
    mockListAuditLogs.mockResolvedValue({ data: [] });
    mockCreateAuditLog.mockResolvedValue({ id: "audit-1" });
    mockCreateDeviation.mockResolvedValue({ id: "deviation-1" });
    mockResolveDeviation.mockResolvedValue({ id: "deviation-1" });
    mockApproveVerification.mockResolvedValue({ id: "verification-1" });
    mockRejectVerification.mockResolvedValue({ id: "verification-1" });
    mockFacilityState = {
      selectedId: "507f1f77bcf86cd799439011",
      selected: {
        id: "507f1f77bcf86cd799439011",
        name: "Readable Test Facility"
      }
    };
  });

  it("shows the selected facility name without exposing its database ID", async () => {
    const screen = render(<FacilityComplianceTab />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Facility: Readable Test Facility")).toBeTruthy();
    expect(screen.queryByText(/507f1f77bcf86cd799439011/)).toBeNull();
  });

  it("keeps initial counts unknown, blocks writes and offers draft-preserving single-flight Retry", async () => {
    const first = deferred();
    const retry = deferred();
    mockGetDeviations
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(retry.promise);
    const screen = render(<FacilityComplianceTab />);
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.queryByText("No open deviations.")).toBeNull();
    fireEvent.changeText(screen.getByLabelText("Deviation title"), "Unsent draft");
    fireEvent.press(screen.getByLabelText("Create compliance deviation"));
    expect(mockCreateDeviation).not.toHaveBeenCalled();
    await act(async () => first.reject(new Error("Read failed")));
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(screen.queryByText("No SOP templates yet.")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh facility compliance"));
    fireEvent.press(screen.getByLabelText("Refresh facility compliance"));
    expect(mockGetDeviations).toHaveBeenCalledTimes(2);
    await act(async () => retry.resolve([]));
    expect(screen.getByDisplayValue("Unsent draft")).toBeTruthy();
    expect(
      screen.getByLabelText("Create compliance deviation").props.accessibilityState
        .disabled
    ).toBe(false);
    expect(screen.getByText("No open deviations.")).toBeTruthy();
  });

  it("labels a failed refresh, retains records and disables record-backed actions", async () => {
    mockGetDeviations
      .mockResolvedValueOnce([{ id: "dev1", title: "Saved deviation", status: "open" }])
      .mockRejectedValueOnce(new Error("Refresh failed"));
    mockGetVerifications.mockResolvedValue([
      { id: "verify1", name: "Saved verification", status: "pending" }
    ]);
    mockGetSOPTemplates.mockResolvedValue([{ id: "sop1", title: "Saved SOP" }]);
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("Saved deviation")).toBeTruthy());
    fireEvent.changeText(
      screen.getByLabelText("Verification reject reason"),
      "Unsent reason"
    );
    fireEvent.press(screen.getByLabelText("Refresh facility compliance"));
    await waitFor(() => expect(screen.getByText("Retry")).toBeTruthy());
    expect(screen.getByText(/Previously loaded compliance records/)).toBeTruthy();
    expect(screen.getByText("Saved deviation")).toBeTruthy();
    expect(screen.getByDisplayValue("Unsent reason")).toBeTruthy();
    for (const name of [
      "Resolve deviation Saved deviation",
      "Approve verification Saved verification",
      "Reject verification Saved verification",
      "Start SOP run from Saved SOP"
    ]) {
      expect(screen.getByLabelText(name).props.accessibilityState.disabled).toBe(true);
      fireEvent.press(screen.getByLabelText(name));
    }
    expect(mockResolveDeviation).not.toHaveBeenCalled();
    expect(mockApproveVerification).not.toHaveBeenCalled();
    expect(mockRejectVerification).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("serializes refresh with creation and preserves confirmed-write feedback when refresh fails", async () => {
    const write = deferred();
    mockCreateDeviation.mockReturnValueOnce(write.promise);
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("No open deviations.")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Deviation title"), "Reviewed draft");
    fireEvent.press(screen.getByLabelText("Create compliance deviation"));
    fireEvent.press(screen.getByLabelText("Create compliance deviation"));
    fireEvent.press(screen.getByLabelText("Refresh facility compliance"));
    const refresh = screen.UNSAFE_getByType(RefreshControl);
    await act(async () => {
      await refresh.props.onRefresh();
    });
    expect(mockCreateDeviation).toHaveBeenCalledTimes(1);
    expect(mockGetDeviations).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Deviation title").props.editable).toBe(false);
    mockGetDeviations.mockRejectedValueOnce(new Error("After-write read failed"));
    await act(async () => write.resolve({ id: "created" }));
    await waitFor(() =>
      expect(
        screen.getByText(/Deviation created\. Records could not refresh/)
      ).toBeTruthy()
    );
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(
      screen.getByLabelText("Create compliance deviation").props.accessibilityState
        .disabled
    ).toBe(true);
  });

  it("retains a failed write draft for a deliberate retry", async () => {
    mockCreateDeviation.mockRejectedValueOnce(new Error("Save failed"));
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("No open deviations.")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Deviation title"), "Keep title");
    fireEvent.changeText(
      screen.getByLabelText("Deviation description"),
      "Keep description"
    );
    fireEvent.press(screen.getByLabelText("Create compliance deviation"));
    await waitFor(() => expect(screen.getByText("Save failed")).toBeTruthy());
    expect(screen.getByDisplayValue("Keep title")).toBeTruthy();
    expect(screen.getByDisplayValue("Keep description")).toBeTruthy();
    expect(mockGetDeviations).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["resolve", "Resolve deviation Saved deviation", "Deviation resolved."],
    ["approve", "Approve verification Saved verification", "Verification approved."],
    ["reject", "Reject verification Saved verification", "Verification rejected."]
  ])(
    "serializes %s and keeps confirmed feedback when its follow-up read fails",
    async (kind, label, success) => {
      mockGetDeviations.mockResolvedValue([
        { id: "dev1", title: "Saved deviation", status: "open" }
      ]);
      mockGetVerifications.mockResolvedValue([
        { id: "ver1", name: "Saved verification", status: "pending" }
      ]);
      const write = deferred();
      const mutation =
        kind === "resolve"
          ? mockResolveDeviation
          : kind === "approve"
            ? mockApproveVerification
            : mockRejectVerification;
      mutation.mockReturnValueOnce(write.promise);
      const screen = render(<FacilityComplianceTab />);
      await waitFor(() => expect(screen.getByText("Saved verification")).toBeTruthy());
      fireEvent.press(screen.getByLabelText(label));
      fireEvent.press(screen.getByLabelText(label));
      fireEvent.press(screen.getByLabelText("Refresh facility compliance"));
      expect(mutation).toHaveBeenCalledTimes(1);
      expect(mockGetDeviations).toHaveBeenCalledTimes(1);
      mockGetDeviations.mockRejectedValueOnce(new Error("Read unavailable"));
      await act(async () => write.resolve({ id: "confirmed" }));
      await waitFor(() =>
        expect(
          screen.getByText(
            success + " Records could not refresh. Retry the read before another change."
          )
        ).toBeTruthy()
      );
      expect(screen.getByLabelText(label).props.accessibilityState.disabled).toBe(true);
    }
  );

  it("rejects malformed returned collections instead of claiming no records", async () => {
    mockGetDeviations.mockResolvedValueOnce({ unexpected: true });
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("Retry")).toBeTruthy());
    expect(screen.queryByText("No open deviations.")).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  it.each(["account", "session", "Facility", "role"])(
    "discards old drafts and late reads after changing %s",
    async (kind) => {
      const oldRead = deferred();
      mockGetDeviations.mockReturnValueOnce(oldRead.promise);
      const screen = render(<FacilityComplianceTab />);
      fireEvent.changeText(screen.getByLabelText("Deviation title"), "Old draft");
      if (kind === "account") mockAuth = { ...mockAuth, user: { id: "other" } };
      if (kind === "session") mockAuth = { ...mockAuth, token: "other-session" };
      if (kind === "Facility")
        mockFacilityState = {
          selectedId: "other-facility",
          selected: { name: "Other Facility" }
        };
      if (kind === "role") mockEntitlementState.facilityRole = "MANAGER";
      screen.rerender(<FacilityComplianceTab />);
      await waitFor(() => expect(screen.getByText("No open deviations.")).toBeTruthy());
      await act(async () => oldRead.resolve([{ id: "old", title: "Old late record" }]));
      expect(screen.queryByText("Old late record")).toBeNull();
      expect(screen.queryByDisplayValue("Old draft")).toBeNull();
    }
  );

  it("does not add an audit or refresh after a late old-account write", async () => {
    const write = deferred();
    mockCreateDeviation.mockReturnValueOnce(write.promise);
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("No open deviations.")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Deviation title"), "Old write");
    fireEvent.press(screen.getByLabelText("Create compliance deviation"));
    mockAuth = { ...mockAuth, user: { id: "other" } };
    screen.rerender(<FacilityComplianceTab />);
    await waitFor(() => expect(mockGetDeviations).toHaveBeenCalledTimes(2));
    await act(async () => write.resolve({ id: "old-created" }));
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
    expect(mockGetDeviations).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Deviation created.")).toBeNull();
  });

  it("does not report unavailable audit access as zero events", async () => {
    mockEntitlementState.can.mockImplementation((key) => key !== "AUDIT_READ");
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("No open deviations.")).toBeTruthy());
    expect(screen.getAllByText("—")).toHaveLength(1);
    expect(mockListAuditLogs).not.toHaveBeenCalled();
  });

  it("keeps Staff resolution excluded without changing its existing write role", async () => {
    mockEntitlementState.facilityRole = "STAFF";
    mockGetDeviations.mockResolvedValue([{ id: "dev1", title: "Review needed" }]);
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("Review needed")).toBeTruthy());
    expect(screen.queryByLabelText("Resolve deviation Review needed")).toBeNull();
    expect(screen.getByLabelText("Create compliance deviation")).toBeTruthy();
  });

  it("does not call compliance APIs without read access", async () => {
    mockEntitlementState.can.mockReturnValue(false);
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("No Compliance Access")).toBeTruthy());
    expect(mockGetDeviations).not.toHaveBeenCalled();
    expect(mockGetSOPTemplates).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Create compliance deviation")).toBeNull();
  });

  it("uses a neutral label when the store only has an identifier", async () => {
    mockFacilityState = {
      selectedId: "507f1f77bcf86cd799439011",
      selected: {
        id: "507f1f77bcf86cd799439011",
        name: "507f1f77bcf86cd799439011"
      }
    };

    const screen = render(<FacilityComplianceTab />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Facility: Selected facility")).toBeTruthy();
    expect(screen.queryByText(/507f1f77bcf86cd799439011/)).toBeNull();
  });

  it("routes SOP authoring through the reviewed SOP Library", async () => {
    const screen = render(<FacilityComplianceTab />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByLabelText("Create SOP template")).toBeNull();
    fireEvent.press(screen.getByLabelText("Open SOP Library"));
    expect(mockRouter.push).toHaveBeenCalledWith("/home/facility/sop-runs/presets");
  });

  it("announces loading, marks navigation as links, and serializes refreshes", async () => {
    let finishLoad: ((value: unknown) => void) | undefined;
    mockGetDeviations.mockImplementationOnce(
      () => new Promise((resolve) => (finishLoad = resolve))
    );
    const screen = render(<FacilityComplianceTab />);

    expect(screen.getByLabelText("Loading facility compliance").props).toMatchObject({
      accessibilityRole: "progressbar"
    });
    const refreshControl = screen.UNSAFE_getByType(RefreshControl);
    act(() => {
      refreshControl.props.onRefresh();
      refreshControl.props.onRefresh();
    });
    expect(mockGetDeviations).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishLoad?.([]);
    });
    expect(screen.getByLabelText("Open compliance export reports").props).toMatchObject({
      accessibilityRole: "link"
    });
    expect(screen.getByLabelText("Open SOP Library").props).toMatchObject({
      accessibilityRole: "link"
    });
  });

  it("uses explicit severity choices and prevents duplicate deviation writes", async () => {
    const screen = render(<FacilityComplianceTab />);
    await waitFor(() => expect(screen.getByText("No SOP templates yet.")).toBeTruthy());

    expect(screen.getByLabelText("Set deviation severity minor").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: true }
    });
    fireEvent.press(screen.getByLabelText("Set deviation severity major"));
    expect(screen.getByLabelText("Set deviation severity major").props).toMatchObject({
      accessibilityState: { checked: true }
    });
    fireEvent.changeText(screen.getByLabelText("Deviation title"), "Humidity drift");

    let finishCreate: ((value: unknown) => void) | undefined;
    mockCreateDeviation.mockImplementationOnce(
      () => new Promise((resolve) => (finishCreate = resolve))
    );
    const createButton = screen.getByLabelText("Create compliance deviation");
    fireEvent.press(createButton);
    fireEvent.press(createButton);

    expect(mockCreateDeviation).toHaveBeenCalledTimes(1);
    expect(mockCreateDeviation).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      expect.objectContaining({ severity: "major", title: "Humidity drift" })
    );
    await act(async () => {
      finishCreate?.({ id: "deviation-2" });
    });
    await waitFor(() => expect(screen.getByText("Deviation created.")).toBeTruthy());
  });

  it("keeps SOP run creation hidden for a viewer", async () => {
    mockGetSOPTemplates.mockResolvedValue([
      { id: "sop-1", title: "Sanitation evidence check", version: 1 }
    ]);
    mockEntitlementState.can.mockImplementation(
      (capability?: string) => capability === "COMPLIANCE_READ"
    );
    mockEntitlementState.facilityRole = "VIEWER";
    const screen = render(<FacilityComplianceTab />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByLabelText("Start new SOP run")).toBeNull();
    expect(
      screen.queryByLabelText("Start SOP run from Sanitation evidence check")
    ).toBeNull();
    expect(
      screen.getByRole("header", { name: "Facility Compliance" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getByRole("header", { name: "Inspection readiness" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByRole("header", { name: "SOP Templates" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByText("You do not have permission to create compliance records.")
    ).toBeTruthy();
  });

  it("keeps SOP template run navigation available to a compliance writer", async () => {
    mockGetSOPTemplates.mockResolvedValue([
      { id: "sop-1", title: "Sanitation evidence check", version: 1 }
    ]);
    const screen = render(<FacilityComplianceTab />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(
      screen.getByLabelText("Start SOP run from Sanitation evidence check")
    );
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/home/facility/sop-runs/start",
      params: {
        templateId: "sop-1",
        templateTitle: "Sanitation evidence check"
      }
    });
  });
});
