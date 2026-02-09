import React from "react";
import { LegacyFacilityRouteShim } from "@/features/routing/LegacyFacilityRouteShim";

/**
 * Legacy facility route:
 * /facilities/[facilityId]/rooms
 *
 * Keep for backward compatibility; shim into canonical facility UI.
 */
export default function LegacyFacilityRooms() {
  return <LegacyFacilityRouteShim section="rooms" />;
}
