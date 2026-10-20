import { ApiError } from "./apiRequest";
import {
  adminVaultRequest,
  getAdminSecurityEpoch,
  getAdminSecurityIdentityEpoch,
  getAdminStepUpExpiry,
  subscribeAdminSecurity
} from "./adminPasskeys";
import { giftObjectId, giftUuid } from "./courseGiftSaleContract";

export const COURSE_CHECKOUT_SUPPORT_REQUEST_MS = 20_000;
const PATHS = Object.freeze({
  courseGift: "/api/course-gifts/support/gift/recover",
  commercialCourse: "/api/course-gifts/support/commercial-course/recover"
});
const HISTORY_PATHS = Object.freeze({
  courseGift: "/api/course-gifts/support/gift/history",
  commercialCourse: "/api/course-gifts/support/commercial-course/history"
});
export type CourseGiftSupportReference = Readonly<{
  operationId: string;
  issuanceRequestId: string;
  status: "reference_issued";
  originalEvidenceVerified: false;
  recoveryAuthorized: false;
  schedulingChanged: false;
  activationAllowed: false;
}>;
export type CourseGiftDeliveryReview = Readonly<{
  status: "technical_review_only";
  snapshotOnly: true;
  observedStateVersion: number;
  observedGeneration: number;
  requiresOriginalEvidence: true;
  originalEvidenceVerified: false;
  restorationAuthorized: false;
  schedulingChanged: false;
  activationAllowed: false;
}>;
type Mode = "recovery" | "history" | "reference" | "delivery";
export type CourseCheckoutSupportHistory = Readonly<{
  status: "unknown" | "request_recorded" | "binding_recorded";
  historicalOnly: true;
  requiresOriginalEvidence: true;
}>;
type Operation = keyof typeof PATHS;
type Body = Readonly<Record<string, string | number>>;
type Status =
  | "empty"
  | "prepared"
  | "pending"
  | "uncertain"
  | "bound_for_review"
  | "history_read"
  | "reference_issued"
  | "technical_review_only"
  | "disposed";
type Code =
  | "NOT_RELEASED"
  | "INPUT_INVALID"
  | "CONFIRMATION_REQUIRED"
  | "BUSY"
  | "REQUEST_FROZEN"
  | "STEP_UP_REQUIRED"
  | "SESSION_CHANGED"
  | "DENIED"
  | "UNKNOWN";

export class CourseCheckoutSupportError extends Error {
  constructor(public readonly code: Code) {
    super(`COURSE_CHECKOUT_SUPPORT_${code}`);
    this.name = "CourseCheckoutSupportError";
  }
}
const fail = (code: Code): never => {
  throw new CourseCheckoutSupportError(code);
};

// Inspect only own data properties; do not invoke caller getters/serialization.
function fields(value: unknown, keys: string[]): Record<string, unknown> | null {
  try {
    if (
      !value ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== keys.length
    )
      return null;
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (!d || !("value" in d) || !d.enumerable) return null;
      result[key] = d.value;
    }
    return result;
  } catch {
    return null;
  }
}

function candidate(operation: Operation, input: unknown, mode: Mode): Body {
  if (!Object.hasOwn(PATHS, operation)) return fail("INPUT_INVALID");
  if (mode === "reference" || mode === "delivery") {
    if (operation !== "courseGift") return fail("INPUT_INVALID");
    const keys = [
      "giftId",
      "purchaserUserId",
      "checkoutAttemptId",
      ...(mode === "reference"
        ? ["issuanceRequestId", "action"]
        : ["operationId", "expectedStateVersion", "expectedGeneration"])
    ];
    const value = fields(input, keys);
    if (
      !value ||
      !giftObjectId(value.giftId) ||
      !giftObjectId(value.purchaserUserId) ||
      !giftUuid(value.checkoutAttemptId) ||
      (mode === "reference"
        ? !giftUuid(value.issuanceRequestId) ||
          ![
            "recover_course_gift_exact_open_session",
            "inspect_course_gift_delivery_recovery"
          ].includes(value.action as string)
        : !giftUuid(value.operationId) ||
          !Number.isSafeInteger(value.expectedStateVersion) ||
          (value.expectedStateVersion as number) < 0 ||
          !Number.isSafeInteger(value.expectedGeneration) ||
          (value.expectedGeneration as number) < 1)
    )
      return fail("INPUT_INVALID");
    return Object.freeze(value as Record<string, string | number>);
  }
  const history = mode === "history";
  const gift = operation === "courseGift";
  const item = gift ? "giftId" : "courseId";
  const buyer = gift ? "purchaserUserId" : "buyerUserId";
  const keys = [
    item,
    buyer,
    "checkoutAttemptId",
    "operationId",
    ...(history ? [] : ["sessionId", "reason", "confirmation"])
  ];
  const values = fields(input, keys);
  if (!values || keys.some((key) => typeof values[key] !== "string"))
    return fail("INPUT_INVALID");
  const body = values as Record<string, string>;
  if (
    !giftObjectId(body[item]) ||
    !giftObjectId(body[buyer]) ||
    !giftUuid(body.checkoutAttemptId) ||
    !giftUuid(body.operationId)
  )
    return fail("INPUT_INVALID");
  if (
    !history &&
    (body.sessionId.length > 255 ||
      !/^cs_[A-Za-z0-9_]+$/.test(body.sessionId) ||
      body.reason.length < 16 ||
      body.reason.length > 1000 ||
      body.reason.trim() !== body.reason ||
      /[\u0000-\u001f\u007f]/.test(body.reason) ||
      body.reason.split(/\s+/).length < 3 ||
      body.confirmation !==
        `RECOVER ${gift ? "COURSE GIFT" : "COURSE CHECKOUT"} ${body[item]} ${body.checkoutAttemptId} ${body.sessionId}`)
  )
    return fail("INPUT_INVALID");
  try {
    if (
      encodeURIComponent(JSON.stringify(body)).replace(/%[A-F\d]{2}/gi, "x").length > 8192
    )
      return fail("INPUT_INVALID");
  } catch {
    return fail("INPUT_INVALID");
  }
  return Object.freeze(body);
}

function privateResult(result: unknown, mode: Mode, body: Body) {
  const envelope = fields(result, ["success", "data"]);
  const expected =
    mode === "reference"
      ? {
          status: "reference_issued",
          issuanceRequestId: body.issuanceRequestId,
          originalEvidenceVerified: false,
          recoveryAuthorized: false,
          schedulingChanged: false,
          activationAllowed: false
        }
      : {
          status: "technical_review_only",
          snapshotOnly: true,
          observedStateVersion: body.expectedStateVersion,
          observedGeneration: body.expectedGeneration,
          requiresOriginalEvidence: true,
          originalEvidenceVerified: false,
          restorationAuthorized: false,
          schedulingChanged: false,
          activationAllowed: false
        };
  const data = fields(envelope?.data, [
    ...Object.keys(expected),
    ...(mode === "reference" ? ["operationId"] : [])
  ]);
  if (
    envelope?.success !== true ||
    !data ||
    Object.entries(expected).some(([key, value]) => data[key] !== value) ||
    (mode === "reference" && !giftUuid(data.operationId))
  )
    return fail("UNKNOWN");
  return Object.freeze(data);
}

function historyResult(result: unknown): CourseCheckoutSupportHistory {
  const envelope = fields(result, ["success", "data"]);
  const data = fields(envelope?.data, [
    "status",
    "historicalOnly",
    "requiresOriginalEvidence"
  ]);
  if (
    envelope?.success !== true ||
    !data ||
    !["unknown", "request_recorded", "binding_recorded"].includes(
      data.status as string
    ) ||
    data.historicalOnly !== true ||
    data.requiresOriginalEvidence !== true
  )
    return fail("UNKNOWN");
  return Object.freeze({
    status: data.status as CourseCheckoutSupportHistory["status"],
    historicalOnly: true,
    requiresOriginalEvidence: true
  });
}

function matches(result: unknown, operation: Operation, body: Body): boolean {
  const envelope = fields(result, ["success", "data"]);
  const target = operation === "courseGift" ? "giftId" : "courseId";
  const data = fields(envelope?.data, [
    target,
    "checkoutAttemptId",
    "operationId",
    "outcome"
  ]);
  return Boolean(
    envelope?.success === true &&
    data &&
    data[target] === body[target] &&
    data.checkoutAttemptId === body.checkoutAttemptId &&
    data.operationId === body.operationId &&
    data.outcome === "bound_for_review"
  );
}

/** No environment, plan or caller option can enable the public entry. */
export function courseCheckoutSupportClient(): never {
  return fail("NOT_RELEASED");
}

/** Dormant controller, not mounted by any route. Candidate sourcing and the future
 * private panel are separate gates. Construction never probes a route or passkey.
 * No credentials, reasons, Session IDs or recovery records are persisted/exported.
 * Server Owner/passkey/exact-evidence checks remain the authority, not this state.
 */
export function createInternalCourseCheckoutSupportClient({
  platform
}: {
  platform: "web" | "native";
}) {
  return createController(platform, "recovery");
}

/** Read-only, dormant history continuation. No candidate restoration or mutation. */
export function createInternalCourseCheckoutSupportHistoryClient({
  platform
}: {
  platform: "web" | "native";
}) {
  return createController(platform, "history");
}

export function createInternalCourseGiftSupportReferenceClient({
  platform
}: {
  platform: "web" | "native";
}) {
  return createController(platform, "reference");
}
export function createInternalCourseGiftDeliveryReviewClient({
  platform
}: {
  platform: "web" | "native";
}) {
  return createController(platform, "delivery");
}

function createController(platform: "web" | "native", mode: Mode) {
  const history = mode === "history";
  const delivery = mode === "delivery";
  const reference = mode === "reference";
  if (platform !== "web") return fail("NOT_RELEASED");
  const identity = getAdminSecurityIdentityEpoch();
  let status: Status = "empty";
  let prepared: { operation: Operation; body: Body } | null = null;
  let attempted = false;
  let recorded: CourseCheckoutSupportHistory | null = null;
  let referenceResult: CourseGiftSupportReference | null = null;
  let deliveryResult: CourseGiftDeliveryReview | null = null;
  let lastCode: Code | null = null;
  let cancel: (() => void) | null = null;
  let unsubscribe: () => void = () => {};
  function dispose() {
    status = "disposed";
    prepared = null;
    recorded = null;
    referenceResult = null;
    deliveryResult = null;
    lastCode = null;
    cancel?.();
    unsubscribe();
  }
  function current() {
    if (identity !== getAdminSecurityIdentityEpoch()) dispose();
    if (status === "disposed") return fail("SESSION_CHANGED");
  }
  function hasProof() {
    const expiry = getAdminStepUpExpiry();
    return Boolean(
      expiry && Number.isFinite(Date.parse(expiry)) && Date.parse(expiry) > Date.now()
    );
  }
  unsubscribe = subscribeAdminSecurity(() => {
    if (identity !== getAdminSecurityIdentityEpoch()) dispose();
    else {
      recorded = null;
      deliveryResult = null;
      cancel?.(); // Same-account verification may renew proof, never replay.
    }
  });
  function snapshot() {
    if (identity !== getAdminSecurityIdentityEpoch()) dispose();
    return Object.freeze({
      status,
      code: lastCode,
      ...(history ? { history: hasProof() ? recorded : null } : {}),
      ...(reference ? { reference: hasProof() ? referenceResult : null } : {}),
      ...(delivery ? { deliveryReview: hasProof() ? deliveryResult : null } : {}),
      needsStepUp: status !== "disposed" && !hasProof()
    });
  }
  function prepare(operation: Operation, input: unknown) {
    current();
    if (status === "pending") return fail("BUSY");
    if (attempted && !history && !delivery) return fail("REQUEST_FROZEN");
    prepared = null;
    status = "empty";
    recorded = null;
    deliveryResult = null;
    prepared = { operation, body: candidate(operation, input, mode) };
    status = "prepared";
    lastCode = null;
    return snapshot();
  }
  function clearHistory() {
    current();
    if (!history && !delivery) return fail("INPUT_INVALID");
    if (status === "pending") return fail("BUSY");
    prepared = null;
    recorded = null;
    deliveryResult = null;
    lastCode = null;
    status = "empty";
    return snapshot();
  }
  async function submit(confirmed: boolean) {
    current();
    if (status === "pending") return fail("BUSY");
    if (confirmed !== true) return fail("CONFIRMATION_REQUIRED");
    if (!prepared) return fail("INPUT_INVALID");
    if (!hasProof()) return fail("STEP_UP_REQUIRED");
    if (status === "bound_for_review" || status === "reference_issued") return snapshot();
    const request = prepared;
    const epoch = getAdminSecurityEpoch();
    const controller = new AbortController();
    status = "pending";
    attempted = true;
    recorded = null;
    deliveryResult = null;
    lastCode = null;
    let timer: ReturnType<typeof setTimeout>;
    const interruption = new Promise<never>((_, reject) => {
      cancel = () => {
        controller.abort();
        reject(new CourseCheckoutSupportError("UNKNOWN"));
      };
      timer = setTimeout(() => cancel?.(), COURSE_CHECKOUT_SUPPORT_REQUEST_MS);
    });
    const work = Promise.resolve().then(async () => {
      current();
      if (controller.signal.aborted || getAdminSecurityEpoch() !== epoch || !hasProof())
        return fail("UNKNOWN");
      const result = await adminVaultRequest(
        reference
          ? "/api/course-gifts/support/gift/reference"
          : delivery
            ? "/api/course-gifts/support/gift/delivery-review"
            : (history ? HISTORY_PATHS : PATHS)[request.operation],
        {
          method: "POST",
          body: request.body,
          auth: false,
          headers: { "Content-Type": "application/json" },
          invalidateOn401: false,
          notifyTransport: false,
          notifyTokenBalance: false,
          retries: 0,
          cache: "no-store",
          redirect: "error",
          responseType: "json",
          signal: controller.signal,
          timeoutMs: COURSE_CHECKOUT_SUPPORT_REQUEST_MS
        }
      );
      current();
      if (controller.signal.aborted || epoch !== getAdminSecurityEpoch() || !hasProof())
        return fail("UNKNOWN");
      if (history) return { history: historyResult(result) };
      if (reference)
        return {
          reference: privateResult(
            result,
            mode,
            request.body
          ) as CourseGiftSupportReference
        };
      if (delivery)
        return {
          delivery: privateResult(result, mode, request.body) as CourseGiftDeliveryReview
        };
      if (!matches(result, request.operation, request.body)) return fail("UNKNOWN");
      return {};
    });
    try {
      const result = await Promise.race([work, interruption]);
      current();
      if (controller.signal.aborted || epoch !== getAdminSecurityEpoch() || !hasProof())
        return fail("UNKNOWN");
      recorded = "history" in result ? result.history! : null;
      referenceResult = "reference" in result ? result.reference! : null;
      deliveryResult = "delivery" in result ? result.delivery! : null;
      status = history
        ? "history_read"
        : reference
          ? "reference_issued"
          : delivery
            ? "technical_review_only"
            : "bound_for_review";
    } catch (error) {
      if ((status as Status) === "disposed") return fail("SESSION_CHANGED");
      // Every attempted failure retains the same request. Even a denial can follow
      // audit/provider work; it does not prove no payment or authorize replacement.
      status = "uncertain";
      lastCode =
        error instanceof ApiError &&
        error.status === 503 &&
        error.code === "COURSE_CHECKOUT_SUPPORT_NOT_RELEASED"
          ? "NOT_RELEASED"
          : error instanceof ApiError &&
              error.status === 403 &&
              error.code === "COURSE_CHECKOUT_SUPPORT_DENIED"
            ? "DENIED"
            : "UNKNOWN";
    } finally {
      clearTimeout(timer!);
      cancel = null;
    }
    return snapshot();
  }
  return Object.freeze({ prepare, submit, snapshot, dispose, clearHistory });
}
