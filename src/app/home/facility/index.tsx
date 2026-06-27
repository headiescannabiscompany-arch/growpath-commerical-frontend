import React, { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { toEntContext } from "@/entitlements/toEntContext";

export default function FacilityEntry() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const ent = toEntContext(auth);

  useEffect(() => {
    const isEntryPath = pathname === "/home/facility" || pathname === "/home/facility/";
    if (!isEntryPath) return;

    if (!ent?.facilityId) {
      router.replace("/home/facility/select" as any);
      return;
    }
    router.replace("/home/facility/dashboard" as any);
  }, [router, pathname, ent?.facilityId]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Entering Facility…</Text>
    </View>
  );
}
