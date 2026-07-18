import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import PersonalHomeRoute from "@/app/home/personal/(tabs)";

const mockListPersonalGrows = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockListToolRuns = jest.fn();
const mockGetDiagnosisHistory = jest.fn();
const mockListTelemetrySources = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
  }
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { email: "grower@example.com" } })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    GROWS_PERSONAL_WRITE: "grows_personal_write",
    LOGS_PERSONAL_WRITE: "logs_personal_write",
    TASK_REMINDERS: "task_reminders"
  },
  useEntitlements: () => ({
    plan: "pro",
    can: () => true
  })
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, style }: any) => React.createElement(View, { style }, children);
});

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

jest.mock("@/api/logs", () => ({
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

jest.mock("@/api/tasks", () => ({
  listPersonalTasks: (...args: any[]) => mockListPersonalTasks(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args)
}));

jest.mock("@/api/diagnose", () => ({
  getDiagnosisHistory: (...args: any[]) => mockGetDiagnosisHistory(...args)
}));

jest.mock("@/api/telemetry", () => ({
  listTelemetrySources: (...args: any[]) => mockListTelemetrySources(...args)
}));

describe("PersonalHomeRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Blue Dream Run",
        status: "flower",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-07T00:00:00Z"
      }
    ]);
    mockListPersonalLogs.mockResolvedValue([
      {
        id: "log-1",
        growId: "grow-1",
        title: "Watered and checked canopy",
        date: "2026-07-07T08:00:00Z",
        photos: ["canopy.jpg"]
      }
    ]);
    mockListPersonalPlants.mockResolvedValue([
      { id: "plant-1", growId: "grow-1", name: "BD #1" },
      { id: "plant-2", growId: "grow-1", name: "BD #2" }
    ]);
    mockListPersonalTasks.mockResolvedValue([
      {
        id: "task-1",
        growId: "grow-1",
        title: "Check VPD after lights on",
        dueDate: new Date().toISOString(),
        priority: "high",
        sourceType: "sensor_alert",
        completed: false
      }
    ]);
    mockListToolRuns.mockResolvedValue([
      {
        id: "tool-1",
        growId: "grow-1",
        toolType: "VPD",
        createdAt: "2026-07-07T09:00:00Z"
      }
    ]);
    mockGetDiagnosisHistory.mockResolvedValue({
      diagnoses: [
        {
          id: "diagnosis-1",
          growId: "grow-1",
          issueSummary: "Leaf edge stress",
          createdAt: "2026-07-07T10:00:00Z"
        }
      ]
    });
    mockListTelemetrySources.mockResolvedValue([
      {
        id: "telemetry-1",
        name: "Pulse tent sensor",
        type: "Pulse",
        isActive: true,
        updatedAt: new Date().toISOString()
      }
    ]);
  });

  it("renders the personal command surface with grow, task, and tool context", async () => {
    const screen = render(<PersonalHomeRoute />);

    await waitFor(() => expect(screen.getByText("Blue Dream Run")).toBeTruthy());

    expect(screen.getByText("Personal workspace")).toBeTruthy();
    expect(screen.getByText("Personal command center")).toBeTruthy();
    expect(screen.getByText("Stage")).toBeTruthy();
    expect(screen.getAllByText("Open tasks").length).toBeGreaterThan(0);
    expect(screen.getByText("Plants")).toBeTruthy();
    expect(screen.getByText("Journal entries")).toBeTruthy();
    expect(screen.getByText("Latest tool")).toBeTruthy();
    expect(screen.getByText("VPD")).toBeTruthy();
    expect(screen.getByText("Check VPD after lights on")).toBeTruthy();
    expect(screen.getByText("Run Tool")).toBeTruthy();
    expect(screen.getByText("Diagnose")).toBeTruthy();
    expect(screen.getByText("Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Discover Storefronts")).toBeTruthy();
    expect(screen.getByText("Commercial Feed")).toBeTruthy();
    expect(screen.getByText("Discovery Directory")).toBeTruthy();
    expect(screen.queryByText("Community")).toBeNull();
  });
});
