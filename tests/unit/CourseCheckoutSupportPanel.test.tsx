import React from "react";
import { Platform } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { apiRequest, ApiError } from "@/api/apiRequest";
import { getToken } from "@/auth/tokenStore";
import { startAuthentication } from "@simplewebauthn/browser";
import { clearAdminStepUp, verifyAdminPasskey } from "@/api/adminPasskeys";
import PublicPanel, {
  InternalCourseCheckoutSupportPanel as Panel
} from "@/features/admin/CourseCheckoutSupportPanel";
import AdminPasskeySecurity from "@/features/admin/AdminPasskeySecurity";
import {
  enterCourseGiftDiagnosticScope,
  filterCourseGiftDiagnostic,
  privateSafeConsole,
  suppressCourseGiftDiagnostic
} from "@/utils/courseGiftDiagnosticPrivacy";

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
const ATTEMPT = "11111111-1111-4111-8111-111111111111";
const OPERATION = "22222222-2222-4222-8222-222222222222";
const TARGET = "a".repeat(24),
  BUYER = "b".repeat(24);
const REASON = "Review original synthetic checkout evidence";
describe("R09-06AN private screen connections", () => {
  const REQUEST = "33333333-3333-4333-8333-333333333333";
  function fillReferences(ui: UI) {
    for (const [label, value] of [
      ["Original gift ID", TARGET],
      ["Original purchaser user ID", BUYER],
      ["Original checkout attempt ID", ATTEMPT],
      ["Original reference request ID", REQUEST]
    ])
      fireEvent.changeText(ui.getByLabelText(label), value);
  }
  const refReply = () => ({
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
  async function issue(ui: UI, retry = false) {
    await act(async () => {
      fireEvent.press(
        ui.getByLabelText(
          retry ? "Retry same reference request" : "Issue or recover support reference"
        )
      );
    });
  }
  it("requires a server-issued reference then retains explicit original-evidence confirmation", async () => {
    await verified();
    const ui = render(<Panel />);
    fillReferences(ui);
    fireEvent.changeText(ui.getByLabelText("Original support operation ID"), OPERATION);
    expect(
      ui.getByLabelText("Review original evidence").props.accessibilityState.disabled
    ).toBe(true);
    respond = async (path) => (path.endsWith("/reference") ? refReply() : reply());
    await issue(ui);
    expect(ui.getByLabelText("Original support operation ID").props.value).toBe(
      OPERATION
    );
    expect(supportCalls()).toHaveLength(1);
    for (const [label, value] of [
      ["Original provider Session ID", SESSION],
      ["Exact original review reason", REASON],
      ["Exact recovery confirmation", body().confirmation]
    ])
      fireEvent.changeText(ui.getByLabelText(label), value);
    fireEvent.press(ui.getByLabelText("Review original evidence"));
    expect(
      ui.getByLabelText("Submit evidence for review").props.accessibilityState.disabled
    ).toBe(true);
    await submit(ui);
    expect(supportCalls().map(([path]) => path)).toEqual([
      "/api/course-gifts/support/gift/reference",
      "/api/course-gifts/support/gift/recover"
    ]);
    expect(supportCalls()[1][1].body.operationId).toBe(OPERATION);
  });
  it("uncertain issuance freezes exact references and never automatically retries", async () => {
    await verified();
    const ui = render(<Panel />);
    fillReferences(ui);
    respond = async () => {
      throw new Error("private diagnostic");
    };
    await issue(ui);
    fireEvent.changeText(ui.getByLabelText("Original gift ID"), "c".repeat(24));
    fireEvent.changeText(ui.getByLabelText("Original reference request ID"), ATTEMPT);
    expect(ui.getByLabelText("Original gift ID").props.value).toBe(TARGET);
    expect(ui.getByLabelText("Original reference request ID").props.value).toBe(REQUEST);
    expect(
      ui.getByLabelText("Ordinary Commercial course").props.accessibilityState.disabled
    ).toBe(true);
    expect(supportCalls()).toHaveLength(1);
    respond = async () => refReply();
    await issue(ui, true);
    expect(supportCalls()[1][1].body).toEqual(supportCalls()[0][1].body);
  });
  it("connects read-only delivery assessment and clears stale results after edits", async () => {
    await verified();
    const ui = render(<Panel />);
    fillReferences(ui);
    fireEvent.press(ui.getByLabelText("Delivery technical review"));
    respond = async (path) =>
      path.endsWith("/reference")
        ? refReply()
        : {
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
          };
    await issue(ui);
    fireEvent.changeText(ui.getByLabelText("Original gift state version"), "0");
    fireEvent.changeText(ui.getByLabelText("Original delivery generation"), "1");
    await act(async () => {
      fireEvent.press(ui.getByLabelText("Read delivery technical assessment"));
    });
    expect(ui.getByText(/Technical snapshot only:/)).toBeTruthy();
    expect(supportCalls()[1][1].body).toEqual({
      giftId: TARGET,
      purchaserUserId: BUYER,
      checkoutAttemptId: ATTEMPT,
      operationId: OPERATION,
      expectedStateVersion: 0,
      expectedGeneration: 1
    });
    expect(ui.queryByLabelText("Submit evidence for review")).toBeNull();
    fireEvent.changeText(ui.getByLabelText("Original gift state version"), "1");
    expect(ui.queryByText(/Technical snapshot only:/)).toBeNull();
  });
  it("hides reference fields after proof loss without replaying on renewal", async () => {
    await verified();
    const ui = render(<Panel />);
    fillReferences(ui);
    respond = async () => refReply();
    await issue(ui);
    await act(async () => {
      clearAdminStepUp();
    });
    expect(ui.queryByLabelText("Original support operation ID")).toBeNull();
    await verified();
    expect(supportCalls()).toHaveLength(1);
    expect(ui.getByLabelText("Original support operation ID").props.value).toBe(
      OPERATION
    );
  });
  it("drops pending replies on account change and remount has no private continuation", async () => {
    await verified();
    const ui = render(<Panel />);
    fillReferences(ui);
    const wait = pending();
    respond = () => wait.promise;
    await issue(ui);
    await act(async () => {
      clearAdminStepUp({ accountChanged: true });
      wait.resolve(refReply());
    });
    expect(ui.queryByLabelText("Original support operation ID")).toBeNull();
    ui.unmount();
    await verified();
    const fresh = render(<Panel />);
    expect(fresh.getByLabelText("Original reference request ID").props.value).toBe("");
    expect(fresh.getByLabelText("Original support operation ID").props.value).toBe("");
    expect(supportCalls()).toHaveLength(1);
  });
  it("keeps ordinary Commercial evidence review separate from gift reference issuance", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui, "commercialCourse");
    await submit(ui);
    expect(supportCalls()).toHaveLength(1);
    expect(supportCalls()[0][0]).toBe(
      "/api/course-gifts/support/commercial-course/recover"
    );
    expect(ui.queryByLabelText("Original reference request ID")).toBeNull();
  });
});
const SESSION = "cs_test_synthetic";
type Kind = "courseGift" | "commercialCourse";
type UI = ReturnType<typeof render>;
const body = (kind: Kind = "courseGift") => ({
  [kind === "courseGift" ? "giftId" : "courseId"]: TARGET,
  [kind === "courseGift" ? "purchaserUserId" : "buyerUserId"]: BUYER,
  checkoutAttemptId: ATTEMPT,
  sessionId: SESSION,
  operationId: OPERATION,
  reason: REASON,
  confirmation: `RECOVER ${kind === "courseGift" ? "COURSE GIFT" : "COURSE CHECKOUT"} ${TARGET} ${ATTEMPT} ${SESSION}`
});
const reply = (kind: Kind = "courseGift") => ({
  success: true,
  data: {
    [kind === "courseGift" ? "giftId" : "courseId"]: TARGET,
    checkoutAttemptId: ATTEMPT,
    operationId: OPERATION,
    outcome: "bound_for_review"
  }
});
const status = {
  ok: true,
  configured: true,
  enrollmentEnabled: true,
  enforcementEnabled: true,
  enrolled: true,
  passkeys: [
    {
      id: "synthetic-key",
      label: "Private device label",
      createdAt: "2026-10-01T00:00:00Z"
    }
  ],
  stepUpExpiresAt: null
};
const supportCalls = () => api.mock.calls.filter(([path]) => path.includes("/support/"));
let respond: (path: string, options: any) => any;
let fetchGuard: jest.SpyInstance, storage: jest.Mock;
const originalGlobals = ["window", "navigator", "PublicKeyCredential"].map(
  (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const
);
const pending = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
async function verified() {
  await act(async () => {
    await verifyAdminPasskey();
  });
}
function fill(ui: UI, kind: Kind = "courseGift") {
  if (kind === "commercialCourse")
    fireEvent.press(ui.getByLabelText("Ordinary Commercial course"));
  for (const [label, value] of [
    [kind === "courseGift" ? "Original gift ID" : "Original course ID", TARGET],
    [
      kind === "courseGift" ? "Original purchaser user ID" : "Original buyer user ID",
      BUYER
    ],
    ["Original checkout attempt ID", ATTEMPT],
    ["Original provider Session ID", SESSION],
    ["Original support operation ID", OPERATION],
    ["Exact original review reason", REASON],
    ["Exact recovery confirmation", body(kind).confirmation]
  ])
    fireEvent.changeText(ui.getByLabelText(label), value);
  fireEvent.press(ui.getByLabelText("Review original evidence"));
}
async function submit(ui: UI, retry = false) {
  fireEvent.press(ui.getByLabelText("I reviewed the exact original evidence"));
  await act(async () => {
    fireEvent.press(
      ui.getByLabelText(retry ? "Retry this exact review" : "Submit evidence for review")
    );
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  clearAdminStepUp({ accountChanged: true });
  jest.replaceProperty(Platform, "OS", "web");
  storage = jest.fn(() => {
    throw new Error("Storage prohibited");
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      isSecureContext: true,
      location: { href: "https://local.invalid/admin" },
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
  (getToken as jest.Mock).mockResolvedValue("synthetic-bearer");
  (startAuthentication as jest.Mock).mockResolvedValue({ id: "synthetic-assertion" });
  respond = async (path) =>
    reply(path.includes("commercial-course") ? "commercialCourse" : "courseGift");
  api.mockImplementation(async (path, options) => {
    if (path === "/api/admin/passkeys") return status;
    if (path === "/api/admin/passkeys/authentication/options")
      return { challengeId: "synthetic", optionsJSON: {} };
    if (path === "/api/admin/passkeys/authentication/verify")
      return {
        stepUpToken: "s".repeat(43),
        expiresAt: new Date(Date.now() + 300000).toISOString()
      };
    if (
      [
        "/api/course-gifts/support/gift/recover",
        "/api/course-gifts/support/commercial-course/recover",
        "/api/course-gifts/support/gift/history",
        "/api/course-gifts/support/gift/reference",
        "/api/course-gifts/support/gift/delivery-review",
        "/api/course-gifts/support/commercial-course/history"
      ].includes(path)
    )
      return respond(path, options);
    throw new Error("Unexpected local mock route");
  });
  fetchGuard = jest.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("Network prohibited");
  });
});
afterEach(async () => {
  await act(async () => {
    cleanup();
    clearAdminStepUp({ accountChanged: true });
  });
  // React's act queues its own awaited-act warning microtasks after the callback.
  // Drain those, not application timeouts, before checking for leaked timers.
  jest.runAllTicks();
  expect(fetchGuard).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
  expect(suppressCourseGiftDiagnostic("ordinary harmless message")).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
  expect(
    api.mock.calls.every(([path]) =>
      /^\/api\/(admin\/passkeys(?:\/authentication\/(options|verify))?|course-gifts\/support\/(gift|commercial-course)\/(recover|history|reference|delivery-review))$/.test(
        path
      )
    )
  ).toBe(true);
  fetchGuard.mockRestore();
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("R09-06H dormant history panel", () => {
  const historyReply = (state = "unknown") => ({
    success: true,
    data: { status: state, historicalOnly: true, requiresOriginalEvidence: true }
  });
  function references(ui: UI, kind: Kind = "courseGift") {
    if (kind === "commercialCourse")
      fireEvent.press(ui.getByLabelText("Ordinary Commercial course"));
    for (const [label, value] of [
      [kind === "courseGift" ? "Original gift ID" : "Original course ID", TARGET],
      [
        kind === "courseGift" ? "Original purchaser user ID" : "Original buyer user ID",
        BUYER
      ],
      ["Original checkout attempt ID", ATTEMPT],
      ["Original support operation ID", OPERATION]
    ])
      fireEvent.changeText(ui.getByLabelText(label), value);
  }
  async function inspect(ui: UI) {
    await act(async () => {
      fireEvent.press(ui.getByText("Check recorded recovery history"));
    });
  }
  it.each<Kind>(["courseGift", "commercialCourse"])(
    "reads %s with only four references and no recovery submission",
    async (kind) => {
      await verified();
      const ui = render(<Panel />);
      references(ui, kind);
      respond = async () => historyReply("binding_recorded");
      expect(supportCalls()).toHaveLength(0);
      await inspect(ui);
      expect(supportCalls()).toHaveLength(1);
      const [path, options] = supportCalls()[0];
      expect(path.endsWith("/history")).toBe(true);
      expect(Object.keys(options.body)).toHaveLength(4);
      expect(options.body).not.toHaveProperty("reason");
      expect(options.body).not.toHaveProperty("sessionId");
      expect(ui.getByText(/A binding was recorded for review/)).toBeTruthy();
      expect(ui.getByText(/historical evidence only, not current payment/)).toBeTruthy();
      expect(ui.queryByText("Submit evidence for review")).toBeNull();
      expect(ui.getByLabelText("Original provider Session ID").props.value).toBe("");
    }
  );
  it.each(["request_recorded", "unknown"])(
    "labels %s without implying success or no prior action",
    async (state) => {
      await verified();
      const ui = render(<Panel />);
      references(ui);
      respond = async () => historyReply(state);
      await inspect(ui);
      expect(
        ui.getByText(
          state === "unknown"
            ? /not proof that no action occurred/
            : /binding is not established by this read/
        )
      ).toBeTruthy();
      expect(supportCalls()).toHaveLength(1);
    }
  );
  it("invalid references are local and editing clears old history", async () => {
    await verified();
    const ui = render(<Panel />);
    await inspect(ui);
    expect(ui.getByText(/Enter the four exact original references/)).toBeTruthy();
    expect(supportCalls()).toHaveLength(0);
    references(ui);
    respond = async () => historyReply("binding_recorded");
    await inspect(ui);
    fireEvent.changeText(ui.getByLabelText("Original gift ID"), "c".repeat(24));
    expect(ui.queryByText(/A binding was recorded/)).toBeNull();
    expect(supportCalls()).toHaveLength(1);
  });
  it("pending history blocks edits and recovery actions without losing reviewed fields", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    const late = pending();
    respond = () => late.promise;
    await inspect(ui);
    await inspect(ui);
    fireEvent.changeText(
      ui.getByLabelText("Exact original review reason"),
      "Changed reason should not save"
    );
    fireEvent.press(ui.getByLabelText("Submit evidence for review"));
    expect(supportCalls()).toHaveLength(1);
    expect(ui.getByLabelText("Exact original review reason").props.value).toBe(REASON);
    await act(async () => {
      late.resolve(historyReply());
    });
    expect(
      ui.getByLabelText("I reviewed the exact original evidence").props.accessibilityState
        .checked
    ).toBe(false);
  });
  it("history cannot release a frozen uncertain recovery request", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    respond = async () => {
      throw new Error("Uncertain");
    };
    await submit(ui);
    const original = supportCalls()[0][1].body;
    respond = async () => historyReply("request_recorded");
    await inspect(ui);
    expect(ui.getByLabelText("Exact original review reason").props.editable).toBe(false);
    expect(
      ui.getByLabelText("I reviewed the exact original evidence").props.accessibilityState
        .checked
    ).toBe(false);
    respond = async () => reply();
    await submit(ui, true);
    expect(supportCalls()).toHaveLength(3);
    expect(supportCalls()[2][1].body).toEqual(original);
  });
  it("proof clearing hides history and renewal does not replay it", async () => {
    await verified();
    const ui = render(<Panel />);
    references(ui);
    respond = async () => historyReply("binding_recorded");
    await inspect(ui);
    act(() => clearAdminStepUp());
    expect(ui.queryByText(/A binding was recorded/)).toBeNull();
    await verified();
    expect(ui.queryByText(/A binding was recorded/)).toBeNull();
    expect(supportCalls()).toHaveLength(1);
  });
  it("account replacement and remount discard history references", async () => {
    await verified();
    const ui = render(<Panel />);
    references(ui);
    const late = pending();
    respond = () => late.promise;
    await inspect(ui);
    await act(async () => {
      clearAdminStepUp({ accountChanged: true });
      late.resolve(historyReply("binding_recorded"));
    });
    expect(ui.queryByText(/A binding was recorded/)).toBeNull();
    expect(ui.queryByLabelText("Original gift ID")).toBeNull();
    ui.unmount();
    await verified();
    const fresh = render(<Panel />);
    expect(fresh.getByLabelText("Original gift ID").props.value).toBe("");
    expect(supportCalls()).toHaveLength(1);
  });
});

describe("R09-06E dormant private support panel", () => {
  it("public entry is inert and does not enter diagnostic scope", () => {
    expect(render(<PublicPanel />).toJSON()).toBeNull();
    expect(api).not.toHaveBeenCalled();
    expect(suppressCourseGiftDiagnostic("ordinary")).toBe(false);
  });
  it("native internal entry is closed", () => {
    jest.replaceProperty(Platform, "OS", "ios");
    expect(render(<Panel />).toJSON()).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
  it("unverified mount hides inputs and makes no credential or transport probe", () => {
    const ui = render(<Panel />);
    expect(ui.queryByLabelText("Original gift ID")).toBeNull();
    expect(ui.getByText(/Private fields hidden/)).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();
  });
  it("reuses explicit existing passkey verification without enrollment or removal", async () => {
    const ui = render(<Panel />);
    await act(async () => {
      fireEvent.press(ui.getByText("Verify existing Admin passkey"));
    });
    expect(ui.queryByText("Add a passkey")).toBeNull();
    expect(ui.queryByLabelText("Current Admin password for passkey changes")).toBeNull();
    expect(ui.queryByText(/Private device label/)).toBeNull();
    await act(async () => {
      fireEvent.press(ui.getByText("Verify passkey"));
    });
    expect(startAuthentication).toHaveBeenCalledTimes(1);
    expect(ui.getByLabelText("Original gift ID")).toBeTruthy();
    expect(supportCalls()).toHaveLength(0);
  });
  it("private passkey failure does not display raw error or source data", async () => {
    const ui = render(<Panel />);
    await act(async () => {
      fireEvent.press(ui.getByText("Verify existing Admin passkey"));
    });
    (startAuthentication as jest.Mock).mockRejectedValueOnce(
      new Error("SECRET opaque support reason")
    );
    await act(async () => {
      fireEvent.press(ui.getByText("Verify passkey"));
    });
    expect(ui.getByText(/Passkey verification could not be confirmed/)).toBeTruthy();
    expect(JSON.stringify(ui.toJSON())).not.toContain("SECRET");
    expect(supportCalls()).toHaveLength(0);
  });
  it("existing default passkey management stays available outside private mode", async () => {
    const ui = render(<AdminPasskeySecurity />);
    await act(async () => {
      fireEvent.press(ui.getByText("Set up or verify a passkey"));
    });
    expect(ui.getByText("Add a passkey")).toBeTruthy();
    expect(ui.getByLabelText("Current Admin password for passkey changes")).toBeTruthy();
  });
  it("review is local and submit requires a separate unchecked acknowledgment", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    fireEvent.press(ui.getByLabelText("Submit evidence for review"));
    expect(supportCalls()).toHaveLength(0);
    expect(
      ui.getByLabelText("I reviewed the exact original evidence").props.accessibilityState
        .checked
    ).toBe(false);
  });
  it("invalid evidence cannot reach submission", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    fireEvent.changeText(ui.getByLabelText("Original gift ID"), "guessed");
    fireEvent.press(ui.getByLabelText("Review original evidence"));
    expect(
      ui.getByText(/Review the original evidence and exact confirmation/)
    ).toBeTruthy();
    expect(ui.queryByLabelText("Submit evidence for review")).toBeNull();
    expect(supportCalls()).toHaveLength(0);
  });
  it("typed confirmation must match the original candidate exactly", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    fireEvent.changeText(ui.getByLabelText("Exact recovery confirmation"), "RECOVER");
    fireEvent.press(ui.getByLabelText("Review original evidence"));
    expect(ui.queryByLabelText("Submit evidence for review")).toBeNull();
    expect(supportCalls()).toHaveLength(0);
  });
  it("editing any unattempted field invalidates the prior review", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    fireEvent.press(ui.getByLabelText("I reviewed the exact original evidence"));
    fireEvent.changeText(
      ui.getByLabelText("Exact original review reason"),
      "A separately edited original reason"
    );
    expect(ui.queryByLabelText("Submit evidence for review")).toBeNull();
    expect(supportCalls()).toHaveLength(0);
  });
  it("changing kind clears the unattempted evidence without network", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    fireEvent.press(ui.getByLabelText("Ordinary Commercial course"));
    expect(ui.getByLabelText("Original course ID").props.value).toBe("");
    expect(ui.getByLabelText("Exact original review reason").props.value).toBe("");
    expect(ui.queryByLabelText("Submit evidence for review")).toBeNull();
    expect(supportCalls()).toHaveLength(0);
  });
  it.each(["courseGift", "commercialCourse"] as Kind[])(
    "%s binds only exact review evidence and states no financial outcome",
    async (kind) => {
      await verified();
      const ui = render(<Panel />);
      fill(ui, kind);
      await submit(ui);
      expect(supportCalls()).toHaveLength(1);
      expect(supportCalls()[0][1].body).toEqual(body(kind));
      expect(supportCalls()[0][1]).toMatchObject({
        notifyTokenBalance: false,
        invalidateOn401: false,
        retries: 0,
        notifyTransport: false
      });
      expect(ui.getByText(/Evidence linked for review only/)).toBeTruthy();
      expect(ui.getByText(/manual refund review/)).toBeTruthy();
      expect(ui.queryByLabelText("Retry this exact review")).toBeNull();
    }
  );
  it("pending action prevents duplicate submission, edits and kind replacement", async () => {
    await verified();
    const wait = pending();
    respond = () => wait.promise;
    const ui = render(<Panel />);
    fill(ui);
    await submit(ui);
    fireEvent.press(ui.getByLabelText("Submit evidence for review"));
    fireEvent.changeText(
      ui.getByLabelText("Exact original review reason"),
      "Unwanted replacement request reason"
    );
    fireEvent.press(ui.getByLabelText("Ordinary Commercial course"));
    expect(ui.getByLabelText("Exact original review reason").props.value).toBe(REASON);
    expect(ui.getByLabelText("Original gift ID").props.editable).toBe(false);
    expect(supportCalls()).toHaveLength(1);
    await act(async () => {
      wait.resolve(reply());
    });
  });
  it("uncertainty keeps exact request and requires a new deliberate retry acknowledgment", async () => {
    await verified();
    respond = async () => {
      throw new Error("SECRET provider error");
    };
    const ui = render(<Panel />);
    fill(ui);
    await submit(ui);
    expect(ui.getByText(/result is uncertain/)).toBeTruthy();
    expect(JSON.stringify(ui.toJSON())).not.toContain("SECRET");
    fireEvent.press(ui.getByLabelText("Retry this exact review"));
    expect(supportCalls()).toHaveLength(1);
    respond = async () => reply();
    await submit(ui, true);
    expect(supportCalls()).toHaveLength(2);
    expect(supportCalls()[1][1].body).toEqual(supportCalls()[0][1].body);
  });
  it.each([
    [503, "COURSE_CHECKOUT_SUPPORT_NOT_RELEASED", /not enabled here/],
    [403, "COURSE_CHECKOUT_SUPPORT_DENIED", /not authorized/]
  ] as const)(
    "safe %s feedback remains frozen rather than inviting a new operation",
    async (code, name, text) => {
      await verified();
      respond = async () => {
        throw new ApiError(name, code, { message: "SECRET" });
      };
      const ui = render(<Panel />);
      fill(ui);
      await submit(ui);
      expect(ui.getByText(text)).toBeTruthy();
      expect(JSON.stringify(ui.toJSON())).not.toContain("SECRET");
      expect(ui.getByLabelText("Original support operation ID").props.editable).toBe(
        false
      );
    }
  );
  it("locking hides private input; renewal retains exact request without replay", async () => {
    await verified();
    respond = async () => {
      throw new Error("synthetic");
    };
    const ui = render(<Panel />);
    fill(ui);
    await submit(ui);
    act(() => clearAdminStepUp());
    expect(ui.queryByLabelText("Original gift ID")).toBeNull();
    expect(JSON.stringify(ui.toJSON())).not.toContain(REASON);
    await verified();
    expect(ui.getByLabelText("Exact original review reason").props.value).toBe(REASON);
    expect(supportCalls()).toHaveLength(1);
    expect(
      ui.getByLabelText("I reviewed the exact original evidence").props.accessibilityState
        .checked
    ).toBe(false);
  });
  it("request timeout leaves explicit uncertainty and the original evidence", async () => {
    await verified();
    const wait = pending();
    respond = () => wait.promise;
    const ui = render(<Panel />);
    fill(ui);
    await submit(ui);
    await act(async () => {
      jest.advanceTimersByTime(20001);
    });
    expect(ui.getByText(/result is uncertain/)).toBeTruthy();
    expect(ui.getByLabelText("Original support operation ID").props.value).toBe(
      OPERATION
    );
    expect(supportCalls()[0][1].signal.aborted).toBe(true);
    await act(async () => {
      wait.resolve(reply());
    });
    expect(ui.queryByText(/Evidence linked for review only/)).toBeNull();
  });
  it("proof expiry hides unattempted private fields and invalidates acknowledgment", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    fireEvent.press(ui.getByLabelText("I reviewed the exact original evidence"));
    await act(async () => {
      jest.advanceTimersByTime(300001);
    });
    expect(ui.queryByLabelText("Exact original review reason")).toBeNull();
    expect(supportCalls()).toHaveLength(0);
    await verified();
    expect(
      ui.getByLabelText("I reviewed the exact original evidence").props.accessibilityState
        .checked
    ).toBe(false);
  });
  it("account change clears private state and ignores late success even after returning", async () => {
    await verified();
    const wait = pending();
    respond = () => wait.promise;
    const ui = render(<Panel />);
    fill(ui);
    await submit(ui);
    await act(async () => {
      clearAdminStepUp({ accountChanged: true });
    });
    expect(ui.getByText(/Private review cleared/)).toBeTruthy();
    await verified();
    await act(async () => {
      wait.resolve(reply());
    });
    expect(ui.queryByText(/Evidence linked for review only/)).toBeNull();
    expect(JSON.stringify(ui.toJSON())).not.toContain(REASON);
  });
  it("unmount aborts local waiting and remount does not recover or replay the lost form", async () => {
    await verified();
    const wait = pending();
    respond = () => wait.promise;
    const ui = render(<Panel />);
    fill(ui);
    await submit(ui);
    ui.unmount();
    expect(supportCalls()[0][1].signal.aborted).toBe(true);
    await act(async () => {
      wait.resolve(reply());
    });
    const next = render(<Panel />);
    expect(next.getByLabelText("Original gift ID").props.value).toBe("");
    expect(next.getByText(/Closing or reloading loses/)).toBeTruthy();
    expect(supportCalls()).toHaveLength(1);
  });
  it("generic Admin diagnostics are suppressed only while the private panel is mounted", () => {
    const safe = { message: "ordinary message" };
    expect(filterCourseGiftDiagnostic(safe)).toBe(safe);
    const ui = render(<Panel />);
    expect(
      filterCourseGiftDiagnostic({
        message: "opaque private reason",
        extra: { id: TARGET }
      })
    ).toBeNull();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(privateSafeConsole("error", "opaque private reason")).toBe(false);
    expect(consoleSpy).not.toHaveBeenCalled();
    ui.unmount();
    expect(filterCourseGiftDiagnostic(safe)).toBe(safe);
    consoleSpy.mockRestore();
  });
  it("overlapping private scopes release idempotently without disabling existing redaction", () => {
    const first = enterCourseGiftDiagnosticScope(),
      second = enterCourseGiftDiagnosticScope();
    first();
    first();
    expect(suppressCourseGiftDiagnostic("ordinary")).toBe(true);
    second();
    expect(suppressCourseGiftDiagnostic("ordinary")).toBe(false);
    expect(filterCourseGiftDiagnostic({ checkoutAttemptId: ATTEMPT })).toBeNull();
  });
  it("all private inputs opt out of autofill and preserve typed values without trimming", async () => {
    await verified();
    const ui = render(<Panel />);
    fill(ui);
    const reason = ui.getByLabelText("Exact original review reason");
    expect(reason.props).toMatchObject({
      autoComplete: "off",
      textContentType: "none",
      autoCorrect: false,
      autoCapitalize: "none",
      spellCheck: false
    });
    fireEvent.changeText(reason, ` ${REASON}`);
    fireEvent.press(ui.getByLabelText("Review original evidence"));
    expect(ui.getByLabelText("Exact original review reason").props.value).toBe(
      ` ${REASON}`
    );
    expect(ui.queryByLabelText("Submit evidence for review")).toBeNull();
    expect(supportCalls()).toHaveLength(0);
  });
});
