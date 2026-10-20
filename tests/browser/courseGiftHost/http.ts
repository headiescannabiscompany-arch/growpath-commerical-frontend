import {
  createInternalCourseGiftClient,
  CourseGiftClientError
} from "../../../src/api/courseGiftClient";

type Options = Parameters<typeof createInternalCourseGiftClient>[0];
type Request = Parameters<Options["invoke"]>[0];
const counts = {
  reviews: 0,
  statuses: 0,
  forbiddenWrites: 0,
  aborts: 0,
  releasedReplies: 0
};
const listeners = new Set<() => void>();
let delayNext = false;
let release: (() => void) | null = null;
function changed() {
  for (const listener of listeners) listener();
}
export function inspectFixture() {
  return { ...counts, heldReply: Boolean(release), delayNext };
}
export function subscribeFixture(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function holdNextReview() {
  delayNext = true;
  changed();
}
export function releaseHeldReview() {
  release?.();
}
async function invoke(request: Request) {
  if (request.operation === "buyer_status") {
    counts.statuses += 1;
    changed();
    return {
      giftId: "3".repeat(24),
      checkoutAttemptId: request.body.checkoutAttemptId,
      checkoutStatus: "open",
      paymentRecorded: false,
      recoveryRequired: false
    };
  }
  if (request.operation !== "recipient_review") {
    counts.forbiddenWrites += 1;
    changed();
    throw new CourseGiftClientError("COURSE_GIFT_REQUEST_UNKNOWN");
  }
  counts.reviews += 1;
  const second = request.body.token === "b".repeat(64);
  const reply = {
    giftId: (second ? "4" : "3").repeat(24),
    courseId: (second ? "6" : "5").repeat(24),
    courseTitle: second ? "Synthetic invitation B" : "Synthetic invitation A",
    recipient: "r***@example.invalid",
    claimExpiresAt: "2099-01-01T00:00:00.000Z",
    code: "COURSE_GIFT_TRANSACTION_REQUIRED"
  };
  if (!delayNext) {
    changed();
    return reply;
  }
  delayNext = false;
  if (release) throw new Error("Only one held synthetic response is allowed");
  return new Promise<typeof reply>((resolve) => {
    const aborted = () => {
      counts.aborts += 1;
      changed();
    };
    request.signal.addEventListener("abort", aborted, { once: true });
    release = () => {
      request.signal.removeEventListener("abort", aborted);
      release = null;
      counts.releasedReplies += 1;
      resolve(reply);
      changed();
    };
    changed();
  });
}
// Replace only the HTTP adapter in this fixture. The actual client/session,
// continuation, screen and Expo navigation code are used without replacement.
export function createInternalCourseGiftHttpClient(options: Omit<Options, "invoke">) {
  return createInternalCourseGiftClient({ ...options, invoke });
}
