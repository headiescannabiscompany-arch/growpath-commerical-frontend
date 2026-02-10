import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function SopRunDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="facility.sopRun.detail">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>SOP Run</Text>
        <Text>Facility: {facilityId || "none"}</Text>
        <Text>Run ID: {id || "missing"}</Text>
        <Text style={{ opacity: 0.75 }}>
          Safe-mount stub. Wire SOP run details next.
        </Text>
      </View>
    </ScreenBoundary>
  );
}
