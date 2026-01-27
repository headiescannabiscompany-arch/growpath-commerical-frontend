import React from "react";
import { Slot, Redirect } from "expo-router";
import { useEntitlements } from "../../../entitlements";

export default function RootLayout() {
  return (
    <EntitlementsProvider>
      <Slot />
      <Redirect href="/(commercial)/feed" />
    </EntitlementsProvider>
  );
}
