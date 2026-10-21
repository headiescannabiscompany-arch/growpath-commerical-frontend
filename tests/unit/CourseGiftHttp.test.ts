import { getToken } from "@/auth/tokenStore";
import { apiRequest, setOnUnauthorized, subscribeToApiTransport } from "@/api/apiRequest";
import { subscribeToTokenBalanceChange } from "@/utils/tokenBalanceEvents";
import { courseGiftClient, COURSE_GIFT_REQUEST_MS } from "@/api/courseGiftClient";
import {
  createInternalCourseGiftHttpClient,
  invokeCourseGiftHttp
} from "@/api/courseGiftHttp";
import {
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";
jest.mock("@/auth/tokenStore", () => ({ getToken: jest.fn() }));
const token = "a".repeat(64);
const attempt = "a0000000-0000-4000-8000-000000000001";
const ready = (): CourseGiftAuth => ({
  state: "ready",
  userId: "b".repeat(24),
  sessionKey: "synthetic",
  emailVerified: true
});
const review = () => ({
  giftId: "c".repeat(24),
  courseId: "d".repeat(24),
  courseTitle: "Synthetic course",
  recipient: "l***@example.invalid",
  claimExpiresAt: "2099-01-01T00:00:00.000Z",
  code: "COURSE_GIFT_TRANSACTION_REQUIRED"
});
const response = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  headers: { get: () => "application/json" },
  text: async () => JSON.stringify(data)
});
const request = (more: any = {}) => ({
  operation: "recipient_review" as const,
  body: { token },
  authorization: "synthetic-auth",
  signal: new AbortController().signal,
  retries: 0 as const,
  cache: "no-store" as const,
  redirect: "error" as const,
  ...more
});
let fetchMock: jest.SpyInstance;
let transport: jest.Mock, balances: jest.Mock, unauthorized: jest.Mock;
let offTransport: () => void, offBalances: () => void;
beforeEach(() => {
  fetchMock = jest
    .spyOn(global, "fetch")
    .mockResolvedValue(response({ success: true, data: review() }) as any);
  transport = jest.fn();
  balances = jest.fn();
  unauthorized = jest.fn();
  offTransport = subscribeToApiTransport(transport);
  offBalances = subscribeToTokenBalanceChange(balances);
  setOnUnauthorized(unauthorized);
});
afterEach(() => {
  expect(getToken).not.toHaveBeenCalled();
  expect(unauthorized).not.toHaveBeenCalled();
  offTransport();
  offBalances();
  setOnUnauthorized(null);
  fetchMock.mockRestore();
  jest.useRealTimers();
});
describe("R09-03B2 unmounted protected HTTP adapter", () => {
  it("construction and disabled public/native entry do not read credentials or call fetch", () => {
    const opts = {
      platform: "web" as const,
      continuation: createCourseGiftContinuation(),
      auth: ready,
      getAccessToken: jest.fn()
    };
    createInternalCourseGiftHttpClient(opts);
    expect(() => courseGiftClient()).toThrow("COURSE_GIFTING_NOT_RELEASED");
    expect(() =>
      createInternalCourseGiftHttpClient({ ...opts, platform: "native" })
    ).toThrow("COURSE_GIFTING_NOT_RELEASED");
    expect(opts.getAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["recipient_review", "recipient_claim", "buyer_status"])(
    "maps only %s to an exact POST endpoint with private body",
    async (operation) => {
      const body =
        operation === "buyer_status" ? { checkoutAttemptId: attempt } : { token };
      await invokeCourseGiftHttp(request({ operation, body }));
      const [url, options] = fetchMock.mock.calls[0];
      const suffix = {
        recipient_review: "recipient/review",
        recipient_claim: "recipient/claim",
        buyer_status: "buyer/status"
      }[operation];
      expect(url).toMatch(new RegExp(`/api/course-gifts/${suffix}$`));
      expect(url).not.toContain(token);
      expect(url).not.toContain(attempt);
      expect(options).toMatchObject({
        method: "POST",
        headers: {
          Authorization: "Bearer synthetic-auth",
          "Content-Type": "application/json"
        },
        cache: "no-store",
        redirect: "error",
        body: JSON.stringify(body)
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(transport).not.toHaveBeenCalled();
    }
  );
  it.each([
    { operation: "toString" },
    { operation: "checkout_create" },
    { body: { token, userId: "private" } },
    { body: { token: `${token}\n` } },
    { authorization: "secret\r\nprivate" },
    { authorization: "" }
  ])("rejects malformed request %# without fetch", async (more) => {
    await expect(invokeCourseGiftHttp(request(more))).rejects.toThrow(/^COURSE_GIFT_/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([401, 403, 409, 500, 503])(
    "sanitizes HTTP %s without signing out or retrying",
    async (status) => {
      fetchMock.mockResolvedValue(
        response(
          { success: false, error: { code: token, message: "private" } },
          status
        ) as any
      );
      await expect(invokeCourseGiftHttp(request())).rejects.toThrow(
        status === 401 ? "COURSE_GIFT_SIGN_IN_REQUIRED" : "COURSE_GIFT_REQUEST_UNKNOWN"
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(transport).not.toHaveBeenCalled();
    }
  );
  it.each([
    null,
    { success: false },
    { success: true, data: [] },
    { success: true, data: "private" }
  ])("rejects invalid envelope %#", async (data) => {
    fetchMock.mockResolvedValue(response(data) as any);
    await expect(invokeCourseGiftHttp(request())).rejects.toThrow(
      "COURSE_GIFT_REQUEST_UNKNOWN"
    );
  });
  it("private gift reads cannot publish AI balance hints", async () => {
    fetchMock.mockResolvedValue(
      response({
        success: true,
        data: { ...review(), aiCreditsUsed: 4 },
        aiTokensRemaining: 0
      }) as any
    );
    await invokeCourseGiftHttp(request());
    expect(balances).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it.each([undefined, true])(
    "affected shared transport keeps ordinary balance notification default %s",
    async (notifyTokenBalance) => {
      fetchMock.mockResolvedValue(response({ aiTokensRemaining: 37 }) as any);
      await apiRequest("/api/synthetic-shared-contract", {
        auth: false,
        notifyTokenBalance,
        notifyTransport: false
      });
      expect(balances).toHaveBeenCalledWith(37);
    }
  );
  it("affected shared transport can suppress consumed-credit hints without hiding the response", async () => {
    fetchMock.mockResolvedValue(response({ aiCreditsUsed: 3 }) as any);
    expect(
      await apiRequest("/api/synthetic-shared-contract", {
        auth: false,
        notifyTokenBalance: false,
        notifyTransport: false
      })
    ).toEqual({ aiCreditsUsed: 3 });
    expect(balances).not.toHaveBeenCalled();
  });
  it("already canceled calls never send", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      invokeCourseGiftHttp(request({ signal: controller.signal }))
    ).rejects.toThrow("COURSE_GIFT_REQUEST_CANCELED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("HTTP timeout includes a stalled response body and leaves global state untouched", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      async (_url, options: any) =>
        ({
          ok: true,
          status: 200,
          text: () =>
            new Promise((_, reject) =>
              options.signal.addEventListener("abort", () =>
                reject(Object.assign(new Error(token), { name: "AbortError" }))
              )
            )
        }) as any
    );
    const result = expect(invokeCourseGiftHttp(request())).rejects.toThrow(
      "COURSE_GIFT_REQUEST_UNKNOWN"
    );
    await jest.advanceTimersByTimeAsync(COURSE_GIFT_REQUEST_MS);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    expect(balances).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it("new HTTP integration discards a parsed result after account change", async () => {
    let auth = ready();
    let finish!: (value: string) => void;
    const continuation = createCourseGiftContinuation();
    continuation.capture({
      location: { pathname: "/claim-course-gift", search: "", hash: `#token=${token}` },
      history: { replaceState: jest.fn() }
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        })
    } as any);
    const client = createInternalCourseGiftHttpClient({
      platform: "web",
      continuation,
      auth: () => auth,
      getAccessToken: async () => "synthetic-auth"
    });
    const result = expect(client.reviewRecipient()).rejects.toThrow(
      "COURSE_GIFT_SESSION_CHANGED"
    );
    for (let count = 0; count < 6; count += 1) await Promise.resolve();
    auth = { ...ready(), sessionKey: "different-session" };
    finish(JSON.stringify({ success: true, data: review() }));
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
