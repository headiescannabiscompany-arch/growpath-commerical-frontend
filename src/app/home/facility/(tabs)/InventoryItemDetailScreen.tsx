import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";

export default function InventoryItemDetailScreen() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();

  return (
    <ScreenBoundary name="facility.inventory.itemDetail">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Inventory Item</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : !itemId ? (
          <InlineError
            title="Missing itemId"
            message="No inventory itemId was provided."
          />
        ) : (
          <>
            <Text style={{ opacity: 0.8 }}>Item ID: {String(itemId)}</Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </TouchableOpacity>

            <Text style={{ opacity: 0.75 }}>
              Stub detail screen (safe mount). Wire GET item details later.
            </Text>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
