import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function FacilityDashboard() {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();

  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Facility Dashboard</Text>
      <Text style={{ opacity: 0.8 }}>facilityId: {facilityId}</Text>

      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 12 }}>
        <Text style={{ fontWeight: "600" }}>Next</Text>
        <Text style={{ opacity: 0.8 }}>
          Add Rooms / Tasks / Team routes under this facilityId scope.
        </Text>
      </View>
    </View>
  );
}
