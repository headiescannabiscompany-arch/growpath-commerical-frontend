// New Admin-outlet seam only. Existing root pinning, support transactions and
// passkey journeys retain their closed evidence; no hosted/provider calls.
import React from "react";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { Platform } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { startAuthentication } from "@simplewebauthn/browser";
import { apiRequest } from "@/api/apiRequest";
import { getToken } from "@/auth/tokenStore";
import { clearAdminStepUp, verifyAdminPasskey } from "@/api/adminPasskeys";
import { InternalCourseGiftTransportContext } from "@/components/courseGifts/CourseGiftTransportContext";
import Entry from "@/features/admin/StagingCourseCheckoutSupportEntry";
import { suppressCourseGiftDiagnostic } from "@/utils/courseGiftDiagnosticPrivacy";

let mockAuth: any;
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/api/apiRequest", () => ({
  ...jest.requireActual("@/api/apiRequest"),
  apiRequest: jest.fn()
}));
jest.mock("@/auth/tokenStore", () => ({ getToken: jest.fn() }));
jest.mock("@simplewebauthn/browser", () => ({ startAuthentication: jest.fn() }));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});

const api = apiRequest as jest.Mock;
const USER = "a".repeat(24);
const GIFT = "b".repeat(24);
const BUYER = "c".repeat(24);
const ATTEMPT = "11111111-1111-4111-8111-111111111111";
const REQUEST = "22222222-2222-4222-8222-222222222222";
const OPERATION = "33333333-3333-4333-8333-333333333333";
const OPEN = "Open course-gift support";
const CLOSE = "Close course-gift support";
const transport = jest.fn();
const otherTransport = jest.fn();
type Invoke = React.ContextType<typeof InternalCourseGiftTransportContext>;
function Scene({ selected = transport }: { selected?: Invoke | null } = {}) {
  return (
    <InternalCourseGiftTransportContext.Provider value={selected ?? undefined}>
      <Entry />
    </InternalCourseGiftTransportContext.Provider>
  );
}
const originalGlobals = ["window", "navigator", "PublicKeyCredential"].map(
  (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const
);
let storage: jest.Mock;
let guards: jest.SpyInstance[];
let respond: (route: string, options: any) => any;
const supportCalls = () =>
  api.mock.calls.filter(([route]) => route.includes("/support/"));
const referenceReply = () => ({
  success: true,
  data: {
    operationId: OPERATION,
    issuanceRequestId: REQUEST,
    status: "reference_issued",
    originalEvidenceVerified: false,
    recoveryAuthorized: false,
    schedulingChanged: false,
    activationAllowed: false
  }
});
async function verified() {
  await act(async () => {
    await verifyAdminPasskey();
  });
}
function open(ui: ReturnType<typeof render>) {
  fireEvent.press(ui.getByLabelText(OPEN));
  expect(ui.getByText("Admin security")).toBeTruthy();
}
function openCallback(ui: ReturnType<typeof render>): () => void {
  // Match fireEvent's ancestor/host-handler lookup rather than assuming Expo's
  // rendered Pressable has the same module identity as the imported component.
  let element: ReturnType<typeof ui.getByLabelText> | null = ui.getByLabelText(OPEN);
  while (element) {
    for (const key of ["onPress", "press", "testOnly_onPress", "testOnly_press"])
      if (typeof element.props[key] === "function") return element.props[key];
    element = element.parent;
  }
  throw Error("Open callback missing from the rendered fixture");
}

beforeEach(() => {
  jest.useFakeTimers();
  clearAdminStepUp({ accountChanged: true });
  jest.replaceProperty(Platform, "OS", "web");
  mockAuth = {
    isAuthed: true,
    isHydrating: false,
    meStatus: "ready",
    token: "synthetic-owner-bearer",
    user: {
      id: USER,
      role: "admin",
      emailVerified: true,
      mode: "facility",
      plan: "facility",
      aiTokens: 73
    }
  };
  storage = jest.fn(() => {
    throw Error("Storage prohibited");
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      isSecureContext: true,
      location: {
        href: "https://growpath-web-staging.onrender.com/admin",
        origin: "https://growpath-web-staging.onrender.com"
      },
      localStorage: { getItem: storage, setItem: storage, removeItem: storage },
      sessionStorage: { getItem: storage, setItem: storage, removeItem: storage }
    }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { credentials: { create: jest.fn(), get: jest.fn() } }
  });
  Object.defineProperty(globalThis, "PublicKeyCredential", {
    configurable: true,
    value: function () {}
  });
  (getToken as jest.Mock).mockImplementation(async () => mockAuth.token);
  (startAuthentication as jest.Mock).mockResolvedValue({ id: "synthetic-assertion" });
  respond = async () => referenceReply();
  api.mockImplementation(async (route, options) => {
    if (route === "/api/admin/passkeys/authentication/options")
      return { challengeId: "synthetic", optionsJSON: {} };
    if (route === "/api/admin/passkeys/authentication/verify")
      return {
        stepUpToken: "s".repeat(43),
        expiresAt: new Date(Date.now() + 300_000).toISOString()
      };
    if (route === "/api/course-gifts/support/gift/reference")
      return respond(route, options);
    throw Error("Unexpected local mock route");
  });
  const blocked = () => {
    throw Error("External access blocked");
  };
  guards = [];
  for (const module of [http, https])
    for (const method of ["get", "request"] as const)
      guards.push(jest.spyOn(module, method).mockImplementation(blocked));
  if (typeof globalThis.fetch === "function")
    guards.push(jest.spyOn(globalThis, "fetch").mockImplementation(blocked));
});

afterEach(async () => {
  await act(async () => {
    cleanup();
    clearAdminStepUp({ accountChanged: true });
  });
  jest.runAllTicks();
  for (const guard of guards) expect(guard).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
  expect(transport).not.toHaveBeenCalled();
  expect(otherTransport).not.toHaveBeenCalled();
  expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
  expect(mockAuth.user).toMatchObject({ plan: "facility", aiTokens: 73 });
  expect(
    api.mock.calls.every(([route]) =>
      /^\/api\/(?:admin\/passkeys\/authentication\/(?:options|verify)|course-gifts\/support\/gift\/reference)$/.test(
        route
      )
    )
  ).toBe(true);
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("R09 staging Admin support entry", () => {
  test("normal Admin page mounts the guarded outlet beside existing commerce review", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../src/app/admin/index.tsx"),
      "utf8"
    );
    expect(source).toContain(
      'import StagingCourseCheckoutSupportEntry from "@/features/admin/StagingCourseCheckoutSupportEntry"'
    );
    expect(source).toMatch(
      /<AdminCommercePaymentReviewCard\s*\/>\s*<StagingCourseCheckoutSupportEntry\s*\/>\s*<AdminFacilityDocuments\s*\/>/
    );
    expect(source.indexOf("if (!isAdmin)")).toBeLessThan(
      source.indexOf("<StagingCourseCheckoutSupportEntry />")
    );
  });

  test("Facility-mode admin opens explicitly without calls, then closes and releases privacy", () => {
    const original = JSON.stringify(mockAuth);
    const ui = render(<Scene />);
    expect(ui.getByLabelText(OPEN)).toBeTruthy();
    expect(ui.queryByText("Admin security")).toBeNull();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
    expect(api).not.toHaveBeenCalled();
    open(ui);
    expect(api).not.toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(true);
    fireEvent.press(ui.getByLabelText(CLOSE));
    expect(ui.queryByText("Admin security")).toBeNull();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
    expect(JSON.stringify(mockAuth)).toBe(original);
  });

  test("absent staging context and native platforms have no entry or effects", () => {
    const ui = render(<Scene selected={null} />);
    expect(ui.queryByLabelText(OPEN)).toBeNull();
    for (const platform of ["android", "ios"] as const) {
      jest.replaceProperty(Platform, "OS", platform);
      ui.rerender(<Scene />);
      expect(ui.queryByLabelText(OPEN)).toBeNull();
    }
    expect(api).not.toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();
  });

  test("pending, unverified, signed-out or non-admin authority never mounts support", () => {
    const original = mockAuth;
    const ui = render(<Scene />);
    for (const change of [
      { isAuthed: false },
      { isHydrating: true },
      { meStatus: "loading" },
      { token: "" },
      { user: { ...original.user, emailVerified: false } },
      { user: { ...original.user, role: "owner" } }
    ]) {
      mockAuth = { ...original, ...change };
      ui.rerender(<Scene />);
      expect(ui.queryByLabelText(OPEN)).toBeNull();
      expect(ui.queryByText("Admin security")).toBeNull();
    }
    mockAuth = original;
    ui.rerender(<Scene />);
    expect(ui.getByLabelText(OPEN)).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });

  test("token, actor, role and readiness changes discard admission; restoration stays closed", () => {
    const original = mockAuth;
    const ui = render(<Scene />);
    for (const change of [
      { token: "synthetic-replacement-bearer" },
      { user: { ...original.user, id: "d".repeat(24) } },
      { user: { ...original.user, role: "user" } },
      { isHydrating: true }
    ]) {
      open(ui);
      mockAuth = { ...original, ...change };
      ui.rerender(<Scene />);
      expect(ui.queryByLabelText(CLOSE)).toBeNull();
      expect(ui.queryByText("Admin security")).toBeNull();
      expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
      mockAuth = original;
      ui.rerender(<Scene />);
      expect(ui.getByLabelText(OPEN)).toBeTruthy();
      expect(ui.queryByText("Admin security")).toBeNull();
    }
    expect(api).not.toHaveBeenCalled();
  });

  test("security identity change closes synchronously and rejects the stale Open callback", () => {
    const ui = render(<Scene />);
    const staleOpen = openCallback(ui);
    act(() => {
      clearAdminStepUp({ accountChanged: true });
      staleOpen();
    });
    expect(ui.getByLabelText(OPEN)).toBeTruthy();
    expect(ui.queryByText("Admin security")).toBeNull();
    open(ui);
    act(() => clearAdminStepUp({ accountChanged: true }));
    expect(ui.getByLabelText(OPEN)).toBeTruthy();
    expect(ui.queryByText("Admin security")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  test("same-account proof renewal preserves the original private form without replay", async () => {
    await verified();
    const ui = render(<Scene />);
    open(ui);
    fireEvent.changeText(ui.getByLabelText("Original gift ID"), GIFT);
    act(() => clearAdminStepUp());
    expect(ui.getByLabelText(CLOSE)).toBeTruthy();
    expect(ui.queryByLabelText("Original gift ID")).toBeNull();
    await verified();
    expect(ui.getByLabelText("Original gift ID").props.value).toBe(GIFT);
    expect(supportCalls()).toHaveLength(0);
    fireEvent.press(ui.getByLabelText(CLOSE));
    open(ui);
    expect(ui.getByLabelText("Original gift ID").props.value).toBe("");
  });

  test("context replacement or loss disposes admission and stale callbacks cannot reopen it", () => {
    const ui = render(<Scene />);
    const staleOpen = openCallback(ui);
    open(ui);
    ui.rerender(<Scene selected={otherTransport} />);
    act(() => staleOpen());
    expect(ui.getByLabelText(OPEN)).toBeTruthy();
    expect(ui.queryByText("Admin security")).toBeNull();
    open(ui);
    ui.rerender(<Scene selected={null} />);
    expect(ui.queryByLabelText(OPEN)).toBeNull();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
    ui.rerender(<Scene />);
    expect(ui.getByLabelText(OPEN)).toBeTruthy();
    expect(ui.queryByText("Admin security")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  test("closing during reference issuance aborts it and drops its late reply on reopen", async () => {
    await verified();
    const ui = render(<Scene />);
    open(ui);
    for (const [label, value] of [
      ["Original gift ID", GIFT],
      ["Original purchaser user ID", BUYER],
      ["Original checkout attempt ID", ATTEMPT],
      ["Original reference request ID", REQUEST]
    ])
      fireEvent.changeText(ui.getByLabelText(label), value);
    let resolve!: (value: unknown) => void;
    respond = () =>
      new Promise((done) => {
        resolve = done;
      });
    await act(async () => {
      fireEvent.press(ui.getByLabelText("Issue or recover support reference"));
    });
    expect(supportCalls()).toHaveLength(1);
    const signal = supportCalls()[0][1].signal;
    expect(signal.aborted).toBe(false);
    fireEvent.press(ui.getByLabelText(CLOSE));
    expect(signal.aborted).toBe(true);
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
    await act(async () => resolve(referenceReply()));
    open(ui);
    expect(ui.getByLabelText("Original gift ID").props.value).toBe("");
    expect(ui.getByLabelText("Original support operation ID").props.value).toBe("");
    expect(supportCalls()).toHaveLength(1);
  });
});
