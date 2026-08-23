import React from "react";

import PhEcToolScreen from "@/app/home/personal/(tabs)/tools/ph-ec";

export default function FacilityPhEcToolRoute() {
  return (
    <PhEcToolScreen backFallbackHref="/home/facility/ai-tools" workspaceType="facility" />
  );
}
