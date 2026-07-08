import React from "react";
import { Redirect } from "expo-router";
import { useFacility } from "@/facility/FacilityProvider";

export default function DashboardShim() {
  const facility = useFacility();

  if (!facility?.selectedId) {
    return <Redirect href="/home/facility/select" />;
  }

  return <Redirect href="/home/facility" />;
}
