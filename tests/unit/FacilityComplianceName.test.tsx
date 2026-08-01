import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import FacilityComplianceTab from "@/app/home/facility/(tabs)/compliance";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockGetSOPTemplates = jest.fn();
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
  createDeviation: jest.fn(),
  getDeviations: jest.fn().mockResolvedValue([]),
  resolveDeviation: jest.fn()
}));

jest.mock("@/api/verification", () => ({
  approveVerification: jest.fn(),
  getVerifications: jest.fn().mockResolvedValue([]),
  rejectVerification: jest.fn()
}));

jest.mock("@/api/sop", () => ({
  createSOPTemplate: jest.fn(),
  getSOPTemplates: (...args: any[]) => mockGetSOPTemplates(...args)
}));

jest.mock("@/api/audit", () => ({
  createAuditLog: jest.fn(),
  listAuditLogs: jest.fn().mockResolvedValue({ data: [] })
}));

describe("Facility Compliance facility label", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntitlementState.can.mockReturnValue(true);
    mockEntitlementState.facilityRole = "OWNER";
    mockGetSOPTemplates.mockResolvedValue([]);
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
