import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import FacilityReportsTab from "@/app/home/facility/(tabs)/reports";

const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockApiErrorState = {
  error: null,
  clearError: mockClearError,
  handleApiError: mockHandleApiError
};
const mockRouter = { push: jest.fn(), replace: jest.fn() };

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
  useEntitlements: () => ({ can: () => false, facilityRole: "VIEWER" })
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
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("FacilityReportsTab viewer access", () => {
  it("keeps compliance export hidden for a viewer", async () => {
    const screen = render(<FacilityReportsTab />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText("Facility Reports")).toBeTruthy());

    expect(screen.queryByLabelText("Export compliance packet")).toBeNull();
    expect(screen.getByLabelText("Refresh facility reports")).toBeTruthy();
  });
});
