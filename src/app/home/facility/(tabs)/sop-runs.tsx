import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilitySopRunsTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="facility.sopRuns.tab">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>SOP Runs</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <>
            <Text style={{ opacity: 0.75 }}>
              Stub SOP runs screen (safe mount). Wire list later.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/home/facility/sop-runs")}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Open SOP Runs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/home/facility/sop-runs/presets")}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 }}
            >
              <Text style={{ fontWeight: "900" }}>Presets</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/home/facility/select")}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 }}
            >
              <Text style={{ fontWeight: "900" }}>Change Facility</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
