import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilityAuditLogDetailStub() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="facility.auditLogs.detail">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        {!facilityId ? (
          <>
            <Text>Select a facility first.</Text>
            <TouchableOpacity
              onPress={() => router.push("/home/facility/select")}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 20, fontWeight: "900" }}>Audit Log Detail</Text>
            <Text style={{ opacity: 0.75 }}>Stub detail for log: {String(id || "")}</Text>
          </>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        >
          <Text style={{ fontWeight: "900" }}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScreenBoundary>
  );
}
