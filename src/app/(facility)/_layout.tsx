import React from "react";
import { Stack } from "expo-router";
import { RequireEntitlement } from "../../guards/RequireEntitlement";

export default function FacilityLayout() {
  return (
    <RequireEntitlement mode="facility" requireFacility>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireEntitlement>
  );
}
