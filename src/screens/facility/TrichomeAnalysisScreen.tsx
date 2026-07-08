import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useAICall } from "@/hooks/useAICall";
import { AIResultCard } from "@/features/ai/components/AIResultCard";
import { uploadImage } from "@/api/uploads";
import { maybePromptAttachPhotosToGrow } from "@/utils/growPhotoAttachment";
import { radius } from "@/theme/theme";

export default function TrichomeAnalysisScreen({
  facilityId,
  growId
}: {
  facilityId: string;
  growId: string;
}) {
  const { callAI, loading, error, last } = useAICall(facilityId);
  const [imageUrl, setImageUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [notes, setNotes] = useState("");
  const [daysSinceFlip, setDaysSinceFlip] = useState("65");
  const [clear, setClear] = useState("0.2");
  const [cloudy, setCloudy] = useState("0.7");
  const [amber, setAmber] = useState("0.1");

  const canRun = useMemo(
    () =>
      !!facilityId &&
      !!growId &&
      !!imageUrl.trim() &&
      !uploading &&
      Number.isFinite(Number(daysSinceFlip)),
    [daysSinceFlip, facilityId, growId, imageUrl, uploading]
  );

  const pickPhoto = async () => {
    setUploadError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError("Photo library access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setPhotoPreview(asset.uri);
    setUploading(true);
    try {
      const uploaded = await uploadImage(asset.uri);
      if (!uploaded?.url) throw new Error("Missing uploaded image URL.");
      setImageUrl(uploaded.url);
      await maybePromptAttachPhotosToGrow([uploaded.url], { skip: Boolean(growId) });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to upload trichome photo."
      );
    } finally {
      setUploading(false);
    }
  };

  const runAnalysis = async () => {
    if (!canRun) return;
    await callAI({
      tool: "harvest",
      fn: "analyzeTrichomes",
      args: {
        images: [imageUrl.trim()],
        zones: ["top"],
        distribution: {
          clear: Number(clear) || 0,
          cloudy: Number(cloudy) || 0,
          amber: Number(amber) || 0
        },
        daysSinceFlip: Number(daysSinceFlip),
        notes: notes.trim() || undefined
      },
      context: { growId }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Days since flip</Text>
        <TextInput
          accessibilityLabel="Trichome days since flip"
          value={daysSinceFlip}
          onChangeText={setDaysSinceFlip}
          keyboardType="numeric"
          style={styles.input}
          placeholder="65"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Trichome distribution</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.small}>Clear</Text>
            <TextInput
              accessibilityLabel="Clear trichome ratio"
              value={clear}
              onChangeText={setClear}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.2"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.small}>Cloudy</Text>
            <TextInput
              accessibilityLabel="Cloudy trichome ratio"
              value={cloudy}
              onChangeText={setCloudy}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.7"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.small}>Amber</Text>
            <TextInput
              accessibilityLabel="Amber trichome ratio"
              value={amber}
              onChangeText={setAmber}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.1"
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Photo</Text>
        <Pressable
          onPress={pickPhoto}
          disabled={uploading}
          accessibilityLabel="Upload trichome photo"
          style={[styles.secondaryButton, uploading && styles.ctaDisabled]}
        >
          <Text style={styles.secondaryButtonText}>
            {uploading ? "Uploading..." : imageUrl ? "Change Photo" : "Upload Photo"}
          </Text>
        </Pressable>
        {!!photoPreview && (
          <Image
            accessibilityLabel="Selected trichome photo"
            source={{ uri: photoPreview }}
            style={styles.preview}
          />
        )}
        {!!uploadError && <Text style={styles.error}>{uploadError}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Image URL</Text>
        <TextInput
          accessibilityLabel="Trichome image URL"
          value={imageUrl}
          onChangeText={(value) => {
            setImageUrl(value);
            setUploadError("");
          }}
          style={styles.input}
          placeholder="/uploads/trichomes.jpg"
          multiline
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Notes (optional)</Text>
        <TextInput
          accessibilityLabel="Trichome analysis notes"
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, { minHeight: 80 }]}
          placeholder="Lens details, lighting, or grow context"
          multiline
        />

        <Pressable
          onPress={runAnalysis}
          disabled={!canRun || loading || uploading}
          accessibilityLabel="Analyze trichome image"
          style={[styles.cta, (!canRun || loading || uploading) && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>
            {loading ? "Analyzing..." : "Analyze Trichomes"}
          </Text>
        </Pressable>

        {!!error && (
          <Text style={styles.error}>
            {error.code}: {error.message}
          </Text>
        )}
      </View>

      {!!last?.data && <AIResultCard title="Trichome Analysis" data={last.data as any} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.card,
    padding: 12,
    gap: 8,
    backgroundColor: "#fff"
  },
  label: { fontWeight: "700", fontSize: 14, marginBottom: 4 },
  small: { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  col: { gap: 0 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.card,
    padding: 10,
    fontSize: 14
  },
  inputSm: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.card,
    minWidth: 82,
    padding: 10,
    fontSize: 13
  },
  cta: {
    marginTop: 10,
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    alignItems: "center"
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontWeight: "700", color: "#fff", fontSize: 14 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: radius.card,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
    backgroundColor: "#F9FAFB"
  },
  secondaryButtonText: { fontWeight: "700", color: "#111827", fontSize: 14 },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: radius.card,
    backgroundColor: "#F3F4F6",
    marginTop: 8
  },
  error: { color: "#DC2626", fontWeight: "600", fontSize: 12, marginTop: 8 }
});
