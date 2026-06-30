import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import AutomationCenterScreen from "@/screens/facility/AutomationCenterScreen";

const mockTogglePolicy = jest.fn();
const mockTriggerPolicy = jest.fn();
const mockUseAutomationPolicies = jest.fn();
const mockCan = jest.fn();

jest.mock("@/hooks/useAutomationPolicies", () => ({
  useAutomationPolicies: () => mockUseAutomationPolicies()
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { FACILITY_SETTINGS_EDIT: "facility.settings.edit" },
  useEntitlements: () => ({ can: mockCan })
}));

describe("AutomationCenterScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCan.mockReturnValue(true);
    mockUseAutomationPolicies.mockReturnValue({
      data: [
        {
          id: "policy-1",
          name: "Dew Point High Risk Alert",
          description: "Create a canopy inspection when condensation risk is high.",
          enabled: true,
          trigger: { source: "tool_run", eventType: "dew_point_high_risk" },
          actions: [
            { type: "create_task", payload: { title: "Inspect canopy" } },
            { type: "create_notification", payload: {} }
          ],
          triggerCount: 3
        }
      ],
      isLoading: false,
      togglePolicy: mockTogglePolicy,
      triggerPolicy: mockTriggerPolicy,
      toggling: false,
      triggering: false
    });
  });

  it("shows policy details and can toggle or manually trigger enabled policies", () => {
    const screen = render(<AutomationCenterScreen />);

    expect(screen.getByText("Dew Point High Risk Alert")).toBeTruthy();
    expect(
      screen.getByText("Create a canopy inspection when condensation risk is high.")
    ).toBeTruthy();
    expect(screen.getByText("Trigger: tool run:dew point high risk")).toBeTruthy();
    expect(screen.getByText("Actions: create task, create notification")).toBeTruthy();
    expect(screen.getByText("Triggered: 3")).toBeTruthy();

    fireEvent.press(screen.getByText("Disable"));
    expect(mockTogglePolicy).toHaveBeenCalledWith({
      policyId: "policy-1",
      enabled: false
    });

    fireEvent.press(screen.getByText("Run Now"));
    expect(mockTriggerPolicy).toHaveBeenCalledWith({
      policyId: "policy-1",
      reason: "manual automation center run"
    });
  });

  it("blocks edits when the user lacks facility settings permission", () => {
    mockCan.mockReturnValue(false);
    const screen = render(<AutomationCenterScreen />);

    fireEvent.press(screen.getByText("Disable"));
    fireEvent.press(screen.getByText("Run Now"));

    expect(mockTogglePolicy).not.toHaveBeenCalled();
    expect(mockTriggerPolicy).not.toHaveBeenCalled();
    expect(screen.getByText("Requires Admin/Owner permissions.")).toBeTruthy();
  });
});
