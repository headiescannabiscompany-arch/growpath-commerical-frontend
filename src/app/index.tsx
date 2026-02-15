import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";

function Center({ label }: { label: string }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff"
      }}
    >
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16 }}>{label}</Text>
    </View>
  );
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
  const decision = useMemo(() => {
    if (auth.isHydrating || !settled) {
      return { kind: "render" as const, node: <Center label="Loading auth..." /> };
    }

    // Deterministic: ensure entitlements settle before routing decisions
    if (!ent.ready) {
      return {
        kind: "render" as const,
        node: <Center label="Loading entitlements..." />
      };
    }

    // After entitlements are ready, decide login vs app
    if (!auth.token) {
      console.log("[INDEX] No token after settle → route to /login");
      return { kind: "nav" as const, href: "/login" };
    }

    console.log("[INDEX] ent.mode:", ent.mode);
    console.log("[INDEX] ent.plan:", ent.plan);
    console.log("[INDEX] facility.isReady:", facility?.isReady);
    console.log("[INDEX] facility.selectedId:", facility?.selectedId);

    if (ent.mode === "facility" || ent.mode === "commercial") {
      if (!facility?.isReady) {
        return {
          kind: "render" as const,
          node: <Center label="Loading facilities..." />
        };
      }

      if (!facility?.selectedId) {
        console.log("[INDEX] No facility selected → /facilities");
        return { kind: "nav" as const, href: "/facilities" };
      }

      if (ent.mode === "facility") {
        console.log("[INDEX] Facility mode → facility dashboard");
        return {
          kind: "nav" as const,
          href: `/facilities/${facility.selectedId}/dashboard`
        };
      }

      if (ent.mode === "commercial") {
        console.log("[INDEX] Commercial mode → /feed");
        return { kind: "nav" as const, href: "/feed" };
      }
    }

    console.log("[INDEX] Personal default → /home/personal");
    return { kind: "nav" as const, href: "/home/personal" };
  }, [
    auth.isHydrating,
    settled,
    auth.token,
    ent.ready,
    ent.mode,
    ent.plan,
    facility?.isReady,
    facility?.selectedId
  ]);

  // Navigate in an effect (never during render)
  const lastHrefRef = useRef<string | null>(null);
  useEffect(() => {
    if (decision.kind !== "nav") return;
    if (lastHrefRef.current === decision.href) return;
    lastHrefRef.current = decision.href;
    router.replace(decision.href as any);
  }, [decision, router]);

  if (decision.kind === "render") return decision.node;

  // While navigation effect runs, render nothing (prevents flicker)
  return null;
}
