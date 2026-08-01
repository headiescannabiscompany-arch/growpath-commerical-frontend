import React from "react";
import { render } from "@testing-library/react-native";

import FacilityAiValidationRoute from "@/app/home/facility/(tabs)/ai-validation";

let mockFacilityRole = "VIEWER";
const mockCan = jest.fn();

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { FACILITY_SETTINGS_EDIT: "FACILITY_SETTINGS_EDIT" },
  useEntitlements: () => ({ facilityRole: mockFacilityRole, can: mockCan })
}));

jest.mock("@/api/aiValidation", () => ({
  aiCompare: jest.fn(),
  aiFeedback: jest.fn(),
  aiTrainingExport: jest.fn(),
  aiVerify: jest.fn()
}));

describe("Facility AI Validation Lab access", () => {
  beforeEach(() => {
    mockFacilityRole = "VIEWER";
    mockCan.mockReset();
  });

  it("does not expose endpoint controls or payload fields to a Viewer", () => {
    mockCan.mockReturnValue(false);
    const screen = render(<FacilityAiValidationRoute />);

    expect(screen.getByText("AI Validation Lab")).toBeTruthy();
    expect(screen.getByText("Owner access required")).toBeTruthy();
    expect(screen.queryByLabelText("AI verify prediction JSON")).toBeNull();
    expect(screen.queryByLabelText("Verify AI prediction")).toBeNull();
    expect(screen.queryByLabelText("Export AI training feedback")).toBeNull();
  });

  it("does not trust a stale owner-only capability on a non-owner role", () => {
    mockFacilityRole = "MANAGER";
    mockCan.mockReturnValue(true);
    const screen = render(<FacilityAiValidationRoute />);

    expect(screen.getByText("Owner access required")).toBeTruthy();
    expect(screen.queryByLabelText("AI feedback target id")).toBeNull();
  });

  it("keeps the operational controls available to a capable facility owner", () => {
    mockFacilityRole = "OWNER";
    mockCan.mockReturnValue(true);
    const screen = render(<FacilityAiValidationRoute />);

    expect(screen.queryByText("Owner access required")).toBeNull();
    expect(screen.getByLabelText("AI verify prediction JSON")).toBeTruthy();
    expect(screen.getByLabelText("Verify AI prediction")).toBeTruthy();
    expect(screen.getByLabelText("Export AI training feedback")).toBeTruthy();
  });
});
