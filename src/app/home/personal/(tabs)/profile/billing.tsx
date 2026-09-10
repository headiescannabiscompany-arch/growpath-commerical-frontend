import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import BillingHome from "@/features/billing/screens/BillingHome";

export default function PersonalBillingRoute() {
  const entitlements = useEntitlements();
  const showCreatorPayouts =
    entitlements.can?.(CAPABILITY_KEYS.COURSES_SELL_PAID) === true;

  return (
    <ScreenBoundary title="Billing" showBack backFallbackHref="/home/personal/profile">
      <BillingHome showCreatorPayouts={showCreatorPayouts} />
    </ScreenBoundary>
  );
}
