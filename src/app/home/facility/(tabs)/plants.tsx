import React from "react";
import { View, Text } from "react-native";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";

export default function FacilityPlantsRoute() {
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
          Facility: Plants
        </Text>
        <Text>This screen is scaffolded and will be wired to facility-scoped APIs.</Text>
      </View>
    </ErrorBoundary>
  );
}
