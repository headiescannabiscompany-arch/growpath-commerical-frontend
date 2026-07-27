import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  evidenceReviewNextChecks,
  type EvidenceReview
} from "@/features/personal/evidence/evidenceReview";

type Props = {
  review: EvidenceReview;
  onAddEvidence?: () => void | Promise<void>;
};

function status(review: EvidenceReview) {
  if (!review.requested) return "No media requested";
  if (!review.performed) return "Pixels not analyzed";
  const count = review.photosAnalyzed || review.photoCount;
  return `${count} photo${count === 1 ? "" : "s"} inspected`;
}

function list(values: string[], label: string) {
  if (!values.length) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{label}</Text>
      {values.map((value) => (
        <Text key={`${label}-${value}`} style={styles.item}>
          • {value}
        </Text>
      ))}
    </View>
  );
}

export default function EvidenceReviewPanel({ review, onAddEvidence }: Props) {
  const nextChecks = evidenceReviewNextChecks(review);
  return (
    <View style={styles.card} accessibilityLabel="Evidence review summary">
      <View style={styles.header}>
        <Text style={styles.title}>Evidence review</Text>
        <Text style={styles.status}>{status(review)}</Text>
      </View>
      <Text style={styles.summary}>
        Quality: {review.quality || "unknown"} · Confidence: {review.confidence}
        {review.providerLabel ? ` · ${review.providerLabel}` : ""}
      </Text>
      {!review.performed && review.requested ? (
        <Text style={styles.warning}>
          The files are attached, but this result does not prove that the provider
          inspected their pixels. Add written observations or retry with an image-capable
          provider.
        </Text>
      ) : null}
      {list(review.evidenceUsed, "Evidence used")}
      {list(review.counterEvidence, "Counter-evidence")}
      {list(evidenceReviewNextChecks(review), "Next evidence or checks")}
      {onAddEvidence && nextChecks.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add requested evidence"
          onPress={onAddEvidence}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Add requested evidence and re-run</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 7
  },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  title: { color: "#0F172A", fontWeight: "800" },
  status: { color: "#166534", fontWeight: "800", fontSize: 12 },
  summary: { color: "#475569", fontSize: 12 },
  warning: { color: "#9A3412", backgroundColor: "#FFF7ED", padding: 8, lineHeight: 18 },
  group: { gap: 3 },
  groupTitle: { color: "#334155", fontWeight: "800", fontSize: 12 },
  item: { color: "#475569", lineHeight: 18, fontSize: 12 },
  button: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  buttonText: { color: "#166534", fontWeight: "800", fontSize: 12 }
});
