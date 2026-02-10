import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilitySopRunCompare() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="FacilitySopRunCompare">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>FacilitySopRunCompare</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <>
            <Text style={{ opacity: 0.75 }}>
              Stub screen (safe mount). Wire API later.
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
