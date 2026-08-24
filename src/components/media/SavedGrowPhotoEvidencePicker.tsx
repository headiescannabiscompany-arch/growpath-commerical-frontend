import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { createEvidenceAsset } from "@/api/evidence";
import { listPersonalLogs } from "@/api/logs";
import {
  existingGrowPhotoCandidates,
  existingGrowPhotoEvidenceInput,
  type ExistingGrowPhotoCandidate
} from "@/features/personal/diagnosis/existingGrowPhotoEvidence";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import type { EvidenceAsset, EvidencePurpose } from "@/types/evidence";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = {
  growId: string;
  plantId?: string;
  purpose: Extract<EvidencePurpose, "diagnosis" | "ipm" | "harvest">;
  value: EvidenceAsset[];
  onChange: React.Dispatch<React.SetStateAction<EvidenceAsset[]>>;
  maxPhotos?: number;
  maxUserPhotos?: number;
};

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

export default function SavedGrowPhotoEvidencePicker({
  growId,
  plantId = "",
  purpose,
  value,
  onChange,
  maxPhotos = 10,
  maxUserPhotos
}: Props) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createSavedGrowPhotoEvidenceStyles(palette), [palette]);
  const [candidates, setCandidates] = useState<ExistingGrowPhotoCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [addingId, setAddingId] = useState("");

  useEffect(() => {
    if (!growId) {
      setCandidates([]);
      setLoading(false);
      setStatus("");
      return;
    }
    let mounted = true;
    setLoading(true);
    setStatus("");
    listPersonalLogs({ growId })
      .then((logs) => {
        if (!mounted) return;
        setCandidates(existingGrowPhotoCandidates(logs, growId));
      })
      .catch(() => {
        if (!mounted) return;
        setCandidates([]);
        setStatus("Unable to load saved grow photos.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [growId]);

  async function addPhoto(candidate: ExistingGrowPhotoCandidate) {
    const selected = value.some(
      (asset) => asset.durableUrl === candidate.url || asset.originalUri === candidate.url
    );
    const photoCount = value.filter((asset) => asset.assetType === "photo").length;
    const userPhotoCount = value.filter(
      (asset) => asset.assetType === "photo" && asset.source !== "generated"
    ).length;
    if (
      addingId ||
      selected ||
      photoCount >= maxPhotos ||
      userPhotoCount >= (maxUserPhotos ?? maxPhotos)
    )
      return;

    setAddingId(candidate.id);
    setStatus("");
    try {
      const saved = await createEvidenceAsset(
        existingGrowPhotoEvidenceInput(candidate, plantId, purpose)
      );
      onChange((current) =>
        current.some(
          (asset) =>
            asset.durableUrl === candidate.url || asset.originalUri === candidate.url
        )
          ? current
          : [...current, saved]
      );
      setStatus(`Added saved grow photo: ${candidate.title}.`);
    } catch (error: any) {
      setStatus(error?.message || "Unable to add the saved grow photo.");
    } finally {
      setAddingId("");
    }
  }

  if (!growId) return null;

  const workflowLabel =
    purpose === "ipm"
      ? "IPM scout"
      : purpose === "harvest"
        ? "harvest readiness"
        : "diagnosis";
  const photoCount = value.filter((asset) => asset.assetType === "photo").length;
  const userPhotoCount = value.filter(
    (asset) => asset.assetType === "photo" && asset.source !== "generated"
  ).length;

  return (
    <View style={styles.section} accessibilityLabel="Saved grow photo evidence">
      <Text accessibilityRole="header" aria-level={3} style={styles.title}>
        Use photos already in this grow
      </Text>
      <Text style={styles.help}>
        Reuse saved grow evidence instead of uploading the same photo again. Selecting a
        photo explicitly includes it in this {workflowLabel} request; it is not used for
        model training.
      </Text>
      {loading ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          Loading saved photos...
        </Text>
      ) : candidates.length ? (
        <View style={styles.grid}>
          {candidates.map((candidate, index) => {
            const selected = value.some(
              (asset) =>
                asset.durableUrl === candidate.url || asset.originalUri === candidate.url
            );
            const busy = addingId === candidate.id;
            const limitReached =
              photoCount >= maxPhotos || userPhotoCount >= (maxUserPhotos ?? maxPhotos);
            const capturedDate = displayDate(candidate.capturedAt);
            return (
              <View key={candidate.id} style={styles.card}>
                <Image
                  source={{ uri: resolveImageUri(candidate.url) }}
                  style={styles.preview}
                  accessibilityLabel={`Saved grow photo ${candidate.title}`}
                />
                <Text style={styles.photoTitle} numberOfLines={2}>
                  Source log: {candidate.title}
                </Text>
                {capturedDate ? <Text style={styles.meta}>{capturedDate}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use saved photo ${candidate.title}, item ${
                    index + 1
                  }${
                    purpose === "ipm" || purpose === "harvest"
                      ? ` for ${workflowLabel}`
                      : ""
                  }`}
                  accessibilityState={{
                    disabled: selected || busy || limitReached,
                    selected
                  }}
                  disabled={selected || busy || limitReached}
                  onPress={() => addPhoto(candidate)}
                  style={[
                    styles.button,
                    (selected || busy || limitReached) && styles.disabled
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {selected ? "Added" : busy ? "Adding..." : "Use Photo"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.status}>
          No saved grow photos are available yet. Add new evidence below.
        </Text>
      )}
      {status ? (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {status}
        </Text>
      ) : null}
    </View>
  );
}

export const createSavedGrowPhotoEvidenceStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    section: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    title: { color: palette.text, fontSize: 16, fontWeight: "800" },
    help: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 8,
      width: 156
    },
    preview: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      height: 104,
      width: "100%"
    },
    photoTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
    meta: { color: palette.textMuted, fontSize: 12 },
    status: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    buttonText: { color: palette.accentText, fontWeight: "800" },
    disabled: { opacity: 0.5 }
  });
