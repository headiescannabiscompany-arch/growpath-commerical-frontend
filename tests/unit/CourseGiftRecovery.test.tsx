import React from "react";
import { Platform } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import {
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";
import { GIFT_SALE_RECOVERY_MS } from "@/utils/courseGiftSaleRecovery";
import {
  createInternalCourseGiftSaleHttpSession,
  InternalCourseGiftSaleScreen
} from "@/components/courseGifts/CourseGiftSaleScreens";
import CourseGiftSaleHost, {
  InternalCourseGiftSaleHost
} from "@/components/courseGifts/CourseGiftSaleHost";

jest.mock("@/api/apiRequest", () => ({
  apiRequest: jest.fn(),
  ApiError: class extends Error {}
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("@/entitlements", () => ({ useEntitlements: jest.fn() }));
jest.mock("@/state/useFacility", () => ({ useFacility: jest.fn() }));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
const COURSE = "a".repeat(24),
  GIFT = "b".repeat(24),
  USER = "d".repeat(24);
const ATTEMPT = "a0000000-0000-4000-8000-000000000001";
const NEW_ATTEMPT = "a0000000-0000-4000-8000-000000000002";
const REQUEST = "b0000000-0000-4000-8000-000000000001";
const HASH = "c".repeat(64),
  EMAIL = "synthetic@example.invalid";
const URL = "https://checkout.stripe.com/c/pay/cs_test_synthetic";
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const quote = () => ({
  version: "course-gift-sale-review-v1",
  courseId: COURSE,
  checkoutAttemptId: ATTEMPT,
  recipientEmail: EMAIL,
  reviewFingerprint: HASH,
  title: "Synthetic course",
  amountCents: 2500,
  currency: "usd",
  terms: {
    version: "synthetic-policy",
    expiry: "Synthetic expiry",
    duplicateAccess: "Synthetic duplicate",
    courseUnavailable: "Synthetic unavailable",
    refund: "Synthetic refund"
  }
});
const consent = () => ({
  reference: "synthetic-consent",
  revision: 1,
  enabled: true,
  revokedAt: null,
  replayed: false
});
const creator = () => ({
  courseId: COURSE,
  canAccept: true,
  matchesPolicy: false,
  consent: null,
  policy: {
    reference: "synthetic-policy",
    fingerprint: HASH,
    version: "synthetic-v1",
    creatorTermsText: "Synthetic creator terms"
  }
});
const status = () => ({
  giftId: GIFT,
  checkoutAttemptId: ATTEMPT,
  checkoutStatus: "reserved",
  paymentRecorded: false,
  recoveryRequired: false
});
const request = () => ({
  courseId: COURSE,
  checkoutAttemptId: ATTEMPT,
  recipientEmail: EMAIL,
  policyVersion: "synthetic-policy"
});
const hint = () => ({
  kind: "buyer" as const,
  courseId: COURSE,
  attemptId: ATTEMPT,
  fingerprint: HASH,
  giftId: null
});
const api = apiRequest as jest.Mock;
const calls = (suffix: string) =>
  api.mock.calls.filter(([p]) => p === `/api/course-gifts/${suffix}`);
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
let auth: CourseGiftAuth, appAuth: any, entitlements: any, facility: any;
let records: Map<string, string>, storage: { getItem: jest.Mock; setItem: jest.Mock };
let now: number,
  replies: Record<string, any>,
  makeId: jest.Mock,
  navigate: jest.Mock,
  network: jest.SpyInstance;
let sessions: ReturnType<typeof createInternalCourseGiftSaleHttpSession>[];
function continuation() {
  const value = createCourseGiftContinuation({ storage, now: () => now });
  value.observe(auth);
  return value;
}
function session(attemptId = ATTEMPT) {
  const value = createInternalCourseGiftSaleHttpSession({
    platform: "web",
    continuation: continuation(),
    auth: () => auth,
    getAccessToken: async () => "synthetic-auth",
    courseId: COURSE,
    attemptId,
    newRequestId: makeId
  });
  sessions.push(value);
  return value;
}
async function unknownReservation() {
  const value = session();
  await value.reviewBuyer(EMAIL);
  api.mockRejectedValueOnce(new Error("private lost reply"));
  await expect(value.reserveBuyer(request())).rejects.toThrow();
  value.dispose();
  return value;
}
async function unknownConsent() {
  const value = session();
  await value.reviewCreator();
  api.mockRejectedValueOnce(new Error("private lost reply"));
  await expect(value.acceptCreator(true)).rejects.toThrow();
  value.dispose();
  return value;
}
async function press(view: ReturnType<typeof render>, label: string) {
  await act(async () => {
    fireEvent.press(view.getByText(label));
  });
}
function host(mode: "creator" | "buyer" = "buyer", courseId = COURSE) {
  return (
    <InternalCourseGiftSaleHost
      mode={mode}
      courseId={courseId}
      attemptId={ATTEMPT}
      storage={storage}
      newRequestId={makeId}
      onNavigateToCheckout={navigate}
    />
  );
}
beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "web");
  network = jest.spyOn(global, "fetch").mockImplementation(() => {
    throw new Error("No network");
  });
  auth = {
    state: "ready",
    userId: USER,
    sessionKey: "synthetic-session",
    emailVerified: true
  };
  appAuth = {
    isAuthed: true,
    token: "synthetic-auth",
    meStatus: "ready",
    isHydrating: false,
    user: { id: USER, emailVerified: true, role: "user", plan: "pro" }
  };
  entitlements = { ready: true, mode: "personal", facilityId: null, facilityRole: null };
  facility = { selectedId: null };
  (useAuth as jest.Mock).mockImplementation(() => appAuth);
  (useEntitlements as jest.Mock).mockImplementation(() => entitlements);
  (useFacility as jest.Mock).mockImplementation(() => facility);
  records = new Map();
  sessions = [];
  now = Date.now();
  storage = {
    getItem: jest.fn((k) => records.get(k) || null),
    setItem: jest.fn((k, v) => records.set(k, v))
  };
  makeId = jest.fn(() => REQUEST);
  navigate = jest.fn();
  replies = {
    "buyer/review": quote(),
    "buyer/reserve": status(),
    "buyer/status": status(),
    "buyer/checkout": {
      giftId: GIFT,
      checkoutAttemptId: ATTEMPT,
      checkoutStatus: "open",
      url: URL
    },
    "creator/review": creator(),
    "creator/accept": consent(),
    "creator/revoke": {
      ...consent(),
      enabled: false,
      revokedAt: new Date(now).toISOString()
    }
  };
  api.mockImplementation(async (url: string) => ({
    success: true,
    data: clone(replies[url.replace("/api/course-gifts/", "")])
  }));
});
afterEach(() => {
  cleanup();
  sessions.forEach((s) => s.dispose());
  expect(network).not.toHaveBeenCalled();
  network.mockRestore();
  jest.useRealTimers();
});

describe("R09-06W recovery layout", () => {
  it("spaces recovery text and each action without submitting or replacing the attempt", async () => {
    continuation().rememberSale(hint());
    const view = render(host());
    expect(view.getByTestId("course-gift-recovery-content")).toHaveStyle({ gap: 12 });
    expect(view.getByText("Check gift payment status")).toBeTruthy();
    expect(view.queryByText("Open secure checkout")).toBeNull();
    expect(api).not.toHaveBeenCalled();
    await press(view, "Check gift payment status");
    expect(view.getByTestId("course-gift-recovery-content")).toHaveStyle({ gap: 12 });
    expect(view.getByText("Open secure checkout")).toBeTruthy();
    expect(calls("buyer/status")).toHaveLength(1);
    expect(calls("buyer/reserve")).toHaveLength(0);
    expect(calls("buyer/checkout")).toHaveLength(0);
    expect(makeId).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("R09-03F opaque continuation", () => {
  it("retains only bounded account/course IDs and fingerprints across disposal/reload", () => {
    const first = continuation();
    expect(first.rememberSale(hint())).toBe(true);
    first.dispose();
    const second = continuation();
    expect(second.recoverSale(COURSE, "buyer")).toEqual({
      state: "ready",
      value: hint()
    });
    const raw = [...records.values()].join();
    for (const privateValue of [
      EMAIL,
      URL,
      "synthetic-auth",
      "Synthetic refund",
      "Synthetic course"
    ])
      expect(raw).not.toContain(privateValue);
    expect(api).not.toHaveBeenCalled();
  });
  it.each(["account", "course", "kind"])("does not hydrate another %s", (kind) => {
    const first = continuation();
    first.rememberSale(hint());
    if (kind === "account") auth.userId = "e".repeat(24);
    const second = continuation();
    expect(
      second.recoverSale(
        kind === "course" ? "f".repeat(24) : COURSE,
        kind === "kind" ? "creator" : "buyer"
      ).state
    ).toBe("empty");
  });
  it("does not overwrite a pending attempt or reset its expiry after status", () => {
    const value = continuation();
    value.rememberSale(hint());
    const old = JSON.parse([...records.values()][0]);
    now += 5000;
    expect(value.rememberSale({ ...hint(), attemptId: NEW_ATTEMPT })).toBe(false);
    expect(value.rememberSale({ ...hint(), giftId: GIFT })).toBe(true);
    const next = JSON.parse([...records.values()][0]);
    expect(next.expiresAt).toBe(old.expiresAt);
    expect(value.rememberSale({ ...hint(), giftId: "e".repeat(24) })).toBe(false);
  });
  it.each(["expired", "future", "extra", "recipient", "malformed", "oversized"])(
    "blocks %s recovery without treating it as a new gift",
    (kind) => {
      const value = continuation();
      value.rememberSale(hint());
      const key = [...records.keys()][0],
        record = JSON.parse(records.get(key)!);
      if (kind === "expired") now += GIFT_SALE_RECOVERY_MS;
      if (kind === "future") record.expiresAt += GIFT_SALE_RECOVERY_MS;
      if (kind === "extra") record.extra = true;
      if (kind === "recipient") record.value.email = EMAIL;
      records.set(
        key,
        kind === "malformed"
          ? "{"
          : kind === "oversized"
            ? "x".repeat(2049)
            : JSON.stringify(record)
      );
      const next = continuation();
      expect(next.recoverSale(COURSE, "buyer").state).toBe("blocked");
      expect(next.rememberSale(hint())).toBe(false);
    }
  );
  it("fails closed when storage reads are denied", () => {
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(continuation().recoverSale(COURSE, "buyer").state).toBe("blocked");
    expect(session().recovery().buyerBlocked).toBe(true);
  });
  it("discloses blocked writes while retaining only the same in-memory hint", () => {
    storage.setItem.mockImplementation(() => {
      throw new Error("denied");
    });
    const value = continuation();
    expect(value.rememberSale(hint())).toBe(false);
    expect(value.recoverSale(COURSE, "buyer").value).toEqual(hint());
  });
});

describe("R09-03F same-attempt session recovery", () => {
  it("late guard: blocks a second form from replacing the first buyer attempt", async () => {
    const first = session(),
      second = session(NEW_ATTEMPT);
    await first.reviewBuyer(EMAIL);
    replies["buyer/review"].checkoutAttemptId = NEW_ATTEMPT;
    await second.reviewBuyer(EMAIL);
    await first.reserveBuyer(request());
    await expect(
      second.reserveBuyer({ ...request(), checkoutAttemptId: NEW_ATTEMPT })
    ).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(1);
    expect(second.recovery().buyerBlocked).toBe(true);
  });
  it("late guard: blocks a second creator form from replacing an unresolved request", async () => {
    const first = session(),
      second = session();
    await first.reviewCreator();
    await second.reviewCreator();
    api.mockRejectedValueOnce(new Error());
    await expect(first.acceptCreator(true)).rejects.toThrow();
    makeId.mockReturnValueOnce(NEW_ATTEMPT);
    await expect(second.acceptCreator(true)).rejects.toThrow();
    expect(calls("creator/accept")).toHaveLength(1);
  });
  it("late guard: rechecks expired recovery before an already-open form retries", async () => {
    await unknownReservation();
    const next = session();
    api.mockRejectedValueOnce(new Error());
    await expect(next.readBuyerStatus()).rejects.toThrow();
    await next.reviewBuyer(EMAIL);
    now += GIFT_SALE_RECOVERY_MS;
    await expect(next.reserveBuyer(request())).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(1);
  });
  it("late guard: a new status read discards the outstanding retry confirmation", async () => {
    await unknownReservation();
    const next = session();
    api.mockRejectedValueOnce(new Error());
    await expect(next.readBuyerStatus()).rejects.toThrow();
    await next.reviewBuyer(EMAIL);
    await next.readBuyerStatus();
    await expect(next.reserveBuyer(request())).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(1);
  });
  it("late guard: a durable creator hint does not show a false storage-failure warning", async () => {
    await unknownConsent();
    const next = session();
    const view = render(
      <InternalCourseGiftSaleScreen
        mode="creator"
        session={next}
        onNavigateToCheckout={navigate}
      />
    );
    expect(view.queryByText(/Reload recovery was not saved/)).toBeNull();
    expect(next.reloadSaved()).toBe(true);
  });
  it("late guard: ordinary reservation and creator save still pass the fresh storage fence", async () => {
    const next = session();
    await next.reviewBuyer(EMAIL);
    await next.reserveBuyer(request());
    await next.reviewCreator();
    expect((await next.acceptCreator(true)).enabled).toBe(true);
    expect(calls("buyer/reserve")).toHaveLength(1);
    expect(calls("creator/accept")).toHaveLength(1);
  });
  it("hydrates the original attempt instead of a host-provided replacement, with no automatic call", async () => {
    await unknownReservation();
    api.mockClear();
    const next = session(NEW_ATTEMPT);
    expect(next.attemptId).toBe(ATTEMPT);
    expect(api).not.toHaveBeenCalled();
    await expect(next.reserveBuyer(request())).rejects.toThrow();
    await expect(next.reviewBuyer(EMAIL)).rejects.toThrow();
    await next.readBuyerStatus();
    await next.openCheckout();
    expect(calls("buyer/status")[0][1].body).toEqual({ checkoutAttemptId: ATTEMPT });
    expect(calls("buyer/reserve")).toHaveLength(0);
  });
  it("retries an unreadable reservation only after fresh matching review, using the identical request", async () => {
    await unknownReservation();
    const original = clone(calls("buyer/reserve")[0][1].body);
    const next = session();
    api.mockRejectedValueOnce(new Error("unknown status"));
    await expect(next.readBuyerStatus()).rejects.toThrow();
    expect(next.recovery().canReviewRetry).toBe(true);
    await expect(next.reserveBuyer(request())).rejects.toThrow();
    await next.reviewBuyer(EMAIL);
    await next.reserveBuyer(request());
    expect(calls("buyer/reserve").map(([, o]) => o.body)).toEqual([original, original]);
    expect(calls("buyer/checkout")).toHaveLength(0);
    await expect(next.reserveBuyer(request())).rejects.toThrow();
  });
  it("requires another review after each uncertain retry", async () => {
    await unknownReservation();
    const next = session();
    api.mockRejectedValueOnce(new Error());
    await expect(next.readBuyerStatus()).rejects.toThrow();
    await next.reviewBuyer(EMAIL);
    api.mockRejectedValueOnce(new Error());
    await expect(next.reserveBuyer(request())).rejects.toThrow();
    await expect(next.reserveBuyer(request())).rejects.toThrow();
    await expect(next.reviewBuyer(EMAIL)).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(2);
  });
  it("rejects changed recipient/price/terms material instead of creating a replacement attempt", async () => {
    await unknownReservation();
    const next = session();
    api.mockRejectedValueOnce(new Error());
    await expect(next.readBuyerStatus()).rejects.toThrow();
    replies["buyer/review"] = {
      ...quote(),
      recipientEmail: "other@example.invalid",
      reviewFingerprint: "e".repeat(64)
    };
    await expect(next.reviewBuyer("other@example.invalid")).rejects.toThrow();
    await expect(next.reserveBuyer(request())).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(1);
  });
  it("pins a known gift across reload before the first recovered status is cached", async () => {
    const first = session();
    await first.reviewBuyer(EMAIL);
    await first.reserveBuyer(request());
    first.dispose();
    const next = session();
    replies["buyer/status"].giftId = "e".repeat(24);
    await expect(next.readBuyerStatus()).rejects.toThrow();
    expect(next.recovery().canReviewRetry).toBe(false);
    replies["buyer/status"] = status();
    await expect(next.readBuyerStatus()).resolves.toEqual(status());
  });
  it("allows expired recovery to read status but never reserve again", async () => {
    await unknownReservation();
    now += GIFT_SALE_RECOVERY_MS;
    const next = session(NEW_ATTEMPT);
    expect(next.recovery().buyerBlocked).toBe(true);
    api.mockRejectedValueOnce(new Error());
    await expect(next.readBuyerStatus()).rejects.toThrow();
    await expect(next.reviewBuyer(EMAIL)).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(1);
    await next.readBuyerStatus();
    expect(next.attemptId).toBe(ATTEMPT);
  });
  it.each(["completed", "expired", "failed", "creating"])(
    "does not reopen checkout for recovered %s",
    async (checkoutStatus) => {
      await unknownReservation();
      const next = session();
      replies["buyer/status"].checkoutStatus = checkoutStatus;
      replies["buyer/status"].paymentRecorded = checkoutStatus === "completed";
      await next.readBuyerStatus();
      await expect(next.openCheckout()).rejects.toThrow();
      expect(calls("buyer/checkout")).toHaveLength(0);
    }
  );
  it("keeps unknown provider creation on the same gift after reload and status", async () => {
    const first = session();
    await first.reviewBuyer(EMAIL);
    await first.reserveBuyer(request());
    api.mockRejectedValueOnce(new Error());
    await expect(first.openCheckout()).rejects.toThrow();
    first.dispose();
    const next = session();
    await expect(next.openCheckout()).rejects.toThrow();
    replies["buyer/status"] = {
      ...status(),
      checkoutStatus: "creation_unknown",
      recoveryRequired: true
    };
    await next.readBuyerStatus();
    expect(await next.openCheckout()).toBe(URL);
    expect(calls("buyer/checkout").map(([, o]) => o.body)).toEqual([
      { giftId: GIFT },
      { giftId: GIFT }
    ]);
  });
  it("recovers a lost creator save with its original request and expected revision", async () => {
    await unknownConsent();
    const original = clone(calls("creator/accept")[0][1].body);
    const next = session();
    replies["creator/review"] = { ...creator(), consent: consent(), matchesPolicy: true };
    await expect(next.acceptCreator(true)).rejects.toThrow();
    await next.reviewCreator();
    await expect(next.acceptCreator(false)).rejects.toThrow();
    await next.acceptCreator(true);
    expect(calls("creator/accept").map(([, o]) => o.body)).toEqual([original, original]);
    expect(makeId).toHaveBeenCalledTimes(1);
    expect(session().recovery().creatorPending).toBe(false);
  });
  it("does not re-enable a revoked consent replay and resolves only the same marker", async () => {
    await unknownConsent();
    const next = session();
    await next.reviewCreator();
    replies["creator/accept"] = {
      ...consent(),
      enabled: false,
      revokedAt: new Date(now).toISOString(),
      replayed: true
    };
    expect((await next.acceptCreator(true)).enabled).toBe(false);
    expect(next.recovery().creatorPending).toBe(false);
    expect(calls("creator/revoke")).toHaveLength(0);
  });
  it("does not silently replace an unresolved creator request after policy rotation", async () => {
    await unknownConsent();
    const next = session();
    replies["creator/review"].policy.fingerprint = "e".repeat(64);
    expect((await next.reviewCreator()).canAccept).toBe(false);
    await expect(next.acceptCreator(true)).rejects.toThrow();
    expect(calls("creator/accept")).toHaveLength(1);
    expect(makeId).toHaveBeenCalledTimes(1);
  });
  it("requires resolving an ambiguous creator save before revoking another revision", async () => {
    await unknownConsent();
    const next = session();
    replies["creator/review"].consent = consent();
    await next.reviewCreator();
    await expect(next.revokeCreator(true)).rejects.toThrow();
    expect(calls("creator/revoke")).toHaveLength(0);
  });
  it("retains current read/revoke recovery after an uncertain revoke without new consent", async () => {
    const first = session();
    replies["creator/review"].consent = consent();
    await first.reviewCreator();
    api.mockRejectedValueOnce(new Error());
    await expect(first.revokeCreator(true)).rejects.toThrow();
    first.dispose();
    const next = session();
    await next.reviewCreator();
    await next.revokeCreator(true);
    expect(calls("creator/revoke").map(([, o]) => o.body.reference)).toEqual([
      "synthetic-consent",
      "synthetic-consent"
    ]);
    expect(calls("creator/accept")).toHaveLength(0);
  });
});

describe("R09-03F dormant authenticated host and recovery screens", () => {
  it("leaves public/native hosts inert, and mounting/reloading never sends a request", () => {
    expect(render(<CourseGiftSaleHost />).toJSON()).toBeNull();
    const view = render(host());
    expect(api).not.toHaveBeenCalled();
    view.unmount();
    expect(render(host()).getByLabelText("Gift recipient email")).toBeTruthy();
    jest.replaceProperty(Platform, "OS", "android");
    expect(render(host()).toJSON()).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
  it("survives Strict Mode effect cleanup/setup without a disposed form", async () => {
    const view = render(<React.StrictMode>{host()}</React.StrictMode>);
    fireEvent.changeText(view.getByLabelText("Gift recipient email"), EMAIL);
    await press(view, "Get current gift review");
    expect(view.getByText(`Recipient: ${EMAIL}`)).toBeTruthy();
    expect(calls("buyer/reserve")).toHaveLength(0);
  });
  it("shows status-only recovery first and requires a new unchecked confirmation for retry", async () => {
    await unknownReservation();
    const view = render(host());
    expect(view.queryByLabelText("Gift recipient email")).toBeNull();
    api.mockRejectedValueOnce(new Error());
    await press(view, "Check gift payment status");
    await press(view, "Review same reservation for retry");
    fireEvent.changeText(view.getByLabelText("Gift recipient email"), EMAIL);
    await press(view, "Review original recipient for retry");
    expect(
      view.getByLabelText("I reviewed the recipient and gift terms").props
        .accessibilityState.checked
    ).toBe(false);
    await press(view, "Continue to checkout");
    expect(calls("buyer/reserve")).toHaveLength(1);
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    await press(view, "Continue to checkout");
    expect(calls("buyer/reserve")).toHaveLength(2);
    expect(view.getByText("Open secure checkout")).toBeTruthy();
    expect(calls("buyer/checkout")).toHaveLength(0);
    await press(view, "Open secure checkout");
    expect(navigate).toHaveBeenCalledWith(URL);
  });
  it("requires unchecked creator consent after reload even if the lost save succeeded", async () => {
    await unknownConsent();
    replies["creator/review"] = { ...creator(), consent: consent(), matchesPolicy: true };
    const view = render(host("creator"));
    await press(view, "Review current gift permission");
    expect(
      view.getByLabelText("I agree to these gift terms for this course").props
        .accessibilityState.checked
    ).toBe(false);
    await press(view, "Retry same consent request");
    expect(calls("creator/accept")).toHaveLength(1);
    fireEvent.press(view.getByLabelText("I agree to these gift terms for this course"));
    await press(view, "Retry same consent request");
    expect(calls("creator/accept")).toHaveLength(2);
  });
  it.each([
    "account",
    "token",
    "workspace",
    "facility",
    "role",
    "verification",
    "pending",
    "signout",
    "course"
  ])("cancels in-flight review and hides stale fields after %s changes", async (kind) => {
    const view = render(host());
    fireEvent.changeText(view.getByLabelText("Gift recipient email"), EMAIL);
    const pending = deferred();
    api.mockReturnValueOnce(pending.promise);
    fireEvent.press(view.getByText("Get current gift review"));
    await act(async () => {
      await Promise.resolve();
    });
    const signal = calls("buyer/review")[0][1].signal;
    if (kind === "account") appAuth.user = { ...appAuth.user, id: "e".repeat(24) };
    if (kind === "token") appAuth.token = "different-synthetic-token";
    if (kind === "workspace") entitlements.mode = "commercial";
    if (kind === "facility") facility.selectedId = "f".repeat(24);
    if (kind === "role") entitlements.facilityRole = "VIEWER";
    if (kind === "verification") appAuth.user.emailVerified = false;
    if (kind === "pending") appAuth.meStatus = "loading";
    if (kind === "signout")
      appAuth = { ...appAuth, token: null, isAuthed: false, user: null };
    view.rerender(host("buyer", kind === "course" ? "f".repeat(24) : COURSE));
    await act(async () => {
      pending.resolve({ success: true, data: quote() });
    });
    expect(signal.aborted).toBe(true);
    expect(view.queryByText(`Recipient: ${EMAIL}`)).toBeNull();
    expect(view.queryByText("Continue to checkout")).toBeNull();
    expect(calls("buyer/reserve")).toHaveLength(0);
    expect(navigate).not.toHaveBeenCalled();
  });
  it("cancels a late checkout and never navigates after host unmount", async () => {
    const first = session();
    await first.reviewBuyer(EMAIL);
    await first.reserveBuyer(request());
    first.dispose();
    const view = render(host());
    await press(view, "Check gift payment status");
    const pending = deferred();
    api.mockReturnValueOnce(pending.promise);
    fireEvent.press(view.getByText("Open secure checkout"));
    await act(async () => {
      await Promise.resolve();
    });
    const signal = calls("buyer/checkout")[0][1].signal;
    view.unmount();
    await act(async () => {
      pending.resolve({ success: true, data: replies["buyer/checkout"] });
    });
    expect(signal.aborted).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
  it("surfaces blocked recovery without a replacement purchase control", () => {
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    const view = render(host());
    expect(view.getByText(/Recovery details are expired or unavailable/)).toBeTruthy();
    expect(view.queryByLabelText("Gift recipient email")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
  it("keeps gift request transport private and AI balances/account settings untouched", async () => {
    await unknownReservation();
    const next = session();
    await next.readBuyerStatus();
    for (const [url, options] of api.mock.calls) {
      expect(url.startsWith("/api/course-gifts/")).toBe(true);
      expect(options).toMatchObject({
        auth: false,
        invalidateOn401: false,
        notifyTransport: false,
        notifyTokenBalance: false,
        retries: 0,
        cache: "no-store",
        redirect: "error"
      });
    }
    expect(appAuth.user.plan).toBe("pro");
    expect(navigate).not.toHaveBeenCalled();
  });
});
