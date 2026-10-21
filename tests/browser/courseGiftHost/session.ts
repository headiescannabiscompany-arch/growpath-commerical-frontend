import { createInternalCourseGiftWebSession as createRealSession } from "../../../src/utils/courseGiftWebSession";
export type { CourseGiftWebSnapshot } from "../../../src/utils/courseGiftWebSession";

const trace: object[] = [];
export function inspectHostTrace() {
  return [...trace];
}
function route(value: string) {
  const path = value.split(/[?#]/, 1)[0];
  return [
    "/claim-course-gift",
    "/course-gifts/checkout",
    "/login",
    "/ordinary",
    "/"
  ].includes(path)
    ? path
    : "other";
}
function record(value: object) {
  if (JSON.stringify(value) === JSON.stringify(trace.at(-1))) return;
  trace.push(value);
  if (trace.length > 40) trace.shift();
}
// Test-only booleans/route labels; never retain URLs, tokens or account identifiers.
export function createInternalCourseGiftWebSession(
  options: Parameters<typeof createRealSession>[0]
) {
  const session = createRealSession(options);
  let expectedLogin = "";
  return Object.freeze({
    ...session,
    sync(...args: Parameters<typeof session.sync>) {
      const before = {
        action: "sync",
        route: route(args[0]),
        expectedLogin: Boolean(expectedLogin) && args[0] === expectedLogin,
        hash: Boolean(args[1]?.location.hash),
        auth: options.auth().state
      };
      const result = session.sync(...args);
      record({
        ...before,
        result: result?.kind || "none",
        invitation: result?.hasInvitation || false
      });
      return result;
    },
    beginSignIn() {
      expectedLogin = session.beginSignIn();
      record({ action: "beginSignIn" });
      return expectedLogin;
    },
    dispose() {
      record({ action: "dispose" });
      session.dispose();
    }
  });
}
