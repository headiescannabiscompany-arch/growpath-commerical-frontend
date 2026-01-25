// src/api/me.ts
import { api } from "./client";
import type { AuthUser } from "./auth";

export async function apiMe(): Promise<{ user: AuthUser }> {
  return api.get("/api/user/me");
}
