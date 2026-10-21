import { Platform } from "react-native";
import { apiRequest, ApiError } from "@/api/apiRequest";
import { getToken } from "@/auth/tokenStore";
import { startAuthentication } from "@simplewebauthn/browser";
import { clearAdminStepUp, verifyAdminPasskey } from "@/api/adminPasskeys";
import {
  courseCheckoutSupportClient,
  createInternalCourseCheckoutSupportClient,
  createInternalCourseCheckoutSupportHistoryClient,
  createInternalCourseGiftSupportReferenceClient,
  createInternalCourseGiftDeliveryReviewClient,
  COURSE_CHECKOUT_SUPPORT_REQUEST_MS
} from "@/api/courseCheckoutSupportClient";

jest.mock("@/api/apiRequest", () => {
  const actual = jest.requireActual("@/api/apiRequest");
  return { ...actual, apiRequest: jest.fn() };
});
jest.mock("@/auth/tokenStore", () => ({ getToken: jest.fn() }));
jest.mock("@simplewebauthn/browser", () => ({ startAuthentication: jest.fn() }));

const call = apiRequest as jest.Mock;
const token = getToken as jest.Mock;
const authenticate = startAuthentication as jest.Mock;
const attempt = "11111111-1111-4111-8111-111111111111";
const operationId = "22222222-2222-4222-8222-222222222222";
type Kind = "courseGift" | "commercialCourse";
const input = (kind: Kind = "courseGift") => {
  const gift = kind === "courseGift";
  return {
    [gift ? "giftId" : "courseId"]: "a".repeat(24),
    [gift ? "purchaserUserId" : "buyerUserId"]: "b".repeat(24),
    checkoutAttemptId: attempt,
    sessionId: "cs_test_synthetic",
    operationId,
    reason: "Review original synthetic checkout evidence",
    confirmation: `RECOVER ${gift ? "COURSE GIFT" : "COURSE CHECKOUT"} ${"a".repeat(24)} ${attempt} cs_test_synthetic`
  };
};
const result = (kind: Kind = "courseGift") => ({
  success: true,
  data: {
    [kind === "courseGift" ? "giftId" : "courseId"]: "a".repeat(24),
    checkoutAttemptId: attempt,
    operationId,
    outcome: "bound_for_review"
  }
});
const pending = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const clients: ReturnType<typeof createInternalCourseCheckoutSupportClient>[] = [];
const make = () => {
  const client = createInternalCourseCheckoutSupportClient({ platform: "web" });
  clients.push(client);
  return client;
};
const originalOS = Platform.OS;
describe("R09-06AN reference and delivery clients", () => {
  const requestId = "33333333-3333-4333-8333-333333333333";
  const referenceBody = () => ({
    giftId: "a".repeat(24),
    purchaserUserId: "b".repeat(24),
    checkoutAttemptId: attempt,
    issuanceRequestId: requestId,
    action: "recover_course_gift_exact_open_session"
  });
  const referenceReply = () => ({
    success: true,
    data: {
      operationId,
      issuanceRequestId: requestId,
      status: "reference_issued",
      originalEvidenceVerified: false,
      recoveryAuthorized: false,
      schedulingChanged: false,
      activationAllowed: false
    }
  });
  function reference() {
    const c = createInternalCourseGiftSupportReferenceClient({ platform: "web" });
    clients.push(c);
    return c;
  }
  function delivery() {
    const c = createInternalCourseGiftDeliveryReviewClient({ platform: "web" });
    clients.push(c);
    return c;
  }
  const deliveryBody = () => ({
    giftId: "a".repeat(24),
    purchaserUserId: "b".repeat(24),
    checkoutAttemptId: attempt,
    operationId,
    expectedStateVersion: 0,
    expectedGeneration: 1
  });
  const deliveryReply = () => ({
    success: true,
    data: {
      status: "technical_review_only",
      snapshotOnly: true,
      observedStateVersion: 0,
      observedGeneration: 1,
      requiresOriginalEvidence: true,
      originalEvidenceVerified: false,
      restorationAuthorized: false,
      schedulingChanged: false,
      activationAllowed: false
    }
  });
  it("issues only on explicit confirmation and uses quiet bound transport", async () => {
    const c = reference();
    c.prepare("courseGift", referenceBody());
    expect(call).not.toHaveBeenCalled();
    await expect(c.submit(true)).rejects.toThrow("STEP_UP_REQUIRED");
    await verified();
    await expect(c.submit(false)).rejects.toThrow("CONFIRMATION_REQUIRED");
    call.mockResolvedValue(referenceReply());
    expect((await c.submit(true)).reference).toEqual(referenceReply().data);
    expect(call).toHaveBeenCalledWith(
      "/api/course-gifts/support/gift/reference",
      expect.objectContaining({
        body: referenceBody(),
        retries: 0,
        notifyTokenBalance: false,
        notifyTransport: false,
        cache: "no-store",
        redirect: "error"
      })
    );
    const count = call.mock.calls.length;
    await c.submit(true);
    expect(call).toHaveBeenCalledTimes(count);
  });
  it("retries only the same frozen issuance after lost reply and renewed proof", async () => {
    await verified();
    const c = reference();
    c.prepare("courseGift", referenceBody());
    call.mockRejectedValueOnce(new Error("private diagnostic"));
    expect((await c.submit(true)).status).toBe("uncertain");
    expect(() =>
      c.prepare("courseGift", { ...referenceBody(), issuanceRequestId: attempt })
    ).toThrow("REQUEST_FROZEN");
    clearAdminStepUp();
    await expect(c.submit(true)).rejects.toThrow("STEP_UP_REQUIRED");
    await verified();
    call.mockResolvedValue(referenceReply());
    expect((await c.submit(true)).reference?.operationId).toBe(operationId);
    expect(call.mock.calls[0][1].body).toEqual(referenceBody());
  });
  it("timeout drops late replies without generating another reference", async () => {
    await verified();
    const c = reference();
    c.prepare("courseGift", referenceBody());
    const wait = pending<any>();
    call.mockReturnValue(wait.promise);
    const task = c.submit(true);
    await jest.advanceTimersByTimeAsync(20_000);
    expect((await task).status).toBe("uncertain");
    wait.resolve(referenceReply());
    await Promise.resolve();
    expect(c.snapshot().reference).toBeNull();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it("account changes discard reference and late replies", async () => {
    await verified();
    const c = reference();
    c.prepare("courseGift", referenceBody());
    const wait = pending<any>();
    call.mockReturnValue(wait.promise);
    const task = c.submit(true);
    const rejection = expect(task).rejects.toThrow("SESSION_CHANGED");
    await Promise.resolve();
    clearAdminStepUp({ accountChanged: true });
    wait.resolve(referenceReply());
    await rejection;
    expect(c.snapshot()).toMatchObject({ status: "disposed", reference: null });
  });
  it.each(["extra", "authority", "request", "getter"])(
    "rejects unsafe reference result %s",
    async (fault) => {
      await verified();
      const c = reference();
      c.prepare("courseGift", referenceBody());
      const value: any = referenceReply(),
        getter = jest.fn(() => operationId);
      if (fault === "extra") value.data.email = "private@example.invalid";
      if (fault === "authority") value.data.recoveryAuthorized = true;
      if (fault === "request") value.data.issuanceRequestId = attempt;
      if (fault === "getter")
        Object.defineProperty(value.data, "operationId", {
          enumerable: true,
          get: getter
        });
      call.mockResolvedValue(value);
      expect((await c.submit(true)).status).toBe("uncertain");
      expect(getter).not.toHaveBeenCalled();
    }
  );
  it("delivery assessment uses exact version and clears on a new preparation", async () => {
    await verified();
    const c = delivery();
    c.prepare("courseGift", deliveryBody());
    call.mockResolvedValue(deliveryReply());
    expect((await c.submit(true)).deliveryReview).toEqual(deliveryReply().data);
    c.clearHistory();
    expect(c.snapshot().deliveryReview).toBeNull();
    c.prepare("courseGift", { ...deliveryBody(), expectedStateVersion: 1 });
    expect((await c.submit(true)).status).toBe("uncertain");
    expect(call.mock.calls[0][0]).toBe("/api/course-gifts/support/gift/delivery-review");
  });
  it("reference is hidden on proof loss and all state is lost on reload", async () => {
    await verified();
    const c = reference();
    c.prepare("courseGift", referenceBody());
    call.mockResolvedValue(referenceReply());
    await c.submit(true);
    clearAdminStepUp();
    expect(c.snapshot().reference).toBeNull();
    c.dispose();
    const fresh = reference();
    expect(fresh.snapshot().status).toBe("empty");
    expect(fresh.snapshot().reference).toBeNull();
  });
  it("native, mismatched kind and private extra input stay closed", () => {
    expect(() =>
      createInternalCourseGiftSupportReferenceClient({ platform: "native" })
    ).toThrow("NOT_RELEASED");
    expect(() =>
      createInternalCourseGiftDeliveryReviewClient({ platform: "native" })
    ).toThrow("NOT_RELEASED");
    const c = reference(),
      d = delivery();
    expect(() => c.prepare("commercialCourse", referenceBody())).toThrow("INPUT_INVALID");
    expect(() =>
      c.prepare("courseGift", { ...referenceBody(), sessionId: "cs_private" })
    ).toThrow("INPUT_INVALID");
    expect(() =>
      d.prepare("courseGift", { ...deliveryBody(), expectedStateVersion: "0" })
    ).toThrow("INPUT_INVALID");
    expect(call).not.toHaveBeenCalled();
  });
});
const originalGlobals = ["window", "navigator", "PublicKeyCredential"].map(
  (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const
);
let fetchGuard: jest.SpyInstance;
async function verified() {
  call.mockResolvedValueOnce({
    challengeId: "synthetic",
    optionsJSON: { challenge: "synthetic" }
  });
  call.mockResolvedValueOnce({
    stepUpToken: "s".repeat(43),
    expiresAt: new Date(Date.now() + 300_000).toISOString()
  });
  authenticate.mockResolvedValue({ id: "synthetic-assertion" });
  await verifyAdminPasskey();
  call.mockClear();
  token.mockClear();
}
beforeEach(() => {
  jest.useFakeTimers();
  clearAdminStepUp({ accountChanged: true });
  token.mockResolvedValue("synthetic-bearer");
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { isSecureContext: true }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { credentials: { create: jest.fn(), get: jest.fn() } }
  });
  Object.defineProperty(globalThis, "PublicKeyCredential", {
    configurable: true,
    value: function () {}
  });
  fetchGuard = jest.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("Network prohibited");
  });
});
afterEach(() => {
  clients.splice(0).forEach((client) => client.dispose());
  clearAdminStepUp({ accountChanged: true });
  expect(fetchGuard).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  fetchGuard.mockRestore();
  Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  jest.useRealTimers();
});

describe("R09-06H dormant history client", () => {
  const makeHistory = () => {
    const client = createInternalCourseCheckoutSupportHistoryClient({ platform: "web" });
    clients.push(client);
    return client;
  };
  const refs = (kind: Kind = "courseGift") => {
    const { sessionId, reason, confirmation, ...body } = input(kind);
    return body;
  };
  const history = (status = "unknown") => ({
    success: true,
    data: { status, historicalOnly: true, requiresOriginalEvidence: true }
  });
  it.each<Kind>(["courseGift", "commercialCourse"])(
    "reads %s without recovery fields or writes",
    async (kind) => {
      await verified();
      const c = makeHistory();
      c.prepare(kind, refs(kind));
      expect(call).not.toHaveBeenCalled();
      call.mockResolvedValue(history("binding_recorded"));
      const next = await c.submit(true);
      expect(next.status).toBe("history_read");
      expect(next.history).toEqual(history("binding_recorded").data);
      expect(call).toHaveBeenCalledTimes(1);
      expect(call.mock.calls[0][0]).toBe(
        `/api/course-gifts/support/${kind === "courseGift" ? "gift" : "commercial-course"}/history`
      );
      expect(call.mock.calls[0][1]).toMatchObject({
        body: refs(kind),
        method: "POST",
        retries: 0,
        cache: "no-store",
        redirect: "error",
        invalidateOn401: false,
        notifyTokenBalance: false,
        notifyTransport: false,
        headers: { "X-Admin-Step-Up": "s".repeat(43) }
      });
      expect(JSON.stringify(next)).not.toContain(attempt);
      expect(JSON.stringify(next)).not.toContain(operationId);
    }
  );
  it.each(["unknown", "request_recorded", "binding_recorded"])(
    "retains historical %s without payment inference",
    async (status) => {
      await verified();
      const c = makeHistory();
      c.prepare("courseGift", refs());
      call.mockResolvedValue(history(status));
      expect((await c.submit(true)).history).toEqual(history(status).data);
    }
  );
  it.each(["sessionId", "reason", "confirmation", "actorUserId"])(
    "rejects extra %s before transport",
    (key) => {
      const c = makeHistory();
      expect(() => c.prepare("courseGift", { ...refs(), [key]: "private" })).toThrow(
        "INPUT_INVALID"
      );
      expect(call).not.toHaveBeenCalled();
    }
  );
  it("native stays closed and proof/explicit request are required", async () => {
    expect(() =>
      createInternalCourseCheckoutSupportHistoryClient({ platform: "native" })
    ).toThrow("NOT_RELEASED");
    const c = makeHistory();
    c.prepare("courseGift", refs());
    await expect(c.submit(true)).rejects.toThrow("STEP_UP_REQUIRED");
    await verified();
    await expect(c.submit(false)).rejects.toThrow("CONFIRMATION_REQUIRED");
    expect(call).not.toHaveBeenCalled();
  });
  it.each([
    { success: true, data: { ...history().data, status: "paid" } },
    { success: true, data: { ...history().data, reason: "private" } },
    { success: true, data: { ...history().data, historicalOnly: false } }
  ])("rejects expanded or misleading replies %#", async (reply) => {
    await verified();
    const c = makeHistory();
    c.prepare("courseGift", refs());
    call.mockResolvedValue(reply);
    const next = await c.submit(true);
    expect(next.status).toBe("uncertain");
    expect(next.history).toBeNull();
  });
  it("serializes reads and allows only deliberate fresh history after completion", async () => {
    await verified();
    const c = makeHistory();
    c.prepare("courseGift", refs());
    const late = pending();
    call.mockReturnValue(late.promise);
    const first = c.submit(true);
    await expect(c.submit(true)).rejects.toThrow("BUSY");
    expect(() => c.prepare("commercialCourse", refs("commercialCourse"))).toThrow("BUSY");
    late.resolve(history());
    await first;
    expect(call).toHaveBeenCalledTimes(1);
    c.prepare("commercialCourse", refs("commercialCourse"));
    expect(c.snapshot().history).toBeNull();
    expect(call).toHaveBeenCalledTimes(1);
    call.mockResolvedValue(history("request_recorded"));
    expect((await c.submit(true)).history?.status).toBe("request_recorded");
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("timeout discards late history and never retries", async () => {
    await verified();
    const c = makeHistory();
    c.prepare("courseGift", refs());
    const late = pending();
    call.mockReturnValue(late.promise);
    const first = c.submit(true);
    await Promise.resolve();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(COURSE_CHECKOUT_SUPPORT_REQUEST_MS + 1);
    expect((await first).status).toBe("uncertain");
    late.resolve(history("binding_recorded"));
    await Promise.resolve();
    await Promise.resolve();
    expect(c.snapshot().history).toBeNull();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it("same-account proof replacement cancels a read without replay", async () => {
    await verified();
    const c = makeHistory();
    c.prepare("courseGift", refs());
    const late = pending();
    call.mockReturnValue(late.promise);
    const first = c.submit(true);
    await Promise.resolve();
    await Promise.resolve();
    clearAdminStepUp();
    expect((await first).status).toBe("uncertain");
    late.resolve(history("binding_recorded"));
    await Promise.resolve();
    expect(c.snapshot().history).toBeNull();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it("account changes dispose pending history and ignore late records", async () => {
    await verified();
    const c = makeHistory();
    c.prepare("courseGift", refs());
    const late = pending();
    call.mockReturnValue(late.promise);
    const first = c.submit(true);
    await Promise.resolve();
    await Promise.resolve();
    clearAdminStepUp({ accountChanged: true });
    await expect(first).rejects.toThrow("SESSION_CHANGED");
    late.resolve(history("binding_recorded"));
    await Promise.resolve();
    expect(c.snapshot().status).toBe("disposed");
    expect(c.snapshot().history).toBeNull();
  });
  it("clears a completed lookup without changing recovery continuation", async () => {
    await verified();
    const c = makeHistory();
    c.prepare("courseGift", refs());
    call.mockResolvedValue(history());
    await c.submit(true);
    expect(c.clearHistory().status).toBe("empty");
    expect(c.snapshot().history).toBeNull();
    const recovery = make();
    recovery.prepare("courseGift", input());
    expect(() => recovery.clearHistory()).toThrow("INPUT_INVALID");
    expect(recovery.snapshot().status).toBe("prepared");
  });
});

describe("R09-06D dormant private support client", () => {
  it("public and native entries stay closed", () => {
    expect(() => (courseCheckoutSupportClient as any)({ enabled: true })).toThrow(
      "NOT_RELEASED"
    );
    expect(() =>
      createInternalCourseCheckoutSupportClient({ platform: "native" })
    ).toThrow("NOT_RELEASED");
    expect(call).not.toHaveBeenCalled();
  });
  it("construction and preparation do not probe credentials or transport", () => {
    const c = make();
    expect(c.snapshot().status).toBe("empty");
    expect(c.prepare("courseGift", input()).status).toBe("prepared");
    expect(token).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });
  it("requires fresh existing step-up before any request", async () => {
    const c = make();
    c.prepare("courseGift", input());
    await expect(c.submit(true)).rejects.toThrow("STEP_UP_REQUIRED");
    expect(call).not.toHaveBeenCalled();
  });
  it("requires a deliberate literal confirmation", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    await expect(c.submit(false)).rejects.toThrow("CONFIRMATION_REQUIRED");
    await expect(c.submit("true" as any)).rejects.toThrow("CONFIRMATION_REQUIRED");
    expect(call).not.toHaveBeenCalled();
  });
  it.each<Kind>(["courseGift", "commercialCourse"])(
    "uses exact %s POST and real existing proof wrapper",
    async (kind) => {
      await verified();
      const c = make();
      c.prepare(kind, input(kind));
      call.mockResolvedValue(result(kind));
      expect((await c.submit(true)).status).toBe("bound_for_review");
      expect(call).toHaveBeenCalledTimes(1);
      const [path, options] = call.mock.calls[0];
      expect(path).toBe(
        `/api/course-gifts/support/${kind === "courseGift" ? "gift" : "commercial-course"}/recover`
      );
      expect(options).toMatchObject({
        method: "POST",
        body: input(kind),
        auth: false,
        headers: {
          Authorization: "Bearer synthetic-bearer",
          "X-Admin-Step-Up": "s".repeat(43),
          "Content-Type": "application/json"
        },
        retries: 0,
        cache: "no-store",
        redirect: "error",
        responseType: "json",
        timeoutMs: COURSE_CHECKOUT_SUPPORT_REQUEST_MS,
        invalidateOn401: false,
        notifyTransport: false,
        notifyTokenBalance: false
      });
      expect(Object.isFrozen(options.body)).toBe(true);
    }
  );
  it.each([
    ["extra field", (b: any) => ({ ...b, amount: 100 })],
    ["wrong target", (b: any) => ({ ...b, giftId: "guessed" })],
    ["wrong buyer", (b: any) => ({ ...b, purchaserUserId: "" })],
    ["wrong attempt", (b: any) => ({ ...b, checkoutAttemptId: "new-attempt" })],
    ["wrong operation", (b: any) => ({ ...b, operationId: "new-operation" })],
    [
      "URL instead of Session",
      (b: any) => ({ ...b, sessionId: "https://example.invalid" })
    ],
    ["oversized Session", (b: any) => ({ ...b, sessionId: `cs_${"x".repeat(253)}` })],
    ["brief reason", (b: any) => ({ ...b, reason: "too short" })],
    [
      "control character",
      (b: any) => ({ ...b, reason: "Original request\nneeds review" })
    ],
    ["padded reason", (b: any) => ({ ...b, reason: ` ${b.reason}` })],
    [
      "oversized reason",
      (b: any) => ({ ...b, reason: `Review original ${"x".repeat(1000)}` })
    ],
    ["wrong typed confirmation", (b: any) => ({ ...b, confirmation: "yes" })]
  ])("rejects %s without transport or stale prepared input", (_label, change) => {
    const c = make();
    c.prepare("courseGift", input());
    expect(() => c.prepare("courseGift", change(input()))).toThrow("INPUT_INVALID");
    expect(c.snapshot().status).toBe("empty");
    expect(call).not.toHaveBeenCalled();
  });
  it("rejects getters without executing them and refuses unknown operations", () => {
    const c = make();
    const body = input();
    const getter = jest.fn(() => "secret");
    Object.defineProperty(body, "reason", { enumerable: true, get: getter });
    expect(() => c.prepare("courseGift", body)).toThrow("INPUT_INVALID");
    expect(getter).not.toHaveBeenCalled();
    expect(() => c.prepare("refund" as any, input())).toThrow("INPUT_INVALID");
  });
  it.each(["target", "attempt", "operation", "outcome", "private-extra"])(
    "withholds mismatched %s replies",
    async (field) => {
      await verified();
      const c = make();
      c.prepare("courseGift", input());
      const reply: any = result();
      const key = (
        {
          target: "giftId",
          attempt: "checkoutAttemptId",
          operation: "operationId",
          outcome: "outcome",
          "private-extra": "sessionUrl"
        } as any
      )[field];
      reply.data[key] = "private-mismatch";
      call.mockResolvedValue(reply);
      expect(await c.submit(true)).toMatchObject({
        status: "uncertain",
        code: "UNKNOWN"
      });
      expect(JSON.stringify(c.snapshot())).not.toContain("private-mismatch");
    }
  );
  it("prevents duplicate in-flight submissions and candidate replacement", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    const wait = pending<any>();
    call.mockReturnValue(wait.promise);
    const first = c.submit(true);
    await expect(c.submit(true)).rejects.toThrow("BUSY");
    expect(() => c.prepare("courseGift", input())).toThrow("BUSY");
    wait.resolve(result());
    await first;
    expect(call).toHaveBeenCalledTimes(1);
  });
  it("freezes the exact original body and reason across uncertain explicit retries", async () => {
    await verified();
    const c = make();
    const original = input();
    c.prepare("courseGift", original);
    original.reason = "Different private operator reason";
    call.mockRejectedValueOnce(new Error("raw private provider payload"));
    expect(await c.submit(true)).toMatchObject({ status: "uncertain", code: "UNKNOWN" });
    expect(() => c.prepare("courseGift", original)).toThrow("REQUEST_FROZEN");
    const body = call.mock.calls[0][1].body;
    expect(body).toEqual(input());
    call.mockResolvedValueOnce(result());
    expect((await c.submit(true)).status).toBe("bound_for_review");
    expect(call.mock.calls[1][1].body).toBe(body);
    await c.submit(true);
    expect(call).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(c.snapshot())).not.toMatch(
      /reason|sessionId|operationId|synthetic|payload/
    );
  });
  it.each([
    [403, "COURSE_CHECKOUT_SUPPORT_DENIED", "DENIED"],
    [503, "COURSE_CHECKOUT_SUPPORT_NOT_RELEASED", "NOT_RELEASED"],
    [401, "PRIVATE_AUTH_ERROR", "UNKNOWN"]
  ])("keeps %s failure private and uncertain", async (status, code, expected) => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    call.mockRejectedValue(
      new ApiError(code as string, status as number, { secret: "never expose" })
    );
    expect(await c.submit(true)).toMatchObject({ status: "uncertain", code: expected });
    expect(() => c.prepare("courseGift", input())).toThrow("REQUEST_FROZEN");
  });
  it("bounds stalled credential lookup and ignores its late reply", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    const wait = pending<string>();
    token.mockReturnValueOnce(wait.promise);
    const first = c.submit(true);
    await jest.advanceTimersByTimeAsync(COURSE_CHECKOUT_SUPPORT_REQUEST_MS);
    expect(await first).toMatchObject({ status: "uncertain", code: "UNKNOWN" });
    expect(call).not.toHaveBeenCalled();
    clearAdminStepUp();
    wait.resolve("synthetic-bearer");
    await jest.advanceTimersByTimeAsync(0);
    expect(c.snapshot().status).toBe("uncertain");
    expect(call).not.toHaveBeenCalled();
  });
  it("aborts timeout, ignores late transport success and retains same-operation retry", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    const wait = pending<any>();
    call.mockReturnValueOnce(wait.promise);
    const first = c.submit(true);
    await jest.advanceTimersByTimeAsync(0);
    const body = call.mock.calls[0][1].body;
    await jest.advanceTimersByTimeAsync(COURSE_CHECKOUT_SUPPORT_REQUEST_MS);
    expect((await first).status).toBe("uncertain");
    expect(call.mock.calls[0][1].signal.aborted).toBe(true);
    call.mockResolvedValueOnce(result());
    await c.submit(true);
    wait.resolve(result());
    await jest.advanceTimersByTimeAsync(0);
    expect(c.snapshot().status).toBe("bound_for_review");
    expect(call.mock.calls[1][1].body).toBe(body);
  });
  it("same-account lock/renewal retains request without automatic replay", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    call.mockRejectedValueOnce(new Error("unknown"));
    await c.submit(true);
    const body = call.mock.calls[0][1].body;
    clearAdminStepUp();
    await expect(c.submit(true)).rejects.toThrow("STEP_UP_REQUIRED");
    call.mockReset();
    await verified();
    expect(call).not.toHaveBeenCalled();
    call.mockResolvedValue(result());
    await c.submit(true);
    expect(call.mock.calls[0][1].body).toBe(body);
  });
  it("account change clears candidate and rejects late success", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    const wait = pending<any>();
    call.mockReturnValueOnce(wait.promise);
    const first = c.submit(true);
    const denied = expect(first).rejects.toThrow("SESSION_CHANGED");
    await jest.advanceTimersByTimeAsync(0);
    clearAdminStepUp({ accountChanged: true });
    await denied;
    wait.resolve(result());
    await jest.advanceTimersByTimeAsync(0);
    expect(c.snapshot()).toEqual({ status: "disposed", code: null, needsStepUp: false });
    expect(() => c.prepare("courseGift", input())).toThrow("SESSION_CHANGED");
  });
  it("changed bearer cannot reuse the existing proof or send a support request", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    token.mockResolvedValue("another-synthetic-bearer");
    expect(await c.submit(true)).toMatchObject({
      status: "uncertain",
      needsStepUp: true
    });
    expect(call).not.toHaveBeenCalled();
  });
  it("proof expiry blocks a prepared operation without renewing credentials", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    await jest.advanceTimersByTimeAsync(300_001);
    await expect(c.submit(true)).rejects.toThrow("STEP_UP_REQUIRED");
    expect(call).not.toHaveBeenCalled();
  });
  it("dispose cancels an in-flight request and a new instance has no recovery state", async () => {
    await verified();
    const c = make();
    c.prepare("courseGift", input());
    const wait = pending<any>();
    call.mockReturnValueOnce(wait.promise);
    const first = c.submit(true);
    const denied = expect(first).rejects.toThrow("SESSION_CHANGED");
    await jest.advanceTimersByTimeAsync(0);
    c.dispose();
    await denied;
    expect(call.mock.calls[0][1].signal.aborted).toBe(true);
    wait.reject(new Error("private late failure"));
    await jest.advanceTimersByTimeAsync(0);
    expect(make().snapshot().status).toBe("empty");
  });
});
