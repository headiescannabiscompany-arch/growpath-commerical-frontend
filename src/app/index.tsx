import React from "react";
import { Slot } from "expo-router";
import { EntitlementsProvider } from "../entitlements";

export default function RootLayout() {
  return (
    <EntitlementsProvider>
      <Slot />
    </EntitlementsProvider>
  );
}
