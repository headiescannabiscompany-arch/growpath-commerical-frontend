import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";

/**
 * TrichomeAnalysisScreen
 *
 * Minimal MVP: accept image URL(s) and submit
 * Calls POST /api/facility/:facilityId/ai/call (harvest.analyzeTrichomes)
 *
 * Full implementation would:
 * - Use react-native-image-picker or Expo.ImagePicker
 * - Upload images to storage backend
 * - Display distribution results + confidence
 *
 * For now: stub with manual image URL input for web demo
 */
export default function TrichomeAnalysisScreen({
  facilityId,
  growId,
  onNavigateBack
}: {
  facilityId: string;
  growId: string;
  onNavigateBack?: () => void;
}) {
  const [imageUrl, setImageUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const handleSubmit = () => {
    // TODO: Call useAICall hook with harvest.analyzeTrichomes
    // Post-MVP: accept images from picker, upload, then call AI
    console.log("Submit trichome analysis", { imageUrl, notes, growId });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Analyze Trichomes</Text>
      <Text style={styles.sub}>
        (MVP: paste image URL. Later: capture from camera or upload)
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Image URL</Text>
        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          style={styles.input}
          placeholder="https://example.com/image.jpg"
          multiline
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, { minHeight: 80 }]}
          placeholder="Lighting conditions, lens used, etc."
          multiline
        />

        <Pressable onPress={handleSubmit} style={[styles.cta]}>
          <Text style={styles.ctaText}>Analyze</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.info}>
          ℹ️ Full camera/upload support coming soon. For now, use a URL to a trichome
          image.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  sub: { fontSize: 14, opacity: 0.7, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#fff"
  },
  label: { fontWeight: "700", fontSize: 14, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    fontSize: 14
  },
  cta: {
    marginTop: 10,
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center"
  },
  ctaText: { fontWeight: "700", color: "#fff", fontSize: 14 },
  info: { fontSize: 13, color: "#0073E6", lineHeight: 18 }
});
