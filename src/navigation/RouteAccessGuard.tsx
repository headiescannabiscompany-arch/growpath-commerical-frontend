import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { radius } from "@/theme/theme";
import { useEntitlements } from "../entitlements";
import { canAccessRoute, getHomeForUser, getRoutePolicy } from "./routeAccess";

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
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
    capabilities: entitlements.capabilities,
    selectedFacilityId: entitlements.facilityId || null
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
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to my dashboard"
            onPress={() =>
              router.replace(
                getHomeForUser({
                  ready: entitlements.ready,
                  mode: entitlements.mode,
                  selectedFacilityId: entitlements.facilityId || null
                }) as any
              )
            }
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Go to my dashboard</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={async () => {
              await auth.logout();
              router.replace("/login");
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Log out</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Contact support"
            onPress={() => router.push("/support")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Contact support</Text>
          </Pressable>
        </View>
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
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 18
  },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryText: { color: "#111827", fontWeight: "800" }
});
