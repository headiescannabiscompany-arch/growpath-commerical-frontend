import React from "react";
import { Alert, Platform } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTeamTab from "@/app/home/facility/(tabs)/team";

const mockInvite = jest.fn();
const mockCan = jest.fn();
const mockListTeamMembers = jest.fn();
const mockRemoveTeamMember = jest.fn();
const mockUpdateTeamMemberRole = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
let mockFacilityRole = "OWNER";
let mockFacilityId = "facility-1";
let mockAuth = { user: { id: "owner-1" }, token: "session-1" };
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacilityId })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TEAM_INVITE: "TEAM_INVITE" },
  useEntitlements: () => ({ facilityRole: mockFacilityRole, can: mockCan })
}));
jest.mock("@/api/team", () => ({
  listTeamMembers: (...args: any[]) => mockListTeamMembers(...args),
  inviteTeamMember: (...args: any[]) => mockInvite(...args),
  removeTeamMember: (...args: any[]) => mockRemoveTeamMember(...args),
  updateTeamMemberRole: (...args: any[]) => mockUpdateTeamMemberRole(...args)
}));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack ? React.createElement(Text, null, `Back ${backFallbackHref}`) : null,
        children
      )
  };
});

describe("FacilityTeamTab", () => {
  beforeEach(() => {
    mockFacilityRole = "OWNER";
    mockFacilityId = "facility-1";
    mockAuth = { user: { id: "owner-1" }, token: "session-1" };
    mockCan.mockImplementation((capability) => capability === "TASKS_WRITE");
    mockInvite.mockReset();
    mockListTeamMembers.mockReset();
    mockListTeamMembers.mockResolvedValue([]);
    mockRemoveTeamMember.mockReset();
    mockRemoveTeamMember.mockResolvedValue({ ok: true });
    mockUpdateTeamMemberRole.mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  it("lets an owner enter an invite email and provides a dashboard back route", async () => {
    mockInvite.mockResolvedValue({});
    const screen = render(<FacilityTeamTab />);

    expect(screen.getByLabelText("Loading facility team").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });

    await screen.findByText("No members yet");
    expect(screen.getByText("Back /home/facility/dashboard")).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText("Invite team member email"),
      "staff@example.com"
    );
    expect(screen.getByDisplayValue("staff@example.com")).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Invite as staff" }).props.accessibilityState
    ).toMatchObject({ checked: true });
    fireEvent.press(screen.getByRole("radio", { name: "Invite as manager" }));
    expect(
      screen.getByRole("radio", { name: "Invite as manager" }).props.accessibilityState
    ).toMatchObject({ checked: true });
    fireEvent.press(screen.getByLabelText("Send team invite"));

    await waitFor(() =>
      expect(mockInvite).toHaveBeenCalledWith("facility-1", {
        email: "staff@example.com",
        role: "MANAGER"
      })
    );
  });

  it("shows managers a clear read-and-assign surface without owner invite controls", async () => {
    mockFacilityRole = "MANAGER";
    mockListTeamMembers.mockResolvedValue([
      { userId: "staff-1", name: "Alex Grower", role: "STAFF" }
    ]);

    const screen = render(<FacilityTeamTab />);

    await waitFor(() => expect(screen.getByText("Team access")).toBeTruthy());
    expect(
      screen.getByText(
        "You can view the team and assign work. Only the facility owner can invite members or change access roles."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Invite team member email")).toBeNull();
    expect(screen.queryByLabelText("Send team invite")).toBeNull();
    expect(screen.getByLabelText("Assign task to Alex Grower")).toBeTruthy();
  });

  it("keeps the Viewer team list read-only without unusable assignment controls", async () => {
    mockFacilityRole = "VIEWER";
    mockCan.mockReturnValue(false);
    mockListTeamMembers.mockResolvedValue([
      { userId: "staff-1", name: "Alex Grower", role: "STAFF" }
    ]);

    const screen = render(<FacilityTeamTab />);

    await waitFor(() => expect(screen.getByText("Alex Grower")).toBeTruthy());
    expect(
      screen.getByRole("header", { name: "Facility Team" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByRole("header", { name: "Team access" }).props["aria-level"]).toBe(
      2
    );
    expect(screen.getByRole("header", { name: "Team members" }).props["aria-level"]).toBe(
      2
    );
    expect(screen.getByRole("header", { name: "Alex Grower" }).props["aria-level"]).toBe(
      3
    );
    expect(
      screen.getByText(
        "You can view the team. Only owners and managers can assign work, and only the facility owner can manage access roles."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Assign task to Alex Grower")).toBeNull();
    expect(screen.queryByLabelText("Invite team member email")).toBeNull();
  });

  it("uses a working web confirmation before removing the exact named member", async () => {
    const platform = Platform;
    const originalPlatform = platform.OS;
    const originalWindow = (globalThis as any).window;
    const confirm = jest.fn(() => true);
    let screen: ReturnType<typeof render> | undefined;

    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "web"
    });
    (globalThis as any).window = { ...(originalWindow || {}), confirm };
    mockListTeamMembers.mockResolvedValue([
      {
        userId: "staff-1",
        name: "Alex Grower",
        email: "alex@example.com",
        role: "STAFF"
      }
    ]);

    try {
      screen = render(<FacilityTeamTab />);

      await waitFor(() => expect(screen?.getByText("Alex Grower")).toBeTruthy());
      mockListTeamMembers.mockResolvedValue([]);
      fireEvent.press(
        screen!.getByLabelText(
          "Remove Alex Grower - alex@example.com - staff from facility"
        )
      );

      expect(confirm).toHaveBeenCalledWith(
        expect.stringContaining("Alex Grower - alex@example.com - staff")
      );
      await waitFor(() =>
        expect(mockRemoveTeamMember).toHaveBeenCalledWith("facility-1", "staff-1")
      );
      await waitFor(() =>
        expect(
          screen?.getByText(
            "Alex Grower - alex@example.com - staff no longer has access to this facility."
          )
        ).toBeTruthy()
      );
    } finally {
      screen?.unmount();
      Object.defineProperty(platform, "OS", {
        configurable: true,
        value: originalPlatform
      });
      if (originalWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = originalWindow;
    }
  });

  it("prevents duplicate invites while email delivery is pending", async () => {
    let finishInvite: ((value: any) => void) | undefined;
    mockInvite.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishInvite = resolve;
        })
    );
    const screen = render(<FacilityTeamTab />);
    await screen.findByText("No members yet");
    fireEvent.changeText(
      screen.getByLabelText("Invite team member email"),
      "viewer@example.com"
    );
    const send = screen.getByLabelText("Send team invite");

    fireEvent.press(send);
    fireEvent.press(send);

    expect(mockInvite).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Send team invite").props.accessibilityState
    ).toMatchObject({ busy: true, disabled: true });
    finishInvite?.({ emailDelivery: { sent: true } });
    const feedback = await screen.findByText(
      "Invite emailed to viewer@example.com as staff."
    );
    expect(feedback.props.accessibilityLiveRegion).toBe("polite");
  });

  it("exposes member access roles as a selected radio group", async () => {
    mockListTeamMembers.mockResolvedValue([
      { userId: "staff-1", name: "Alex Grower", role: "STAFF" }
    ]);
    const screen = render(<FacilityTeamTab />);

    await waitFor(() => expect(screen.getByText("Alex Grower")).toBeTruthy());
    expect(
      screen.getByLabelText("Access role for Alex Grower").props.accessibilityRole
    ).toBe("radiogroup");
    expect(screen.getByLabelText("Change Alex Grower role to staff").props).toMatchObject(
      {
        accessibilityRole: "radio",
        accessibilityState: { checked: true, disabled: true }
      }
    );
    expect(
      screen.getByLabelText("Assign task to Alex Grower").props.accessibilityRole
    ).toBe("link");
  });

  it("does not claim zero members after a failed initial read and recovers without sending an invite", async () => {
    mockListTeamMembers.mockRejectedValueOnce(new Error("offline"));
    const screen = render(<FacilityTeamTab />);
    await screen.findByText("Team unavailable. Retry to load members.");
    expect(screen.getByText("Team count unavailable")).toBeTruthy();
    expect(screen.queryByText("No members yet")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Invite team member email"),
      "qa@example.com"
    );
    expect(
      screen.getByLabelText("Send team invite").props.accessibilityState.disabled
    ).toBe(true);
    mockListTeamMembers.mockResolvedValueOnce([
      { userId: "staff-1", name: "Alex", role: "STAFF" }
    ]);
    await act(async () =>
      fireEvent.press(screen.getByLabelText("Refresh facility team"))
    );
    expect(await screen.findByText("Alex")).toBeTruthy();
    expect(screen.getByDisplayValue("qa@example.com")).toBeTruthy();
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it("labels retained team after failed refresh and locks role, removal and assignment until Retry", async () => {
    mockListTeamMembers.mockResolvedValueOnce([
      { userId: "staff-1", name: "Alex", role: "STAFF" }
    ]);
    const screen = render(<FacilityTeamTab />);
    await screen.findByText("Alex");
    mockListTeamMembers.mockRejectedValueOnce(new Error("offline"));
    await act(async () =>
      fireEvent.press(screen.getByLabelText("Refresh facility team"))
    );
    await screen.findByText("1 member (previously loaded)");
    expect(
      screen.getByLabelText("Assign task to Alex").props.accessibilityState.disabled
    ).toBe(true);
    expect(
      screen.getByLabelText("Change Alex role to manager").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(
      screen.getByLabelText("Remove Alex - staff from facility").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(mockUpdateTeamMemberRole).not.toHaveBeenCalled();
    expect(mockRemoveTeamMember).not.toHaveBeenCalled();
  });

  it.each(["account", "session", "facility", "role"])(
    "discards old members and invite drafts after %s changes",
    async (kind) => {
      mockListTeamMembers.mockResolvedValueOnce([
        { userId: "staff-1", name: "Old member", role: "STAFF" }
      ]);
      const screen = render(<FacilityTeamTab />);
      await screen.findByText("Old member");
      fireEvent.changeText(
        screen.getByLabelText("Invite team member email"),
        "old@example.com"
      );
      if (kind === "account") mockAuth = { ...mockAuth, user: { id: "owner-2" } };
      if (kind === "session") mockAuth = { ...mockAuth, token: "session-2" };
      if (kind === "facility") mockFacilityId = "facility-2";
      if (kind === "role") mockFacilityRole = "VIEWER";
      screen.rerender(<FacilityTeamTab />);
      await screen.findByText("No members yet");
      expect(screen.queryByText("Old member")).toBeNull();
      expect(screen.queryByDisplayValue("old@example.com")).toBeNull();
    }
  );

  it("ignores an old invite completion after the selected Facility changes", async () => {
    let finish!: (value: any) => void;
    mockInvite.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<FacilityTeamTab />);
    await screen.findByText("No members yet");
    fireEvent.changeText(
      screen.getByLabelText("Invite team member email"),
      "old@example.com"
    );
    fireEvent.press(screen.getByLabelText("Send team invite"));
    mockFacilityId = "facility-2";
    screen.rerender(<FacilityTeamTab />);
    await screen.findByText("No members yet");
    await act(async () => finish({ emailDelivery: { sent: true } }));
    expect(screen.queryByText(/Invite emailed/)).toBeNull();
    expect(mockListTeamMembers).toHaveBeenCalledTimes(2);
  });

  it("keeps a confirmed role change separate from failed canonical refresh", async () => {
    mockListTeamMembers.mockResolvedValueOnce([
      { userId: "staff-1", name: "Alex", role: "STAFF" }
    ]);
    mockUpdateTeamMemberRole.mockResolvedValue({});
    const screen = render(<FacilityTeamTab />);
    await screen.findByText("Alex");
    mockListTeamMembers.mockRejectedValueOnce(new Error("offline"));
    await act(async () =>
      fireEvent.press(screen.getByLabelText("Change Alex role to manager"))
    );
    await screen.findByText("Role change saved. Refresh confirms the current team.");
    expect(screen.getByText("1 member (previously loaded)")).toBeTruthy();
    expect(mockUpdateTeamMemberRole).toHaveBeenCalledTimes(1);
  });

  it("serializes different members' role changes and refresh", async () => {
    mockListTeamMembers.mockResolvedValue([
      { userId: "staff-1", name: "Alex", role: "STAFF" },
      { userId: "staff-2", name: "Sam", role: "STAFF" }
    ]);
    let finish!: (value: any) => void;
    mockUpdateTeamMemberRole.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<FacilityTeamTab />);
    await screen.findByText("Alex");
    fireEvent.press(screen.getByLabelText("Change Alex role to manager"));
    fireEvent.press(screen.getByLabelText("Change Sam role to manager"));
    fireEvent.press(screen.getByLabelText("Refresh facility team"));
    expect(mockUpdateTeamMemberRole).toHaveBeenCalledTimes(1);
    expect(mockListTeamMembers).toHaveBeenCalledTimes(1);
    await act(async () => finish({}));
    expect(mockListTeamMembers).toHaveBeenCalledTimes(2);
  });

  it("ignores a pending old-Facility team read", async () => {
    let finish!: (value: any) => void;
    mockListTeamMembers.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<FacilityTeamTab />);
    mockFacilityId = "facility-2";
    screen.rerender(<FacilityTeamTab />);
    await screen.findByText("No members yet");
    await act(async () => finish([{ userId: "old", name: "Old member", role: "STAFF" }]));
    expect(screen.queryByText("Old member")).toBeNull();
    expect(screen.getByText("0 members")).toBeTruthy();
  });

  it.each(["role", "session"])(
    "invalidates a delayed removal confirmation after a %s change",
    async (boundary) => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
      const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      mockListTeamMembers.mockResolvedValue([
        { userId: "staff-1", name: "Alex", role: "STAFF" }
      ]);
      const screen = render(<FacilityTeamTab />);
      try {
        await screen.findByText("Alex");
        fireEvent.press(screen.getByLabelText("Remove Alex - staff from facility"));
        const confirm = alert.mock.calls[0][2]?.find(
          (button) => button.text === "Remove"
        )?.onPress;
        expect(confirm).toBeDefined();
        if (boundary === "role") {
          mockFacilityRole = "VIEWER";
          mockCan.mockReturnValue(false);
        } else {
          mockAuth = { user: { id: "owner-1" }, token: "session-2" };
        }
        screen.rerender(<FacilityTeamTab />);
        await screen.findByText("Alex");
        await act(async () => confirm?.());
        expect(mockRemoveTeamMember).not.toHaveBeenCalled();
        if (boundary === "role") {
          expect(screen.queryByLabelText("Send team invite")).toBeNull();
          expect(screen.queryByLabelText("Assign task to Alex")).toBeNull();
          expect(screen.queryByLabelText("Remove Alex - staff from facility")).toBeNull();
        }
      } finally {
        screen.unmount();
        alert.mockRestore();
        Object.defineProperty(Platform, "OS", {
          configurable: true,
          value: originalPlatform
        });
      }
    }
  );

  it("discards an invitation draft and late success when Owner access becomes Viewer", async () => {
    let finish!: (value: any) => void;
    mockInvite.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<FacilityTeamTab />);
    await screen.findByText("No members yet");
    fireEvent.changeText(
      screen.getByLabelText("Invite team member email"),
      "synthetic@qa.invalid"
    );
    fireEvent.press(screen.getByLabelText("Send team invite"));
    expect(mockInvite).toHaveBeenCalledTimes(1);
    mockFacilityRole = "VIEWER";
    mockCan.mockReturnValue(false);
    screen.rerender(<FacilityTeamTab />);
    await screen.findByText("No members yet");
    const readsAfterRoleChange = mockListTeamMembers.mock.calls.length;
    await act(async () => finish({ emailDelivery: { sent: true } }));
    expect(screen.queryByText(/Invite emailed/)).toBeNull();
    expect(screen.queryByDisplayValue("synthetic@qa.invalid")).toBeNull();
    expect(screen.queryByLabelText("Send team invite")).toBeNull();
    expect(mockListTeamMembers).toHaveBeenCalledTimes(readsAfterRoleChange);
    expect(mockInvite).toHaveBeenCalledTimes(1);
  });

  it("discards a previous session's pending roster after token refresh", async () => {
    let finish!: (value: any) => void;
    mockListTeamMembers.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<FacilityTeamTab />);
    mockAuth = { user: { id: "owner-1" }, token: "session-2" };
    screen.rerender(<FacilityTeamTab />);
    await screen.findByText("No members yet");
    await act(async () =>
      finish([{ userId: "old", name: "Earlier session member", role: "STAFF" }])
    );
    expect(screen.queryByText("Earlier session member")).toBeNull();
    expect(screen.getByText("0 members")).toBeTruthy();
    expect(mockInvite).not.toHaveBeenCalled();
    expect(mockUpdateTeamMemberRole).not.toHaveBeenCalled();
    expect(mockRemoveTeamMember).not.toHaveBeenCalled();
  });

  it("invalidates a delayed native removal confirmation when the team refreshes", async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockListTeamMembers.mockResolvedValue([
      { userId: "staff-1", name: "Alex", role: "STAFF" }
    ]);
    const screen = render(<FacilityTeamTab />);
    try {
      await screen.findByText("Alex");
      fireEvent.press(screen.getByLabelText("Remove Alex - staff from facility"));
      const confirm = alert.mock.calls[0][2]?.find(
        (button) => button.text === "Remove"
      )?.onPress;
      expect(confirm).toBeDefined();
      await act(async () =>
        fireEvent.press(screen.getByLabelText("Refresh facility team"))
      );
      await act(async () => confirm?.());
      expect(mockRemoveTeamMember).not.toHaveBeenCalled();
    } finally {
      screen.unmount();
      alert.mockRestore();
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: originalPlatform
      });
    }
  });
});
