/** @jest-environment jsdom */
// Actual installed @sentry/react-native web initializer/client/default integrations.
// Only transport/DSN/release/native availability are test seams. Envelopes never
// leave memory. This is not a browser/native crash or Sentry-hosted acceptance.
import { Platform } from "react-native";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

const mockEnvelopes: unknown[] = [];
const mockInitOptions: any[] = [];
jest.mock("@/config/config", () => ({
  config: { sentryDsn: "https://synthetic@monitoring.invalid/1", env: "synthetic-test" }
}));
jest.mock("@sentry/react-native", () => {
  const actual = jest.requireActual("@sentry/react-native");
  return {
    ...actual,
    init: (options: any) => {
      mockInitOptions.push(options);
      return actual.init({
        ...options,
        enableNative: false,
        enableNativeNagger: false,
        release: "synthetic-local-only",
        transport: () => ({
          send: async (envelope: unknown) => {
            mockEnvelopes.push(envelope);
            return { statusCode: 200 };
          },
          flush: async () => true
        })
      });
    }
  };
});

const INVITATION = "d".repeat(64);
const PRIVATE = "/claim-course-gift#token=" + INVITATION;
const originalOS = Platform.OS;
const originalFetch = global.fetch;
const originalWebSocket = global.WebSocket;
let sdk: any, core: any, monitoring: any;
let networkAttempts: string[];
let restorers: (() => void)[];
const navigate = (path: string) => window.history.replaceState(null, "", path);
const events = () =>
  mockEnvelopes.flatMap((envelope: any) =>
    envelope[1]
      .filter(([header]: any) => header.type === "event")
      .map(([, body]: any) => body)
  );
function error(message: string) {
  return Object.assign(new Error(message), {
    stack: `Error: ${message}\n at ordinary.js:1:1`
  });
}
function blocked(name: string): never {
  networkAttempts.push(name);
  throw new Error("External transport forbidden by isolated fixture");
}
function denyTransport(object: any, key: string, name: string) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  Object.defineProperty(object, key, {
    configurable: true,
    writable: true,
    value: () => blocked(name)
  });
  restorers.push(() => {
    if (descriptor) Object.defineProperty(object, key, descriptor);
    else delete object[key];
  });
}

beforeAll(() => {
  networkAttempts = [];
  restorers = [];
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  navigate("/ordinary");
  // Plain replacements survive Jest's per-case resetMocks/restoreMocks settings.
  global.fetch = (() => blocked("fetch")) as typeof global.fetch;
  global.WebSocket = class {
    constructor() {
      blocked("websocket");
    }
  } as any;
  for (const [object, method, name] of [
    [http, "request", "http"],
    [https, "request", "https"],
    [net, "connect", "net"],
    [net, "createConnection", "net.createConnection"],
    [tls, "connect", "tls"],
    [XMLHttpRequest.prototype, "send", "xhr"]
  ] as const) {
    denyTransport(object, method, name);
  }
  if (typeof navigator.sendBeacon === "function") {
    denyTransport(navigator, "sendBeacon", "beacon");
  }
  // Import only after the network deny-all is installed. No real config/DSN read.
  sdk = require("@sentry/react-native");
  // Session helpers belong to the installed core package, not the RN barrel.
  core = require("@sentry/core");
  monitoring = require("../../src/utils/monitoring");
  expect(monitoring.initMonitoring().enabled).toBe(true);
});
beforeEach(async () => {
  navigate("/ordinary");
  sdk.getCurrentScope().clear();
  sdk.getIsolationScope().clear();
  await sdk.flush();
  mockEnvelopes.length = 0;
});
afterEach(async () => {
  await sdk.flush();
  expect(networkAttempts).toEqual([]);
  expect(JSON.stringify(mockEnvelopes)).not.toContain(INVITATION);
});
afterAll(async () => {
  try {
    await sdk?.close();
    sdk?.getCurrentScope().clear();
    sdk?.getIsolationScope().clear();
    sdk?.getCurrentScope().setClient(undefined);
    expect(networkAttempts).toEqual([]);
  } finally {
    for (const restore of restorers) restore();
    global.fetch = originalFetch;
    global.WebSocket = originalWebSocket;
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
    navigate("/");
    mockEnvelopes.length = 0;
  }
});

test("app initializer reaches the installed client with sampling/session defaults intact", () => {
  expect(mockInitOptions).toHaveLength(1);
  expect(mockInitOptions[0]).toMatchObject({
    tracesSampleRate: 0,
    enableAutoSessionTracking: true
  });
  expect(mockInitOptions[0].enableLogs).toBeUndefined();
  const client = sdk.getClient();
  expect(client.constructor.name).toBe("ReactNativeClient");
  expect(client.getOptions().enableNative).toBe(false);
  expect(client.getOptions().integrations.length).toBeGreaterThan(0);
});

test("ordinary event survives real SDK preparation and reaches memory transport", async () => {
  sdk.captureEvent({ message: "Ordinary diagnostic control" });
  await sdk.flush();
  expect(events()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ message: "Ordinary diagnostic control" })
    ])
  );
});

test("direct SDK captures on a private page produce no outgoing error event", async () => {
  navigate(PRIVATE);
  sdk.captureEvent({ message: "Synthetic private-page failure" });
  sdk.captureException(error("Synthetic private exception"));
  await sdk.flush();
  expect(events()).toHaveLength(0);
});

test("private original exception is rejected after navigating to an ordinary page", async () => {
  const heldError = error(INVITATION);
  navigate(PRIVATE);
  navigate("/ordinary");
  sdk.captureException(heldError);
  await sdk.flush();
  expect(events()).toHaveLength(0);
});

test("SDK breadcrumb integration drops private URL and preserves ordinary breadcrumb", async () => {
  sdk.addBreadcrumb({ category: "navigation", data: { to: PRIVATE } });
  sdk.addBreadcrumb({ category: "ui.click", message: "Ordinary navigation control" });
  sdk.captureEvent({ message: "Breadcrumb transport control" });
  await sdk.flush();
  const sent = events().find(
    (event: any) => event.message === "Breadcrumb transport control"
  );
  expect(sent).toBeTruthy();
  expect(sent.breadcrumbs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ message: "Ordinary navigation control" })
    ])
  );
  expect(JSON.stringify(sent)).not.toContain("claim-course-gift");
});

test("delayed SDK processing cannot serialize a retained private request URL", async () => {
  let release!: () => void;
  let entered!: () => void;
  const processing = new Promise<void>((resolve) => {
    entered = resolve;
  });
  sdk.withScope((scope: any) => {
    scope.addEventProcessor(
      (event: any) =>
        new Promise((resolve) => {
          release = () => resolve(event);
          entered();
        })
    );
    sdk.captureEvent({
      message: "Synthetic delayed private request",
      request: { url: PRIVATE }
    });
  });
  await processing;
  navigate("/ordinary");
  release();
  await sdk.flush();
  expect(events()).toHaveLength(0);
});

test("application capture remains private-safe with a real SDK behind it", async () => {
  navigate(PRIVATE);
  expect(
    monitoring.captureException(error("Generic error"), {
      email: "synthetic-recipient@example.invalid"
    })
  ).toBe(false);
  navigate("/ordinary");
  const ordinaryError = error("Ordinary app capture");
  const stackLimit = Error.stackTraceLimit;
  try {
    // The SDK creates its own synthetic Error here. This test file's name is a
    // private marker; omit fixture-only caller frames from that ordinary control.
    // The supplied ordinary Error keeps its explicit stack; privacy hooks and
    // the SDK's event pipeline remain unchanged.
    Error.stackTraceLimit = 0;
    expect(monitoring.captureException(ordinaryError, { screen: "ordinary" })).toBe(true);
  } finally {
    Error.stackTraceLimit = stackLimit;
  }
  await sdk.flush();
  expect(
    events().some((event: any) =>
      event.exception?.values?.some(
        (value: any) => value.value === "Ordinary app capture"
      )
    )
  ).toBe(true);
  expect(JSON.stringify(mockEnvelopes)).not.toContain(
    "synthetic-recipient@example.invalid"
  );
});

test("session envelopes emitted with default tracking contain no invitation or recipient", async () => {
  navigate(PRIVATE);
  expect(core.getClient()).toBe(sdk.getClient());
  core.startSession();
  core.captureSession();
  core.endSession();
  await sdk.flush();
  const sessions = mockEnvelopes.flatMap((envelope: any) =>
    envelope[1].filter(([head]: any) => head.type === "session")
  );
  expect(sessions.length).toBeGreaterThan(0);
  const serialized = JSON.stringify(sessions);
  expect(serialized).not.toContain("claim-course-gift");
  expect(serialized).not.toContain(INVITATION);
  expect(serialized).not.toContain("recipient");
});
