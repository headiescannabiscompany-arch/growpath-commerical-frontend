import React, { useEffect, useMemo } from "react";
import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";

export default function FacilityLayout() {
  const pathname = usePathname();

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

  useEffect(() => {
    if (!ent.ready || ent.mode !== "facility" || !ent.facilityId || selectedId) return;

    const selectFacility =
      facilityStore?.selectFacility ??
      facilityStore?.setSelected ??
      facilityStore?.setSelectedId ??
      facilityStore?.setFacilityId;

    if (typeof selectFacility === "function") {
      selectFacility({
        id: ent.facilityId,
        name: String(ent.facilityId)
      });
    }
  }, [ent.facilityId, ent.mode, ent.ready, facilityStore, selectedId]);

  if (!ent.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (redirectTarget) return <Redirect href={redirectTarget as any} />;

  if (ent.mode === "facility" && ent.facilityId && !selectedId) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
