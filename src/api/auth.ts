// src/api/auth.ts
import { api } from "./client";

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

export async function register(body: SignupBody): Promise<{ token: string }> {
  return api.post("/api/auth/register", body, { auth: false });
}

export async function signup(
  body: SignupBody
): Promise<{ token: string; user: AuthUser }> {
  return api.post("/api/auth/signup", body, { auth: false });
}

export async function login(body: LoginBody): Promise<{ token: string; user: AuthUser }> {
  return api.post("/api/auth/login", body, { auth: false });
}

export async function becomeCreator(): Promise<{ ok: true; role: "creator" }> {
  return api.post("/api/auth/become-creator");
}

export async function savePushToken(pushToken: string): Promise<{ ok: true }> {
  return api.post("/api/auth/save-push-token", { pushToken });
}
