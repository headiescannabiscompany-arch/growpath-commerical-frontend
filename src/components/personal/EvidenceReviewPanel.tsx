import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  evidenceReviewNextChecks,
  type EvidenceReview
} from "@/features/personal/evidence/evidenceReview";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

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

export const createEvidenceReviewPanelStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 7,
      padding: 12
    },
    header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    title: { color: palette.text, fontWeight: "800" },
    status: { color: palette.link, fontWeight: "800", fontSize: 12 },
    summary: { color: palette.textMuted, fontSize: 12 },
    warning: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.warning,
      lineHeight: 18,
      padding: 8
    },
    group: { gap: 3 },
    groupTitle: { color: palette.text, fontWeight: "800", fontSize: 12 },
    item: { color: palette.textMuted, lineHeight: 18, fontSize: 12 },
    button: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    buttonText: { color: palette.link, fontWeight: "800", fontSize: 12 },
    followUp: { color: palette.text, fontSize: 12, lineHeight: 18 }
  });

type EvidenceReviewPanelStyles = ReturnType<typeof createEvidenceReviewPanelStyles>;

function list(values: string[], label: string, styles: EvidenceReviewPanelStyles) {
  if (!values.length) return null;
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" aria-level={3} style={styles.groupTitle}>
        {label}
      </Text>
      {values.map((value) => (
        <Text key={`${label}-${value}`} style={styles.item}>
          • {value}
        </Text>
      ))}
    </View>
  );
}

export default function EvidenceReviewPanel({ review, onAddEvidence }: Props) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createEvidenceReviewPanelStyles(palette), [palette]);
  const nextChecks = evidenceReviewNextChecks(review);
  const reviewFingerprint = JSON.stringify({ review, nextChecks });
  const [followUpFeedback, setFollowUpFeedback] = useState("");
  const followUpBusyRef = useRef(false);
  const previousReviewFingerprintRef = useRef(reviewFingerprint);

  useEffect(() => {
    if (previousReviewFingerprintRef.current === reviewFingerprint) return;
    previousReviewFingerprintRef.current = reviewFingerprint;
    setFollowUpFeedback("");
  }, [reviewFingerprint]);

  async function showRequestedEvidenceGuidance() {
    if (!onAddEvidence || followUpBusyRef.current) return;
    followUpBusyRef.current = true;
    setFollowUpFeedback(
      `Requested next evidence: ${nextChecks.join(
        "; "
      )}. Use the evidence uploader above to attach these items. Then run the tool again when you are ready. This guidance did not upload evidence, rerun the tool, or change the current result.`
    );
    try {
      await onAddEvidence();
    } finally {
      followUpBusyRef.current = false;
    }
  }
  return (
    <View style={styles.card} accessibilityLabel="Evidence review summary">
      <View style={styles.header}>
        <Text accessibilityRole="header" aria-level={2} style={styles.title}>
          Evidence review
        </Text>
        <Text style={styles.status}>{status(review)}</Text>
      </View>
      <Text style={styles.summary}>
        Quality: {review.quality || "unknown"} · Confidence: {review.confidence}
        {review.providerLabel ? ` · ${review.providerLabel}` : ""}
      </Text>
      {!review.performed && review.requested ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          The files are attached, but this result does not prove that the provider
          inspected their pixels. Add written observations or retry with an image-capable
          provider.
        </Text>
      ) : null}
      {list(review.evidenceUsed, "Evidence used", styles)}
      {list(review.counterEvidence, "Counter-evidence", styles)}
      {list(nextChecks, "Next evidence or checks", styles)}
      {onAddEvidence && nextChecks.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How to add requested evidence"
          onPress={showRequestedEvidenceGuidance}
          style={styles.button}
        >
          <Text style={styles.buttonText}>How to add requested evidence</Text>
        </Pressable>
      ) : null}
      {followUpFeedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.followUp}>
          {followUpFeedback}
        </Text>
      ) : null}
    </View>
  );
}
