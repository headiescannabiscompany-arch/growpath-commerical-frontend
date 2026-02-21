// src/api/auth.ts
// Contract-locked: every function returns canonical response type or throws ApiError with code/status.
import { apiRequest } from "./apiRequest";
// import type { ApiError } from "./errors"; // Removed as unused

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "creator" | "admin";
  plan: string | null;
  subscriptionStatus: string | null;
};

export type SignupBody = {
  name?: string;
  displayName?: string;
  email: string;
  password: string;
};

export type LoginBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type SignupResponse = {
  token: string;
  user: AuthUser;
};

/** Login with email/password. Returns LoginResponse or throws ApiError. */
export async function login(body: LoginBody): Promise<LoginResponse> {
  return apiRequest("/api/auth/login", {
    method: "POST",
    auth: false,
    body
  }) as Promise<LoginResponse>;
}

/** Signup with email/password. Returns SignupResponse or throws ApiError. */
export async function signup(body: SignupBody): Promise<SignupResponse> {
  return apiRequest("/api/auth/signup", {
    method: "POST",
    auth: false,
    body
  }) as Promise<SignupResponse>;
}

/** Register (legacy). Returns { token } or throws ApiError. */
export async function register(body: SignupBody): Promise<{ token: string }> {
  return apiRequest("/api/auth/register", {
    method: "POST",
    auth: false,
    body
  }) as Promise<{ token: string }>;
}

/** Upgrade account to creator. Returns { ok, role } or throws ApiError. */
export async function becomeCreator(): Promise<{ ok: true; role: "creator" }> {
  return apiRequest("/api/auth/become-creator", {
    method: "POST"
  }) as Promise<{ ok: true; role: "creator" }>;
}

/** Save push notification token. Returns { ok } or throws ApiError. */
export async function savePushToken(pushToken: string): Promise<{ ok: true }> {
  return apiRequest("/api/auth/save-push-token", {
    method: "POST",
    body: { pushToken }
  }) as Promise<{ ok: true }>;
}
