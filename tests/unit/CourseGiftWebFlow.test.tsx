/** @jest-environment jsdom */
import React from "react";
import { Platform, Text } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { createInternalCourseGiftWebSession } from "@/utils/courseGiftWebSession";
import { type CourseGiftAuth } from "@/utils/courseGiftContinuation";
import { courseGiftReturnPath } from "@/utils/courseGiftPaths";
import {
  parseSafeLoginReturnPath,
  parseShopperSignupReturnPath
} from "@/utils/authReturnPath";
import GiftScreen from "@/app/claim-course-gift";
import GiftCheckoutScreen from "@/app/course-gifts/checkout";
import LoginScreen from "@/app/login";
import Boundary, {
  InternalCourseGiftWebBoundary
} from "@/components/courseGifts/CourseGiftWebBoundary";
import { applyPublicRouteMetadata, metadataForPathname } from "@/seo/publicRouteMetadata";
import { filterMarketingEvent } from "@/analytics/marketingPolicy";

const mockNavigate = jest.fn();
const mockInvoke = jest.fn();
let mockAuth: any;
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockNavigate, replace: mockNavigate }),
  useLocalSearchParams: () =>
    Object.fromEntries(new URLSearchParams(globalThis.window.location.search)),
  usePathname: () => globalThis.window.location.pathname,
  useGlobalSearchParams: () => ({}),
  useUnstableGlobalHref: () =>
    globalThis.window.location.pathname +
    globalThis.window.location.search +
    globalThis.window.location.hash,
  useNavigationContainerRef: () => ({
    isReady: () => true,
    addListener: () => () => undefined
  })
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});
jest.mock("@/api/courseGiftHttp", () => ({
  createInternalCourseGiftHttpClient: (options: any) =>
    jest
      .requireActual("@/api/courseGiftClient")
      .createInternalCourseGiftClient({ ...options, invoke: mockInvoke })
}));

const token = "a".repeat(64);
const path = "/claim-course-gift";
const attempt = "synthetic-attempt-123456789";
const checkout = `/course-gifts/checkout?attempt=${attempt}&result=return`;
const ready: CourseGiftAuth = {
  state: "ready",
  userId: "1".repeat(24),
  sessionKey: "synthetic-session",
  emailVerified: true
};
const signedOut: CourseGiftAuth = {
  state: "signed_out",
  userId: "",
  sessionKey: "",
  emailVerified: false
};
const preview = {
  giftId: "2".repeat(24),
  courseId: "3".repeat(24),
  courseTitle: "Synthetic course",
  recipient: "r***@example.invalid",
  claimExpiresAt: "2099-01-01T00:00:00.000Z",
  code: "COURSE_GIFT_TRANSACTION_REQUIRED"
};
const payment = {
  giftId: preview.giftId,
  checkoutAttemptId: attempt,
  checkoutStatus: "completed",
  paymentRecorded: true,
  recoveryRequired: false
};
const originalFetch = global.fetch;
const originalOS = Platform.OS;
const sessions: ReturnType<typeof createInternalCourseGiftWebSession>[] = [];
function fixture(initial = ready) {
  const auth = { current: { ...initial } };
  const storage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  const credentials = jest.fn(async () => "synthetic-bearer");
  const session = createInternalCourseGiftWebSession({
    auth: () => auth.current,
    getAccessToken: credentials,
    storage
  });
  sessions.push(session);
  const sync = (url: string) => {
    window.history.replaceState(null, "", url);
    return session.sync(url, window);
  };
  return { session, auth, storage, credentials, sync };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockInvoke.mockReset();
  window.history.replaceState(null, "", "/");
  document.head.innerHTML = "";
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  global.fetch = jest.fn(() => {
    throw new Error("No outbound calls permitted");
  });
  mockAuth = {
    token: null,
    user: null,
    isAuthed: false,
    isHydrating: false,
    meStatus: "idle",
    logout: jest.fn(),
    retryMe: jest.fn(),
    login: jest.fn(async () => undefined),
    plan: "free",
    credits: 5
  };
});
afterEach(() => {
  sessions.splice(0).forEach((session) => session.dispose());
  expect(global.fetch).not.toHaveBeenCalled();
  expect(mockAuth.logout).not.toHaveBeenCalled();
  expect(mockAuth.plan).toBe("free");
  expect(mockAuth.credits).toBe(5);
  global.fetch = originalFetch;
});
afterAll(() =>
  Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS })
);

describe("course gift private web flow", () => {
  it.each([
    path,
    checkout,
    `/course-gifts/checkout?attempt=${attempt}`,
    `/course-gifts/checkout?attempt=${attempt}&result=cancel`
  ])("allows only a navigation return for %s", (url) => {
    expect(courseGiftReturnPath(url)).toBe(url);
    expect(parseSafeLoginReturnPath(url)).toBe(url);
    expect(parseShopperSignupReturnPath(url)).toBe("");
  });
  it.each([
    `${path}#token=${token}`,
    `${path}?token=${token}`,
    "//example.com/claim-course-gift",
    "/claim-course-gift/",
    `/course-gifts/checkout?attempt=${attempt}&paid=true`,
    `/course-gifts/checkout?attempt=${attempt}&attempt=${attempt}`,
    `/course-gifts/checkout?attempt=%61${attempt}`,
    "/course-gifts/checkout"
  ])("rejects secret or ambiguous return %s", (url) => {
    expect(courseGiftReturnPath(url)).toBe("");
    expect(parseSafeLoginReturnPath(url)).toBe("");
  });
  it("retains a scrubbed invitation only across deliberate same-tab login, with no automatic request", async () => {
    const f = fixture(signedOut);
    const first = f.sync(`${path}#token=${token}`)!;
    expect(first.hasInvitation).toBe(true);
    expect(JSON.stringify(first)).not.toContain(token);
    expect(window.location.hash).toBe("");
    const login = f.session.beginSignIn();
    expect(login).toBe("/login?next=%2Fclaim-course-gift");
    f.sync(login);
    f.auth.current = { ...signedOut, state: "pending" };
    f.sync(login);
    f.auth.current = { ...ready };
    f.sync(login);
    expect(f.sync(path)?.hasInvitation).toBe(true);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(f.storage.setItem).not.toHaveBeenCalled();
    mockInvoke.mockResolvedValue(preview);
    await expect(f.session.reviewRecipient()).resolves.toEqual(preview);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke.mock.calls[0][0]).toMatchObject({
      operation: "recipient_review",
      body: { token }
    });
  });
  it.each([
    "/login?next=%2Fclaim-course-gift",
    "/forgot-password",
    "/home/personal",
    "/login?next=https%3A%2F%2Fevil.invalid"
  ])("leaving without an exact authorized login clears invitation: %s", async (url) => {
    const f = fixture(signedOut);
    f.sync(`${path}#token=${token}`);
    expect(f.sync(url)).toBeNull();
    f.auth.current = { ...ready };
    expect(f.sync(path)?.hasInvitation).toBe(false);
    await expect(f.session.reviewRecipient()).rejects.toMatchObject({
      code: "COURSE_GIFT_REOPEN_INVITATION"
    });
  });
  it("reload does not restore a recipient token", async () => {
    const f = fixture();
    f.sync(`${path}#token=${token}`);
    f.session.dispose();
    expect(f.sync(path)?.hasInvitation).toBe(false);
    await expect(f.session.reviewRecipient()).rejects.toMatchObject({
      code: "COURSE_GIFT_REOPEN_INVITATION"
    });
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });
  it.each([path, checkout])(
    "the existing login returns to %s without replaying a gift request",
    async (destination) => {
      window.history.replaceState(
        null,
        "",
        `/login?next=${encodeURIComponent(destination)}`
      );
      const view = render(<LoginScreen />);
      fireEvent.changeText(
        view.getByLabelText("Email address"),
        "synthetic@example.invalid"
      );
      fireEvent.changeText(
        view.getByLabelText("Password"),
        "synthetic-password-not-a-credential"
      );
      await act(async () => {
        fireEvent.press(view.getByLabelText("Sign in"));
      });
      expect(mockAuth.login).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(destination);
      expect(mockInvoke).not.toHaveBeenCalled();
      view.unmount();
    }
  );
  it.each([
    { ...ready, userId: "4".repeat(24) },
    { ...ready, sessionKey: "replacement" },
    { ...ready, state: "pending" as const },
    signedOut,
    { ...ready, emailVerified: false }
  ])("drops resolved-session state when authority changes", async (changed) => {
    const f = fixture();
    const initial = f.sync(`${path}#token=${token}`)!;
    f.auth.current = changed;
    const next = f.sync(path)!;
    expect(next.key).not.toBe(initial.key);
    expect(next.hasInvitation).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
  it("a new malformed invitation clears the old one and scrubs its URL", async () => {
    const f = fixture();
    f.sync(`${path}#token=${token}`);
    expect(f.sync(`${path}?token=${token}`)?.hasInvitation).toBe(false);
    expect(window.location.search).toBe("");
    await expect(f.session.reviewRecipient()).rejects.toMatchObject({
      code: "COURSE_GIFT_REOPEN_INVITATION"
    });
  });
  it("saves an opaque checkout attempt only after a buyer-authorized read", async () => {
    const f = fixture();
    f.sync(checkout);
    expect(f.storage.setItem).not.toHaveBeenCalled();
    mockInvoke.mockResolvedValue(payment);
    await expect(f.session.readBuyerStatus()).resolves.toEqual({
      status: payment,
      reloadSaved: true
    });
    const stored = JSON.parse(f.storage.setItem.mock.calls[0][1]);
    expect(Object.keys(stored).sort()).toEqual([
      "attempt",
      "expiresAt",
      "userId",
      "version"
    ]);
    expect(stored.attempt).toBe(attempt);
  });
  it("does not persist an unverified checkout attempt or create a new one", async () => {
    const f = fixture();
    f.sync(checkout);
    mockInvoke.mockRejectedValue(new Error("synthetic private provider error"));
    await expect(f.session.readBuyerStatus()).rejects.toMatchObject({
      code: "COURSE_GIFT_REQUEST_UNKNOWN"
    });
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
  it("discloses blocked checkout storage without losing a confirmed read", async () => {
    const f = fixture();
    f.storage.setItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    f.sync(checkout);
    mockInvoke.mockResolvedValue(payment);
    await expect(f.session.readBuyerStatus()).resolves.toMatchObject({
      reloadSaved: false,
      status: payment
    });
  });
  it("leaving aborts an in-flight read and discards its result", async () => {
    const f = fixture();
    f.sync(`${path}#token=${token}`);
    let finish!: (value: unknown) => void;
    mockInvoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const read = f.session.reviewRecipient();
    const rejected = expect(read).rejects.toMatchObject({
      code: "COURSE_GIFT_REQUEST_CANCELED"
    });
    await Promise.resolve();
    f.sync("/courses");
    await rejected;
    finish(preview);
    expect(mockInvoke.mock.calls[0][0].signal.aborted).toBe(true);
  });

  it.each([GiftScreen, GiftCheckoutScreen])(
    "keeps the public route and boundary disabled without reading credentials",
    (Screen) => {
      window.history.replaceState(null, "", `${path}#token=${token}`);
      const view = render(
        <Boundary>
          <Screen />
        </Boundary>
      );
      expect(view.getByText(/Course gifting is not available yet/)).toBeTruthy();
      expect(view.queryByText("Claim course gift")).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(window.location.hash).toBe("");
    }
  );
  it("integrates explicit review then explicit claim using existing recipient controls", async () => {
    window.history.replaceState(null, "", `${path}#token=${token}`);
    mockAuth = {
      ...mockAuth,
      token: "synthetic-bearer",
      user: { id: ready.userId, emailVerified: true },
      isAuthed: true,
      meStatus: "ready"
    };
    const view = render(
      <InternalCourseGiftWebBoundary>
        <GiftScreen />
      </InternalCourseGiftWebBoundary>
    );
    expect(mockInvoke).not.toHaveBeenCalled();
    mockInvoke.mockResolvedValueOnce(preview);
    await act(async () => {
      fireEvent.press(view.getByText("Review course gift"));
    });
    expect(view.getByText(preview.courseTitle)).toBeTruthy();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    mockInvoke.mockResolvedValueOnce({
      action: "claimed",
      giftId: preview.giftId,
      courseId: preview.courseId,
      enrollmentId: "5".repeat(24)
    });
    await act(async () => {
      fireEvent.press(view.getByText("Claim course gift"));
    });
    expect(view.getByText(/Course gift claimed/)).toBeTruthy();
    fireEvent.press(view.getByText("Open course"));
    expect(mockNavigate).toHaveBeenCalledWith(`/courses?courseId=${preview.courseId}`);
    view.unmount();
  });
  it("hides prior UI as authentication becomes pending, without re-requesting", async () => {
    window.history.replaceState(null, "", `${path}#token=${token}`);
    mockAuth = {
      ...mockAuth,
      token: "synthetic-bearer",
      user: { id: ready.userId, emailVerified: true },
      isAuthed: true,
      meStatus: "ready"
    };
    const tree = () => (
      <InternalCourseGiftWebBoundary>
        <GiftScreen />
      </InternalCourseGiftWebBoundary>
    );
    const view = render(tree());
    mockInvoke.mockResolvedValueOnce(preview);
    await act(async () => {
      fireEvent.press(view.getByText("Review course gift"));
    });
    mockAuth = { ...mockAuth, meStatus: "loading" };
    view.rerender(tree());
    expect(view.queryByText(preview.courseTitle)).toBeNull();
    expect(view.queryByText("Claim course gift")).toBeNull();
    expect(view.getByText(/Waiting for your sign-in/)).toBeTruthy();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    view.unmount();
  });
  it("shows payment status separately from delivery or access and never opens checkout", async () => {
    window.history.replaceState(null, "", checkout);
    mockAuth = {
      ...mockAuth,
      token: "synthetic-bearer",
      user: { id: ready.userId, emailVerified: true },
      isAuthed: true,
      meStatus: "ready"
    };
    const view = render(
      <InternalCourseGiftWebBoundary>
        <GiftCheckoutScreen />
      </InternalCourseGiftWebBoundary>
    );
    mockInvoke.mockResolvedValueOnce(payment);
    await act(async () => {
      fireEvent.press(view.getByText("Check this payment attempt"));
    });
    expect(view.getByText(/A payment record exists/)).toBeTruthy();
    expect(view.queryByText("Open course")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    view.unmount();
  });
  it("keeps native and unrelated children outside the internal flow", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    const view = render(
      <InternalCourseGiftWebBoundary>
        <GiftScreen />
        <Text>Unchanged child</Text>
      </InternalCourseGiftWebBoundary>
    );
    expect(view.getByText(/Course gifting is not available yet/)).toBeTruthy();
    expect(view.getByText("Unchanged child")).toBeTruthy();
    expect(mockInvoke).not.toHaveBeenCalled();
    view.unmount();
  });
  it.each([path, checkout])(
    "removes public schema/share identity and excludes telemetry for %s",
    (url) => {
      applyPublicRouteMetadata("/pricing");
      applyPublicRouteMetadata(url + `#token=${token}`);
      expect(metadataForPathname(url).index).toBe(false);
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
        "noindex,nofollow,noarchive"
      );
      expect(
        document.querySelector('meta[name="referrer"]')?.getAttribute("content")
      ).toBe("no-referrer");
      expect(
        document.querySelector(
          'link[rel="canonical"], meta[property="og:url"], script[type="application/ld+json"]'
        )
      ).toBeNull();
      expect(document.head.innerHTML).not.toContain(token);
      expect(document.head.innerHTML).not.toContain(attempt);
      expect(
        filterMarketingEvent(
          { event: "$pageview", properties: { $current_url: url } },
          url
        )
      ).toBeNull();
      applyPublicRouteMetadata("/about");
      expect(document.querySelector('meta[name="referrer"]')).toBeNull();
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://growpathai.com/about"
      );
    }
  );
  it("restores an existing referrer policy after leaving the private screen", () => {
    document.head.innerHTML = '<meta name="referrer" content="same-origin" />';
    applyPublicRouteMetadata(path);
    applyPublicRouteMetadata(path);
    applyPublicRouteMetadata("/features");
    expect(document.querySelector('meta[name="referrer"]')?.getAttribute("content")).toBe(
      "same-origin"
    );
  });
});
