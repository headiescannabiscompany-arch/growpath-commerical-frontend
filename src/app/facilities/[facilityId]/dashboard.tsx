import React from "react";
import { LegacyFacilityRouteShim } from "@/features/routing/LegacyFacilityRouteShim";

/**
 * Legacy facility route:
 * /facilities/[facilityId]/dashboard
 *
 * We keep this for backward compatibility and immediately shim to the
 * canonical facility UI surfaces.
 */
export default function LegacyFacilityDashboard() {
  return <LegacyFacilityRouteShim section="dashboard" />;
}
