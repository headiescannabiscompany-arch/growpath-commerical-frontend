import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { apiRequest } from "@/api/apiRequest";
import { CourseGiftBuyerPanel } from "@/components/courseGifts/CourseGiftPanels";
import CourseGiftEntry from "@/components/courseGifts/CourseGiftPanels";
import {
  createInternalCourseGiftSaleHttpSession,
  InternalCourseGiftSaleScreen
} from "@/components/courseGifts/CourseGiftSaleScreens";
import {
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";
import { safeGiftCheckoutUrl } from "@/api/courseGiftSaleContract";
jest.mock("@/api/apiRequest", () => ({
  apiRequest: jest.fn(),
  ApiError: class extends Error {}
}));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
const COURSE = "a".repeat(24),
  GIFT = "b".repeat(24);
const ATTEMPT = "a0000000-0000-4000-8000-000000000001";
const REQUEST = "b0000000-0000-4000-8000-000000000001";
const EMAIL = "synthetic@example.invalid",
  HASH = "c".repeat(64);
const URL = "https://checkout.stripe.com/c/pay/cs_test_synthetic#synthetic";
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const quote = () => ({
  version: "course-gift-sale-review-v1" as const,
  courseId: COURSE,
  checkoutAttemptId: ATTEMPT,
  recipientEmail: EMAIL,
  reviewFingerprint: HASH,
  title: "Synthetic course",
  amountCents: 2500,
  currency: "usd" as const,
  terms: {
    version: "synthetic-policy",
    expiry: "Synthetic expiry terms",
    duplicateAccess: "Synthetic duplicate terms",
    courseUnavailable: "Synthetic unavailable terms",
    refund: "Synthetic refund terms"
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
  policyVersion: quote().terms.version
});
let auth: CourseGiftAuth,
  session: ReturnType<typeof createInternalCourseGiftSaleHttpSession>;
let replies: Record<string, any>, token: jest.Mock, newId: jest.Mock, navigate: jest.Mock;
let storage: { getItem: jest.Mock; setItem: jest.Mock }, fetchGuard: jest.SpyInstance;
const api = apiRequest as jest.Mock;
const path = (suffix: string) => `/api/course-gifts/${suffix}`;
const calls = (suffix: string) => api.mock.calls.filter(([url]) => url === path(suffix));
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "web");
  fetchGuard = jest.spyOn(global, "fetch").mockImplementation(() => {
    throw new Error("No network");
  });
  auth = {
    state: "ready",
    userId: "d".repeat(24),
    sessionKey: "synthetic-session",
    emailVerified: true
  };
  storage = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };
  token = jest.fn().mockResolvedValue("synthetic-auth");
  newId = jest.fn().mockReturnValue(REQUEST);
  navigate = jest.fn();
  replies = {
    "creator/review": creator(),
    "creator/accept": consent(),
    "creator/revoke": {
      ...consent(),
      enabled: false,
      revokedAt: "2026-10-16T02:00:00.000Z"
    },
    "buyer/review": quote(),
    "buyer/reserve": status(),
    "buyer/status": status(),
    "buyer/checkout": {
      giftId: GIFT,
      checkoutAttemptId: ATTEMPT,
      checkoutStatus: "open",
      url: URL
    }
  };
  api.mockImplementation(async (url: string) => ({
    success: true,
    data: clone(replies[url.replace("/api/course-gifts/", "")])
  }));
  session = createInternalCourseGiftSaleHttpSession({
    platform: "web",
    continuation: createCourseGiftContinuation({ storage }),
    auth: () => auth,
    getAccessToken: token,
    courseId: COURSE,
    attemptId: ATTEMPT,
    newRequestId: newId
  });
});
afterEach(() => {
  session.dispose();
  expect(fetchGuard).not.toHaveBeenCalled();
  fetchGuard.mockRestore();
  jest.useRealTimers();
});
async function press(view: ReturnType<typeof render>, label: string) {
  await act(async () => {
    fireEvent.press(view.getByText(label));
  });
}
function screen(mode: "creator" | "buyer") {
  return render(
    <InternalCourseGiftSaleScreen
      mode={mode}
      session={session}
      onNavigateToCheckout={navigate}
    />
  );
}
async function reserve() {
  await session.reviewBuyer(EMAIL);
  return session.reserveBuyer(request());
}
describe("R09-03E internal creator and buyer screens", () => {
  it("hides a private form when the host rerenders after a session change", async () => {
    const view = screen("buyer");
    fireEvent.changeText(view.getByLabelText("Gift recipient email"), EMAIL);
    await press(view, "Get current gift review");
    auth.sessionKey = "changed-session";
    view.rerender(
      <InternalCourseGiftSaleScreen
        mode="buyer"
        session={session}
        onNavigateToCheckout={navigate}
      />
    );
    expect(view.toJSON()).toBeNull();
    expect(calls("buyer/reserve")).toHaveLength(0);
  });
  it("keeps public/native entries inert and construction request-free", () => {
    expect(render(<CourseGiftEntry />).toJSON()).toBeNull();
    jest.replaceProperty(Platform, "OS", "android");
    expect(screen("buyer").toJSON()).toBeNull();
    expect(api).not.toHaveBeenCalled();
    expect(token).not.toHaveBeenCalled();
  });
  it("loads creator terms, requires explicit acceptance and saves through the HTTP binding", async () => {
    const view = screen("creator");
    expect(api).not.toHaveBeenCalled();
    await press(view, "Review current gift permission");
    expect(view.getByText("Synthetic creator terms")).toBeTruthy();
    expect(view.getByText("Save gift consent").parent).toBeTruthy();
    await press(view, "Save gift consent");
    expect(calls("creator/accept")).toHaveLength(0);
    fireEvent.press(view.getByLabelText("I agree to these gift terms for this course"));
    await press(view, "Save gift consent");
    expect(calls("creator/accept")[0][1].body).toEqual({
      courseId: COURSE,
      requestId: REQUEST,
      policyReference: "synthetic-policy",
      policyFingerprint: HASH,
      expectedConsentRef: null,
      accepted: true
    });
    expect(view.getByText(/Consent saved/)).toBeTruthy();
    expect(view.queryByText("Save gift consent")).toBeNull();
  });
  it("permits confirmed revocation when approved terms are unavailable", async () => {
    replies["creator/review"] = {
      ...creator(),
      policy: null,
      canAccept: false,
      consent: consent()
    };
    const view = screen("creator");
    await press(view, "Review current gift permission");
    expect(view.queryByText("Save gift consent")).toBeNull();
    await press(view, "Revoke gift consent");
    expect(calls("creator/revoke")).toHaveLength(0);
    fireEvent.press(view.getByLabelText("I want to revoke gift consent for this course"));
    await press(view, "Revoke gift consent");
    expect(calls("creator/revoke")[0][1].body).toEqual({
      courseId: COURSE,
      reference: "synthetic-consent",
      confirmed: true
    });
    expect(view.getByText(/does not refund existing payments/)).toBeTruthy();
  });
  it("renders server recipient/price/all terms and separates reservation from checkout", async () => {
    const view = screen("buyer");
    fireEvent.changeText(
      view.getByLabelText("Gift recipient email"),
      " Synthetic@Example.invalid "
    );
    await press(view, "Get current gift review");
    expect(view.getByText(`Recipient: ${EMAIL}`)).toBeTruthy();
    expect(view.getByText("Refunds: Synthetic refund terms")).toBeTruthy();
    expect(view.getByText("One course: USD 25.00")).toBeTruthy();
    expect(calls("buyer/reserve")).toHaveLength(0);
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    await press(view, "Continue to checkout");
    expect(calls("buyer/reserve")[0][1].body).toEqual({
      ...request(),
      reviewFingerprint: HASH,
      accepted: true
    });
    expect(calls("buyer/checkout")).toHaveLength(0);
    await press(view, "Open secure checkout");
    expect(calls("buyer/checkout")[0][1].body).toEqual({ giftId: GIFT });
    expect(navigate).toHaveBeenCalledWith(URL);
    expect(JSON.stringify(storage.setItem.mock.calls)).not.toContain(EMAIL);
    // R09-03F retains an opaque review fingerprint for same-attempt recovery,
    // never the reviewed recipient, terms, price, credentials or checkout URL.
    expect(JSON.stringify(storage.setItem.mock.calls)).not.toContain("Synthetic refund terms");
    expect(JSON.stringify(storage.setItem.mock.calls)).not.toContain(URL);
  });
  it("requires a new server review after editing recipient", async () => {
    const view = screen("buyer");
    fireEvent.changeText(view.getByLabelText("Gift recipient email"), EMAIL);
    await press(view, "Get current gift review");
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    await press(view, "Edit recipient");
    expect(view.queryByText("Continue to checkout")).toBeNull();
    await press(view, "Get current gift review");
    expect(
      view.getByLabelText("I reviewed the recipient and gift terms").props
        .accessibilityState.checked
    ).toBe(false);
    expect(calls("buyer/review")).toHaveLength(2);
  });
  it("discloses unavailable reload recovery without changing the original attempt", async () => {
    storage.setItem.mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const view = screen("buyer");
    fireEvent.changeText(view.getByLabelText("Gift recipient email"), EMAIL);
    await press(view, "Get current gift review");
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    await press(view, "Continue to checkout");
    expect(view.getByText(/Reload recovery was not saved/)).toBeTruthy();
    expect(calls("buyer/reserve")).toHaveLength(1);
  });
  it("does not navigate from a late checkout reply after leaving the screen", async () => {
    const view = screen("buyer");
    fireEvent.changeText(view.getByLabelText("Gift recipient email"), EMAIL);
    await press(view, "Get current gift review");
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    await press(view, "Continue to checkout");
    const pending = deferred();
    api.mockImplementation(() => pending.promise);
    fireEvent.press(view.getByText("Open secure checkout"));
    view.unmount();
    await act(async () => {
      pending.resolve({ success: true, data: replies["buyer/checkout"] });
    });
    expect(navigate).not.toHaveBeenCalled();
  });
  it("preserves the affected legacy panel's explicit confirmation path", async () => {
    const onCheckout = jest.fn().mockResolvedValue(status());
    const view = render(
      <CourseGiftBuyerPanel
        scopeKey="legacy-synthetic"
        availability="ready"
        quote={quote()}
        onCheckout={onCheckout}
        onRefresh={jest.fn()}
      />
    );
    fireEvent.changeText(view.getByLabelText("Recipient email"), EMAIL);
    await press(view, "Review gift");
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    await press(view, "Continue to checkout");
    expect(onCheckout).toHaveBeenCalledWith(request());
    expect(view.queryByText("Open secure checkout")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
});
describe("R09-03E session, transport and uncertainty guards", () => {
  it.each([
    "courseId",
    "checkoutAttemptId",
    "recipientEmail",
    "reviewFingerprint",
    "terms"
  ])("rejects changed or incomplete quote %s", async (field) => {
    replies["buyer/review"][field] =
      field === "terms" ? { ...quote().terms, refund: "" } : "wrong";
    await expect(session.reviewBuyer(EMAIL)).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(0);
  });
  it("projects only approved fields and isolates returned snapshots", async () => {
    replies["buyer/review"].privateSecret = "not-for-screen";
    const result = await session.reviewBuyer(EMAIL);
    expect(result).not.toHaveProperty("privateSecret");
    result.recipientEmail = "changed@example.invalid";
    result.terms.version = "changed";
    await session.reserveBuyer(request());
    expect(calls("buyer/reserve")[0][1].body.recipientEmail).toBe(EMAIL);
  });
  it("uses exact private POST options without ordinary balance or sign-out events", async () => {
    await session.reviewBuyer(EMAIL);
    const options = calls("buyer/review")[0][1];
    expect(options).toMatchObject({
      method: "POST",
      auth: false,
      invalidateOn401: false,
      notifyTransport: false,
      notifyTokenBalance: false,
      retries: 0,
      cache: "no-store",
      redirect: "error",
      timeoutMs: 20000
    });
    expect(options.headers.Authorization).toBe("Bearer synthetic-auth");
    expect(calls("buyer/review")[0][0]).not.toContain(EMAIL);
  });
  it("requires review and rejects changed reservation recipient or policy", async () => {
    await expect(session.reserveBuyer(request())).rejects.toThrow();
    await session.reviewBuyer(EMAIL);
    await expect(
      session.reserveBuyer({ ...request(), recipientEmail: "other@example.invalid" })
    ).rejects.toThrow();
    await expect(
      session.reserveBuyer({ ...request(), policyVersion: "changed" })
    ).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(0);
  });
  it("uses status-only recovery after an uncertain reservation", async () => {
    await session.reviewBuyer(EMAIL);
    api.mockRejectedValueOnce(new Error("secret"));
    await expect(session.reserveBuyer(request())).rejects.toThrow(
      "COURSE_GIFT_REQUEST_UNKNOWN"
    );
    await expect(session.reserveBuyer(request())).rejects.toThrow();
    await expect(session.reviewBuyer(EMAIL)).rejects.toThrow();
    await session.readBuyerStatus();
    await session.openCheckout();
    expect(calls("buyer/reserve")).toHaveLength(1);
    expect(calls("buyer/status")[0][1].body).toEqual({ checkoutAttemptId: ATTEMPT });
  });
  it("rechecks status before recovering the same uncertain checkout", async () => {
    await reserve();
    api.mockRejectedValueOnce(new Error("private provider error"));
    await expect(session.openCheckout()).rejects.toThrow();
    await expect(session.openCheckout()).rejects.toThrow();
    replies["buyer/status"].checkoutStatus = "creation_unknown";
    replies["buyer/status"].recoveryRequired = true;
    await session.readBuyerStatus();
    expect(await session.openCheckout()).toBe(URL);
    expect(calls("buyer/checkout").map(([, options]) => options.body)).toEqual([
      { giftId: GIFT },
      { giftId: GIFT }
    ]);
  });
  it.each(["completed", "expired", "failed", "creating"])(
    "does not open checkout in %s state",
    async (state) => {
      await reserve();
      replies["buyer/status"].checkoutStatus = state;
      await session.readBuyerStatus();
      await expect(session.openCheckout()).rejects.toThrow();
      expect(calls("buyer/checkout")).toHaveLength(0);
    }
  );
  it("does not open checkout for a recorded payment", async () => {
    replies["buyer/reserve"].paymentRecorded = true;
    await reserve();
    await expect(session.openCheckout()).rejects.toThrow();
  });
  it("rejects mismatched status/checkout gift identities", async () => {
    await reserve();
    replies["buyer/status"].giftId = "e".repeat(24);
    await expect(session.readBuyerStatus()).rejects.toThrow();
    await expect(session.openCheckout()).rejects.toThrow();
    expect(calls("buyer/checkout")).toHaveLength(0);
    replies["buyer/status"] = status();
    await session.readBuyerStatus();
    replies["buyer/checkout"].giftId = "e".repeat(24);
    await expect(session.openCheckout()).rejects.toThrow();
  });
  it.each([
    "https://evil.invalid/c/pay/a",
    "https://checkout.stripe.com.evil.invalid/c/pay/a",
    "javascript:alert(1)",
    "https://user@checkout.stripe.com/c/pay/a",
    "http://checkout.stripe.com/c/pay/a",
    "https://checkout.stripe.com/not-checkout"
  ])("rejects an unsafe checkout URL %s", async (url) => {
    expect(safeGiftCheckoutUrl(url)).toBe("");
    await reserve();
    replies["buyer/checkout"].url = url;
    await expect(session.openCheckout()).rejects.toThrow();
  });
  it.each(["account", "session", "verification", "signout"])(
    "rejects stale state after %s changes",
    async (change) => {
      await session.reviewBuyer(EMAIL);
      if (change === "account") auth.userId = "e".repeat(24);
      if (change === "session") auth.sessionKey = "other";
      if (change === "verification") auth.emailVerified = false;
      if (change === "signout") auth.state = "signed_out";
      await expect(session.reserveBuyer(request())).rejects.toThrow();
      expect(calls("buyer/reserve")).toHaveLength(0);
    }
  );
  it("rejects a late quote and duplicate requests while pending", async () => {
    const pending = deferred();
    api.mockImplementation(() => pending.promise);
    const read = session.reviewBuyer(EMAIL);
    await expect(session.reviewBuyer(EMAIL)).rejects.toThrow();
    await Promise.resolve();
    auth.sessionKey = "other";
    pending.resolve({ success: true, data: quote() });
    await expect(read).rejects.toThrow();
    expect(calls("buyer/reserve")).toHaveLength(0);
  });
  it("bounds credential lookup and transport time without retries", async () => {
    jest.useFakeTimers();
    token.mockImplementation(() => new Promise(() => {}));
    const read = session.reviewBuyer(EMAIL);
    const rejection = expect(read).rejects.toThrow("COURSE_GIFT_REQUEST_UNKNOWN");
    await jest.advanceTimersByTimeAsync(20001);
    await rejection;
    expect(api).not.toHaveBeenCalled();
  });
  it("requires fresh creator review after uncertainty and preserves the same save request", async () => {
    await session.reviewCreator();
    api.mockRejectedValueOnce(new Error("lost save"));
    await expect(session.acceptCreator(true)).rejects.toThrow();
    await expect(session.acceptCreator(true)).rejects.toThrow();
    await session.reviewCreator();
    await session.acceptCreator(true);
    expect(calls("creator/accept").map(([, options]) => options.body.requestId)).toEqual([
      REQUEST,
      REQUEST
    ]);
    expect(newId).toHaveBeenCalledTimes(1);
  });
  it("requires fresh explicit creator consent after policy changes", async () => {
    await session.reviewCreator();
    await expect(session.acceptCreator(false)).rejects.toThrow();
    replies["creator/review"].policy.fingerprint = "e".repeat(64);
    await session.reviewCreator();
    await session.acceptCreator(true);
    expect(calls("creator/accept")[0][1].body.policyFingerprint).toBe("e".repeat(64));
  });
  it("does not interpret an idempotent revoked save as consent enabled", async () => {
    await session.reviewCreator();
    replies["creator/accept"] = {
      ...consent(),
      enabled: false,
      replayed: true,
      revokedAt: "2026-10-16T02:00:00.000Z"
    };
    expect((await session.acceptCreator(true)).enabled).toBe(false);
  });
  it("disposal aborts pending work and blocks new actions", async () => {
    api.mockImplementation(() => new Promise(() => {}));
    const read = session.reviewBuyer(EMAIL);
    const rejection = expect(read).rejects.toThrow();
    session.dispose();
    await rejection;
    await expect(session.reviewCreator()).rejects.toThrow();
  });
});
