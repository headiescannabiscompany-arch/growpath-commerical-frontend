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
  emailVerified?: boolean;
};

export type SignupBody = {
  name?: string;
  displayName?: string;
  email: string;
  password: string;
  plan?: "free" | "pro" | "commercial" | "facility";
  mode?: "personal" | "commercial" | "facility";
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
  emailVerificationRequired?: boolean;
  emailSent?: boolean;
};

export type EmailVerificationResponse = {
  ok: true;
  message?: string;
  emailSent?: boolean;
  alreadyVerified?: boolean;
};

export type ConfirmEmailVerificationResponse = {
  ok: true;
  user: AuthUser;
};

export type ForgotPasswordResponse = {
  ok: true;
  message: string;
  emailSent?: boolean;
};

export type ResetPasswordResponse = {
  ok: true;
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

export async function requestEmailVerification(
  email: string
): Promise<EmailVerificationResponse> {
  return apiRequest("/api/auth/verify-email/request", {
    method: "POST",
    auth: false,
    body: { email }
  }) as Promise<EmailVerificationResponse>;
}

export async function confirmEmailVerification(
  token: string
): Promise<ConfirmEmailVerificationResponse> {
  return apiRequest("/api/auth/verify-email/confirm", {
    method: "POST",
    auth: false,
    body: { token }
  }) as Promise<ConfirmEmailVerificationResponse>;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiRequest("/api/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email }
  }) as Promise<ForgotPasswordResponse>;
}

export async function resetPassword(
  token: string,
  password: string
): Promise<ResetPasswordResponse> {
  return apiRequest("/api/auth/reset-password", {
    method: "POST",
    auth: false,
    body: { token, password }
  }) as Promise<ResetPasswordResponse>;
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
