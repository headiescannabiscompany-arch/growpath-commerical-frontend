import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { getFacilities, type Facility } from "@/api/facilities";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { useAppTheme } from "@/theme/appTheme";

export default function FacilityLayout() {
  const pathname = usePathname();
  const auth = useAuth();
  const { palette } = useAppTheme();

  const ent = useEntitlements();
  const facilityStore: any = useFacility();
  const { selectedId } = facilityStore;

  const redirectTarget = useMemo(() => {
    if (!ent.ready) return null;

    // Mode gate
    if (ent.mode !== "facility") {
      return ent.mode === "commercial" ? "/home/commercial" : "/home/personal";
    }

    // Facility selection gate (allow /select to render without selectedId)
    const isSelect =
      pathname === "/home/facility/select" || pathname === "/home/facility/select/";

    if (!selectedId && !ent.facilityId && !isSelect) {
      return "/home/facility/select";
    }

    return null;
  }, [ent.facilityId, ent.mode, ent.ready, pathname, selectedId]);

  if (!ent.ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.page
        }}
      >
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (redirectTarget) return <Redirect href={redirectTarget as any} />;

  const isSelect = pathname.replace(/\/$/, "") === "/home/facility/select";
  if (ent.mode === "facility" && ent.facilityId && !selectedId && !isSelect) {
    return (
      <FacilitySelectionHydrator
        key={JSON.stringify([
          auth.user?.id || auth.user?._id,
          auth.token,
          ent.facilityId,
          ent.facilityRole
        ])}
        facilityId={ent.facilityId}
        selectFacility={facilityStore.selectFacility}
      />
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

// Resolve only an exact server-provided membership identity, never the first row
// or a name match. Session IDs may be public aliases, unlike operational API IDs.
export function resolveFacilitySelection(rows: Facility[], identity: string) {
  const matches = rows.filter(
    (row) =>
      typeof row.id === "string" &&
      /^[A-Za-z0-9:_-]+$/.test(row.id) &&
      (row.id === identity || row.canonicalFacilityId === identity)
  );
  return matches.length === 1 ? matches[0] : null;
}

function FacilitySelectionHydrator({
  facilityId,
  selectFacility
}: {
  facilityId: string;
  selectFacility: (facility: Facility) => void;
}) {
  const { palette } = useAppTheme();
  const router = useRouter();
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const selectRef = useRef(selectFacility);
  selectRef.current = selectFacility;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (inFlight.current || !mounted.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const rows = await getFacilities();
      if (!mounted.current) return;
      const selected = resolveFacilitySelection(rows, facilityId);
      if (!selected) throw new Error("selection unavailable");
      selectRef.current(selected);
    } catch {
      if (mounted.current)
        setError(
          "Unable to restore this Facility workspace. Retry or select your Facility."
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [facilityId]);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        gap: 16,
        justifyContent: "center",
        backgroundColor: palette.page
      }}
    >
      <Text
        accessibilityRole="header"
        aria-level={1}
        style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}
      >
        Facility workspace
      </Text>
      {loading ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Restoring Facility workspace"
        >
          <ActivityIndicator color={palette.accent} />
          <Text style={{ color: palette.text }}>Restoring your selected Facility...</Text>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.text }}>
          {error}
        </Text>
      ) : null}
      {!loading ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry Facility selection"
            onPress={load}
          >
            <Text style={{ color: palette.accent }}>Retry</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Select Facility"
            onPress={() => router.replace("/home/facility/select")}
          >
            <Text style={{ color: palette.accent }}>Select Facility</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
