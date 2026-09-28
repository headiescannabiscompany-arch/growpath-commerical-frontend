import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import PersonalGrowsRoute, {
  formatGrowStartDate,
  supportsPullToRefresh
} from "@/app/home/personal/(tabs)/grows";

const mockListPersonalGrows = jest.fn();
const mockArchivePersonalGrow = jest.fn();
const mockRestorePersonalGrow = jest.fn();
const mockPush = jest.fn();
let mockEntitlements = {
  ready: true,
  bootstrapError: null as string | null,
  can: () => true,
  limits: { maxGrows: 10 }
};

function deferredRows() {
  let resolve!: (rows: any[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any[]>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function expectNoUnverifiedGrowClaims(screen: ReturnType<typeof render>) {
  for (const text of [
    "Free grow limit reached",
    "Grow limit reached",
    "Manage Billing",
    "Create Grow",
    "Start First Grow",
    "Turn a blank workspace into a real grow record.",
    "Create a grow first, then connect tools and export records from here.",
    "Workspace summary",
    "0 total",
    "0 shown",
    "No grow yet",
    "No grows yet",
    "Show (0)",
    "No archived grows."
  ]) {
    expect(screen.queryByText(text)).toBeNull();
  }
  expect(screen.queryAllByText("0")).toHaveLength(0);
}

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => true,
    push: mockPush,
    replace: jest.fn()
  }),
  Link: ({ children, href }: any) =>
    require("react").cloneElement(children, {
      href,
      onPress: () => mockPush(href)
    })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    GROWS_PERSONAL_WRITE: "grows_personal_write"
  },
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args),
  archivePersonalGrow: (...args: any[]) => mockArchivePersonalGrow(...args),
  restorePersonalGrow: (...args: any[]) => mockRestorePersonalGrow(...args)
}));

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppCard({ children, style }: any) {
    return React.createElement(View, { style }, children);
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockPersonalFeedPlacement({ placement, routeKey }: any) {
    return React.createElement(
      Text,
      { testID: `feed-${routeKey}-${placement}` },
      `${routeKey} ${placement} feed`
    );
  };
});

describe("PersonalGrowsRoute", () => {
  it("renders a date-only grow anchor without shifting it across timezones", () => {
    expect(formatGrowStartDate("2026-08-20T00:00:00.000Z")).toBe(
      new Date(2026, 7, 20).toLocaleDateString()
    );
  });

  it("keeps pull-to-refresh out of the web renderer", () => {
    expect(supportsPullToRefresh("web")).toBe(false);
    expect(supportsPullToRefresh("ios")).toBe(true);
    expect(supportsPullToRefresh("android")).toBe(true);
  });

  beforeEach(() => {
    mockListPersonalGrows.mockReset();
    mockArchivePersonalGrow.mockReset();
    mockRestorePersonalGrow.mockReset();
    mockPush.mockReset();
    mockEntitlements = {
      ready: true,
      bootstrapError: null,
      can: () => true,
      limits: { maxGrows: 10 }
    };
    mockListPersonalGrows.mockResolvedValue([]);
    mockArchivePersonalGrow.mockResolvedValue({});
    mockRestorePersonalGrow.mockResolvedValue({});
  });

  it("uses the normal grows feed policy instead of the Home featured feed", async () => {
    const screen = render(<PersonalGrowsRoute />);

    await screen.findByText("No grows yet");

    expect(screen.getByText("Personal grow workspace")).toBeTruthy();
    expect(screen.getByText("Grows")).toBeTruthy();
    expect(screen.getByText("Grow roadmap")).toBeTruthy();
    expect(
      screen.getByText("Turn a blank workspace into a real grow record.")
    ).toBeTruthy();
    expect(screen.getAllByText("Create Grow").length).toBeGreaterThan(1);
    expect(screen.queryByText("Integrations")).toBeNull();
    expect(screen.queryByText("PDF Export")).toBeNull();
    expect(screen.getByText("Workspace summary")).toBeTruthy();
    expect(screen.getByText("No grow yet")).toBeTruthy();
    expect(screen.getByTestId("feed-personal_grows-middle")).toBeTruthy();
    expect(screen.getByTestId("feed-personal_grows-bottom")).toBeTruthy();
    expect(screen.queryByText("Featured feed mock")).toBeNull();
  });

  it("waits for both grow lists before presenting an empty account", async () => {
    const active = deferredRows();
    const archived = deferredRows();
    mockListPersonalGrows.mockImplementation((options?: { archived?: boolean }) =>
      options?.archived ? archived.promise : active.promise
    );
    mockEntitlements.limits.maxGrows = 1;
    const screen = render(<PersonalGrowsRoute />);

    expect(screen.getByText("Loading grow dashboard...")).toBeTruthy();
    expectNoUnverifiedGrowClaims(screen);
    await act(async () => active.resolve([]));
    expectNoUnverifiedGrowClaims(screen);
    expect(screen.getByText("Loading grow dashboard...")).toBeTruthy();

    await act(async () => archived.resolve([]));
    expect(screen.getByText("No grows yet")).toBeTruthy();
    expect(screen.getByText("0 total")).toBeTruthy();
    expect(screen.getByText("0 shown")).toBeTruthy();
    expect(screen.getByText("Show (0)")).toBeTruthy();
    expect(screen.getByTestId("btn-new-grow")).toBeTruthy();
    expect(screen.queryByText("Free grow limit reached")).toBeNull();
  });

  it.each([
    [401, "Not authenticated", false],
    [503, "Service unavailable", true]
  ])(
    "does not turn HTTP %s into an empty or quota result",
    async (status, message, can) => {
      mockEntitlements.can = () => can;
      mockEntitlements.limits.maxGrows = 1;
      mockListPersonalGrows.mockRejectedValue(
        Object.assign(new Error(message), { status })
      );
      const screen = render(<PersonalGrowsRoute />);

      await screen.findByText("Unable to load grows");
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.getByLabelText("Try loading grows again")).toBeTruthy();
      expectNoUnverifiedGrowClaims(screen);
      expect(screen.queryByText("Loading grow dashboard...")).toBeNull();
      expect(mockListPersonalGrows).toHaveBeenCalledWith({ throwOnError: true });
      expect(mockListPersonalGrows).toHaveBeenCalledWith({
        archived: true,
        throwOnError: true
      });
    }
  );

  it("does not show a confirmed empty account when only the archived lookup fails", async () => {
    mockListPersonalGrows.mockImplementation(async (options?: { archived?: boolean }) => {
      if (options?.archived) throw new Error("Archived grows unavailable");
      return [];
    });
    const screen = render(<PersonalGrowsRoute />);

    await screen.findByText("Archived grows unavailable");
    expectNoUnverifiedGrowClaims(screen);
  });

  it.each([false, true])(
    "keeps a pending retry distinct before recovering to full=%s",
    async (full) => {
      mockEntitlements.limits.maxGrows = 1;
      mockListPersonalGrows.mockRejectedValue(new Error("Not authenticated"));
      const screen = render(<PersonalGrowsRoute />);
      await screen.findByText("Unable to load grows");

      const active = deferredRows();
      const archived = deferredRows();
      mockListPersonalGrows.mockImplementation((options?: { archived?: boolean }) =>
        options?.archived ? archived.promise : active.promise
      );
      fireEvent.press(screen.getByLabelText("Try loading grows again"));
      expect(screen.getByText("Loading grow dashboard...")).toBeTruthy();
      expect(screen.queryByText("Unable to load grows")).toBeNull();
      expectNoUnverifiedGrowClaims(screen);

      await act(async () => archived.resolve([]));
      expectNoUnverifiedGrowClaims(screen);
      await act(async () =>
        active.resolve(full ? [{ id: "grow-1", name: "Basil" }] : [])
      );

      expect(screen.queryByText("Loading grow dashboard...")).toBeNull();
      if (full) {
        expect(screen.getByText("Free grow limit reached")).toBeTruthy();
        expect(screen.getByText("1 total")).toBeTruthy();
        expect(screen.queryByText("No grows yet")).toBeNull();
        expect(screen.queryByTestId("btn-new-grow")).toBeNull();
      } else {
        expect(screen.getByText("No grows yet")).toBeTruthy();
        expect(screen.getByTestId("btn-new-grow")).toBeTruthy();
        expect(screen.queryByText("Free grow limit reached")).toBeNull();
      }
    }
  );

  it("keeps a failed retry unavailable instead of leaving a loading or empty state", async () => {
    mockListPersonalGrows.mockRejectedValue(new Error("Not authenticated"));
    const screen = render(<PersonalGrowsRoute />);
    await screen.findByText("Unable to load grows");
    const retry = deferredRows();
    mockListPersonalGrows.mockReturnValue(retry.promise);

    fireEvent.press(screen.getByLabelText("Try loading grows again"));
    expect(screen.getByText("Loading grow dashboard...")).toBeTruthy();
    await act(async () => retry.reject(new Error("Service unavailable")));
    expect(screen.getByText("Service unavailable")).toBeTruthy();
    expect(screen.queryByText("Loading grow dashboard...")).toBeNull();
    expectNoUnverifiedGrowClaims(screen);
  });

  it.each([
    [false, null, false],
    [false, null, true],
    [true, "Unable to verify entitlements", false],
    [true, "Unable to verify entitlements", true]
  ])(
    "does not show quota while entitlements are ready=%s with error=%s and full=%s",
    async (ready, bootstrapError, full) => {
      mockEntitlements.ready = ready;
      mockEntitlements.bootstrapError = bootstrapError;
      mockEntitlements.can = () => false;
      mockEntitlements.limits.maxGrows = 1;
      mockListPersonalGrows.mockResolvedValue(
        full ? [{ id: "grow-1", name: "Basil" }] : []
      );
      const screen = render(<PersonalGrowsRoute />);

      await screen.findByText(full ? "1 total" : "0 total");
      expect(screen.queryByText("Free grow limit reached")).toBeNull();
      expect(screen.queryByText("Manage Billing")).toBeNull();
      expect(screen.queryByTestId("btn-new-grow")).toBeNull();
    }
  );

  it("does not mistake missing write permission for a reached numeric limit", async () => {
    mockEntitlements.can = () => false;
    mockEntitlements.limits.maxGrows = 1;
    const screen = render(<PersonalGrowsRoute />);

    await screen.findByText("No grows yet");
    expect(screen.queryByText("Free grow limit reached")).toBeNull();
    expect(screen.queryByTestId("btn-new-grow")).toBeNull();
  });

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])(
    "never labels an unbounded or invalid cap %s as full",
    async (maxGrows) => {
      mockEntitlements.limits.maxGrows = maxGrows;
      mockListPersonalGrows.mockResolvedValue([{ id: "grow-1", name: "Basil" }]);
      const screen = render(<PersonalGrowsRoute />);

      await screen.findByText("1 total");
      expect(screen.queryByText("Free grow limit reached")).toBeNull();
      expect(screen.queryByText("Grow limit reached")).toBeNull();
    }
  );

  it("shows a useful roadmap and routes legacy _id grows correctly", async () => {
    mockListPersonalGrows.mockResolvedValue([
      {
        _id: "grow-1",
        name: "Front Yard",
        cropCommonName: "Cannabis",
        scientificName: "Cannabis sativa",
        cultivar: "Blue Dream",
        location: "Greenhouse A",
        startDate: "2026-07-21T00:00:00Z",
        updatedAt: "2026-07-22T00:00:00Z",
        status: "flowering",
        photos: [{ id: "photo-1" }, { id: "photo-2" }]
      }
    ]);

    const screen = render(<PersonalGrowsRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Front Yard").length).toBeGreaterThan(0)
    );

    expect(screen.getByText("Grow roadmap")).toBeTruthy();
    expect(
      screen.getByText("Keep the current grow moving with a clear next step.")
    ).toBeTruthy();
    expect(
      screen.getAllByText("Cannabis • Cannabis sativa • Blue Dream").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Greenhouse A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open Grow").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Journal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Timeline").length).toBeGreaterThan(0);

    fireEvent.press(screen.getAllByText("Timeline")[0]);
    expect(mockPush).toHaveBeenCalledWith("/home/personal/grows/grow-1/timeline");
  });

  it("shows retained archived grows and restores them explicitly", async () => {
    mockListPersonalGrows.mockImplementation(async (options?: { archived?: boolean }) =>
      options?.archived
        ? [
            {
              _id: "archived-grow-1",
              name: "Archived Tomato",
              cropCommonName: "Tomato",
              archivedAt: "2026-08-20T12:00:00.000Z"
            }
          ]
        : []
    );

    const screen = render(<PersonalGrowsRoute />);

    await waitFor(() => expect(screen.getByText("Show (1)")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Show archived grows"));
    expect(screen.getByText("Archived Tomato")).toBeTruthy();
    expect(screen.getByText(/Their records remain retained/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Restore Archived Tomato"));
    await waitFor(() =>
      expect(mockRestorePersonalGrow).toHaveBeenCalledWith("archived-grow-1")
    );
    expect(
      await screen.findByText("Archived Tomato was restored to active grows.")
    ).toBeTruthy();
  });

  it("hides stale archive rows when the post-restore reload becomes unavailable", async () => {
    mockListPersonalGrows.mockImplementation(async (options?: { archived?: boolean }) =>
      options?.archived
        ? [{ id: "archived-grow-1", name: "Archived Basil", archivedAt: "2026-08-20" }]
        : []
    );
    const screen = render(<PersonalGrowsRoute />);
    await screen.findByText("Show (1)");
    fireEvent.press(screen.getByLabelText("Show archived grows"));

    mockListPersonalGrows.mockRejectedValue(new Error("Service unavailable"));
    fireEvent.press(screen.getByLabelText("Restore Archived Basil"));
    await screen.findByText("Service unavailable");
    expectNoUnverifiedGrowClaims(screen);
    expect(screen.queryByText("Archived Basil")).toBeNull();
    expect(screen.queryByLabelText("Restore Archived Basil")).toBeNull();
  });

  it("retains a successfully loaded list when a restore mutation itself fails", async () => {
    mockListPersonalGrows.mockImplementation(async (options?: { archived?: boolean }) =>
      options?.archived
        ? [{ id: "archived-grow-1", name: "Archived Basil", archivedAt: "2026-08-20" }]
        : [{ id: "grow-1", name: "Current Basil" }]
    );
    mockRestorePersonalGrow.mockRejectedValue(new Error("Restore unavailable"));
    const screen = render(<PersonalGrowsRoute />);
    await screen.findByText("Show (1)");
    fireEvent.press(screen.getByLabelText("Show archived grows"));
    fireEvent.press(screen.getByLabelText("Restore Archived Basil"));

    await screen.findByText("Restore unavailable");
    expect(screen.getByText("1 total")).toBeTruthy();
    expect(screen.getAllByText("Current Basil").length).toBeGreaterThan(0);
    expect(screen.getByText("Archived Basil")).toBeTruthy();
    expect(screen.getByLabelText("Restore Archived Basil")).toBeTruthy();
  });
});
