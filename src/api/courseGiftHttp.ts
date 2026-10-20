import { apiRequest, ApiError } from "./apiRequest";
import { validGiftRenewalBody } from "./courseGiftRenewalContract";
import {
  SALE_PATHS,
  validGiftSaleBody,
  type SaleOperation
} from "./courseGiftSaleContract";
import {
  createInternalCourseGiftClient,
  CourseGiftClientError,
  COURSE_GIFT_REQUEST_MS
} from "./courseGiftClient";

type Options = Parameters<typeof createInternalCourseGiftClient>[0];
type GiftRequest = Parameters<Options["invoke"]>[0];
const PATHS = Object.freeze({
  ...SALE_PATHS,
  recipient_review: "/api/course-gifts/recipient/review",
  recipient_claim: "/api/course-gifts/recipient/claim",
  recipient_renew: "/api/course-gifts/recipient/renew",
  buyer_status: "/api/course-gifts/buyer/status"
});
const fail = (code: string): never => {
  throw new CourseGiftClientError(code);
};

/** Unmounted adapter for the matching disabled backend boundary. No endpoint is
 * probed on import/construction. Current public client still always fails closed.
 * The B1 controller owns the total deadline and identity fence across token lookup.
 */
export function createInternalCourseGiftHttpClient(
  options: Omit<Options, "invoke"> & { invoke?: Options["invoke"] }
) {
  return createInternalCourseGiftClient({
    ...options,
    invoke: options.invoke || invokeCourseGiftHttp
  });
}

export async function invokeCourseGiftHttp(request: GiftRequest): Promise<unknown> {
  if (!Object.hasOwn(PATHS, request.operation))
    return fail("COURSE_GIFT_REQUEST_UNKNOWN");
  if (request.signal?.aborted) return fail("COURSE_GIFT_REQUEST_CANCELED");
  const key = request.operation === "buyer_status" ? "checkoutAttemptId" : "token";
  const body = request.body;
  const value = body?.[key];
  const sale = Object.hasOwn(SALE_PATHS, request.operation);
  const renewal = request.operation === "recipient_renew";
  if (
    renewal
      ? !validGiftRenewalBody(body)
      : sale
        ? !validGiftSaleBody(request.operation as SaleOperation, body)
        : !body ||
          Object.keys(body).length !== 1 ||
          !Object.hasOwn(body, key) ||
          typeof value !== "string" ||
          (key === "token"
            ? value.length !== 64 || !/^[a-f0-9]{64}$/.test(value)
            : value !== value.trim() || !/^[A-Za-z0-9_-]{20,128}$/.test(value))
  )
    return fail("COURSE_GIFT_REQUEST_UNKNOWN");
  const authorization = request.authorization?.replace(/^Bearer /, "");
  if (
    typeof authorization !== "string" ||
    !authorization ||
    authorization.length > 8192 ||
    /\s/.test(authorization)
  )
    return fail("COURSE_GIFT_SIGN_IN_REQUIRED");
  try {
    const result = await apiRequest(PATHS[request.operation], {
      method: "POST",
      body: sale || renewal ? { ...body } : { [key]: value },
      headers: {
        Authorization: `Bearer ${authorization}`,
        "Content-Type": "application/json"
      },
      auth: false,
      invalidateOn401: false,
      notifyTransport: false,
      notifyTokenBalance: false,
      retries: 0,
      cache: "no-store",
      redirect: "error",
      signal: request.signal,
      timeoutMs: COURSE_GIFT_REQUEST_MS,
      responseType: "json"
    });
    if (request.signal.aborted) return fail("COURSE_GIFT_REQUEST_CANCELED");
    if (
      result?.success !== true ||
      !result.data ||
      typeof result.data !== "object" ||
      Array.isArray(result.data)
    )
      return fail("COURSE_GIFT_REQUEST_UNKNOWN");
    return result.data;
  } catch (error) {
    if (request.signal.aborted) return fail("COURSE_GIFT_REQUEST_CANCELED");
    if (error instanceof ApiError && error.status === 401)
      return fail("COURSE_GIFT_SIGN_IN_REQUIRED");
    return fail("COURSE_GIFT_REQUEST_UNKNOWN");
  }
}
