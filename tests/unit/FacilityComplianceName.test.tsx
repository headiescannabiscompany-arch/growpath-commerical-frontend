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
    clearError: mockClearError
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
  beforeEach(() => {
    jest.clearAllMocks();
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
    await waitFor(() =>
      expect(screen.getByLabelText("Create compliance deviation")).toBeTruthy()
    );

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
