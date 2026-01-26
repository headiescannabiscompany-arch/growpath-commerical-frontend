import React from "react";
import { Slot } from "expo-router";

import { AuthProvider } from "../src/auth/AuthContext";
import { EntitlementsProvider } from "../src/entitlements/EntitlementsProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <EntitlementsProvider>
        <Slot />
      </EntitlementsProvider>
    </AuthProvider>
  );
}
