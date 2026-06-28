import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { usePathname } from "expo-router";
import { useEntitlements } from "../entitlements";
import { canAccessRoute, getRoutePolicy } from "./routeAccess";

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const entitlements = useEntitlements();
  const policy = getRoutePolicy(pathname);

  if (!policy) return <>{children}</>;

  if (!entitlements.ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const allowed = canAccessRoute(pathname, {
    ready: entitlements.ready,
    mode: entitlements.mode,
    capabilities: entitlements.capabilities
  });

  if (!allowed) {
    const modes = Array.isArray(policy.mode) ? policy.mode : [policy.mode];
    const wrongMode = !modes.includes(entitlements.mode);
    return (
      <View accessibilityRole="alert" style={styles.centered}>
        <Text style={styles.title}>Access denied</Text>
        <Text style={styles.message}>
          {wrongMode
            ? `This page is only available in ${modes.join(" or ")} mode.`
            : "Your account does not have access to this page."}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  title: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700"
  },
  message: {
    color: "#4B5563",
    fontSize: 14,
    marginTop: 8,
    maxWidth: 420,
    textAlign: "center"
  }
});
