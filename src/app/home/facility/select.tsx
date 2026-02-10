import React from "react";
import { View, Text } from "react-native";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilitySelectRoute() {
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="facility.select">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>
          Facility Select
        </Text>
        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <Text style={{ opacity: 0.75 }}>
            Stub screen (safe mount). Wire up selection logic next.
          </Text>
        )}
      </View>
    </ScreenBoundary>
  );
}
