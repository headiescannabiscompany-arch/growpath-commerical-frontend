import React, { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { useEntitlements } from "@/entitlements/EntitlementsProvider";

export default function FacilityEntry() {
  const router = useRouter();
  const pathname = usePathname();
  const ent = useEntitlements();

  useEffect(() => {
    const isEntryPath = pathname === "/home/facility" || pathname === "/home/facility/";
    if (!isEntryPath) return;

    if (!ent.ready) return;

    if (!ent.facilityId) {
      router.replace("/home/facility/select" as any);
      return;
    }
    router.replace("/home/facility/dashboard" as any);
  }, [router, pathname, ent.ready, ent.facilityId]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Entering Facility...</Text>
    </View>
  );
}
