import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import {
  useBusinessDeskWorkspaceTimeZone,
  WorkspaceTimeZoneControl
} from "@/features/businessDesk/WorkspaceTimeZoneControl";

const mockGetWorkspaceTimeZone = jest.fn();
const mockPatchWorkspaceTimeZone = jest.fn();
let mockOperationKeyCalls = 0;

jest.mock("@/api/businessDesk", () => ({
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
  getBusinessDeskWorkspaceTimeZone: (...args: any[]) => mockGetWorkspaceTimeZone(...args),
  normalizeIanaTimeZone: (value: unknown) => {
    const candidate = typeof value === "string" ? value.trim() : "";
    if (!candidate) return null;
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: candidate }).resolvedOptions()
        .timeZone;
    } catch {
      return null;
    }
  },
  patchBusinessDeskWorkspaceTimeZone: (...args: any[]) =>
    mockPatchWorkspaceTimeZone(...args)
}));

jest.mock("@/features/businessDesk/recordWorkflow", () => ({
  newBusinessDeskOperationKey: () => {
    mockOperationKeyCalls += 1;
    return "workspace-time-zone-fixed-key";
  }
}));

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, subtitle, children }: any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle),
      children
    );
});

const workspace = {
  workspaceType: "facility" as const,
  facilityId: "facility-2"
};

function configured(timeZone = "America/New_York", version = 5) {
  return {
    configured: true as const,
    workspaceType: "facility" as const,
    workspaceId: "facility-2",
    timeZone,
    version,
    selectedByUserId: "owner-1",
    selectedByRole: "OWNER",
    selectedAt: "2026-08-22T12:00:00.000Z"
  };
}

function Harness({ canConfigure }: { canConfigure: boolean }) {
  const state = useBusinessDeskWorkspaceTimeZone(workspace);
  return (
    <WorkspaceTimeZoneControl
      state={state}
      workspaceLabel="Facility"
      canConfigure={canConfigure}
    />
  );
}

describe("WorkspaceTimeZoneControl", () => {
  beforeEach(() => {
    mockGetWorkspaceTimeZone.mockReset().mockResolvedValue(configured());
    mockPatchWorkspaceTimeZone.mockReset();
    mockOperationKeyCalls = 0;
  });

  it("allows an owner to retry an unchanged CAS request with the same idempotency key", async () => {
    mockPatchWorkspaceTimeZone
      .mockRejectedValueOnce(new Error("Temporary network failure"))
      .mockResolvedValueOnce(configured("America/Chicago", 6));
    const screen = render(<Harness canConfigure />);
    const input = await screen.findByLabelText("IANA workspace time zone");
    fireEvent.changeText(input, "America/Chicago");
    fireEvent.press(screen.getByLabelText("Save workspace time zone"));
    await screen.findByText("Temporary network failure");
    fireEvent.press(screen.getByLabelText("Save workspace time zone"));

    await screen.findByText(/Facility time zone saved as America\/Chicago, version 6/i);
    expect(mockPatchWorkspaceTimeZone).toHaveBeenCalledTimes(2);
    expect(mockPatchWorkspaceTimeZone.mock.calls[0][1]).toEqual({
      timeZone: "America/Chicago",
      expectedVersion: 5,
      idempotencyKey: "workspace-time-zone-fixed-key"
    });
    expect(mockPatchWorkspaceTimeZone.mock.calls[1][1]).toEqual(
      mockPatchWorkspaceTimeZone.mock.calls[0][1]
    );
    expect(mockOperationKeyCalls).toBe(1);
  });

  it("requires an authoritative reload after a CAS conflict", async () => {
    const conflict = Object.assign(new Error("Workspace setting version conflict."), {
      code: "BUSINESS_DESK_WORKSPACE_SETTINGS_VERSION_CONFLICT",
      status: 409
    });
    mockGetWorkspaceTimeZone
      .mockResolvedValueOnce(configured())
      .mockResolvedValueOnce(configured("America/Denver", 6));
    mockPatchWorkspaceTimeZone.mockRejectedValue(conflict);
    const screen = render(<Harness canConfigure />);
    fireEvent.changeText(
      await screen.findByLabelText("IANA workspace time zone"),
      "America/Chicago"
    );
    fireEvent.press(screen.getByLabelText("Save workspace time zone"));

    await screen.findByText(/setting or your access changed/i);
    expect(screen.queryByLabelText("Save workspace time zone")).toBeNull();
    fireEvent.press(screen.getByLabelText("Reload authoritative workspace time zone"));
    await screen.findByText(/Authoritative setting: America\/Denver · version 6/i);
    expect(screen.getByLabelText("IANA workspace time zone").props.value).toBe(
      "America/Denver"
    );
    expect(mockGetWorkspaceTimeZone).toHaveBeenCalledTimes(2);
  });

  it("fails closed when a would-be owner is forbidden after role drift", async () => {
    const forbidden = Object.assign(
      new Error("Only the current Facility owner can change this setting."),
      { code: "BUSINESS_DESK_TIME_ZONE_OWNER_REQUIRED", status: 403 }
    );
    mockPatchWorkspaceTimeZone.mockRejectedValue(forbidden);
    const screen = render(<Harness canConfigure />);
    fireEvent.changeText(
      await screen.findByLabelText("IANA workspace time zone"),
      "America/Chicago"
    );
    fireEvent.press(screen.getByLabelText("Save workspace time zone"));

    await screen.findByText(/Only the current Facility owner can change this setting/i);
    expect(
      screen.getByLabelText("Reload authoritative workspace time zone")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Save workspace time zone")).toBeNull();
  });

  it("never exposes configuration controls to a Facility Manager", async () => {
    const screen = render(<Harness canConfigure={false} />);
    await screen.findByText(/Authoritative setting: America\/New_York · version 5/i);
    expect(screen.queryByLabelText("IANA workspace time zone")).toBeNull();
    expect(screen.queryByLabelText("Save workspace time zone")).toBeNull();
    expect(
      screen.getByText(/Only the current Facility owner can change this setting/i)
    ).toBeTruthy();
    expect(mockPatchWorkspaceTimeZone).not.toHaveBeenCalled();
  });
});
