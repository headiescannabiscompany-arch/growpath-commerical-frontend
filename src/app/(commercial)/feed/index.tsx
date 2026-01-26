import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useEntitlements } from "@/entitlements";

export default function CommercialFeedScreen() {
  const router = useRouter();
  const ent = useEntitlements();
  const facilityId = ent.facilityId;

  if (!facilityId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ fontSize: 18, color: "#888", textAlign: "center", marginBottom: 12 }}>
          Commercial feed is locked. Select a facility to continue.
        </Text>

        <Pressable
          onPress={() => router.push("/(commercial)")}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: "#aaa",
            borderRadius: 8,
          }}
        >
          <Text>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 8 }}>Commercial Feed</Text>
      <Text style={{ color: "#666" }}>Facility: {String(facilityId)}</Text>
    </View>
  );
}
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useEntitlements } from "@/entitlements";

export default function CommercialFeedScreen() {
  const router = useRouter();
  const ent = useEntitlements();
  const facilityId = ent.facilityId;

  if (!facilityId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ fontSize: 18, color: "#888", textAlign: "center", marginBottom: 12 }}>
          Commercial feed is locked. Select a facility to continue.
        </Text>

        <Pressable
          onPress={() => router.push("/(commercial)")}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: "#aaa",
            borderRadius: 8,
          }}
        >
          <Text>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 8 }}>Commercial Feed</Text>
      <Text style={{ color: "#666" }}>Facility: {String(facilityId)}</Text>
    </View>
  );
}

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 8 }}>Commercial Feed</Text>
      <Text style={{ color: "#666" }}>Facility: {String(facilityId)}</Text>
    </View>
  );
}
