import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import UpgradePlan from "@/features/billing/screens/UpgradePlan";

export default function PersonalUpgradePlanRoute() {
  return (
    <ScreenBoundary title="Upgrade Account" showBack backFallbackHref="/home/personal/profile">
      <UpgradePlan />
    </ScreenBoundary>
  );
}
