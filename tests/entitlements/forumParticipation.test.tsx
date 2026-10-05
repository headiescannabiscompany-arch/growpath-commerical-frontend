import React from "react";
import { Text } from "react-native";
import { act, render } from "@testing-library/react-native";
import {
  EntitlementsProvider,
  useEntitlements,
  type EntitlementsState
} from "@/entitlements/EntitlementsProvider";
import { CAPABILITY_KEYS as CAPS } from "@/entitlements/capabilityKeys";

const mockLoadPreferredMode = jest.fn();
const mockPersistPreferredMode = jest.fn();
const mockLogout = jest.fn();
const originalDevPlan = process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN;
let mockAuth: {
  token: string | null;
  isHydrating: boolean;
  meStatus: "ready";
  meError: null;
  logout: typeof mockLogout;
  ctx: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
};
let currentEntitlements: EntitlementsState;

jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/auth/modeStore", () => ({
  getPreferredMode: () => mockLoadPreferredMode(),
  setPreferredMode: (mode: unknown) => mockPersistPreferredMode(mode)
}));

function Probe() {
  const entitlements = useEntitlements();
  currentEntitlements = entitlements;
  return (
    <Text testID="entitlements">
      {JSON.stringify({
        ready: entitlements.ready,
        mode: entitlements.mode,
        plan: entitlements.plan,
        facilityId: entitlements.facilityId,
        forumView: entitlements.can(CAPS.FORUM_VIEW),
        forumPost: entitlements.can(CAPS.FORUM_POST),
        forumPostProperty: entitlements.can[CAPS.FORUM_POST],
        tasksWrite: entitlements.can(CAPS.TASKS_WRITE),
        growLogsWrite: entitlements.can(CAPS.GROWLOGS_WRITE),
        growsWrite: entitlements.can(CAPS.GROWS_WRITE)
      })}
    </Text>
  );
}

function App() {
  return (
    <EntitlementsProvider>
      <Probe />
    </EntitlementsProvider>
  );
}

function session({
  id = "individual-a",
  individualStatus = "expired",
  facilityStatus = "active",
  facilityRole = "OWNER",
  mode = "facility"
} = {}) {
  const paid = ["active", "trial", "trialing"].includes(individualStatus);
  return {
    token: `session-${id}`,
    isHydrating: false,
    meStatus: "ready" as const,
    meError: null,
    logout: mockLogout,
    user: { id, plan: "pro", subscriptionStatus: individualStatus },
    ctx: {
      mode,
      requestedPlan: "pro",
      plan: paid ? "pro" : "free",
      subscriptionStatus: individualStatus,
      facilityId: "facility-a",
      facilityRole,
      facilityPlan: "facility",
      facilitySubscriptionStatus: facilityStatus,
      capabilities: {}
    }
  };
}

async function mountProvider() {
  const screen = render(<App />);
  // Settle the mocked persisted-mode read as well as the provider's real effects.
  await act(async () => {});
  return {
    snapshot: () => JSON.parse(screen.getByTestId("entitlements").props.children),
    reapplyAuth: async () => {
      screen.rerender(<App />);
      await act(async () => {});
    }
  };
}

beforeEach(() => {
  mockLoadPreferredMode.mockResolvedValue(null);
  mockPersistPreferredMode.mockResolvedValue(undefined);
  mockAuth = session();
  delete process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN;
});

afterEach(() => {
  if (originalDevPlan === undefined) {
    delete process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN;
  } else {
    process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN = originalDevPlan;
  }
});

describe("shared Forum participation through the real EntitlementsProvider", () => {
  it.each(["OWNER", "MANAGER", "STAFF"])(
    "denies an expired individual's shared posting while retaining active Facility %s operations",
    async (facilityRole) => {
      mockAuth = session({ facilityRole });
      mockAuth.ctx = { ...mockAuth.ctx, capabilities: { [CAPS.FORUM_POST]: true } };
      const provider = await mountProvider();

      expect(provider.snapshot()).toMatchObject({
        ready: true,
        mode: "facility",
        plan: "facility",
        forumView: true,
        forumPost: false,
        forumPostProperty: false,
        tasksWrite: true,
        growLogsWrite: true,
        growsWrite: facilityRole !== "STAFF"
      });
    }
  );

  it("allows a paid individual's shared posting without granting inactive Facility writes", async () => {
    mockAuth = session({ individualStatus: "active", facilityStatus: "expired" });
    const provider = await mountProvider();

    expect(provider.snapshot()).toMatchObject({
      ready: true,
      mode: "facility",
      plan: "free",
      forumView: true,
      forumPost: true,
      forumPostProperty: true,
      tasksWrite: false,
      growLogsWrite: false,
      growsWrite: false
    });
  });

  it("honors the canonical active Pro plan when the legacy requested plan is Free", async () => {
    mockAuth = {
      ...session({ individualStatus: "active", mode: "personal" }),
      user: { id: "legacy-individual", plan: "free", subscriptionStatus: "active" },
      ctx: {
        mode: "personal",
        plan: "pro",
        requestedPlan: "free",
        subscriptionStatus: "active",
        capabilities: {}
      }
    };
    const provider = await mountProvider();

    expect(provider.snapshot()).toMatchObject({
      ready: true,
      mode: "personal",
      forumPost: true,
      forumPostProperty: true,
      tasksWrite: false,
      growsWrite: false
    });
  });

  it("does not grant shared posting merely because a Free account is an administrator", async () => {
    mockAuth = {
      ...session({ mode: "personal" }),
      user: { id: "admin-free", role: "admin", plan: "free" },
      ctx: {
        mode: "personal",
        role: "admin",
        plan: "free",
        requestedPlan: "free",
        subscriptionStatus: "active",
        capabilities: {}
      }
    };
    const provider = await mountProvider();

    expect(provider.snapshot()).toMatchObject({
      ready: true,
      forumView: true,
      forumPost: false,
      forumPostProperty: false,
      tasksWrite: false,
      growsWrite: false
    });
  });

  it("does not promote a canonical Free plan from a requested paid plan or stale Forum grant", async () => {
    mockAuth = {
      ...session({ individualStatus: "active", mode: "personal" }),
      ctx: {
        mode: "personal",
        plan: "free",
        requestedPlan: "pro",
        subscriptionStatus: "active",
        capabilities: { [CAPS.FORUM_POST]: true }
      }
    };
    const provider = await mountProvider();

    expect(provider.snapshot()).toMatchObject({
      ready: true,
      mode: "personal",
      forumView: true,
      forumPost: false,
      forumPostProperty: false,
      tasksWrite: false,
      growsWrite: false
    });
  });

  it.each([
    { individualStatus: "expired", facilityStatus: "active", forumPost: false },
    { individualStatus: "active", facilityStatus: "expired", forumPost: true }
  ])(
    "re-evaluates workspace switches without replacing the $individualStatus individual's Forum access",
    async ({ individualStatus, facilityStatus, forumPost }) => {
      mockAuth = session({ individualStatus, facilityStatus, mode: "personal" });
      const provider = await mountProvider();
      expect(provider.snapshot()).toMatchObject({ mode: "personal", forumPost });

      await act(async () => currentEntitlements.setPreferredMode?.("facility"));
      expect(provider.snapshot()).toMatchObject({
        mode: "facility",
        forumPost,
        tasksWrite: facilityStatus === "active"
      });
      expect(mockPersistPreferredMode).toHaveBeenLastCalledWith("facility");

      await act(async () => currentEntitlements.setPreferredMode?.("personal"));
      expect(provider.snapshot()).toMatchObject({
        mode: "personal",
        forumPost,
        tasksWrite: false
      });
    }
  );

  it("revokes and restores shared posting after account changes in the same active Facility", async () => {
    mockAuth = session({ individualStatus: "active" });
    const provider = await mountProvider();
    expect(provider.snapshot()).toMatchObject({ forumPost: true, tasksWrite: true });

    mockAuth = session({ id: "individual-b", individualStatus: "expired" });
    await provider.reapplyAuth();
    expect(provider.snapshot()).toMatchObject({
      facilityId: "facility-a",
      forumPost: false,
      forumPostProperty: false,
      tasksWrite: true
    });

    mockAuth = session({ id: "individual-c", individualStatus: "trialing" });
    await provider.reapplyAuth();
    expect(provider.snapshot()).toMatchObject({ forumPost: true, tasksWrite: true });
  });

  it("re-evaluates the selected Facility independently of the paid individual's Forum access", async () => {
    mockAuth = session({ individualStatus: "active" });
    const provider = await mountProvider();
    expect(provider.snapshot()).toMatchObject({ forumPost: true, tasksWrite: true });

    mockAuth = {
      ...mockAuth,
      ctx: {
        ...mockAuth.ctx,
        facilityId: "facility-b",
        facilitySubscriptionStatus: "expired"
      }
    };
    await provider.reapplyAuth();
    expect(provider.snapshot()).toMatchObject({
      facilityId: "facility-b",
      plan: "free",
      forumPost: true,
      tasksWrite: false,
      growLogsWrite: false,
      growsWrite: false
    });
  });

  it("re-evaluates an individual subscription change without changing the account or session", async () => {
    mockAuth = session({ individualStatus: "active" });
    const provider = await mountProvider();
    expect(provider.snapshot()).toMatchObject({ forumPost: true, tasksWrite: true });
    const initialToken = mockAuth.token;
    const initialUserId = mockAuth.user?.id;

    mockAuth = session({ individualStatus: "expired" });
    expect(mockAuth.token).toBe(initialToken);
    expect(mockAuth.user?.id).toBe(initialUserId);
    await provider.reapplyAuth();
    expect(provider.snapshot()).toMatchObject({
      forumPost: false,
      forumPostProperty: false,
      tasksWrite: true,
      growLogsWrite: true
    });
  });

  it("drops shared posting and Facility writes when the authenticated account signs out", async () => {
    mockAuth = session({ individualStatus: "active" });
    const provider = await mountProvider();
    expect(provider.snapshot()).toMatchObject({ forumPost: true, tasksWrite: true });

    mockAuth = { ...mockAuth, token: null, user: null, ctx: null };
    await provider.reapplyAuth();
    expect(provider.snapshot()).toMatchObject({
      ready: true,
      mode: "personal",
      plan: "free",
      facilityId: null,
      forumPost: false,
      tasksWrite: false,
      growsWrite: false
    });
  });
});
