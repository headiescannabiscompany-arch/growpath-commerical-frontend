import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { useFacility } from "@/state/useFacility";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";

export default function CreateInventoryItemScreen() {
  const { selectedId: facilityId } = useFacility();
  const router = useRouter();

  const [name, setName] = useState("");
  const [error] = useState<any | null>(null);

  return (
    <ScreenBoundary name="facility.inventory.createItem">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Create Inventory Item</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <>
            <InlineError
              title={error?.title}
              message={error?.message}
              requestId={error?.requestId}
            />

            <TextInput
              placeholder="Item name"
              value={name}
              onChangeText={setName}
              style={{
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>
                Save (stub) — Back
              </Text>
            </TouchableOpacity>

            <Text style={{ opacity: 0.75 }}>
              Stub create screen (Step 1 safe mount). Wire POST create in Step 3.
            </Text>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
    marginBottom: 16,
    fontSize: 16
  },
  button: {
    backgroundColor: "#f59e0b",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center"
  },
  buttonDisabled: {
    backgroundColor: "#f3f4f6"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});
