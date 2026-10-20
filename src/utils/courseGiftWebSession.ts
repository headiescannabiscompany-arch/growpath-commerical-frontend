import { createInternalCourseGiftHttpClient } from "@/api/courseGiftHttp";
import { CourseGiftClientError } from "@/api/courseGiftClient";
import {
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "./courseGiftContinuation";
import {
  COURSE_GIFT_CLAIM_PATH,
  courseGiftCheckoutAttempt,
  courseGiftReturnPath
} from "./courseGiftPaths";
import { safeLoginPath } from "./authReturnPath";

type Continuation = ReturnType<typeof createCourseGiftContinuation>;
type Browser = Parameters<Continuation["capture"]>[0];
type Client = ReturnType<typeof createInternalCourseGiftHttpClient>;
type Options = {
  auth: () => CourseGiftAuth;
  getAccessToken: (signal: AbortSignal) => Promise<string>;
  storage?: Pick<Storage, "getItem" | "setItem">;
  invoke?: Parameters<typeof createInternalCourseGiftHttpClient>[0]["invoke"];
};
export type CourseGiftWebSnapshot = {
  key: string;
  path: string;
  kind: "claim" | "checkout";
  authState: CourseGiftAuth["state"];
  hasInvitation: boolean;
  attempt: string;
};

/** Internal, web-only owner of one private journey. It stays above the route
 * during deliberate same-tab login, but never survives leaving that journey.
 * Public routes do not instantiate it. No global token or automatic requests.
 */
export function createInternalCourseGiftWebSession(options: Options) {
  let generation = 0;
  let flow: {
    path: string;
    continuation: Continuation;
    client: Client;
    invitation: boolean;
    loginPath: string;
    loginSeen: boolean;
    authKey: string;
    authState: string;
  } | null = null;
  let snapshot: CourseGiftWebSnapshot | null = null;
  let currentPath = "";

  function dispose() {
    flow?.client.dispose();
    flow = null;
    snapshot = null;
    generation += 1;
  }
  function start(path: string) {
    dispose();
    const continuation = createCourseGiftContinuation({ storage: options.storage });
    const client = createInternalCourseGiftHttpClient({
      platform: "web",
      continuation,
      auth: options.auth,
      getAccessToken: options.getAccessToken,
      invoke: options.invoke
    });
    flow = {
      path,
      continuation,
      client,
      invitation: false,
      loginPath: "",
      loginSeen: false,
      authKey: "",
      authState: ""
    };
    return flow;
  }
  function current() {
    if (!flow || !snapshot || currentPath !== flow.path)
      throw new CourseGiftClientError("COURSE_GIFT_REQUEST_CANCELED");
    return flow;
  }

  return Object.freeze({
    sync(rawPath: string, browser: Browser | null): CourseGiftWebSnapshot | null {
      let path = courseGiftReturnPath(rawPath);
      const incoming =
        browser?.location.pathname === COURSE_GIFT_CLAIM_PATH &&
        Boolean(browser.location.hash || browser.location.search);
      if (incoming && browser) {
        // Clear any older invitation even when the new link is invalid.
        const next = start(COURSE_GIFT_CLAIM_PATH);
        next.invitation = next.continuation.capture(browser);
        path = COURSE_GIFT_CLAIM_PATH;
      }
      currentPath = path || rawPath;
      if (!path && (!flow?.loginPath || rawPath !== flow.loginPath)) {
        dispose();
        return null;
      }
      if (path && path !== flow?.path) start(path);
      if (!flow) return null;
      if (!path && rawPath === flow.loginPath) flow.loginSeen = true;
      const auth = { ...options.auth() };
      const authKey = JSON.stringify([
        auth.state,
        auth.userId,
        auth.sessionKey,
        auth.emailVerified
      ]);
      if (flow.authKey && flow.authKey !== authKey) {
        generation += 1;
        // Never resurrect a prior request or claim panel after a resolved session
        // is replaced or becomes uncertain. A fresh invitation is safe recovery.
        if (flow.authState === "ready") {
          const oldPath = flow.path;
          start(oldPath);
        }
      }
      flow!.authKey = authKey;
      flow!.authState = auth.state;
      flow!.continuation.observe(auth);
      // Expo may render the login route before it commits the browser URL.
      // A stale render of the origin must not disarm the deliberate handoff.
      if (path && flow!.loginSeen) {
        flow!.loginPath = "";
        flow!.loginSeen = false;
      }
      snapshot = {
        key: `${generation}:${authKey}`,
        path: flow!.path,
        kind: flow!.path === COURSE_GIFT_CLAIM_PATH ? "claim" : "checkout",
        authState: auth.state,
        hasInvitation: flow!.invitation,
        attempt: courseGiftCheckoutAttempt(flow!.path)
      };
      return { ...snapshot };
    },
    beginSignIn() {
      const next = current();
      if (options.auth().state !== "signed_out")
        throw new CourseGiftClientError("COURSE_GIFT_SESSION_CHANGED");
      next.loginPath = safeLoginPath("", next.path);
      next.loginSeen = false;
      return next.loginPath;
    },
    reviewRecipient() {
      return current().client.reviewRecipient();
    },
    claimRecipient() {
      return current().client.claimRecipient({ confirmed: true });
    },
    renewRecipient() {
      return current().client.renewRecipient({ confirmed: true });
    },
    async readBuyerStatus() {
      const next = current();
      const attempt = courseGiftCheckoutAttempt(next.path);
      const result = await next.client.readBuyerStatus(attempt);
      // Save only after the server proved ownership of this exact attempt.
      if (flow !== next || currentPath !== next.path)
        throw new CourseGiftClientError("COURSE_GIFT_SESSION_CHANGED");
      const reloadSaved = next.continuation.rememberCheckout(attempt);
      return { status: result, reloadSaved };
    },
    dispose
  });
}
