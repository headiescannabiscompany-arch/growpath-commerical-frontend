import {
  COURSE_GIFT_CLAIM_PATH,
  COURSE_GIFT_CHECKOUT_PATH,
  COURSE_GIFT_CHECKOUT_STORAGE_KEY,
  COURSE_GIFT_LINK_MEMORY_MS,
  courseGiftReturnPath,
  courseGiftCheckoutAttempt,
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";
import {
  courseGiftClient,
  createInternalCourseGiftClient,
  CourseGiftClientError,
  COURSE_GIFT_REQUEST_MS
} from "@/api/courseGiftClient";
import { filterMarketingEvent } from "@/analytics/marketingPolicy";
import { metadataForPathname } from "@/seo/publicRouteMetadata";

const token = "a".repeat(64);
const userId = "b".repeat(24);
const courseId = "c".repeat(24);
const giftId = "d".repeat(24);
const attempt = "synthetic-attempt-1234567890";
const ready = (): CourseGiftAuth => ({
  state: "ready",
  userId,
  sessionKey: "synthetic-session",
  emailVerified: true
});
const browser = (
  hash = `#token=${token}`,
  search = "",
  pathname = COURSE_GIFT_CLAIM_PATH
) => ({
  location: { pathname, search, hash },
  history: { replaceState: jest.fn() }
});
const review = () => ({
  giftId,
  courseId,
  courseTitle: "Synthetic course",
  recipient: "r***@example.invalid",
  claimExpiresAt: "2099-01-01T00:00:00.000Z",
  code: "COURSE_GIFT_TRANSACTION_REQUIRED"
});
const claim = () => ({
  action: "claimed",
  giftId,
  courseId,
  enrollmentId: "e".repeat(24)
});
const buyer = () => ({
  giftId,
  checkoutAttemptId: attempt,
  checkoutStatus: "open",
  paymentRecorded: false,
  recoveryRequired: false
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function fixture() {
  let auth = ready();
  const continuation = createCourseGiftContinuation();
  continuation.capture(browser());
  const getAccessToken = jest.fn().mockResolvedValue("synthetic-access-token");
  const invoke = jest.fn().mockResolvedValue(review());
  const options = {
    platform: "web" as const,
    continuation,
    auth: () => auth,
    getAccessToken,
    invoke
  };
  const client = createInternalCourseGiftClient(options);
  return {
    continuation,
    getAccessToken,
    invoke,
    options,
    client,
    setAuth: (next: CourseGiftAuth) => {
      auth = next;
    }
  };
}
let network: jest.SpyInstance;
beforeEach(() => {
  network = jest.spyOn(global, "fetch").mockImplementation(() => {
    throw new Error("No network");
  });
});
afterEach(() => {
  expect(network).not.toHaveBeenCalled();
  network.mockRestore();
  jest.useRealTimers();
});

describe("R09-03B1 private course gift continuation", () => {
  it.each([
    COURSE_GIFT_CLAIM_PATH,
    `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}`,
    `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}&result=return`,
    `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}&result=cancel`
  ])("accepts exact path %s", (path) => {
    expect(courseGiftReturnPath(path)).toBe(path);
    expect(courseGiftCheckoutAttempt(path)).toBe(
      path === COURSE_GIFT_CLAIM_PATH ? "" : attempt
    );
  });
  it.each([
    `${COURSE_GIFT_CLAIM_PATH}?token=${token}`,
    `${COURSE_GIFT_CLAIM_PATH}#token=${token}`,
    `${COURSE_GIFT_CLAIM_PATH}\n`,
    `https://growpathai.com${COURSE_GIFT_CLAIM_PATH}`,
    `/${COURSE_GIFT_CLAIM_PATH}`,
    [COURSE_GIFT_CLAIM_PATH],
    `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}&next=/admin`,
    `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}&attempt=${attempt}`,
    `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}&result=success`,
    `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}\n`
  ])("rejects ambiguous/private redirect %#", (path) => {
    expect(courseGiftReturnPath(path)).toBe("");
  });
  it("captures only after scrubbing, survives deliberate first sign-in in memory, and stores no raw token", () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn() };
    const continuation = createCourseGiftContinuation({ storage });
    const page = browser();
    expect(continuation.capture(page)).toBe(true);
    expect(page.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      COURSE_GIFT_CLAIM_PATH
    );
    expect(
      continuation.observe({
        ...ready(),
        state: "signed_out",
        userId: "",
        sessionKey: ""
      })
    ).toBe("");
    const scope = continuation.observe(ready());
    expect(continuation.tokenForScope(scope)).toBe(token);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(JSON.stringify(continuation)).not.toContain(token);
  });
  it.each([
    `#token=${token}&token=${token}`,
    `#token=${token}&next=/admin`,
    `#token=${token}\n`,
    `#token=${token.toUpperCase()}`,
    `#token=%61${token.slice(1)}`,
    "#token=short"
  ])("scrubs and rejects malformed fragment %#", (hash) => {
    const continuation = createCourseGiftContinuation();
    const page = browser(hash);
    expect(continuation.capture(page)).toBe(false);
    expect(page.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      COURSE_GIFT_CLAIM_PATH
    );
    expect(continuation.tokenForScope(continuation.observe(ready()))).toBe("");
  });
  it("rejects query secrets and scrub failures without retaining an earlier token", () => {
    const continuation = createCourseGiftContinuation();
    continuation.capture(browser());
    expect(continuation.capture(browser(`#token=${token}`, `?token=${token}`))).toBe(
      false
    );
    const blocked = browser();
    blocked.history.replaceState.mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    expect(continuation.capture(blocked)).toBe(false);
    expect(continuation.tokenForScope(continuation.observe(ready()))).toBe("");
  });
  it("does not touch unrelated pages", () => {
    const page = browser(`#token=${token}`, "", "/claim-gift");
    expect(createCourseGiftContinuation().capture(page)).toBe(false);
    expect(page.history.replaceState).not.toHaveBeenCalled();
  });
  it("clears a bound token on sign-out/account switch and allows a newly reopened invitation", () => {
    const continuation = createCourseGiftContinuation();
    continuation.capture(browser());
    continuation.observe(ready());
    continuation.observe({ ...ready(), state: "signed_out" });
    expect(continuation.tokenForScope(continuation.observe(ready()))).toBe("");
    continuation.observe({ ...ready(), state: "signed_out" });
    continuation.capture(browser());
    const next = { ...ready(), userId: "f".repeat(24), sessionKey: "new-session" };
    expect(continuation.tokenForScope(continuation.observe(next))).toBe(token);
    expect(continuation.tokenForScope(continuation.observe(ready()))).toBe("");
  });
  it("expires memory and never recovers a claim token from storage on reload", () => {
    let now = 1000;
    const storage = { getItem: jest.fn(), setItem: jest.fn() };
    const continuation = createCourseGiftContinuation({ now: () => now, storage });
    continuation.capture(browser());
    const scope = continuation.observe(ready());
    now += COURSE_GIFT_LINK_MEMORY_MS;
    expect(continuation.tokenForScope(scope)).toBe("");
    const reloaded = createCourseGiftContinuation({ storage });
    expect(reloaded.tokenForScope(reloaded.observe(ready()))).toBe("");
    expect(storage.getItem).not.toHaveBeenCalled();
  });
  it("recovers only the same account's opaque attempt, without email, token, or payment instructions", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      }
    };
    const first = createCourseGiftContinuation({ storage });
    first.observe(ready());
    expect(first.rememberCheckout(attempt)).toBe(true);
    const saved = storage.getItem(COURSE_GIFT_CHECKOUT_STORAGE_KEY)!;
    expect(Object.keys(JSON.parse(saved)).sort()).toEqual([
      "attempt",
      "expiresAt",
      "userId",
      "version"
    ]);
    expect(saved).not.toContain(token);
    const next = createCourseGiftContinuation({ storage });
    next.observe(ready());
    expect(next.recoverCheckout()).toBe(attempt);
    next.observe({ ...ready(), userId: "f".repeat(24) });
    expect(next.recoverCheckout()).toBe("");
  });
  it("rejects corrupt/expired recovery records and preserves same-instance fallback on storage failure", () => {
    let now = 1000;
    const storage = {
      getItem: jest.fn().mockReturnValue("bad-json"),
      setItem: jest.fn(() => {
        throw new Error("blocked");
      })
    };
    const continuation = createCourseGiftContinuation({ now: () => now, storage });
    continuation.observe(ready());
    expect(continuation.recoverCheckout()).toBe("");
    expect(continuation.rememberCheckout(attempt)).toBe(false);
    storage.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(continuation.recoverCheckout()).toBe(attempt);
    now += 60 * 60 * 1000;
    expect(continuation.recoverCheckout()).toBe("");
  });
  it.each([COURSE_GIFT_CLAIM_PATH, `${COURSE_GIFT_CHECKOUT_PATH}?attempt=${attempt}`])(
    "existing privacy defaults exclude %s",
    (path) => {
      const url = `https://growpathai.com${path}#token=${token}`;
      expect(
        filterMarketingEvent(
          { event: "$pageview", properties: { $current_url: url } },
          url
        )
      ).toBeNull();
      expect(metadataForPathname(path).index).toBe(false);
    }
  );
});

describe("R09-03B1 disabled bounded client", () => {
  it("keeps public and native clients closed before any credential or transport call", () => {
    const f = fixture();
    expect(() => courseGiftClient()).toThrow("COURSE_GIFTING_NOT_RELEASED");
    expect(() =>
      createInternalCourseGiftClient({ ...f.options, platform: "native" })
    ).toThrow("COURSE_GIFTING_NOT_RELEASED");
    expect(f.getAccessToken).not.toHaveBeenCalled();
    expect(f.invoke).not.toHaveBeenCalled();
  });
  it.each(["pending", "signed_out"] as const)(
    "makes no request with %s auth",
    async (state) => {
      const f = fixture();
      f.setAuth({ ...ready(), state });
      await expect(f.client.reviewRecipient()).rejects.toThrow(
        "COURSE_GIFT_SIGN_IN_REQUIRED"
      );
      expect(f.getAccessToken).not.toHaveBeenCalled();
      expect(f.invoke).not.toHaveBeenCalled();
    }
  );
  it("sends token only in a protected body with no retry/cache/redirect, and projects safe preview fields", async () => {
    const f = fixture();
    f.invoke.mockResolvedValue({
      ...review(),
      rawToken: token,
      email: "private@example.invalid",
      lessons: ["private"]
    });
    expect(await f.client.reviewRecipient()).toEqual(review());
    expect(f.invoke.mock.calls[0][0]).toMatchObject({
      operation: "recipient_review",
      body: { token },
      authorization: "synthetic-access-token",
      retries: 0,
      cache: "no-store",
      redirect: "error"
    });
    expect(f.invoke).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...review(), recipient: "private@example.invalid" },
    { ...review(), giftId: `${giftId}\n` },
    { ...review(), code: token },
    { ...review(), claimExpiresAt: "tomorrow" }
  ])("rejects malformed preview %#", async (row) => {
    const f = fixture();
    f.invoke.mockResolvedValue(row);
    await expect(f.client.reviewRecipient()).rejects.toThrow(
      "COURSE_GIFT_RESPONSE_INVALID"
    );
  });
  it("requires fresh review, verified email and a literal confirmation before claim", async () => {
    const f = fixture();
    await expect(f.client.claimRecipient({ confirmed: true })).rejects.toThrow(
      "COURSE_GIFT_FRESH_REVIEW_REQUIRED"
    );
    await f.client.reviewRecipient();
    await expect(f.client.claimRecipient({ confirmed: false })).rejects.toThrow(
      "COURSE_GIFT_FRESH_REVIEW_REQUIRED"
    );
    f.setAuth({ ...ready(), emailVerified: false });
    await expect(f.client.claimRecipient({ confirmed: true })).rejects.toThrow(
      "COURSE_GIFT_FRESH_REVIEW_REQUIRED"
    );
    expect(f.invoke).toHaveBeenCalledTimes(1);
  });
  it("explicit claim returns only bound access fields and clears the token", async () => {
    const f = fixture();
    await f.client.reviewRecipient();
    f.invoke.mockResolvedValue({ ...claim(), token, notes: "private" });
    expect(await f.client.claimRecipient({ confirmed: true })).toEqual(claim());
    expect(f.continuation.tokenForScope(f.continuation.observe(ready()))).toBe("");
    await expect(f.client.claimRecipient({ confirmed: true })).rejects.toThrow(
      "COURSE_GIFT_FRESH_REVIEW_REQUIRED"
    );
  });
  it("sanitizes a lost claim, requires recheck, and preserves the original gift binding through read errors", async () => {
    const f = fixture();
    await f.client.reviewRecipient();
    f.invoke.mockRejectedValue(new Error(`private ${token}`));
    await expect(f.client.claimRecipient({ confirmed: true })).rejects.toThrow(
      /^COURSE_GIFT_REQUEST_UNKNOWN$/
    );
    await expect(f.client.claimRecipient({ confirmed: true })).rejects.toThrow(
      "COURSE_GIFT_FRESH_REVIEW_REQUIRED"
    );
    await expect(f.client.reviewRecipient()).rejects.toThrow(
      "COURSE_GIFT_REQUEST_UNKNOWN"
    );
    f.invoke.mockResolvedValue({ ...review(), giftId: "f".repeat(24) });
    await expect(f.client.reviewRecipient()).rejects.toThrow(
      "COURSE_GIFT_RESPONSE_INVALID"
    );
  });
  it("does not leak even a forged client-error code from transport", async () => {
    const f = fixture();
    f.invoke.mockRejectedValue(new CourseGiftClientError(token));
    await expect(f.client.reviewRecipient()).rejects.toThrow(
      /^COURSE_GIFT_REQUEST_UNKNOWN$/
    );
  });
  it("sanitizes authentication adapter failures before any credential or transport call", async () => {
    const f = fixture();
    const client = createInternalCourseGiftClient({
      ...f.options,
      auth: () => {
        throw new Error(`private ${token}`);
      }
    });
    await expect(client.reviewRecipient()).rejects.toThrow(
      /^COURSE_GIFT_SIGN_IN_REQUIRED$/
    );
    expect(f.getAccessToken).not.toHaveBeenCalled();
    expect(f.invoke).not.toHaveBeenCalled();
  });
  it("single-flights requests and rejects late results after session change", async () => {
    const f = fixture();
    const pending = deferred<unknown>();
    f.invoke.mockReturnValue(pending.promise);
    const reading = f.client.reviewRecipient();
    const outcome = expect(reading).rejects.toThrow("COURSE_GIFT_SESSION_CHANGED");
    await Promise.resolve();
    await Promise.resolve();
    await expect(f.client.readBuyerStatus(attempt)).rejects.toThrow(
      "COURSE_GIFT_REQUEST_BUSY"
    );
    f.setAuth({ ...ready(), sessionKey: "changed" });
    pending.resolve(review());
    await outcome;
    expect(f.invoke).toHaveBeenCalledTimes(1);
  });
  it("does not dispatch after identity changed during credential retrieval", async () => {
    const f = fixture();
    const pending = deferred<string>();
    f.getAccessToken.mockReturnValue(pending.promise);
    const reading = f.client.reviewRecipient();
    const outcome = expect(reading).rejects.toThrow("COURSE_GIFT_SESSION_CHANGED");
    f.setAuth({ ...ready(), userId: "f".repeat(24) });
    pending.resolve("synthetic-access-token");
    await outcome;
    expect(f.invoke).not.toHaveBeenCalled();
  });
  it.each(["credential", "transport"])(
    "bounds the complete %s wait and discards late success",
    async (stage) => {
      jest.useFakeTimers();
      const f = fixture();
      const pending = deferred<any>();
      if (stage === "credential") f.getAccessToken.mockReturnValue(pending.promise);
      else f.invoke.mockReturnValue(pending.promise);
      const reading = f.client.reviewRecipient();
      const outcome = expect(reading).rejects.toThrow("COURSE_GIFT_REQUEST_UNKNOWN");
      await jest.advanceTimersByTimeAsync(COURSE_GIFT_REQUEST_MS);
      await outcome;
      pending.resolve(stage === "credential" ? "synthetic-access-token" : review());
      await Promise.resolve();
      await Promise.resolve();
      expect(f.invoke).toHaveBeenCalledTimes(stage === "credential" ? 0 : 1);
      expect(jest.getTimerCount()).toBe(0);
    }
  );
  it("dispose cancels a hanging operation and clears private continuation", async () => {
    jest.useFakeTimers();
    const f = fixture();
    f.getAccessToken.mockReturnValue(new Promise(() => {}));
    const reading = f.client.reviewRecipient();
    const outcome = expect(reading).rejects.toThrow("COURSE_GIFT_REQUEST_CANCELED");
    f.client.dispose();
    await outcome;
    expect(f.invoke).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
  it("buyer return is a read of the same attempt, not enrollment or another checkout", async () => {
    const f = fixture();
    f.invoke.mockResolvedValue({
      ...buyer(),
      email: "private",
      enrollmentId: "private",
      url: "private"
    });
    expect(await f.client.readBuyerStatus(attempt)).toEqual(buyer());
    expect(f.invoke.mock.calls[0][0]).toMatchObject({
      operation: "buyer_status",
      body: { checkoutAttemptId: attempt }
    });
    f.invoke.mockResolvedValue({ ...buyer(), giftId: "f".repeat(24) });
    await expect(f.client.readBuyerStatus(attempt)).rejects.toThrow(
      "COURSE_GIFT_RESPONSE_INVALID"
    );
  });
  it("rejects invalid/mismatched checkout attempts without inventing payment results", async () => {
    const f = fixture();
    await expect(f.client.readBuyerStatus(`${attempt}\n`)).rejects.toThrow(
      "COURSE_GIFT_ATTEMPT_INVALID"
    );
    expect(f.invoke).not.toHaveBeenCalled();
    f.invoke.mockResolvedValue({
      ...buyer(),
      checkoutAttemptId: "different-attempt-1234567890"
    });
    await expect(f.client.readBuyerStatus(attempt)).rejects.toThrow(
      "COURSE_GIFT_RESPONSE_INVALID"
    );
  });
  it.each(["paid", token, "completed\n"])(
    "rejects unknown checkout state %#",
    async (checkoutStatus) => {
      const f = fixture();
      f.invoke.mockResolvedValue({ ...buyer(), checkoutStatus });
      await expect(f.client.readBuyerStatus(attempt)).rejects.toThrow(
        "COURSE_GIFT_RESPONSE_INVALID"
      );
    }
  );
});
