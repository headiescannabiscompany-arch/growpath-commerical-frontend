import React from "react";
import { render } from "@testing-library/react-native";

import FacilityAuditLogDetailRoute from "@/app/home/facility/audit-logs/[id]";
import FacilityAuditLogEntityRoute from "@/app/home/facility/audit-logs/[entity]/[entityId]";
import FacilityAuditLogsIndexRoute from "@/app/home/facility/audit-logs";
import FacilityComplianceAiDashboardRoute from "@/app/home/facility/compliance/ai4.dashboard";
import FacilityComplianceReportDetailRoute from "@/app/home/facility/compliance/report-detail";

const mockUseAuditLogs = jest.fn();
const mockUseFacilityReport = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Link: ({ children, href }: any) =>
      React.createElement(
        Text,
        { accessibilityLabel: `link-${JSON.stringify(href)}` },
        children
      ),
    useLocalSearchParams: () => mockParams
  };
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) =>
      React.createElement(
        View,
        { accessibilityLabel: `screen-${title}` },
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/hooks/useAuditLogs", () => ({
  useAuditLogs: (...args: any[]) => mockUseAuditLogs(...args)
}));

jest.mock("@/hooks/useFacilityReport", () => ({
  useFacilityReport: (...args: any[]) => mockUseFacilityReport(...args)
}));

describe("facility audit and compliance nested back behavior", () => {
  beforeEach(() => {
    mockParams = {};
    mockUseAuditLogs.mockReset();
    mockUseFacilityReport.mockReset();
    mockUseAuditLogs.mockReturnValue({
      logs: [
        {
          id: "audit-1",
          action: "Room update",
          details: "Flower Room 1 changed",
          entity: "room",
          entityId: "room-1"
        }
      ],
      isLoading: false,
      error: null
    });
    mockUseFacilityReport.mockReturnValue({
      data: { status: "ready", deviations: [] },
      isLoading: false,
      error: null
    });
  });

  it("uses the shared back fallback on audit log detail", () => {
    mockParams = { id: "audit-1" };

    const screen = render(<FacilityAuditLogDetailRoute />);

    expect(screen.getByText("Shared Back /home/facility/audit-logs")).toBeTruthy();
    expect(screen.getByText("Audit Log Detail")).toBeTruthy();
    expect(screen.getByText("View all for this entity")).toBeTruthy();
  });

  it("uses the shared back fallback on audit entity detail", () => {
    mockParams = { entity: "room", entityId: "room-1" };

    const screen = render(<FacilityAuditLogEntityRoute />);

    expect(screen.getByText("Shared Back /home/facility/audit-logs")).toBeTruthy();
    expect(screen.getByText("Audit Logs for Entity")).toBeTruthy();
    expect(screen.getByText("Room Update")).toBeTruthy();
    expect(screen.getByText("Room history")).toBeTruthy();
    expect(screen.queryByText("entityId: room-1")).toBeNull();
  });

  it("summarizes the primary audit list without raw JSON or identifier arrays", () => {
    mockUseAuditLogs.mockReturnValue({
      logs: [
        {
          id: "audit-reorder",
          action: "ROOMS_REORDERED",
          details: JSON.stringify({
            roomIds: [
              "6a563c662fb9f669d231a012",
              "6a563c652fb9f669d231a004",
              "6a563c642fb9f669d2319ff6"
            ]
          }),
          timestamp: "2026-07-22T19:00:00.000Z"
        },
        {
          id: "audit-task",
          action: "TASK_CREATED",
          details: JSON.stringify({ title: "QA room check", status: "OPEN" })
        }
      ],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refetch: jest.fn()
    });

    const screen = render(<FacilityAuditLogsIndexRoute />);

    expect(screen.getByText("Rooms Reordered")).toBeTruthy();
    expect(screen.getByText("3 rooms reordered.")).toBeTruthy();
    expect(screen.getByText("QA room check | Status: Open")).toBeTruthy();
    expect(screen.queryByText(/roomIds/)).toBeNull();
    expect(screen.queryByText(/6a563c662fb9f669d231a012/)).toBeNull();
    expect(screen.getAllByText("Open Detail")).toHaveLength(2);
  });

  it("uses the shared back fallback on compliance report detail", () => {
    mockParams = { id: "latest" };

    const screen = render(<FacilityComplianceReportDetailRoute />);

    expect(screen.getByText("Shared Back /home/facility/compliance")).toBeTruthy();
    expect(screen.getByText("Compliance Report Detail")).toBeTruthy();
    expect(screen.getByText("reportId: latest")).toBeTruthy();
  });

  it("uses the shared back fallback on compliance AI dashboard drill-in", () => {
    const screen = render(<FacilityComplianceAiDashboardRoute />);

    expect(screen.getByText("Shared Back /home/facility/compliance")).toBeTruthy();
    expect(screen.getByText("Compliance AI Dashboard")).toBeTruthy();
    expect(screen.getByText(/"status": "ready"/)).toBeTruthy();
  });

  it("keeps the shared back fallback while the compliance AI dashboard loads", () => {
    mockUseFacilityReport.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    });

    const screen = render(<FacilityComplianceAiDashboardRoute />);

    expect(screen.getByText("Shared Back /home/facility/compliance")).toBeTruthy();
    expect(screen.getByText("Loading AI dashboard...")).toBeTruthy();
  });
});
