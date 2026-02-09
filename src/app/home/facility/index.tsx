import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, Text } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { toEntContext } from "@/entitlements/toEntContext";

export default function FacilityEntry() {
  const router = useRouter();
  const auth = useAuth();
  const ent = toEntContext(auth);

  useEffect(() => {
    if (!ent?.facilityId) {
      router.replace("/home/facility/select" as any);
      return;
    }
    router.replace("/home/facility/dashboard" as any);
  }, [router, ent?.facilityId]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Entering Facility…</Text>
    </View>
  );
}
