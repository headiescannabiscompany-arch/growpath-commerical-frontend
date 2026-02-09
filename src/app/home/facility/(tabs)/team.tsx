import React from "react";
import { View, Text } from "react-native";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";

export default function FacilityTeamRoute() {
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
          Facility: Team
        </Text>
        <Text>
          This tab will be gated by entitlements (facility.team) and role (OWNER/MANAGER).
        </Text>
      </View>
    </ErrorBoundary>
  );
}
