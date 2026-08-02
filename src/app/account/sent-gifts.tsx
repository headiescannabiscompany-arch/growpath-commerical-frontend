import React from "react";

import RequireAuthGate from "@/auth/RequireAuthGate";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import BillingHome from "@/features/billing/screens/BillingHome";

export default function SentGiftsRoute() {
  return (
    <RequireAuthGate>
      <ScreenBoundary
        title="Gifts you sent"
        showBack
        backFallbackHref="/account/workspace"
      >
        <BillingHome purchaserHistoryOnly />
      </ScreenBoundary>
    </RequireAuthGate>
  );
}
