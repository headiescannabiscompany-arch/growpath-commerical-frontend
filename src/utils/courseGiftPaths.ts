// Navigation values only. Neither a return nor a cancellation proves payment.
export const COURSE_GIFT_CLAIM_PATH = "/claim-course-gift";
export const COURSE_GIFT_CHECKOUT_PATH = "/course-gifts/checkout";

export function courseGiftAttemptId(value: unknown): string {
  return typeof value === "string" &&
    value === value.trim() &&
    /^[A-Za-z0-9_-]{20,128}$/.test(value)
    ? value
    : "";
}

export function courseGiftReturnPath(value: unknown): string {
  if (value === COURSE_GIFT_CLAIM_PATH) return COURSE_GIFT_CLAIM_PATH;
  if (typeof value !== "string" || value !== value.trim() || value.length > 256)
    return "";
  const match =
    /^\/course-gifts\/checkout\?attempt=([A-Za-z0-9_-]{20,128})(?:&result=(return|cancel))?$/.exec(
      value
    );
  return match && courseGiftAttemptId(match[1]) ? value : "";
}

export function courseGiftCheckoutAttempt(value: unknown): string {
  const path = courseGiftReturnPath(value);
  return path.startsWith(`${COURSE_GIFT_CHECKOUT_PATH}?`)
    ? new URLSearchParams(path.slice(path.indexOf("?") + 1)).get("attempt") || ""
    : "";
}
