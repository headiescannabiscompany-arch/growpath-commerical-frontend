import React from "react";

import RequireAuthGate from "@/auth/RequireAuthGate";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import BillingHome from "@/features/billing/screens/BillingHome";

export default function AccountBillingRoute() {
  const entitlements = useEntitlements();
  const showCreatorPayouts =
    entitlements.can?.(CAPABILITY_KEYS.COURSES_SELL_PAID) === true;

  return (
    <RequireAuthGate>
      <ScreenBoundary title="Billing" showBack backFallbackHref="/account/workspace">
        <BillingHome showCreatorPayouts={showCreatorPayouts} />
      </ScreenBoundary>
    </RequireAuthGate>
  );
}
