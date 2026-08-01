import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import PublicLandingPage from "@/components/marketing/PublicLandingPage";

function Center({ label }: { label: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createRootIndexStyles(palette), [palette]);

  return (
    <View testID="root-index-loading" style={styles.center}>
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={styles.centerLabel}>{label}</Text>
    </View>
  );
}

function BootstrapError({
  label,
  onRetry,
  onSignOut
}: {
  label: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createRootIndexStyles(palette), [palette]);

  return (
    <View testID="root-index-bootstrap-error" style={styles.errorCenter}>
      <Text style={styles.errorLabel}>{label}</Text>
      <Pressable onPress={onRetry} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Retry /api/me</Text>
      </Pressable>
      <Pressable onPress={onSignOut} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Clear session and sign in</Text>
      </Pressable>
    </View>
  );
}

export function createRootIndexStyles(palette: ThemePalette) {
  return StyleSheet.create({
    center: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      justifyContent: "center"
    },
    centerLabel: { color: palette.textMuted, marginTop: 16 },
    errorCenter: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20
    },
    errorLabel: {
      color: palette.danger,
      marginBottom: 14,
      textAlign: "center"
    },
    primaryButton: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "700" },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.text, fontWeight: "700" }
  });
}

export default function Index() {
  const router = useRouter();
  const auth = useAuth();
  const ent = useEntitlements();
  const facility = useFacility();

  // One-tick settle after hydration completes (prevents token=false frame)
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (auth.isHydrating) {
      setSettled(false);
      return;
    }
    const id = setTimeout(() => setSettled(true), 0);
    return () => clearTimeout(id);
  }, [auth.isHydrating]);

  // Log only when these values change (prevents console spam)
  useEffect(() => {
    console.log("[INDEX] auth.isHydrating:", auth.isHydrating);
    console.log("[INDEX] auth.token:", !!auth.token);
    console.log("[INDEX] ent.ready:", ent.ready);
  }, [auth.isHydrating, auth.token, ent.ready]);

  // Decide what to do (render vs navigate)
  const decision = (() => {
    if (auth.isHydrating || !settled) {
      return { kind: "render" as const, node: <Center label="Loading auth..." /> };
    }

    // Deterministic: ensure entitlements settle before routing decisions
    if (!ent.ready) {
      if (auth.token && ent.bootstrapError) {
        return {
          kind: "render" as const,
          node: (
            <BootstrapError
              label={ent.bootstrapError}
              onRetry={() => {
                void auth.retryMe();
              }}
              onSignOut={() => {
                void auth.logout().then(() => router.replace("/login"));
              }}
            />
          )
        };
      }
      return {
        kind: "render" as const,
        node: <Center label="Loading entitlements..." />
      };
    }

    // After entitlements are ready, decide login vs app
    if (!auth.token) {
      console.log("[INDEX] No token after settle -> public homepage");
      return {
        kind: "render" as const,
        node: <PublicLandingPage page="home" />
      };
    }

    if (String(auth.user?.role || "").toLowerCase() === "admin") {
      console.log("[INDEX] Platform admin -> /admin");
      return { kind: "nav" as const, href: "/admin" };
    }

    console.log("[INDEX] ent.mode:", ent.mode);
    console.log("[INDEX] ent.plan:", ent.plan);
    console.log("[INDEX] facility.isReady:", facility?.isReady);
    console.log("[INDEX] facility.selectedId:", facility?.selectedId);

    if (ent.mode === "commercial") {
      console.log("[INDEX] Commercial mode -> /home/commercial");
      return { kind: "nav" as const, href: "/home/commercial" };
    }

    if (ent.mode === "facility") {
      if (!facility?.isReady) {
        return {
          kind: "render" as const,
          node: <Center label="Loading facilities..." />
        };
      }

      if (!facility?.selectedId) {
        console.log("[INDEX] No facility selected -> /home/facility/select");
        return { kind: "nav" as const, href: "/home/facility/select" };
      }

      if (ent.mode === "facility") {
        console.log("[INDEX] Facility mode -> /home/facility");
        return {
          kind: "nav" as const,
          href: "/home/facility"
        };
      }
    }

    console.log("[INDEX] Personal default -> /home/personal");
    return { kind: "nav" as const, href: "/home/personal" };
  })();

  // Navigate in an effect (never during render)
  const lastHrefRef = useRef<string | null>(null);
  useEffect(() => {
    if (decision.kind !== "nav") return;
    if (lastHrefRef.current === decision.href) return;
    lastHrefRef.current = decision.href;
    if (Platform.OS === "web") {
      const windowRef = (globalThis as any).window;
      const location = windowRef?.location;
      if (location && location.pathname !== decision.href) {
        location.replace(decision.href);
        return;
      }
    }
    router.replace(decision.href as any);
  }, [decision.kind, decision.href, router]);

  if (decision.kind === "render") return decision.node;

  // While navigation effect runs, render nothing (prevents flicker)
  return null;
}
