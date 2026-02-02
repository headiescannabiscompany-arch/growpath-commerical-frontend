import React, { createContext, useContext, useMemo } from "react";
import { ENTITLEMENTS } from "./entitlements";
import { useBilling } from "./features/billing/hooks";
import { useAuth } from "./auth/AuthProvider";

const EntitlementsContext = createContext<any>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const billing = useBilling();
  const { user } = useAuth();
  // Assume plan is loaded elsewhere and available here
  // For demo, fallback to 'free'
  const plan = user?.facilityPlan || "free";
  const entitlements = ENTITLEMENTS[plan] || ENTITLEMENTS.free;

  const value = useMemo(
    () => ({
      can: entitlements,
      plan
    }),
    [entitlements, plan]
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementsContext) || { can: ENTITLEMENTS.free, plan: "free" };
}
