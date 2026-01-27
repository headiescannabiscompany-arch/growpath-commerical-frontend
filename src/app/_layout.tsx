import React from "react";
import { Slot } from "expo-router";
import { AuthProvider } from "../auth/AuthContext";
import { SessionProvider } from "../session/SessionProvider";
import { EntitlementsProvider } from "@/entitlements";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SessionProvider>
        <EntitlementsProvider>
          <Slot />
        </EntitlementsProvider>
      </SessionProvider>
    </AuthProvider>
  );
}
