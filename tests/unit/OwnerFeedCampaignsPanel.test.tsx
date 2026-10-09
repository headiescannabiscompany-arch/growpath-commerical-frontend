import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import OwnerFeedCampaignsPanel from "@/components/feed/OwnerFeedCampaignsPanel";
import type { CommercialFeedCampaign } from "@/api/commercialFeed";

const mockList = jest.fn();
const mockUnpublish = jest.fn();
const mockEvent = jest.fn();
let mockAuth: any;
let mockEnt: any;

jest.mock("@/api/commercialFeed", () => ({
  listOwnedFeedCampaigns: (...args: any[]) => mockList(...args),
  unpublishFeedCampaign: (...args: any[]) => mockUnpublish(...args),
  recordFeedCampaignEvent: (...args: any[]) => mockEvent(...args)
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({ useEntitlements: () => mockEnt }));

function campaign(
  overrides: Partial<CommercialFeedCampaign> = {}
): CommercialFeedCampaign {
  return {
    id: "campaign-1",
    type: "update",
    sourceType: "standard",
    title: "Soil workshop",
    body: "A saved campaign",
    tags: [],
    growInterests: [],
    status: "active",
    ...overrides
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function open(screen: ReturnType<typeof render>) {
  fireEvent.press(screen.getByLabelText("Open your campaigns"));
  await screen.findByLabelText("Unpublish Soil workshop");
}

function pressHandler(screen: ReturnType<typeof render>, label: string) {
  let node = screen.getByLabelText(label);
  while (node && typeof node.props.onPress !== "function") node = node.parent!;
  if (!node) throw new Error(`Missing press handler for ${label}`);
  return node.props.onPress;
}

describe("OwnerFeedCampaignsPanel", () => {
  beforeEach(() => {
    mockAuth = {
      user: { id: "owner-a", role: "user" },
      token: "session-a",
      isAuthed: true,
      isHydrating: false
    };
    mockEnt = {
      ready: true,
      mode: "commercial",
      plan: "commercial",
      facilityId: null,
      facilityRole: null
    };
    mockList.mockReset().mockResolvedValue({ items: [campaign()], nextCursor: null });
    mockUnpublish.mockReset().mockResolvedValue(campaign({ status: "cancelled" }));
    mockEvent.mockReset();
  });

  it("requires an explicit owner-list read and never emits public engagement or shares", async () => {
    const onUnpublished = jest.fn();
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
    expect(mockList).not.toHaveBeenCalled();
    expect(screen.queryByText("Soil workshop")).toBeNull();
    await open(screen);
    expect(mockList).toHaveBeenCalledWith({ limit: 20 });
    expect(
      screen.getByText(/Previously cached or copied content cannot be recalled/)
    ).toBeTruthy();
    expect(screen.queryByLabelText(/Share/)).toBeNull();
    expect(mockEvent).not.toHaveBeenCalled();
    expect(mockUnpublish).not.toHaveBeenCalled();
    expect(onUnpublished).not.toHaveBeenCalled();
  });

  it.each(["signed out", "hydrating", "no user", "entitlements pending"])(
    "does not expose owner controls when %s",
    (state) => {
      if (state === "signed out") mockAuth.isAuthed = false;
      if (state === "hydrating") mockAuth.isHydrating = true;
      if (state === "no user") mockAuth.user = null;
      if (state === "entitlements pending") mockEnt.ready = false;
      const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
      expect(screen.queryByText("Your campaigns")).toBeNull();
      expect(mockList).not.toHaveBeenCalled();
    }
  );

  it("allows a downgraded personal owner to withdraw without create or republish controls", async () => {
    mockEnt.mode = "personal";
    mockEnt.plan = "free";
    const onUnpublished = jest.fn();
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
    await open(screen);
    fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
    expect(screen.getByText(/Its record and analytics will remain/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Confirm unpublish Soil workshop"));
    await screen.findByText("Unpublished");
    expect(mockUnpublish).toHaveBeenCalledWith("campaign-1");
    expect(onUnpublished).toHaveBeenCalledWith("campaign-1");
    expect(screen.getByText("Soil workshop")).toBeTruthy();
    expect(screen.queryByLabelText("Unpublish Soil workshop")).toBeNull();
    expect(screen.queryByLabelText(/Publish|Republish|Delete|Share/)).toBeNull();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it("cancels a named confirmation without a write", async () => {
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
    await open(screen);
    fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
    fireEvent.press(screen.getByLabelText("Cancel unpublish"));
    expect(screen.queryByLabelText("Confirm unpublish Soil workshop")).toBeNull();
    expect(mockUnpublish).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Unpublish Soil workshop").props.accessibilityState.disabled
    ).toBe(false);
  });

  it.each(["Cancel", "Refresh", "uncertain write"])(
    "rejects a saved confirmation callback after %s invalidates it",
    async (change) => {
      const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
      await open(screen);
      fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
      const oldConfirm = pressHandler(screen, "Confirm unpublish Soil workshop");
      if (change === "Cancel") fireEvent.press(screen.getByLabelText("Cancel unpublish"));
      if (change === "Refresh") {
        fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
        await waitFor(() =>
          expect(screen.queryByText("Loading your campaigns…")).toBeNull()
        );
      }
      if (change === "uncertain write") {
        mockUnpublish.mockRejectedValueOnce(new Error("timeout"));
        fireEvent.press(screen.getByLabelText("Confirm unpublish Soil workshop"));
        await screen.findByText(/Unpublish could not be confirmed/);
      }
      const writes = mockUnpublish.mock.calls.length;
      act(() => oldConfirm());
      expect(mockUnpublish).toHaveBeenCalledTimes(writes);
      expect(screen.queryByLabelText("Confirm unpublish Soil workshop")).toBeNull();
    }
  );

  it("serializes owner reads, writes, pagination and duplicate confirmation", async () => {
    const initial = deferred<any>();
    const write = deferred<CommercialFeedCampaign>();
    mockList.mockReturnValue(initial.promise);
    mockUnpublish.mockReturnValue(write.promise);
    const onBusyChange = jest.fn();
    const screen = render(
      <OwnerFeedCampaignsPanel onUnpublished={jest.fn()} onBusyChange={onBusyChange} />
    );
    fireEvent.press(screen.getByLabelText("Open your campaigns"));
    fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    await act(async () => initial.resolve({ items: [campaign()], nextCursor: "page-2" }));
    fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
    const confirm = pressHandler(screen, "Confirm unpublish Soil workshop");
    act(() => {
      confirm();
      confirm();
    });
    fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
    fireEvent.press(screen.getByLabelText("Load more of your campaigns"));
    fireEvent.press(screen.getByLabelText("Cancel unpublish"));
    expect(mockUnpublish).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Confirm unpublish Soil workshop").props.accessibilityState
        .disabled
    ).toBe(true);
    await act(async () => write.resolve(campaign({ status: "cancelled" })));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps a failed initial read unknown rather than displaying a verified empty list", async () => {
    mockList.mockRejectedValueOnce(new Error("offline"));
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("Open your campaigns"));
    await screen.findByText(/Your campaigns could not be loaded/);
    expect(screen.queryByText("No owned campaigns available.")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
    await screen.findByLabelText("Unpublish Soil workshop");
    expect(mockUnpublish).not.toHaveBeenCalled();
  });

  it("paginates read-only, merges duplicate rows and locks stale rows after failed refresh", async () => {
    mockList
      .mockResolvedValueOnce({ items: [campaign()], nextCursor: "cursor-1" })
      .mockResolvedValueOnce({
        items: [
          campaign(),
          campaign({ id: "campaign-2", title: "Next workshop", status: "scheduled" })
        ],
        nextCursor: null
      })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
    await open(screen);
    fireEvent.press(screen.getByLabelText("Load more of your campaigns"));
    await screen.findByText("Next workshop");
    expect(mockList).toHaveBeenNthCalledWith(2, { limit: 20, cursor: "cursor-1" });
    expect(screen.getAllByText("Soil workshop")).toHaveLength(1);
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.queryByLabelText("Load more of your campaigns")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
    await screen.findByText(/Your campaigns could not be loaded/);
    expect(screen.getByText(/Previously loaded campaigns/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
    expect(screen.queryByLabelText("Confirm unpublish Soil workshop")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
    await screen.findByText("No owned campaigns available.");
    expect(screen.queryByText("Soil workshop")).toBeNull();
    expect(mockUnpublish).not.toHaveBeenCalled();
  });

  it.each(["rejected", "wrong id", "wrong status"])(
    "requires read recovery after an uncertain %s write",
    async (failure) => {
      if (failure === "rejected")
        mockUnpublish.mockRejectedValueOnce(new Error("timeout"));
      if (failure === "wrong id")
        mockUnpublish.mockResolvedValueOnce(
          campaign({ id: "other-id", status: "cancelled" })
        );
      if (failure === "wrong status")
        mockUnpublish.mockResolvedValueOnce(campaign({ status: "active" }));
      const onUnpublished = jest.fn();
      const screen = render(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
      await open(screen);
      fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
      fireEvent.press(screen.getByLabelText("Confirm unpublish Soil workshop"));
      await screen.findByText(/Unpublish could not be confirmed/);
      fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
      expect(screen.queryByLabelText("Confirm unpublish Soil workshop")).toBeNull();
      expect(onUnpublished).not.toHaveBeenCalled();
      fireEvent.press(screen.getByLabelText("Close your campaigns"));
      fireEvent.press(screen.getByLabelText("Open your campaigns"));
      expect(
        screen.getByLabelText("Unpublish Soil workshop").props.accessibilityState.disabled
      ).toBe(true);
      mockList.mockRejectedValueOnce(new Error("still offline"));
      fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
      await screen.findByText(/Your campaigns could not be loaded/);
      expect(
        screen.getByLabelText("Unpublish Soil workshop").props.accessibilityState.disabled
      ).toBe(true);
      fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
      await waitFor(() =>
        expect(
          screen.getByLabelText("Unpublish Soil workshop").props.accessibilityState
            .disabled
        ).toBe(false)
      );
      expect(mockUnpublish).toHaveBeenCalledTimes(1);
      fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
      fireEvent.press(screen.getByLabelText("Confirm unpublish Soil workshop"));
      await screen.findByText("Unpublished");
      expect(mockUnpublish).toHaveBeenCalledTimes(2);
    }
  );

  it("recovers a committed but unacknowledged withdrawal with a read only", async () => {
    mockUnpublish.mockRejectedValueOnce(new Error("timeout after commit"));
    const onUnpublished = jest.fn();
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
    await open(screen);
    fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
    fireEvent.press(screen.getByLabelText("Confirm unpublish Soil workshop"));
    await screen.findByText(/Unpublish could not be confirmed/);
    mockList.mockResolvedValueOnce({
      items: [campaign({ status: "cancelled" })],
      nextCursor: null
    });
    fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
    await screen.findByText("Unpublished");
    expect(onUnpublished).toHaveBeenCalledWith("campaign-1");
    expect(mockUnpublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Unpublish Soil workshop")).toBeNull();
  });

  const scopes = [
    "account",
    "session",
    "mode",
    "plan",
    "Facility",
    "Facility role",
    "account role"
  ];
  function changeScope(kind: string) {
    if (kind === "account") mockAuth.user = { ...mockAuth.user, id: "owner-b" };
    if (kind === "session") mockAuth.token = "session-b";
    if (kind === "mode") mockEnt.mode = "personal";
    if (kind === "plan") mockEnt.plan = "free";
    if (kind === "Facility") mockEnt.facilityId = "facility-b";
    if (kind === "Facility role") mockEnt.facilityRole = "VIEWER";
    if (kind === "account role") mockAuth.user = { ...mockAuth.user, role: "admin" };
  }

  it.each(scopes)(
    "clears private rows and confirmation immediately on %s changes",
    async (kind) => {
      const onUnpublished = jest.fn();
      const screen = render(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
      await open(screen);
      fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
      const oldConfirm = pressHandler(screen, "Confirm unpublish Soil workshop");
      changeScope(kind);
      screen.rerender(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
      expect(screen.queryByText("Soil workshop")).toBeNull();
      expect(screen.queryByLabelText("Confirm unpublish Soil workshop")).toBeNull();
      act(() => oldConfirm());
      expect(mockUnpublish).not.toHaveBeenCalled();
      expect(mockList).toHaveBeenCalledTimes(1);
    }
  );

  it.each(scopes)("rejects a late owner read after %s A to B to A", async (kind) => {
    const first = deferred<any>();
    mockList.mockReturnValueOnce(first.promise);
    const onUnpublished = jest.fn();
    const savedAuth = { ...mockAuth, user: { ...mockAuth.user } };
    const savedEnt = { ...mockEnt };
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
    fireEvent.press(screen.getByLabelText("Open your campaigns"));
    changeScope(kind);
    screen.rerender(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
    mockAuth = savedAuth;
    mockEnt = savedEnt;
    screen.rerender(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
    await act(async () =>
      first.resolve({ items: [campaign({ status: "cancelled" })], nextCursor: null })
    );
    expect(screen.queryByText("Soil workshop")).toBeNull();
    expect(onUnpublished).not.toHaveBeenCalled();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it.each(["scope change", "unmount"])(
    "ignores a late write after %s",
    async (change) => {
      const write = deferred<CommercialFeedCampaign>();
      mockUnpublish.mockReturnValue(write.promise);
      const onUnpublished = jest.fn();
      const screen = render(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
      await open(screen);
      fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
      fireEvent.press(screen.getByLabelText("Confirm unpublish Soil workshop"));
      if (change === "unmount") screen.unmount();
      else {
        mockAuth.token = "session-b";
        screen.rerender(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
        mockAuth.token = "session-a";
        screen.rerender(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
      }
      await act(async () => write.resolve(campaign({ status: "cancelled" })));
      expect(onUnpublished).not.toHaveBeenCalled();
    }
  );

  it("does not expose Harvest lifecycle controls or share an unpublished record", async () => {
    mockList.mockResolvedValue({
      items: [
        campaign({ status: "cancelled" }),
        campaign({
          id: "harvest-1",
          title: "Harvest readiness",
          sourceType: "harvest_readiness"
        })
      ],
      nextCursor: null
    });
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("Open your campaigns"));
    await screen.findByText("Unpublished");
    expect(screen.queryByText("Harvest readiness")).toBeNull();
    expect(screen.queryByLabelText(/Unpublish|Share|Delete/)).toBeNull();
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it("labels a future publication as scheduled even with a legacy active status", async () => {
    mockList.mockResolvedValue({
      items: [campaign({ startsAt: "2999-01-01T00:00:00Z" })],
      nextCursor: null
    });
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
    await open(screen);
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.queryByText("Published")).toBeNull();
  });

  it("labels moderated records unavailable without showing internal moderation metadata", async () => {
    mockList.mockResolvedValue({
      items: [
        {
          ...campaign({ isHidden: true }),
          hiddenReason: "Internal moderation reason",
          hiddenBy: "private-admin-id"
        }
      ],
      nextCursor: null
    });
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
    await open(screen);
    expect(screen.getByText("Unavailable")).toBeTruthy();
    expect(screen.queryByText("Published")).toBeNull();
    expect(screen.queryByText(/Internal moderation reason|private-admin-id/)).toBeNull();
    expect(screen.getByLabelText("Unpublish Soil workshop")).toBeTruthy();
  });

  it("labels a scheduled campaign as published after its start time passes", async () => {
    mockList.mockResolvedValue({
      items: [campaign({ status: "scheduled", startsAt: "2000-01-01T00:00:00Z" })],
      nextCursor: null
    });
    const screen = render(<OwnerFeedCampaignsPanel onUnpublished={jest.fn()} />);
    await open(screen);
    expect(screen.getByText("Published")).toBeTruthy();
    expect(screen.queryByText("Scheduled")).toBeNull();
  });

  it("blocks management actions while the surrounding create operation is pending", async () => {
    const onUnpublished = jest.fn();
    const screen = render(
      <OwnerFeedCampaignsPanel onUnpublished={onUnpublished} disabled />
    );
    fireEvent.press(screen.getByLabelText("Open your campaigns"));
    expect(mockList).not.toHaveBeenCalled();
    screen.rerender(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} />);
    await open(screen);
    fireEvent.press(screen.getByLabelText("Unpublish Soil workshop"));
    const oldConfirm = pressHandler(screen, "Confirm unpublish Soil workshop");
    screen.rerender(<OwnerFeedCampaignsPanel onUnpublished={onUnpublished} disabled />);
    act(() => oldConfirm());
    fireEvent.press(screen.getByLabelText("Refresh your campaigns"));
    expect(mockUnpublish).not.toHaveBeenCalled();
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});
