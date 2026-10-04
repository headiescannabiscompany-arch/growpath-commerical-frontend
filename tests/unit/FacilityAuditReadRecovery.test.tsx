import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import FacilityAuditLogsIndexRoute from "@/features/facility/routes/FacilityAuditLogsIndexRoute";
import FacilityAuditLogDetailRoute from "@/app/home/facility/audit-logs/[id]";
import FacilityAuditLogEntityRoute from "@/app/home/facility/audit-logs/[entity]/[entityId]";
import { listAuditLogs } from "@/api/audit";

let mockFacility = "facility-1";
let mockAuth = { user: { id: "owner" }, token: "session" };
let mockRole = "OWNER";
let mockParams: Record<string, string> = {};
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockRole })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacility })
}));
jest.mock("@/api/audit", () => ({ listAuditLogs: jest.fn() }));
jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    useLocalSearchParams: () => mockParams,
    Link: ({ children }: any) => React.createElement(Text, null, children)
  };
});
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    ScreenBoundary: ({ children, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, backFallbackHref),
        children
      )
  };
});
const rows = [
  {
    id: "audit-1",
    action: "TASK_CREATED",
    details: "Synthetic recorded task",
    entity: "task",
    entityId: "task-1"
  }
];
const response = { success: true, data: rows } as any;
const pending = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
beforeEach(() => {
  jest.mocked(listAuditLogs).mockReset().mockResolvedValue(response);
  mockFacility = "facility-1";
  mockRole = "OWNER";
  mockAuth = { user: { id: "owner" }, token: "session" };
  mockParams = { id: "audit-1", entity: "task", entityId: "task-1" };
});
describe.each([
  ["list", FacilityAuditLogsIndexRoute],
  ["detail", FacilityAuditLogDetailRoute],
  ["entity", FacilityAuditLogEntityRoute]
] as const)("audit %s recovery", (_name, Route) => {
  it("offers Retry without a false missing or empty result", async () => {
    jest
      .mocked(listAuditLogs)
      .mockRejectedValueOnce(new Error("Synthetic network failure"));
    const screen = render(<Route />);
    await screen.findByText("Retry audit history");
    expect(screen.queryByText("No audit logs yet.")).toBeNull();
    expect(screen.queryByText("No matching audit logs.")).toBeNull();
    expect(screen.queryByText("Audit log not found.")).toBeNull();
    fireEvent.press(
      screen.getByRole("button", { name: "Refresh facility audit history" })
    );
    await screen.findByText("Synthetic recorded task");
    expect(listAuditLogs).toHaveBeenCalledTimes(2);
  });
  it("retains labeled history on refresh failure and recovers", async () => {
    const screen = render(<Route />);
    await screen.findByText("Synthetic recorded task");
    jest
      .mocked(listAuditLogs)
      .mockRejectedValueOnce(new Error("Synthetic refresh failure"));
    fireEvent.press(
      screen.getByRole("button", { name: "Refresh facility audit history" })
    );
    await screen.findByText("Retry audit history");
    expect(screen.getByText(/Previously loaded audit history shown/)).toBeTruthy();
    expect(screen.getByText("Synthetic recorded task")).toBeTruthy();
    await act(async () => {
      fireEvent.press(
        screen.getByRole("button", { name: "Refresh facility audit history" })
      );
    });
    expect(listAuditLogs).toHaveBeenCalledTimes(3);
    await waitFor(() =>
      expect(screen.queryByText(/Previously loaded audit history shown/)).toBeNull()
    );
  });
  it("serializes repeated refreshes", async () => {
    const screen = render(<Route />);
    await screen.findByText("Synthetic recorded task");
    const deferred = pending();
    jest.mocked(listAuditLogs).mockReturnValueOnce(deferred.promise);
    const button = screen.getByRole("button", { name: "Refresh facility audit history" });
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(listAuditLogs).toHaveBeenCalledTimes(2);
    await act(async () => deferred.resolve(response));
  });
  it.each(["account", "session", "facility", "role", "route"])(
    "discards old results across %s changes",
    async (change) => {
      const screen = render(<Route />);
      await screen.findByText("Synthetic recorded task");
      const old = pending();
      const next = pending();
      jest
        .mocked(listAuditLogs)
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(next.promise);
      fireEvent.press(
        screen.getByRole("button", { name: "Refresh facility audit history" })
      );
      if (change === "account") mockAuth = { ...mockAuth, user: { id: "other" } };
      if (change === "session") mockAuth = { ...mockAuth, token: "new-session" };
      if (change === "facility") mockFacility = "facility-2";
      if (change === "role") mockRole = "VIEWER";
      if (change === "route") {
        if (_name === "list") mockFacility = "facility-2";
        else mockParams = { id: "audit-2", entity: "room", entityId: "room-2" };
      }
      screen.rerender(<Route />);
      expect(screen.queryByText("Synthetic recorded task")).toBeNull();
      await act(async () => old.resolve(response));
      expect(screen.queryByText("Synthetic recorded task")).toBeNull();
      await act(async () => next.resolve({ success: true, data: [] }));
      expect(screen.queryByText("Synthetic recorded task")).toBeNull();
    }
  );
  it("does not load without a Facility", async () => {
    mockFacility = "";
    const screen = render(<Route />);
    expect(screen.getByText("Select a facility first.")).toBeTruthy();
    expect(listAuditLogs).not.toHaveBeenCalled();
  });
  it("ignores a late result after unmount", async () => {
    const deferred = pending();
    jest.mocked(listAuditLogs).mockReturnValueOnce(deferred.promise);
    const screen = render(<Route />);
    screen.unmount();
    await act(async () => deferred.resolve(response));
    expect(listAuditLogs).toHaveBeenCalledTimes(1);
  });
});
