import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

function Tile({
  title,
  desc,
  onPress
}: {
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileDesc}>{desc}</Text>
      <Text style={styles.tileCta}>Open ›</Text>
    </Pressable>
  );
}

export default function FacilityAiToolsTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
    }
  }, [facilityId, router]);

  return (
    <ScreenBoundary title="AI Tools">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Facility AI Tools</Text>
        <Text style={styles.muted}>
          facilityId: {facilityId ? String(facilityId) : "(none)"}
        </Text>

        <Tile
          title="Ask AI"
          desc="Freeform questions + facility context."
          onPress={() => router.push("/home/facility/ai/ask")}
        />
        <Tile
          title="Photo Diagnosis"
          desc="Upload a photo and get an issue diagnosis."
          onPress={() => router.push("/home/facility/ai/diagnosis-photo")}
        />
        <Tile
          title="SOP Template Assistant"
          desc="Generate or refine SOP templates."
          onPress={() => router.push("/home/facility/ai/template")}
        />
        <Tile
          title="Compliance AI4 Dashboard"
          desc="AI explanations on compliance risk + recommendations."
          onPress={() => router.push("/home/facility/compliance/ai4.dashboard")}
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7, marginBottom: 12 },

  tile: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  pressed: { opacity: 0.85 },
  tileTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 },
  tileDesc: { opacity: 0.75, marginBottom: 10 },
  tileCta: { fontWeight: "900", opacity: 0.7 }
});
