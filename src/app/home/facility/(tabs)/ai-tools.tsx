import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function AIToolsTab() {
  const { selectedId: facilityId } = useFacility();
  const router = useRouter();

  return (
    <ScreenBoundary name="facility.tabs.aiTools">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>AI Tools</Text>

        {!facilityId ? (
          <Text>Select a facility to use AI tools.</Text>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => router.push("/home/facility/ai/ask" as any)}
              style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Ask AI</Text>
              <Text style={{ opacity: 0.75, marginTop: 4 }}>
                Chat + uncertainty + options + recommendation.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/home/facility/ai/diagnosis-photo" as any)}
              style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Photo Diagnosis</Text>
              <Text style={{ opacity: 0.75, marginTop: 4 }}>
                Attach photo (stub for now), run diagnosis, get receipt.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/home/facility/ai/template" as any)}
              style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Template Runner</Text>
              <Text style={{ opacity: 0.75, marginTop: 4 }}>
                Soil/NPK templates now → dropdown ingredient system next.
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
