import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilitySelectScreen() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="facility.select">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Facility Select</Text>

        {!facilityId ? (
          <Text>No facility selected.</Text>
        ) : (
          <Text>Selected: {facilityId}</Text>
        )}

        <Text style={{ opacity: 0.75 }}>
          Safe-mount stub. Replace with real facility list + setSelected.
        </Text>

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
