import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSession } from "@/session";
import { useEntitlements } from "@/entitlements";

export default function FacilitySettingsScreen() {
  const nav = useNavigation<any>();
  const { facilityId } = useEntitlements();
  const { setMode, setSelectedFacilityId, setFacilityFeaturesEnabled } = useSession();

  const switchFacility = () => {
    setSelectedFacilityId(null);
    nav.replace("SelectFacility");
  };

  const exitFacilityMode = () => {
    setSelectedFacilityId(null);
    setFacilityFeaturesEnabled(false);
    setMode("personal");
    nav.replace("Personal");
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Facility Settings</Text>
      <Text style={{ opacity: 0.7 }}>Current Facility: {facilityId}</Text>

      <Pressable
        onPress={switchFacility}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Switch Facility</Text>
      </Pressable>

      <Pressable
        onPress={exitFacilityMode}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Exit Facility Mode</Text>
      </Pressable>
    </View>
  );
}
