import React from "react";
import { act, render } from "@testing-library/react-native";

import FacilityComplianceTab from "@/app/home/facility/(tabs)/compliance";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockEntitlementState = {
  can: jest.fn(() => true),
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
  getSOPTemplates: jest.fn().mockResolvedValue([])
}));

jest.mock("@/api/audit", () => ({
  createAuditLog: jest.fn(),
  listAuditLogs: jest.fn().mockResolvedValue({ data: [] })
}));

describe("Facility Compliance facility label", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
