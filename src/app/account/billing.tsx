import React from "react";

import RequireAuthGate from "@/auth/RequireAuthGate";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import BillingHome from "@/features/billing/screens/BillingHome";

export default function AccountBillingRoute() {
  return (
    <RequireAuthGate>
      <ScreenBoundary title="Billing" showBack backFallbackHref="/account/workspace">
        <BillingHome />
      </ScreenBoundary>
    </RequireAuthGate>
  );
}
