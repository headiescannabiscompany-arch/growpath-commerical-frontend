import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { radius } from "@/theme/theme";
import { useEntitlements } from "../entitlements";
import { canAccessRoute, getHomeForUser, getRoutePolicy } from "./routeAccess";
import { useAppTheme } from "@/theme/appTheme";

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const policy = getRoutePolicy(pathname);
  const { palette } = useAppTheme();

  if (!policy) return <>{children}</>;

  if (!entitlements.ready) {
    if (auth.token && entitlements.bootstrapError) {
      return (
        <View
          accessibilityRole="alert"
          style={[styles.centered, { backgroundColor: palette.page }]}
        >
          <Text
            accessibilityRole="header"
            aria-level={1}
            style={[styles.title, { color: palette.text }]}
          >
            Session check failed
          </Text>
          <Text style={[styles.message, { color: palette.textMuted }]}>
            {entitlements.bootstrapError}
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry /api/me"
              onPress={() => auth.retryMe()}
              style={[styles.primaryButton, { backgroundColor: palette.accent }]}
            >
              <Text style={[styles.primaryText, { color: palette.accentText }]}>
                Retry /api/me
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear session and sign in"
              onPress={async () => {
                await auth.logout();
                router.replace("/login");
              }}
              style={[
                styles.secondaryButton,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.secondaryText, { color: palette.text }]}>
                Clear session and sign in
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Contact support"
              onPress={() => router.push("/support")}
              style={[
                styles.secondaryButton,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.secondaryText, { color: palette.text }]}>
                Contact support
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.centered, { backgroundColor: palette.page }]}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const allowed = canAccessRoute(pathname, {
    ready: entitlements.ready,
    mode: entitlements.mode,
    capabilities: entitlements.capabilities,
    selectedFacilityId: entitlements.facilityId || null,
    facilityRole: entitlements.facilityRole || null
  });

  if (!allowed) {
    const modes = Array.isArray(policy.mode) ? policy.mode : [policy.mode];
    const wrongMode = !modes.includes(entitlements.mode);
    return (
      <View
        accessibilityRole="alert"
        style={[styles.centered, { backgroundColor: palette.page }]}
      >
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={[styles.title, { color: palette.text }]}
        >
          Access denied
        </Text>
        <Text style={[styles.message, { color: palette.textMuted }]}>
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
            style={[styles.primaryButton, { backgroundColor: palette.accent }]}
          >
            <Text style={[styles.primaryText, { color: palette.accentText }]}>
              Go to my dashboard
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={async () => {
              await auth.logout();
              router.replace("/login");
            }}
            style={[
              styles.secondaryButton,
              { backgroundColor: palette.surface, borderColor: palette.border }
            ]}
          >
            <Text style={[styles.secondaryText, { color: palette.text }]}>Log out</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Contact support"
            onPress={() => router.push("/support")}
            style={[
              styles.secondaryButton,
              { backgroundColor: palette.surface, borderColor: palette.border }
            ]}
          >
            <Text style={[styles.secondaryText, { color: palette.text }]}>
              Contact support
            </Text>
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
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 20,
    fontWeight: "700"
  },
  message: {
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
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryText: { fontWeight: "800" },
  secondaryButton: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryText: { fontWeight: "800" }
});
