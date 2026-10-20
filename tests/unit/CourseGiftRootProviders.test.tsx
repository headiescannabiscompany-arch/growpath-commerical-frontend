/** @jest-environment jsdom */
// R09-04E: real root/provider composition, synthetic I/O only. Router scheduling
// was covered separately by 04D; this suite must not claim browser/login proof.
import React, { useContext } from "react";
import { Platform } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import http from "node:http";
import https from "node:https";

const mockReadToken = jest.fn();
const mockPersistToken = jest.fn();
const mockMe = jest.fn();
const mockLogin = jest.fn();
const mockApi = jest.fn();
const mockNavigate = jest.fn();
const mockParams = {};
const mockNavigation = { isReady: () => true, addListener: () => () => undefined };
let mockInternal = true;
let mockMode: "claim" | "creator" = "claim";
let mockLatest: any;
const mockStorage = new Map<string, string>();
const mockGiftStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
const mockRequestId = () => "12345678-1234-4123-8123-123456789abc";

jest.mock("expo-router", () => ({
  Slot: () => <MockProbe />,
  router: { replace: (...args: any[]) => mockNavigate(...args) },
  useRouter: () => ({ push: mockNavigate, replace: mockNavigate, setParams: jest.fn() }),
  usePathname: () => globalThis.window.location.pathname,
  useGlobalSearchParams: () => mockParams,
  useNavigationContainerRef: () => mockNavigation,
  useUnstableGlobalHref: () =>
    globalThis.window.location.pathname +
    globalThis.window.location.search +
    globalThis.window.location.hash
}));
jest.mock("@react-navigation/native", () => ({
  DefaultTheme: { colors: {} },
  ThemeProvider: ({ children }: any) => children
}));
jest.mock("react-native-screens", () => ({ enableScreens: jest.fn() }));
jest.mock("@/components/GlobalApiStatusBanner", () => ({
  GlobalApiStatusBanner: () => null
}));
jest.mock("@/components/GlobalReportBugButton", () => ({
  __esModule: true,
  default: () => null
}));
jest.mock("@/notifications/useNotificationDeepLinks", () => ({
  useNotificationDeepLinks: jest.fn()
}));
jest.mock("@/seo/publicRouteMetadata", () => ({ applyPublicRouteMetadata: jest.fn() }));
jest.mock("@/utils/monitoring", () => ({
  initMonitoring: jest.fn(),
  wrapWithMonitoring: (value: any) => value
}));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    ThemeModeProvider: ({ children }: any) => children,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});
jest.mock("@/hooks/usePushRegistration", () => ({ usePushRegistration: jest.fn() }));
jest.mock("@/api/events", () => ({ logEvent: jest.fn() }));
jest.mock("@/api/adminPasskeys", () => ({
  clearAdminStepUp: jest.fn(),
  clearAdminSecurityForLogout: jest.fn(async () => undefined)
}));
jest.mock("@/api/auth", () => ({
  login: (...args: any[]) => mockLogin(...args),
  signup: jest.fn()
}));
jest.mock("@/api/me", () => ({ apiMe: (...args: any[]) => mockMe(...args) }));
jest.mock("@/auth/tokenStore", () => ({
  getToken: (...args: any[]) => mockReadToken(...args),
  setToken: (...args: any[]) => mockPersistToken(...args),
  clearToken: jest.fn(),
  subscribeToExternalTokenChanges: () => () => undefined
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApi(...args),
  setOnUnauthorized: jest.fn(),
  ApiError: class extends Error {}
}));
// Preserve this accepted internal-provider fixture after the root's import-only
// staging selection. New normal selection coverage is isolated in
// CourseGiftNormalStagingRoot; these completed provider cases are not rerun.
jest.mock("@/components/courseGifts/PreparedStagingCourseGiftWebBoundary", () => {
  const actual = jest.requireActual("@/components/courseGifts/CourseGiftWebBoundary");
  return {
    __esModule: true,
    PreparedStagingCourseGiftWebBoundary: (props: any) => {
      const Boundary = mockInternal
        ? actual.InternalCourseGiftWebBoundary
        : actual.default;
      return <Boundary {...props} />;
    }
  };
});

import RootLayout from "@/app/_layout";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility, resetFacilityStore } from "@/state/useFacility";
import { resetAccountModeStore } from "@/state/useAccountMode";
import GiftScreen, {
  InternalCourseGiftWebContext
} from "@/components/courseGifts/CourseGiftWebScreen";
import { InternalCourseGiftSaleHost } from "@/components/courseGifts/CourseGiftSaleHost";

const COURSE = "3".repeat(24);
const INVITATION = "a".repeat(64);
const CLAIM = "/claim-course-gift";
function MockProbe() {
  mockLatest = {
    auth: useAuth(),
    entitlements: useEntitlements(),
    facility: useFacility(),
    gift: useContext(InternalCourseGiftWebContext)
  };
  return mockMode === "claim" ? (
    <GiftScreen />
  ) : (
    <InternalCourseGiftSaleHost
      mode="creator"
      courseId={COURSE}
      attemptId={mockRequestId()}
      newRequestId={mockRequestId}
      storage={mockGiftStorage}
      onNavigateToCheckout={mockNavigate}
    />
  );
}
function me(id = "1".repeat(24), role: string | null = null) {
  return {
    user: {
      id,
      email: "synthetic@example.invalid",
      role: "user",
      plan: "pro",
      subscriptionStatus: "active",
      emailVerified: true,
      tokenBalance: 37
    },
    ctx: role
      ? {
          mode: "facility",
          plan: "pro",
          facilityId: "4".repeat(24),
          facilityRole: role,
          facilityPlan: "facility",
          facilitySubscriptionStatus: "active"
        }
      : { mode: "personal", plan: "pro" }
  };
}
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: any) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const review = () => ({
  success: true,
  data: {
    courseId: COURSE,
    canAccept: true,
    matchesPolicy: false,
    consent: null,
    policy: {
      reference: "synthetic-policy",
      fingerprint: "b".repeat(64),
      version: "synthetic-v1",
      creatorTermsText: "Synthetic private creator terms"
    }
  }
});
const giftCalls = () =>
  mockApi.mock.calls.filter(([path]) => path.startsWith("/api/course-gifts/"));
const originalFetch = global.fetch;
const originalOS = Platform.OS;
let unexpected: string[];
let view: ReturnType<typeof render> | undefined;
let oldDevPlan: string | undefined;

beforeEach(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  oldDevPlan = process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN;
  delete process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN;
  window.history.replaceState(null, "", CLAIM + "#token=" + INVITATION);
  window.sessionStorage.clear();
  mockStorage.clear();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key) => mockStorage.get(key) ?? null
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    mockStorage.set(key, value);
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key) => {
    mockStorage.delete(key);
  });
  resetFacilityStore();
  resetAccountModeStore();
  mockInternal = true;
  mockMode = "claim";
  mockLatest = null;
  unexpected = [];
  mockReadToken.mockResolvedValue("synthetic-bearer-one");
  mockPersistToken.mockResolvedValue(undefined);
  require("@/api/adminPasskeys").clearAdminSecurityForLogout.mockResolvedValue(undefined);
  mockMe.mockResolvedValue(me());
  mockGiftStorage.getItem.mockReturnValue(null);
  mockApi.mockImplementation(async (path) => {
    if (path === "/api/presence/heartbeat") return {}; // simulated provider side effect, never sent
    if (path === "/api/course-gifts/creator/review") return review();
    unexpected.push(path);
    throw new Error("Unapproved synthetic operation");
  });
  global.fetch = jest.fn(() => {
    unexpected.push("fetch");
    throw new Error("Network forbidden");
  });
  jest.spyOn(http, "request").mockImplementation(() => {
    unexpected.push("http");
    throw new Error("Network forbidden");
  });
  jest.spyOn(https, "request").mockImplementation(() => {
    unexpected.push("https");
    throw new Error("Network forbidden");
  });
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  view = undefined;
  resetFacilityStore();
  resetAccountModeStore();
  mockStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  global.fetch = originalFetch;
  Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
  if (oldDevPlan === undefined) delete process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN;
  else process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN = oldDevPlan;
  expect(unexpected).toEqual([]);
  expect(mockGiftStorage.setItem).not.toHaveBeenCalled();
});
async function mount() {
  view = render(<RootLayout />);
  await waitFor(() => expect(mockLatest.auth.isHydrating).toBe(false));
  return view;
}
async function ready() {
  const screen = await mount();
  await waitFor(() => expect(mockLatest.entitlements.ready).toBe(true));
  expect(mockLatest.auth.user).toMatchObject({ plan: "pro", tokenBalance: 37 });
  return screen;
}

test("real root keeps the default public gate closed after authenticated bootstrap", async () => {
  mockInternal = false;
  const screen = await ready();
  expect(mockLatest.gift).toBeNull();
  expect(screen.getByText(/Course gifting is not available yet/)).toBeTruthy();
  expect(giftCalls()).toHaveLength(0);
  expect(mockPersistToken).not.toHaveBeenCalled();
});

test("actual AuthProvider hydration binds the first settled identity without gift reads", async () => {
  const pending = deferred();
  mockMe.mockReturnValueOnce(pending.promise);
  view = render(<RootLayout />);
  await waitFor(() => expect(mockMe).toHaveBeenCalledTimes(1));
  expect(mockLatest.gift.snapshot).toMatchObject({
    authState: "pending",
    hasInvitation: true
  });
  await act(async () => pending.resolve(me()));
  await waitFor(() => expect(mockLatest.gift.snapshot.authState).toBe("ready"));
  expect(mockLatest.gift.snapshot.hasInvitation).toBe(true);
  expect(giftCalls()).toHaveLength(0);
  expect(mockPersistToken).not.toHaveBeenCalled();
});

test("initial /me outage blocks gift actions and explicit session retry sends no gift", async () => {
  mockMe.mockRejectedValueOnce(new Error("Synthetic offline"));
  await mount();
  expect(mockLatest.auth.meStatus).toBe("error");
  expect(mockLatest.entitlements.ready).toBe(false);
  expect(mockLatest.gift.snapshot.authState).toBe("pending");
  await act(async () => mockLatest.auth.retryMe());
  await waitFor(() => expect(mockLatest.entitlements.ready).toBe(true));
  expect(mockLatest.auth.user).toMatchObject({ plan: "pro", tokenBalance: 37 });
  expect(giftCalls()).toHaveLength(0);
  expect(mockPersistToken).not.toHaveBeenCalled();
});

test("deliberate sign-in survives the real AuthProvider token/reset/bootstrap sequence", async () => {
  mockReadToken.mockResolvedValue(null);
  const screen = await readySignedOut();
  const path = mockLatest.gift.session.beginSignIn();
  expect(path).toBe("/login?next=%2Fclaim-course-gift");
  act(() => {
    window.history.replaceState(null, "", path);
    screen.rerender(<RootLayout />);
  });
  mockLogin.mockResolvedValue({ token: "synthetic-bearer-one", user: me().user });
  await act(async () =>
    mockLatest.auth.login("synthetic@example.invalid", "not-a-real-password")
  );
  act(() => {
    window.history.replaceState(null, "", CLAIM);
    screen.rerender(<RootLayout />);
  });
  await waitFor(() =>
    expect(mockLatest.gift.snapshot).toMatchObject({
      authState: "ready",
      hasInvitation: true
    })
  );
  expect(mockLatest.auth.user).toMatchObject({ plan: "pro", tokenBalance: 37 });
  expect(mockPersistToken.mock.calls.map(([value]) => value)).toEqual([
    null,
    "synthetic-bearer-one"
  ]);
  expect(giftCalls()).toHaveLength(0);
});

async function readySignedOut() {
  const screen = await mount();
  await waitFor(() => expect(mockLatest.gift.snapshot.authState).toBe("signed_out"));
  return screen;
}

test("background real /me refresh clears the bound invitation even when entitlements stay ready", async () => {
  await ready();
  const pending = deferred();
  mockMe.mockReturnValueOnce(pending.promise);
  let refresh: Promise<void>;
  act(() => {
    refresh = mockLatest.auth.retryMe();
  });
  expect(mockLatest.auth.meStatus).toBe("loading");
  expect(mockLatest.gift.snapshot.hasInvitation).toBe(false);
  await act(async () => {
    pending.resolve(me());
    await refresh!;
  });
  expect(mockLatest.gift.snapshot).toMatchObject({
    authState: "ready",
    hasInvitation: false
  });
  expect(giftCalls()).toHaveLength(0);
});

test("real logout clears continuation and workspace store without a gift request", async () => {
  await ready();
  act(() =>
    mockLatest.facility.selectFacility({ id: "4".repeat(24), name: "Synthetic" })
  );
  await act(async () => mockLatest.auth.logout());
  expect(mockLatest.auth.isAuthed).toBe(false);
  expect(mockLatest.facility.selectedId).toBeNull();
  expect(mockLatest.gift.snapshot.hasInvitation).toBe(false);
  expect(mockPersistToken).toHaveBeenCalledWith(null);
  expect(giftCalls()).toHaveLength(0);
});

test("real account replacement and late old /me cannot restore private continuation", async () => {
  await ready();
  const old = deferred();
  mockMe.mockReturnValueOnce(old.promise);
  let refresh: Promise<void>;
  act(() => {
    refresh = mockLatest.auth.retryMe();
  });
  const second = me("2".repeat(24));
  mockLogin.mockResolvedValue({ token: "synthetic-bearer-two", user: second.user });
  mockMe.mockResolvedValueOnce(second);
  await act(async () =>
    mockLatest.auth.login("synthetic-two@example.invalid", "not-a-real-password")
  );
  await act(async () => {
    old.resolve(me());
    await refresh!;
  });
  expect(mockLatest.auth.user).toMatchObject({
    id: second.user.id,
    plan: "pro",
    tokenBalance: 37
  });
  expect(mockLatest.gift.snapshot.hasInvitation).toBe(false);
  expect(giftCalls()).toHaveLength(0);
});

test("actual Facility store change disposes held creator read without saving consent", async () => {
  mockMode = "creator";
  mockMe.mockResolvedValue(me(undefined, "OWNER"));
  const screen = await ready();
  const held = deferred();
  mockApi.mockImplementation((path) => {
    if (path === "/api/course-gifts/creator/review") return held.promise;
    if (path === "/api/presence/heartbeat") return Promise.resolve({});
    unexpected.push(path);
    throw new Error("Unapproved synthetic operation");
  });
  await act(async () =>
    fireEvent.press(screen.getByText("Review current gift permission"))
  );
  const call = giftCalls()[0];
  expect(call).toBeTruthy();
  act(() =>
    mockLatest.facility.selectFacility({
      id: "5".repeat(24),
      name: "Synthetic second workspace"
    })
  );
  expect(call[1].signal.aborted).toBe(true);
  await act(async () => held.resolve(review()));
  expect(screen.queryByText("Synthetic private creator terms")).toBeNull();
  expect(giftCalls().map(([path]) => path)).toEqual(["/api/course-gifts/creator/review"]);
});

test("real entitlement role refresh discards the old creator form and never auto-reviews", async () => {
  mockMode = "creator";
  mockMe.mockResolvedValue(me(undefined, "OWNER"));
  const screen = await ready();
  await act(async () =>
    fireEvent.press(screen.getByText("Review current gift permission"))
  );
  await waitFor(() =>
    expect(screen.getByText("Synthetic private creator terms")).toBeTruthy()
  );
  mockMe.mockResolvedValueOnce(me(undefined, "VIEWER"));
  await act(async () => mockLatest.auth.retryMe());
  await waitFor(() => expect(mockLatest.entitlements.facilityRole).toBe("VIEWER"));
  expect(screen.queryByText("Synthetic private creator terms")).toBeNull();
  expect(giftCalls()).toHaveLength(1);
  expect(mockLatest.auth.user).toMatchObject({ plan: "pro", tokenBalance: 37 });
});
