import type { AuthUser } from "@/api/auth";
import type { BillingPlanKey } from "./planCopy";

export function pendingSignupPlan(
  user: Pick<AuthUser, "emailVerified" | "plan" | "subscriptionStatus"> | null | undefined
): BillingPlanKey | null {
  if (user?.emailVerified !== true || user.subscriptionStatus !== "inactive") {
    return null;
  }
  const plan = user.plan;
  return plan === "pro" || plan === "commercial" || plan === "facility" ? plan : null;
}
