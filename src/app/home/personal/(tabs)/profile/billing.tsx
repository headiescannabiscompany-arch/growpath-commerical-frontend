import React from "react";
import { useLocalSearchParams } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import BillingHome from "@/features/billing/screens/BillingHome";
import { personalMoreReturnHref } from "@/utils/personalMoreReturn";

export default function PersonalBillingRoute() {
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const moreReturn = personalMoreReturnHref(from);
  const entitlements = useEntitlements();
  const showCreatorPayouts =
    entitlements.can?.(CAPABILITY_KEYS.COURSES_SELL_PAID) === true;

  return (
    <ScreenBoundary
      title="Billing"
      showBack
      backFallbackHref={moreReturn || "/home/personal/profile"}
      preferBackFallback={Boolean(moreReturn)}
    >
      <BillingHome showCreatorPayouts={showCreatorPayouts} />
    </ScreenBoundary>
  );
}
