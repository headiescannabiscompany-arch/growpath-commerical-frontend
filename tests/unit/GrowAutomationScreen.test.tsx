import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowAutomationScreen from "@/app/home/personal/(tabs)/grows/[growId]/automation";

const mockListPolicies = jest.fn();
const mockCreatePolicy = jest.fn();
const mockUpdatePolicy = jest.fn();
const mockDeletePolicy = jest.fn();
const mockTestPolicy = jest.fn();

jest.mock("@/api/automation", () => ({
  listPersonalAutomationPolicies: (...args: any[]) => mockListPolicies(...args),
  createPersonalAutomationPolicy: (...args: any[]) => mockCreatePolicy(...args),
  updatePersonalAutomationPolicy: (...args: any[]) => mockUpdatePolicy(...args),
  deletePersonalAutomationPolicy: (...args: any[]) => mockDeletePolicy(...args),
  testPersonalAutomationPolicy: (...args: any[]) => mockTestPolicy(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  Link: ({ children }: any) => children
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/components/personal/GrowWorkspaceNav", () => {
  const { View } = require("react-native");
  return () => <View testID="grow-workspace-nav" />;
});

describe("GrowAutomationScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPolicies.mockResolvedValue([
      {
        id: "policy-1",
        name: "Dew Point High Risk Alert",
        description: "Create a canopy inspection task.",
        enabled: true,
        trigger: { source: "tool_run", eventType: "dew_point_high_risk" },
        actions: [{ type: "create_task" }],
        triggerCount: 2
      }
    ]);
    mockCreatePolicy.mockResolvedValue({ id: "policy-created" });
    mockUpdatePolicy.mockResolvedValue({ id: "policy-1", enabled: false });
    mockDeletePolicy.mockResolvedValue({ success: true });
    mockTestPolicy.mockResolvedValue({ result: { matchedPolicyCount: 1 } });
  });

  it("manages grow-scoped automation policies from the grow workspace", async () => {
    const screen = render(<GrowAutomationScreen />);

    await waitFor(() =>
      expect(mockListPolicies).toHaveBeenCalledWith({ growId: "grow-1" })
    );

    expect(screen.getByText("Dew Point High Risk Alert")).toBeTruthy();
    expect(screen.getByText("Trigger: tool run:dew point high risk")).toBeTruthy();
    expect(screen.getByText("Actions: create task")).toBeTruthy();
    expect(screen.getByText("Triggered: 2")).toBeTruthy();

    fireEvent.press(screen.getByText("Add Dew Point Alert"));
    await waitFor(() =>
      expect(mockCreatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          name: "Dew Point High Risk Alert",
          trigger: { source: "tool_run", eventType: "dew_point_high_risk" }
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Dew Point automation added.")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Disable"));
    await waitFor(() =>
      expect(mockUpdatePolicy).toHaveBeenCalledWith("policy-1", { enabled: false })
    );
    await waitFor(() => expect(screen.getByText("Automation disabled.")).toBeTruthy());

    fireEvent.press(screen.getByText("Test"));
    await waitFor(() =>
      expect(mockTestPolicy).toHaveBeenCalledWith("policy-1", {
        risk: "high",
        dewPointSpreadC: 1.2
      })
    );
    await waitFor(() => expect(screen.getByText("Dry-run completed.")).toBeTruthy());

    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => expect(mockDeletePolicy).toHaveBeenCalledWith("policy-1"));
  });
});
