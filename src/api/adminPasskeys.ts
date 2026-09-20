import { Platform } from "react-native";
import { ApiError, apiRequest, type ApiRequestOptions } from "@/api/apiRequest";
import { getToken } from "@/auth/tokenStore";

const BASE = "/api/admin/passkeys";
type Proof = { token: string; bearer: string; expiresAt: string };
let proof: Proof | null = null;
// A canceled browser prompt can still leave a short-lived server challenge.
// Remember its session until logout/lock so we revoke that challenge too.
let pendingCeremonyBearer: string | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let securityEpoch = 0;
let securityIdentityEpoch = 0;
const listeners = new Set<() => void>();

export type AdminPasskey = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};
export type AdminPasskeyStatus = {
  ok: true;
  configured: boolean;
  enrollmentEnabled: boolean;
  enforcementEnabled: boolean;
  enrolled: boolean;
  passkeys: AdminPasskey[];
  stepUpExpiresAt: string | null;
};

export function subscribeAdminSecurity(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getAdminSecurityEpoch() {
  return securityEpoch;
}
export function getAdminSecurityIdentityEpoch() {
  return securityIdentityEpoch;
}
export function getAdminStepUpExpiry() {
  return proof?.expiresAt || null;
}
export function clearAdminStepUp({ accountChanged = false } = {}) {
  proof = null;
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  securityEpoch += 1;
  if (accountChanged) securityIdentityEpoch += 1;
  listeners.forEach((listener) => listener());
}

export function adminPasskeysSupported() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    typeof PublicKeyCredential !== "undefined" &&
    typeof navigator?.credentials?.create === "function" &&
    typeof navigator?.credentials?.get === "function"
  );
}

function proofHeaders(bearer: string | null): Record<string, string> {
  if (!proof) return {};
  const current = proof;
  if (Date.parse(current.expiresAt) <= Date.now() || bearer !== current.bearer) {
    if (proof === current) clearAdminStepUp();
    return {};
  }
  return proof === current ? { "X-Admin-Step-Up": current.token } : {};
}

/** Only restricted Admin callers use this wrapper; normal app requests are unchanged. */
export async function adminVaultRequest<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const epoch = securityEpoch;
  try {
    const bearer = await getToken();
    const headers = proofHeaders(bearer);
    if (epoch !== securityEpoch)
      throw new Error("Admin security changed. Refresh this review before continuing.");
    const result = await apiRequest<T>(path, {
      ...options,
      cache: "no-store",
      retries: 0,
      invalidateOn401: false,
      headers: {
        ...options.headers,
        ...headers,
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
      }
    });
    const currentBearer = await getToken();
    if (epoch !== securityEpoch || currentBearer !== bearer)
      throw new Error("Admin security changed. Refresh this review before continuing.");
    return result;
  } catch (error) {
    if (
      error instanceof ApiError &&
      [
        "ADMIN_STEP_UP_REQUIRED",
        "ADMIN_STEP_UP_EXPIRED",
        "ADMIN_PASSKEY_ROLE_REQUIRED"
      ].includes(error.code)
    ) {
      if (epoch === securityEpoch) clearAdminStepUp();
      throw new Error(
        "Verify your passkey in Admin security before this restricted action."
      );
    }
    throw error;
  }
}

export async function getAdminPasskeyStatus() {
  const status = await adminVaultRequest<AdminPasskeyStatus>(BASE);
  if (status?.ok !== true || !Array.isArray(status.passkeys))
    throw new Error("Invalid Admin security response.");
  return status;
}

function requireBrowser() {
  if (!adminPasskeysSupported())
    throw new Error(
      "Open GrowPathAI in a supported HTTPS web browser to use an Admin passkey."
    );
}

function browserPasskeys(): typeof import("@simplewebauthn/browser") {
  // Load only after the HTTPS/browser check. Use the package's supported CJS
  // entry so Expo's existing Jest/native toolchain needs no loader changes.
  return require("@simplewebauthn/browser");
}

async function sameSession(bearer: string | null, epoch: number) {
  if (!bearer || (await getToken()) !== bearer || epoch !== securityEpoch) {
    throw new Error("The account or security session changed. Start again.");
  }
}

export async function registerAdminPasskey(password: string, label: string) {
  requireBrowser();
  const bearer = await getToken();
  const epoch = securityEpoch;
  await sameSession(bearer, epoch);
  pendingCeremonyBearer = bearer;
  const { challengeId, optionsJSON } = await adminVaultRequest<any>(
    `${BASE}/registration/options`,
    {
      method: "POST",
      body: { password, label }
    }
  );
  await sameSession(bearer, epoch);
  const { startRegistration } = browserPasskeys();
  const response = await startRegistration({ optionsJSON });
  await sameSession(bearer, epoch);
  return adminVaultRequest(`${BASE}/registration/verify`, {
    method: "POST",
    body: { challengeId, response, label }
  });
}

export async function verifyAdminPasskey() {
  requireBrowser();
  clearAdminStepUp();
  const epoch = securityEpoch;
  const bearer = await getToken();
  await sameSession(bearer, epoch);
  pendingCeremonyBearer = bearer;
  const { challengeId, optionsJSON } = await adminVaultRequest<any>(
    `${BASE}/authentication/options`,
    {
      method: "POST",
      body: {}
    }
  );
  await sameSession(bearer, epoch);
  const { startAuthentication } = browserPasskeys();
  const response = await startAuthentication({ optionsJSON });
  await sameSession(bearer, epoch);
  const result = await adminVaultRequest<{ stepUpToken: string; expiresAt: string }>(
    `${BASE}/authentication/verify`,
    {
      method: "POST",
      body: { challengeId, response }
    }
  );
  await sameSession(bearer, epoch);
  const ttl = Date.parse(result.expiresAt) - Date.now();
  if (!result.stepUpToken || !Number.isFinite(ttl) || ttl <= 0 || ttl > 15 * 60_000) {
    throw new Error("Invalid Admin verification receipt.");
  }
  proof = { token: result.stepUpToken, bearer: bearer!, expiresAt: result.expiresAt };
  expiryTimer = setTimeout(clearAdminStepUp, ttl);
  securityEpoch += 1;
  listeners.forEach((listener) => listener());
  return result.expiresAt;
}

export async function lockAdminSecurity() {
  const epoch = securityEpoch;
  const bearer = await getToken();
  if (epoch !== securityEpoch)
    throw new Error("Admin security changed. Refresh before locking this session.");
  const headers = {
    ...proofHeaders(bearer),
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
  };
  clearAdminStepUp();
  if (!bearer) return;
  if (pendingCeremonyBearer === bearer) pendingCeremonyBearer = null;
  await revokeAdminSession(headers);
}

function revokeAdminSession(headers: Record<string, string>) {
  return apiRequest(`${BASE}/lock`, {
    method: "POST",
    body: {},
    headers,
    cache: "no-store",
    retries: 0,
    invalidateOn401: false,
    timeoutMs: 5000
  });
}

/** Invalidate locally before I/O; a late lock response cannot clear a newer login. */
export function clearAdminSecurityForLogout(bearer: string | null) {
  const needsRevocation = Boolean(
    bearer && (proof?.bearer === bearer || pendingCeremonyBearer === bearer)
  );
  const headers: Record<string, string> = bearer
    ? { Authorization: `Bearer ${bearer}` }
    : {};
  clearAdminStepUp();
  if (pendingCeremonyBearer === bearer) pendingCeremonyBearer = null;
  return needsRevocation ? revokeAdminSession(headers) : Promise.resolve();
}

export async function revokeAdminPasskey(
  id: string,
  password: string,
  confirmation: string
) {
  const result = await adminVaultRequest(`${BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: { password, confirmation }
  });
  clearAdminStepUp();
  return result;
}
