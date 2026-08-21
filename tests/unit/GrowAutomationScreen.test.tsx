import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowAutomationScreen from "@/app/home/personal/(tabs)/grows/[growId]/automation";

const mockListPolicies = jest.fn();
const mockListEvents = jest.fn();
const mockCreatePolicy = jest.fn();
const mockUpdatePolicy = jest.fn();
const mockDeletePolicy = jest.fn();
const mockTestPolicy = jest.fn();
const mockListCommercialPolicies = jest.fn();
const mockListCommercialEvents = jest.fn();
const mockCreateCommercialPolicy = jest.fn();
const mockUpdateCommercialPolicy = jest.fn();
const mockDeleteCommercialPolicy = jest.fn();
const mockTestCommercialPolicy = jest.fn();

jest.mock("@/api/automation", () => ({
  listPersonalAutomationPolicies: (...args: any[]) => mockListPolicies(...args),
  listPersonalAutomationEvents: (...args: any[]) => mockListEvents(...args),
  createPersonalAutomationPolicy: (...args: any[]) => mockCreatePolicy(...args),
  updatePersonalAutomationPolicy: (...args: any[]) => mockUpdatePolicy(...args),
  deletePersonalAutomationPolicy: (...args: any[]) => mockDeletePolicy(...args),
  testPersonalAutomationPolicy: (...args: any[]) => mockTestPolicy(...args),
  listCommercialAutomationPolicies: (...args: any[]) =>
    mockListCommercialPolicies(...args),
  listCommercialAutomationEvents: (...args: any[]) => mockListCommercialEvents(...args),
  createCommercialAutomationPolicy: (...args: any[]) =>
    mockCreateCommercialPolicy(...args),
  updateCommercialAutomationPolicy: (...args: any[]) =>
    mockUpdateCommercialPolicy(...args),
  deleteCommercialAutomationPolicy: (...args: any[]) =>
    mockDeleteCommercialPolicy(...args),
  testCommercialAutomationPolicy: (...args: any[]) => mockTestCommercialPolicy(...args)
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
  return function MockGrowWorkspaceNav() {
    return <View testID="grow-workspace-nav" />;
  };
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
    mockListEvents.mockResolvedValue([
      {
        id: "event-1",
        source: "tool_run",
        eventType: "dew_point_high_risk",
        payload: { risk: "high" },
        processed: true,
        matchedPolicyIds: ["policy-1"],
        errors: [],
        createdAt: "2026-06-30T12:00:00.000Z"
      }
    ]);
    mockCreatePolicy.mockResolvedValue({ id: "policy-created" });
    mockUpdatePolicy.mockResolvedValue({ id: "policy-1", enabled: false });
    mockDeletePolicy.mockResolvedValue({ success: true });
    mockTestPolicy.mockResolvedValue({ result: { matchedPolicyCount: 1 } });
    mockListCommercialPolicies.mockResolvedValue([]);
    mockListCommercialEvents.mockResolvedValue([]);
    mockCreateCommercialPolicy.mockResolvedValue({ id: "commercial-policy-created" });
    mockUpdateCommercialPolicy.mockResolvedValue({
      id: "commercial-policy-1",
      enabled: false
    });
    mockDeleteCommercialPolicy.mockResolvedValue({ success: true });
    mockTestCommercialPolicy.mockResolvedValue({
      result: { matchedPolicyCount: 1 }
    });
  });

  it("manages grow-scoped automation policies from the grow workspace", async () => {
    const screen = render(<GrowAutomationScreen />);

    await waitFor(() =>
      expect(mockListPolicies).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    expect(mockListEvents).toHaveBeenCalledWith({ growId: "grow-1" });

    expect(screen.getByText("Dew Point High Risk Alert")).toBeTruthy();
    expect(screen.getByText("Trigger: tool run:dew point high risk")).toBeTruthy();
    expect(screen.getByText("Actions: create task")).toBeTruthy();
    expect(screen.getByText("Triggered: 2")).toBeTruthy();
    expect(screen.getByText("Recent Automation Events")).toBeTruthy();
    expect(screen.getByText("tool run:dew point high risk")).toBeTruthy();
    expect(screen.getByText("Processed | matched 1 policy(s)")).toBeTruthy();
    expect(screen.getByText("Risk: high")).toBeTruthy();

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

  it("uses only Commercial policy and event operations in a Commercial grow", async () => {
    mockListCommercialPolicies.mockResolvedValue([
      {
        id: "commercial-policy-1",
        name: "Commercial Dew Point Alert",
        enabled: true,
        trigger: { source: "tool_run", eventType: "dew_point_high_risk" },
        actions: [{ type: "create_task" }],
        triggerCount: 1
      }
    ]);

    const screen = render(<GrowAutomationScreen workspace="commercial" />);

    await waitFor(() =>
      expect(mockListCommercialPolicies).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    expect(mockListCommercialEvents).toHaveBeenCalledWith({ growId: "grow-1" });
    expect(mockListPolicies).not.toHaveBeenCalled();
    expect(mockListEvents).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Add Dew Point Alert"));
    await waitFor(() =>
      expect(mockCreateCommercialPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          scope: "grow",
          name: "Dew Point High Risk Alert"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Dew Point automation added.")).toBeTruthy()
    );
    expect(mockCreatePolicy).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Disable"));
    await waitFor(() =>
      expect(mockUpdateCommercialPolicy).toHaveBeenCalledWith("commercial-policy-1", {
        enabled: false
      })
    );
    await waitFor(() => expect(screen.getByText("Automation disabled.")).toBeTruthy());
    expect(mockUpdatePolicy).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Test"));
    await waitFor(() =>
      expect(mockTestCommercialPolicy).toHaveBeenCalledWith("commercial-policy-1", {
        growId: "grow-1",
        payload: { risk: "high", dewPointSpreadC: 1.2 }
      })
    );
    await waitFor(() => expect(screen.getByText("Dry-run completed.")).toBeTruthy());
    expect(mockTestPolicy).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() =>
      expect(mockDeleteCommercialPolicy).toHaveBeenCalledWith("commercial-policy-1")
    );
    expect(mockDeletePolicy).not.toHaveBeenCalled();
  });
});
