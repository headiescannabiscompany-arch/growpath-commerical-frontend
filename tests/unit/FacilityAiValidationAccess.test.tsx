import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityAiValidationRoute from "@/app/home/facility/(tabs)/ai-validation";

let mockFacilityRole = "VIEWER";
const mockCan = jest.fn();
const mockAiVerify = jest.fn();
const mockAiCompare = jest.fn();
const mockAiFeedback = jest.fn();
const mockAiTrainingExport = jest.fn();

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { FACILITY_SETTINGS_EDIT: "FACILITY_SETTINGS_EDIT" },
  useEntitlements: () => ({ facilityRole: mockFacilityRole, can: mockCan })
}));

jest.mock("@/api/aiValidation", () => ({
  aiCompare: (...args: any[]) => mockAiCompare(...args),
  aiFeedback: (...args: any[]) => mockAiFeedback(...args),
  aiTrainingExport: (...args: any[]) => mockAiTrainingExport(...args),
  aiVerify: (...args: any[]) => mockAiVerify(...args)
}));

describe("Facility AI Validation Lab access", () => {
  beforeEach(() => {
    mockFacilityRole = "VIEWER";
    mockCan.mockReset();
    mockAiVerify.mockReset();
    mockAiCompare.mockReset();
    mockAiFeedback.mockReset();
    mockAiTrainingExport.mockReset();
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
    expect(screen.getByText("Verify Prediction")).toBeTruthy();
    expect(screen.getByText("Compare Candidates")).toBeTruthy();
    expect(screen.getByText("Submit Feedback")).toBeTruthy();
    expect(screen.getByText("Export Training Feedback")).toBeTruthy();
  });

  it("locks fields, announces progress, and prevents duplicate owner submissions", async () => {
    mockFacilityRole = "OWNER";
    mockCan.mockReturnValue(true);
    let resolveRequest: ((value: Record<string, unknown>) => void) | undefined;
    mockAiVerify.mockReturnValue(
      new Promise<Record<string, unknown>>((resolve) => {
        resolveRequest = resolve;
      })
    );
    const screen = render(<FacilityAiValidationRoute />);
    const action = screen.getByLabelText("Verify AI prediction");

    fireEvent.press(action);
    fireEvent.press(action);

    expect(mockAiVerify).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Prediction verification in progress")).toBeTruthy();
    expect(screen.getByLabelText("AI verify prediction JSON").props.editable).toBe(false);

    resolveRequest?.({ success: true, status: "verified" });

    await waitFor(() =>
      expect(screen.getByText("Prediction verification completed.")).toBeTruthy()
    );
    expect(screen.getByText("Latest Validation Response")).toBeTruthy();
    expect(screen.getByLabelText("AI verify prediction JSON").props.editable).toBe(true);
  });

  it("keeps invalid JSON local and provides an assertive readable error", async () => {
    mockFacilityRole = "OWNER";
    mockCan.mockReturnValue(true);
    const screen = render(<FacilityAiValidationRoute />);

    fireEvent.changeText(screen.getByLabelText("AI verify prediction JSON"), "{");
    fireEvent.press(screen.getByLabelText("Verify AI prediction"));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(mockAiVerify).not.toHaveBeenCalled();
  });
});
