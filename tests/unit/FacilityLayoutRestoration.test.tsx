import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import FacilityLayout, { resolveFacilitySelection } from "@/app/home/facility/_layout";

const mockGetFacilities = jest.fn();
const mockSelect = jest.fn();
const mockReplace = jest.fn();
let mockPath = "/home/facility/team";
let mockSelectedId: string | null = null;
let mockEnt: any;
let mockAuth: any;
jest.mock("@/api/facilities", () => ({ getFacilities: () => mockGetFacilities() }));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({ useEntitlements: () => mockEnt }));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockSelectedId, selectFacility: mockSelect })
}));
jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    usePathname: () => mockPath,
    useRouter: () => ({ replace: mockReplace }),
    Stack: () => React.createElement(Text, null, "Facility child routes"),
    Redirect: ({ href }: any) => React.createElement(Text, null, `Redirect ${href}`)
  };
});
const row = { id: "db-1", canonicalFacilityId: "public:facility-1", name: "QA Facility" };
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
beforeEach(() => {
  jest.clearAllMocks();
  mockGetFacilities.mockReset().mockResolvedValue([row]);
  mockEnt = {
    ready: true,
    mode: "facility",
    facilityId: row.canonicalFacilityId,
    facilityRole: "OWNER"
  };
  mockAuth = { user: { id: "owner-1" }, token: "session-1" };
  mockPath = "/home/facility/team";
  mockSelectedId = null;
});
describe("Facility direct-route restoration", () => {
  it.each(["OWNER", "MANAGER", "STAFF", "VIEWER"])(
    "restores the exact server row for %s without using the public alias as an operational ID",
    async (role) => {
      mockEnt.facilityRole = role;
      const screen = render(<FacilityLayout />);
      expect(screen.queryByText("Facility child routes")).toBeNull();
      await waitFor(() => expect(mockSelect).toHaveBeenCalledWith(row));
      expect(mockGetFacilities).toHaveBeenCalledTimes(1);
      mockSelectedId = row.id;
      screen.rerender(<FacilityLayout />);
      expect(screen.getByText("Facility child routes")).toBeTruthy();
      expect(mockGetFacilities).toHaveBeenCalledTimes(1);
    }
  );
  it("accepts an exact database identity and preserves its readable server metadata", async () => {
    mockEnt.facilityId = row.id;
    render(<FacilityLayout />);
    await waitFor(() => expect(mockSelect).toHaveBeenCalledWith(row));
  });
  it.each(
    [
      [],
      [{ ...row, canonicalFacilityId: "other" }],
      [row, { ...row, id: "db-2" }],
      [{ ...row, id: "[object Object]" }],
      [{ id: "different", name: row.canonicalFacilityId }]
    ].map((rows) => [rows])
  )("does not choose an absent, ambiguous, malformed or name-only match: %j", (rows) => {
    expect(resolveFacilitySelection(rows as any, row.canonicalFacilityId)).toBeNull();
  });
  it("offers one read-only Retry after failure instead of fabricating selection", async () => {
    mockGetFacilities.mockRejectedValueOnce(new Error("offline"));
    const screen = render(<FacilityLayout />);
    const retry = await screen.findByLabelText("Retry Facility selection");
    expect(mockSelect).not.toHaveBeenCalled();
    const next = deferred();
    mockGetFacilities.mockReturnValueOnce(next.promise);
    await act(async () => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(mockGetFacilities).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve([row]));
    expect(mockSelect).toHaveBeenCalledWith(row);
  });
  it("keeps selection reachable when no match is available", async () => {
    mockGetFacilities.mockResolvedValue([]);
    const screen = render(<FacilityLayout />);
    fireEvent.press(await screen.findByLabelText("Select Facility"));
    expect(mockReplace).toHaveBeenCalledWith("/home/facility/select");
    mockPath = "/home/facility/select";
    screen.rerender(<FacilityLayout />);
    expect(screen.getByText("Facility child routes")).toBeTruthy();
    expect(mockSelect).not.toHaveBeenCalled();
  });
  it.each(["account", "session", "facility", "role"])(
    "ignores late restoration after a %s change",
    async (change) => {
      const old = deferred();
      mockGetFacilities.mockReturnValueOnce(old.promise);
      const screen = render(<FacilityLayout />);
      if (change === "account") mockAuth = { ...mockAuth, user: { id: "owner-2" } };
      if (change === "session") mockAuth = { ...mockAuth, token: "session-2" };
      if (change === "facility")
        mockEnt = { ...mockEnt, facilityId: "public:facility-2" };
      if (change === "role") mockEnt = { ...mockEnt, facilityRole: "VIEWER" };
      const next = { ...row, id: "db-2", canonicalFacilityId: mockEnt.facilityId };
      mockGetFacilities.mockResolvedValueOnce([next]);
      screen.rerender(<FacilityLayout />);
      await waitFor(() => expect(mockSelect).toHaveBeenCalledWith(next));
      await act(async () => old.resolve([row]));
      expect(mockSelect).toHaveBeenCalledTimes(1);
    }
  );
  it("does not select after unmount", async () => {
    const old = deferred();
    mockGetFacilities.mockReturnValueOnce(old.promise);
    const screen = render(<FacilityLayout />);
    screen.unmount();
    await act(async () => old.resolve([row]));
    expect(mockSelect).not.toHaveBeenCalled();
  });
  it("preserves an explicitly selected Facility and skips restoration on Select", () => {
    mockSelectedId = "explicit-db";
    const screen = render(<FacilityLayout />);
    expect(screen.getByText("Facility child routes")).toBeTruthy();
    mockSelectedId = null;
    mockPath = "/home/facility/select/";
    screen.rerender(<FacilityLayout />);
    expect(screen.getByText("Facility child routes")).toBeTruthy();
    expect(mockGetFacilities).not.toHaveBeenCalled();
  });
  it("waits for entitlements and preserves non-Facility redirects", () => {
    mockEnt.ready = false;
    const screen = render(<FacilityLayout />);
    expect(mockGetFacilities).not.toHaveBeenCalled();
    mockEnt = { ...mockEnt, ready: true, mode: "commercial" };
    screen.rerender(<FacilityLayout />);
    expect(screen.getByText("Redirect /home/commercial")).toBeTruthy();
    expect(mockGetFacilities).not.toHaveBeenCalled();
  });
});
