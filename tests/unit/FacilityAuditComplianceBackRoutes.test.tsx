import React from "react";
import { render } from "@testing-library/react-native";

import FacilityAuditLogDetailRoute from "@/app/home/facility/audit-logs/[id]";
import FacilityAuditLogEntityRoute from "@/app/home/facility/audit-logs/[entity]/[entityId]";
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
    expect(screen.getByText("Room update")).toBeTruthy();
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
});
