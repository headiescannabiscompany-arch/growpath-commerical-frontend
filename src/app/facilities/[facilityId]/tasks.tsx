import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function FacilityTasks() {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Tasks</Text>
      <Text style={{ opacity: 0.8 }}>facilityId: {facilityId}</Text>
      <Text style={{ opacity: 0.8 }}>Stub screen</Text>
    </View>
  );
}
