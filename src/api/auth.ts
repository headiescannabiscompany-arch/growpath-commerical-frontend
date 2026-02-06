// src/api/auth.ts
// Contract-locked wrappers: every function returns the canonical response type or throws ApiError.
import { api } from "./client";
import type { ApiError } from "./errors";

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

/** Login with email/password. Throws ApiError on failure. */
export async function login(body: LoginBody): Promise<LoginResponse> {
  return api.post("/api/auth/login", body, { auth: false });
}

/** Signup with email/password. Throws ApiError on failure. */
export async function signup(body: SignupBody): Promise<SignupResponse> {
  return api.post("/api/auth/signup", body, { auth: false });
}

/** Register (legacy). Throws ApiError on failure. */
export async function register(body: SignupBody): Promise<{ token: string }> {
  return api.post("/api/auth/register", body, { auth: false });
}

/** Upgrade account to creator. Throws ApiError on failure. */
export async function becomeCreator(): Promise<{ ok: true; role: "creator" }> {
  return api.post("/api/auth/become-creator");
}

/** Save push notification token. Throws ApiError on failure. */
export async function savePushToken(pushToken: string): Promise<{ ok: true }> {
  return api.post("/api/auth/save-push-token", { pushToken });
}
