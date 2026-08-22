import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import FacilityBillingHome from "@/features/billing/screens/FacilityBillingHome";

export default function FacilityBillingRoute() {
  return (
    <ScreenBoundary
      title="Facility billing"
      showBack
      backFallbackHref="/home/facility/profile"
    >
      <FacilityBillingHome />
    </ScreenBoundary>
  );
}
