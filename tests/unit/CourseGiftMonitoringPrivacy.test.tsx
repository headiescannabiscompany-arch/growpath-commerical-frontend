/** @jest-environment jsdom */
// Only mocked diagnostics. No SDK transport, server, account or database.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";

jest.mock("@/config/config", () => ({
  config: { sentryDsn: "https://synthetic@monitoring.invalid/1", env: "test" }
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  withScope: jest.fn(),
  captureException: jest.fn(),
  wrap: jest.fn()
}));
jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette: { page: "white", text: "black", textMuted: "gray" } })
}));
jest.mock("@/components/nav/BackButton", () => ({
  __esModule: true,
  default: () => null
}));

const TOKEN = "c".repeat(64);
const PRIVATE = "/claim-course-gift#token=" + TOKEN;
const ordinaryError = (message = "ordinary failure") =>
  Object.assign(new Error(message), {
    stack: `Error: ${message}\n at ordinary.js:1:1`
  });
let privacy: any, monitoring: any, sdk: any, config: any, extra: jest.Mock;
let errorLog: jest.SpyInstance, warnLog: jest.SpyInstance;
let fetchBefore: typeof global.fetch;
const navigate = (url: string) => window.history.replaceState({}, "", url);
const hooks = () => {
  monitoring.initMonitoring();
  return sdk.init.mock.calls[0][0];
};

beforeEach(() => {
  jest.resetModules();
  navigate("/ordinary");
  fetchBefore = global.fetch;
  global.fetch = jest.fn(() => {
    throw new Error("Fetch forbidden");
  });
  jest.spyOn(http, "request").mockImplementation(() => {
    throw new Error("HTTP forbidden");
  });
  jest.spyOn(https, "request").mockImplementation(() => {
    throw new Error("HTTPS forbidden");
  });
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  warnLog = jest.spyOn(console, "warn").mockImplementation(() => {});
  sdk = require("@sentry/react-native");
  extra = jest.fn();
  sdk.withScope.mockImplementation((callback: any) => callback({ setExtra: extra }));
  sdk.wrap.mockImplementation((component: unknown) => component);
  config = require("@/config/config").config;
  privacy = require("../../src/utils/courseGiftDiagnosticPrivacy");
  monitoring = require("../../src/utils/monitoring");
});
afterEach(() => {
  global.fetch = fetchBefore;
  navigate("/ordinary");
});

describe("course gift frontend monitoring privacy", () => {
  test("engine stack accessor is inspected, including an assigned private stack", () => {
    const error = ordinaryError();
    expect(privacy.containsCourseGiftDiagnostic(error)).toBe(false);
    error.stack = `Error: ordinary\n at ${TOKEN}:1:1`;
    expect(privacy.containsCourseGiftDiagnostic(error)).toBe(true);
  });
  test("custom stack and inherited Error name accessors are never invoked", () => {
    const getter = jest.fn(() => TOKEN);
    const error = ordinaryError();
    Object.defineProperty(error, "stack", { get: getter });
    expect(privacy.containsCourseGiftDiagnostic(error)).toBe(true);
    const prototype = Object.create(Error.prototype);
    Object.defineProperty(prototype, "name", { get: getter });
    const inherited = ordinaryError();
    Object.setPrototypeOf(inherited, prototype);
    expect(privacy.containsCourseGiftDiagnostic(inherited)).toBe(true);
    expect(getter).not.toHaveBeenCalled();
  });
  test.each([
    PRIVATE,
    "/course-gifts/checkout?attempt=opaque",
    "/login?next=" + encodeURIComponent("/course-gifts/checkout?attempt=opaque"),
    "/%63laim-course-gift%ZZ",
    "COURSE_GIFT_REQUEST_FAILED",
    { request: { data: { token: TOKEN } } },
    { extra: { checkoutAttemptId: "opaque" } },
    { breadcrumbs: [{ data: { url: PRIVATE } }] },
    { cause: ordinaryError(TOKEN) }
  ])("suppresses private payloads without storing or mutating them %#", (value) => {
    expect(privacy.filterCourseGiftDiagnostic(value)).toBeNull();
  });
  test.each([
    PRIVATE,
    "/course-gifts/checkout?attempt=opaque",
    "/login?next=%2Fclaim-course-gift"
  ])(
    "protects the current URL before React initializes or scrubs the fragment: %s",
    (url) => {
      navigate(url);
      expect(
        privacy.filterCourseGiftDiagnostic({ message: "generic failure" })
      ).toBeNull();
      expect(privacy.privateSafeConsole("error", "recipient@synthetic.invalid")).toBe(
        false
      );
      expect(errorLog).not.toHaveBeenCalled();
    }
  );
  test("drops non-enumerable exception causes", () => {
    const error = ordinaryError();
    Object.defineProperty(error, "cause", { value: { token: TOKEN } });
    expect(privacy.filterCourseGiftDiagnostic(error)).toBeNull();
  });
  test("never invokes getters or custom serialization", () => {
    const getter = jest.fn(() => TOKEN),
      toJSON = jest.fn(() => TOKEN);
    expect(
      privacy.filterCourseGiftDiagnostic(
        Object.defineProperty({}, "private", { get: getter })
      )
    ).toBeNull();
    expect(privacy.filterCourseGiftDiagnostic({ toJSON })).toBeNull();
    expect(getter).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
  });
  test("fails closed on uncertainty within a bounded scan", () => {
    expect(
      privacy.filterCourseGiftDiagnostic(
        new Proxy(
          {},
          {
            ownKeys() {
              throw ordinaryError(TOKEN);
            }
          }
        )
      )
    ).toBeNull();
    expect(privacy.filterCourseGiftDiagnostic("x".repeat(32769))).toBeNull();
    let value: unknown = {};
    for (let i = 0; i < 14; i++) value = { data: value };
    expect(privacy.filterCourseGiftDiagnostic(value)).toBeNull();
    expect(
      privacy.filterCourseGiftDiagnostic(Array.from({ length: 1001 }, () => "safe"))
    ).toBeNull();
    let encoded = "/course-gifts";
    for (let i = 0; i < 10; i++) encoded = encodeURIComponent(encoded);
    expect(privacy.filterCourseGiftDiagnostic(encoded)).toBeNull();
  });
  test("ordinary cyclic/frozen diagnostic objects retain identity", () => {
    const value: any = {
      message: "ordinary",
      error: ordinaryError(),
      request: { url: "/api/courses" }
    };
    value.self = value;
    Object.freeze(value);
    expect(privacy.filterCourseGiftDiagnostic(value)).toBe(value);
  });
  test("delayed private events and original-exception hints remain suppressed after navigation", () => {
    const options = hooks();
    navigate(PRIVATE);
    const lateEvent = { request: { url: window.location.href }, message: "generic" };
    navigate("/ordinary");
    expect(options.beforeSend(lateEvent)).toBeNull();
    expect(
      options.beforeSend(
        { message: "generic" },
        { originalException: ordinaryError(TOKEN) }
      )
    ).toBeNull();
    const ordinary = { message: "ordinary" };
    expect(options.beforeSend(ordinary)).toBe(ordinary);
  });
  test("installs filtering hooks without changing sampling or session settings", () => {
    const options = hooks();
    expect(options.tracesSampleRate).toBe(0);
    expect(options.enableAutoSessionTracking).toBe(true);
    expect(options.dsn).toBe(config.sentryDsn);
    for (const name of [
      "beforeSend",
      "beforeSendTransaction",
      "beforeBreadcrumb",
      "beforeSendLog"
    ]) {
      const ordinary = { message: "ordinary" };
      expect(options[name](ordinary)).toBe(ordinary);
      expect(options[name]({ message: TOKEN })).toBeNull();
      navigate(PRIVATE);
      expect(options[name](ordinary)).toBeNull();
      navigate("/ordinary");
    }
  });
  test("unserialized breadcrumb hints do not execute getters or drop ordinary breadcrumbs", () => {
    const options = hooks();
    const getter = jest.fn(() => TOKEN);
    const hint = Object.defineProperty({}, "event", { get: getter });
    const breadcrumb = { category: "ui.click", message: "Ordinary button" };
    expect(options.beforeBreadcrumb(breadcrumb, hint)).toBe(breadcrumb);
    expect(getter).not.toHaveBeenCalled();
  });
  test("private app capture exits before SDK scope/extras/capture", () => {
    hooks();
    expect(
      monitoring.captureException(ordinaryError(TOKEN), { email: "synthetic@invalid" })
    ).toBe(false);
    navigate(PRIVATE);
    expect(monitoring.captureException(ordinaryError())).toBe(false);
    expect(sdk.withScope).not.toHaveBeenCalled();
    expect(extra).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });
  test("ordinary capture and component wrapping still work", () => {
    hooks();
    const error = ordinaryError(),
      Component = () => null;
    expect(monitoring.captureException(error, { screen: "Courses" })).toBe(true);
    expect(extra).toHaveBeenCalledWith("screen", "Courses");
    expect(sdk.captureException).toHaveBeenCalledWith(error);
    expect(monitoring.wrapWithMonitoring(Component)).toBe(Component);
    expect(sdk.wrap).toHaveBeenCalledWith(Component);
  });
  test("disabled monitoring stays inert without changing any consent", () => {
    config.sentryDsn = "";
    expect(monitoring.initMonitoring()).toEqual({
      initialized: true,
      enabled: false,
      provider: "none"
    });
    expect(monitoring.captureException(ordinaryError())).toBe(false);
    const Component = () => null;
    expect(monitoring.wrapWithMonitoring(Component)).toBe(Component);
    expect(sdk.init).not.toHaveBeenCalled();
  });
  test("initialization is idempotent", () => {
    monitoring.initMonitoring();
    monitoring.initMonitoring();
    expect(sdk.init).toHaveBeenCalledTimes(1);
  });
  test("initialization failure never logs the SDK error", () => {
    sdk.init.mockImplementation(() => {
      throw ordinaryError(TOKEN);
    });
    expect(monitoring.initMonitoring().enabled).toBe(false);
    expect(warnLog).toHaveBeenCalledWith("[monitoring] failed to initialize");
    expect(JSON.stringify(warnLog.mock.calls)).not.toContain(TOKEN);
  });
  test("capture failure never logs the SDK error", () => {
    hooks();
    sdk.captureException.mockImplementation(() => {
      throw ordinaryError(TOKEN);
    });
    expect(monitoring.captureException(ordinaryError())).toBe(false);
    expect(warnLog).toHaveBeenCalledWith("[monitoring] failed to capture exception");
    expect(JSON.stringify(warnLog.mock.calls)).not.toContain(TOKEN);
  });
  test.each(["log", "warn", "error", "info"])(
    "shared %s logger suppresses private payloads and current routes",
    (level) => {
      const spy = jest.spyOn(console, level as "log").mockImplementation(() => {});
      const logger = require("../../src/utils/logger").logger;
      logger[level](TOKEN);
      navigate(PRIVATE);
      logger[level]("recipient@synthetic.invalid");
      expect(spy).not.toHaveBeenCalled();
      navigate("/ordinary");
      logger[level]("ordinary message");
      expect(spy).toHaveBeenCalledWith("ordinary message");
    }
  );
  test.each(["ScreenBoundary", "ErrorBoundary"])(
    "%s keeps private state/logs generic and ordinary diagnostics working",
    (name) => {
      hooks();
      const modulePath =
        name === "ScreenBoundary"
          ? "../../src/components/ScreenBoundary"
          : "../../src/components/system/ErrorBoundary";
      const wrapper = require(modulePath)[name];
      // Exercise the affected boundary lifecycle methods without inducing React's
      // separate development-only framework error logging or a native crash.
      const element = wrapper({ children: "child", name: "Courses", label: "Courses" });
      const Boundary = element.type;
      const boundary = new Boundary(element.props);
      navigate(PRIVATE);
      boundary.state = Boundary.getDerivedStateFromError(ordinaryError(TOKEN));
      boundary.componentDidCatch(ordinaryError(TOKEN), {
        componentStack: "CourseGiftWebScreen"
      });
      expect(errorLog).not.toHaveBeenCalled();
      expect(sdk.captureException).not.toHaveBeenCalled();
      expect(
        name === "ScreenBoundary" ? boundary.state.error.message : boundary.state.message
      ).toBe(privacy.PRIVATE_PAGE_ERROR);
      expect(JSON.stringify(boundary.render())).not.toContain(TOKEN);
      navigate("/ordinary");
      const error = ordinaryError("ordinary visible message");
      boundary.state = Boundary.getDerivedStateFromError(error);
      boundary.componentDidCatch(error, { componentStack: "CoursesScreen" });
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(sdk.captureException).toHaveBeenCalledWith(error);
      expect(
        name === "ScreenBoundary" ? boundary.state.error : boundary.state.message
      ).toBe(name === "ScreenBoundary" ? error : error.message);
    }
  );
  test("ErrorBoundary rechecks an old ordinary message when rendered on a private page", () => {
    const element = require("../../src/components/system/ErrorBoundary").ErrorBoundary({
      children: null
    });
    const boundary = new element.type(element.props);
    boundary.state = { hasError: true, message: "synthetic-recipient@invalid" };
    navigate(PRIVATE);
    const rendered = JSON.stringify(boundary.render());
    expect(rendered).toContain(privacy.PRIVATE_PAGE_ERROR);
    expect(rendered).not.toContain("synthetic-recipient@invalid");
  });
  test("the affected auth and entitlement logs use the private-safe wrapper only", () => {
    const auth = fs.readFileSync(
      path.resolve(__dirname, "../../src/auth/AuthContext.tsx"),
      "utf8"
    );
    const entitlements = fs.readFileSync(
      path.resolve(__dirname, "../../src/entitlements/EntitlementsProvider.tsx"),
      "utf8"
    );
    expect(auth).toMatch(
      /privateSafeConsole\("error", "\[AUTH\] Failed to load \/api\/me:", e\)/
    );
    expect(auth).not.toMatch(/console\.error\("\[AUTH\] Failed to load/);
    expect(entitlements).toMatch(/privateSafeConsole\(\s*"warn"/);
    expect(entitlements).not.toMatch(/console\.warn/);
  });
});
