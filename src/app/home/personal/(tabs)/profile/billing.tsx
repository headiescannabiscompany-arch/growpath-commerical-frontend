import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import BillingHome from "@/features/billing/screens/BillingHome";

export default function PersonalBillingRoute() {
  return (
    <ScreenBoundary title="Billing" showBack backFallbackHref="/home/personal/profile">
      <BillingHome />
    </ScreenBoundary>
  );
}
