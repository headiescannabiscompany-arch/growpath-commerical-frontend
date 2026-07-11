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
  token?: string;
  user?: AuthUser;
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

function currentOrigin() {
  const location = (globalThis as any)?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

function setLegacyAuthGlobals(response: LoginResponse | SignupResponse) {
  const token = response?.token;
  if (token) {
    (globalThis as any).authToken = token;
    if (response.user) (globalThis as any).user = response.user;
  }
}

function normalizeAuthArgs(a: LoginBody | string, b?: string): LoginBody {
  if (typeof a === "object" && a !== null) return a;
  return { email: String(a || ""), password: String(b || "") };
}

function normalizeSignupArgs(a: SignupBody | string, b?: string, c?: string): SignupBody {
  if (typeof a === "object" && a !== null) return a;
  return {
    email: String(a || ""),
    password: String(b || ""),
    displayName: String(c || ""),
    name: String(c || "")
  };
}

/** Login with email/password. Returns LoginResponse or throws ApiError. */
export async function login(
  bodyOrEmail: LoginBody | string,
  maybePassword?: string
): Promise<LoginResponse> {
  const body = normalizeAuthArgs(bodyOrEmail, maybePassword);
  const response = (await apiRequest("/api/auth/login", {
    method: "POST",
    auth: false,
    body
  })) as LoginResponse;
  setLegacyAuthGlobals(response);
  return response;
}

/** Signup with email/password. Returns SignupResponse or throws ApiError. */
export async function signup(
  bodyOrEmail: SignupBody | string,
  maybePassword?: string,
  maybeDisplayName?: string
): Promise<SignupResponse> {
  const body = normalizeSignupArgs(bodyOrEmail, maybePassword, maybeDisplayName);
  const response = (await apiRequest("/api/auth/signup", {
    method: "POST",
    auth: false,
    body
  })) as SignupResponse;
  setLegacyAuthGlobals(response);
  return response;
}

/** Register (legacy). Returns signup/verification state or throws ApiError. */
export async function register(
  bodyOrEmail: SignupBody | string,
  maybePassword?: string,
  maybeDisplayName?: string
): Promise<SignupResponse> {
  const body = normalizeSignupArgs(bodyOrEmail, maybePassword, maybeDisplayName);
  const response = (await apiRequest("/api/auth/register", {
    method: "POST",
    auth: false,
    body
  })) as SignupResponse;
  setLegacyAuthGlobals(response);
  return response;
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
  const origin = currentOrigin();
  return apiRequest("/api/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: {
      email,
      ...(origin
        ? {
            resetUrl: `${origin}/reset-password`,
            resetUrlBase: `${origin}/reset-password`
          }
        : {})
    }
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
  const response = (await apiRequest("/api/auth/become-creator", {
    method: "POST"
  })) as { ok: true; role: "creator" };
  if (response.role && (globalThis as any).user) {
    (globalThis as any).user.role = response.role;
  }
  return response;
}

/** Save push notification token. Returns { ok } or throws ApiError. */
export async function savePushToken(pushToken: string): Promise<{ ok: true }> {
  return apiRequest("/api/auth/save-push-token", {
    method: "POST",
    body: { pushToken }
  }) as Promise<{ ok: true }>;
}
