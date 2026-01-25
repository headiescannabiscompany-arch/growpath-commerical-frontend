// src/auth/guards.ts
import type { AuthUser } from "../api/auth";

export function hasRole(user: AuthUser | null, roles: string[]): boolean {
  return !!user && roles.includes(user.role);
}

export function hasPlan(user: AuthUser | null, plans: (string | null)[]): boolean {
  return !!user && plans.includes(user.plan);
}

export function requireAny(condition: boolean, message = "Not authorized") {
  if (!condition) throw new Error(message);
}

// Example usage in a component:
// import { useAuth } from "./AuthContext";
// import { hasRole } from "./guards";
//
// const { user } = useAuth();
// if (!hasRole(user, ["creator", "admin"])) {
//   return <Text>Creator access required.</Text>;
// }
