import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { loadAiInspectionView } from "@/api/evidence";
import {
  evidenceReviewNextChecks,
  type EvidenceReview
} from "@/features/personal/evidence/evidenceReview";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  exportAiInspectionEvidence,
  saveAiInspectionImage
} from "@/utils/aiInspectionEvidenceExport";
import type { AiInspectionView } from "@/types/evidence";

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
    followUp: { color: palette.text, fontSize: 12, lineHeight: 18 },
    inspectionCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 10,
      width: 250
    },
    inspectionImage: {
      backgroundColor: palette.page,
      borderRadius: radius.card,
      height: 210,
      width: "100%"
    },
    inspectionRow: { gap: 10, paddingVertical: 4 },
    inspectionActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    inspectionMeta: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    viewerBackdrop: {
      backgroundColor: "rgba(0, 0, 0, 0.88)",
      flex: 1,
      justifyContent: "center",
      padding: 18
    },
    viewerCard: {
      alignSelf: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      height: "92%",
      maxWidth: 1200,
      padding: 14,
      width: "100%"
    },
    viewerImage: {
      backgroundColor: palette.page,
      borderRadius: radius.card,
      flex: 1,
      minHeight: 220,
      width: "100%"
    },
    viewerTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    viewerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "flex-end"
    }
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
  const inspectionViews = review.inspectionViews || [];
  const nextChecks = evidenceReviewNextChecks(review);
  const reviewFingerprint = JSON.stringify({ review, nextChecks });
  const [followUpFeedback, setFollowUpFeedback] = useState("");
  const [inspectionFeedback, setInspectionFeedback] = useState("");
  const [loadedViews, setLoadedViews] = useState<Record<string, AiInspectionView>>({});
  const [activeInspectionView, setActiveInspectionView] =
    useState<AiInspectionView | null>(null);
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

  function viewKey(view: AiInspectionView) {
    return `${view.sourceEvidenceAssetId}:${view.sha256}`;
  }

  async function loadView(view: AiInspectionView) {
    const key = viewKey(view);
    if (loadedViews[key]?.dataUrl) return loadedViews[key];
    setInspectionFeedback(
      `Loading ${view.kind} from source photo ${view.sourceImageIndex}...`
    );
    const loaded = await loadAiInspectionView(view, {
      workspaceType: view.workspaceType || "personal",
      workspaceId: view.workspaceId,
      facilityId: view.facilityId
    });
    setLoadedViews((current) => ({ ...current, [key]: loaded }));
    setInspectionFeedback(
      `Opened the exact ${view.kind} inspected from source photo ${view.sourceImageIndex}.`
    );
    return loaded;
  }

  async function saveView(view: AiInspectionView) {
    try {
      const loaded = await loadView(view);
      await saveAiInspectionImage(loaded);
      setInspectionFeedback(
        "Inspection image saved or opened in the device share sheet."
      );
    } catch (error: any) {
      setInspectionFeedback(error?.message || "The inspection image could not be saved.");
    }
  }

  async function openView(view: AiInspectionView) {
    try {
      const loaded = await loadView(view);
      setActiveInspectionView(loaded);
    } catch (error: any) {
      setInspectionFeedback(error?.message || "The inspection view could not be opened.");
    }
  }

  async function exportViews() {
    try {
      setInspectionFeedback("Loading the exact inspected views for export...");
      const complete: AiInspectionView[] = [];
      for (const view of inspectionViews) complete.push(await loadView(view));
      await exportAiInspectionEvidence("GrowPathAI inspection evidence", complete, {
        analysisId: review.analysisId,
        reviewPolicyVersion: review.reviewPolicyVersion,
        providerModel: review.providerModel,
        imageDetail: review.imageDetail
      });
      setInspectionFeedback("Inspection evidence package exported.");
    } catch (error: any) {
      setInspectionFeedback(
        error?.message || "Inspection evidence could not be exported."
      );
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
      {inspectionViews.length ? (
        <View style={styles.group}>
          <Text accessibilityRole="header" aria-level={3} style={styles.groupTitle}>
            AI inspection views
          </Text>
          <Text style={styles.item}>
            These are the exact enlarged views inspected from the retained originals. They
            are supplemental views, not extra photos or independent evidence.
          </Text>
          <ScrollView
            horizontal
            contentContainerStyle={styles.inspectionRow}
            accessibilityLabel="AI inspection views"
          >
            {inspectionViews.map((view) => {
              const loaded = loadedViews[viewKey(view)];
              return (
                <View key={viewKey(view)} style={styles.inspectionCard}>
                  {loaded?.dataUrl ? (
                    <Image
                      source={{ uri: loaded.dataUrl }}
                      resizeMode="contain"
                      style={styles.inspectionImage}
                      accessibilityLabel={`${view.kind} from source photo ${view.sourceImageIndex}`}
                    />
                  ) : null}
                  <Text style={styles.groupTitle}>
                    Photo {view.sourceImageIndex}: {view.kind}
                  </Text>
                  <Text style={styles.inspectionMeta}>
                    {view.width} x {view.height} {" | "}
                    {view.cropStrategy.replaceAll("_", " ")}
                    {view.sourceBounds
                      ? ` | source x ${view.sourceBounds.left}-${
                          view.sourceBounds.left + view.sourceBounds.width
                        }, y ${view.sourceBounds.top}-${
                          view.sourceBounds.top + view.sourceBounds.height
                        }`
                      : ""}
                  </Text>
                  <View style={styles.inspectionActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${view.kind} from source photo ${view.sourceImageIndex}`}
                      onPress={() => void openView(view)}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>View</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Save ${view.kind} from source photo ${view.sourceImageIndex}`}
                      onPress={() => void saveView(view)}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export all AI inspection views"
            onPress={() => void exportViews()}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Export inspection evidence</Text>
          </Pressable>
          {inspectionFeedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.followUp}>
              {inspectionFeedback}
            </Text>
          ) : null}
          <Modal
            animationType="fade"
            onRequestClose={() => setActiveInspectionView(null)}
            transparent
            visible={Boolean(activeInspectionView)}
          >
            {activeInspectionView ? (
              <View
                accessibilityViewIsModal
                style={styles.viewerBackdrop}
                testID="ai-inspection-full-size-viewer"
              >
                <View style={styles.viewerCard}>
                  <Text accessibilityRole="header" style={styles.viewerTitle}>
                    Photo {activeInspectionView.sourceImageIndex}:{" "}
                    {activeInspectionView.kind}
                  </Text>
                  <Image
                    accessibilityLabel={`Full-size ${activeInspectionView.kind} from source photo ${activeInspectionView.sourceImageIndex}`}
                    resizeMode="contain"
                    source={{ uri: activeInspectionView.dataUrl }}
                    style={styles.viewerImage}
                  />
                  <Text style={styles.inspectionMeta}>
                    Exact inspected view Â· {activeInspectionView.width} x{" "}
                    {activeInspectionView.height} Â· supplemental pixels from the retained
                    original
                  </Text>
                  <View style={styles.viewerActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Save full-size ${activeInspectionView.kind} from source photo ${activeInspectionView.sourceImageIndex}`}
                      onPress={() => void saveView(activeInspectionView)}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>Save image</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close full-size inspection view"
                      onPress={() => setActiveInspectionView(null)}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
          </Modal>
        </View>
      ) : null}
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
