import React from "react";
import { View, Text } from "react-native";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";

export default function FacilityProfileRoute() {
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
          Facility: Profile
        </Text>
        <Text>
          This screen is scaffolded and will be wired to station/user switching.
        </Text>
      </View>
    </ErrorBoundary>
  );
}
