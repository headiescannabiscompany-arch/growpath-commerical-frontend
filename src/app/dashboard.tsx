import React from "react";
import { Redirect } from "expo-router";
import { useFacility } from "@/facility/FacilityProvider";

export default function DashboardShim() {
  const facility = useFacility();

  if (!facility?.selectedId) {
    return <Redirect href="/facilities" />;
  }

  return <Redirect href={`/facilities/${facility.selectedId}/dashboard`} />;
}
