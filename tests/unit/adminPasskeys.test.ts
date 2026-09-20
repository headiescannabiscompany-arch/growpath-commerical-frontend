import { Platform } from "react-native";
import { apiRequest, ApiError } from "@/api/apiRequest";
import { getToken } from "@/auth/tokenStore";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  adminVaultRequest,
  clearAdminSecurityForLogout,
  clearAdminStepUp,
  getAdminStepUpExpiry,
  lockAdminSecurity,
  registerAdminPasskey,
  subscribeAdminSecurity,
  verifyAdminPasskey
} from "@/api/adminPasskeys";

jest.mock("@/api/apiRequest", () => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiRequest: jest.fn(), ApiError };
});
jest.mock("@/auth/tokenStore", () => ({ getToken: jest.fn() }));
jest.mock("@simplewebauthn/browser", () => ({
  startAuthentication: jest.fn(),
  startRegistration: jest.fn()
}));

const request = apiRequest as jest.Mock;
const token = getToken as jest.Mock;
const authenticate = startAuthentication as jest.Mock;
const register = startRegistration as jest.Mock;
const originalOS = Platform.OS;

async function verified() {
  request.mockResolvedValueOnce({
    challengeId: "one-use",
    optionsJSON: { challenge: "synthetic" }
  });
  request.mockResolvedValueOnce({
    stepUpToken: "synthetic-proof",
    expiresAt: new Date(Date.now() + 300_000).toISOString()
  });
  authenticate.mockResolvedValue({ id: "synthetic-public-credential" });
  await verifyAdminPasskey();
}

beforeEach(() => {
  jest.useFakeTimers();
  clearAdminStepUp();
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { isSecureContext: true }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { credentials: { create: jest.fn(), get: jest.fn() } }
  });
  Object.defineProperty(globalThis, "PublicKeyCredential", {
    configurable: true,
    value: function () {}
  });
  token.mockResolvedValue("synthetic-bearer-a");
});
afterEach(() => {
  clearAdminStepUp();
  jest.useRealTimers();
  Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
});

test("verified proof is attached only to explicit restricted requests and cleared at expiry", async () => {
  await verified();
  request.mockResolvedValueOnce({ ok: true });
  await adminVaultRequest("/api/admin/evidence-vault/users/example/removal-review", {
    method: "POST",
    body: {}
  });
  expect(request).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: expect.objectContaining({ "X-Admin-Step-Up": "synthetic-proof" }),
      retries: 0,
      cache: "no-store"
    })
  );
  jest.advanceTimersByTime(300_000);
  expect(getAdminStepUpExpiry()).toBeNull();
  request.mockResolvedValueOnce({ ok: true });
  await adminVaultRequest("/api/admin/passkeys");
  expect(request).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({ headers: { Authorization: "Bearer synthetic-bearer-a" } })
  );
});

test("canceling device authentication sends no verification or restricted mutation", async () => {
  request.mockResolvedValueOnce({ challengeId: "one-use", optionsJSON: {} });
  authenticate.mockRejectedValue(
    Object.assign(new Error("Canceled"), { name: "NotAllowedError" })
  );
  await expect(verifyAdminPasskey()).rejects.toMatchObject({ name: "NotAllowedError" });
  expect(request).toHaveBeenCalledTimes(1);
  expect(getAdminStepUpExpiry()).toBeNull();
});

test("account change during a ceremony cannot verify or store its proof", async () => {
  request.mockResolvedValueOnce({ challengeId: "one-use", optionsJSON: {} });
  authenticate.mockImplementation(async () => {
    token.mockResolvedValue("synthetic-bearer-b");
    return {};
  });
  await expect(verifyAdminPasskey()).rejects.toThrow("session changed");
  expect(request).toHaveBeenCalledTimes(1);
  expect(getAdminStepUpExpiry()).toBeNull();
});

test("changed bearer cannot reuse a verified proof", async () => {
  await verified();
  token.mockResolvedValue("synthetic-bearer-b");
  const calls = request.mock.calls.length;
  await expect(adminVaultRequest("/api/admin/passkeys")).rejects.toThrow(
    "security changed"
  );
  expect(request).toHaveBeenCalledTimes(calls);
  expect(getAdminStepUpExpiry()).toBeNull();
});

test("lock clears memory immediately even when server revocation is unavailable", async () => {
  await verified();
  request.mockRejectedValueOnce(new Error("Offline"));
  await expect(lockAdminSecurity()).rejects.toThrow("Offline");
  expect(getAdminStepUpExpiry()).toBeNull();
  expect(request).toHaveBeenLastCalledWith(
    "/api/admin/passkeys/lock",
    expect.objectContaining({
      headers: expect.objectContaining({ "X-Admin-Step-Up": "synthetic-proof" }),
      invalidateOn401: false
    })
  );
});

test("server denial clears proof and notifies protected displays", async () => {
  await verified();
  const listener = jest.fn();
  const unsubscribe = subscribeAdminSecurity(listener);
  request.mockRejectedValueOnce(new ApiError("ADMIN_STEP_UP_EXPIRED", 403));
  await expect(
    adminVaultRequest("/api/admin/evidence-vault/restricted-cases/example/records")
  ).rejects.toThrow("Verify your passkey");
  expect(listener).toHaveBeenCalledTimes(1);
  expect(getAdminStepUpExpiry()).toBeNull();
  unsubscribe();
});

test("registration submits the password only to options, not credential verification", async () => {
  request.mockResolvedValueOnce({ challengeId: "registration", optionsJSON: {} });
  request.mockResolvedValueOnce({ ok: true });
  register.mockResolvedValue({ id: "public-response" });
  await registerAdminPasskey("synthetic-current-password", "My phone");
  expect(request).toHaveBeenNthCalledWith(
    1,
    "/api/admin/passkeys/registration/options",
    expect.objectContaining({
      body: { password: "synthetic-current-password", label: "My phone" }
    })
  );
  expect(request).toHaveBeenLastCalledWith(
    "/api/admin/passkeys/registration/verify",
    expect.objectContaining({
      body: {
        challengeId: "registration",
        response: { id: "public-response" },
        label: "My phone"
      }
    })
  );
  expect(getAdminStepUpExpiry()).toBeNull();
});

test("unsupported browsers cannot start a ceremony or fall back to password-only access", async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  await expect(verifyAdminPasskey()).rejects.toThrow("supported HTTPS");
  expect(request).not.toHaveBeenCalled();
});

test("logout revokes a pending challenge after a canceled prompt even without a proof", async () => {
  request.mockResolvedValueOnce({ challengeId: "one-use", optionsJSON: {} });
  authenticate.mockRejectedValue(
    Object.assign(new Error("Canceled"), { name: "NotAllowedError" })
  );
  await expect(verifyAdminPasskey()).rejects.toMatchObject({ name: "NotAllowedError" });
  request.mockResolvedValueOnce({ ok: true, locked: true });
  await clearAdminSecurityForLogout("synthetic-bearer-a");
  expect(request).toHaveBeenLastCalledWith(
    "/api/admin/passkeys/lock",
    expect.objectContaining({
      headers: { Authorization: "Bearer synthetic-bearer-a" },
      retries: 0
    })
  );
  expect(getAdminStepUpExpiry()).toBeNull();
});

test("a late restricted response is rejected after the security session is cleared", async () => {
  await verified();
  let finish!: (value: unknown) => void;
  request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = adminVaultRequest(
    "/api/admin/evidence-vault/restricted-cases/example/records"
  );
  await Promise.resolve();
  clearAdminStepUp();
  finish({ records: ["synthetic restricted record"] });
  await expect(pending).rejects.toThrow("security changed");
});

test("a late logout revocation cannot clear a new account's verification", async () => {
  await verified();
  let finish!: (value: unknown) => void;
  request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const departing = clearAdminSecurityForLogout("synthetic-bearer-a");
  expect(getAdminStepUpExpiry()).toBeNull();
  token.mockResolvedValue("synthetic-bearer-b");
  await verified();
  const newExpiry = getAdminStepUpExpiry();
  finish({ ok: true });
  await departing;
  expect(getAdminStepUpExpiry()).toBe(newExpiry);
});

test("lock during the final bearer read still rejects a protected response", async () => {
  await verified();
  let finishToken!: (value: string) => void;
  token.mockResolvedValueOnce("synthetic-bearer-a");
  token.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishToken = resolve;
      })
  );
  request.mockResolvedValueOnce({ records: ["synthetic restricted record"] });
  const pending = adminVaultRequest(
    "/api/admin/evidence-vault/restricted-cases/example/records"
  );
  await Promise.resolve();
  await Promise.resolve();
  clearAdminStepUp();
  finishToken("synthetic-bearer-a");
  await expect(pending).rejects.toThrow("security changed");
});
