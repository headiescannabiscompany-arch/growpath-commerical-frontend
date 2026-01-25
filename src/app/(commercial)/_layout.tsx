import React from "react";
import { Stack } from "expo-router";
import { RequireEntitlement } from "../../guards/RequireEntitlement";

export default function CommercialLayout() {
  return (
    <RequireEntitlement mode="commercial" requireFacility capability="FEED_VIEW">
      <Stack screenOptions={{ headerShown: false }} />
    </RequireEntitlement>
  );
}
