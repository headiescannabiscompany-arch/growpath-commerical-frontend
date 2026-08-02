import React from "react";

import RequireAuthGate from "@/auth/RequireAuthGate";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import GiftCheckoutReturn from "@/features/billing/screens/GiftCheckoutReturn";

export default function GiftCheckoutSuccessRoute() {
  return (
    <RequireAuthGate>
      <ScreenBoundary
        title="Check gift checkout"
        showBack
        backFallbackHref="/account/sent-gifts"
      >
        <GiftCheckoutReturn expectedReturn="success" />
      </ScreenBoundary>
    </RequireAuthGate>
  );
}
