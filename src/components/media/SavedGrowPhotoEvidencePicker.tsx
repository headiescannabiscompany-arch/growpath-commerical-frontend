import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { createEvidenceAsset } from "@/api/evidence";
import { listPersonalLogs } from "@/api/logs";
import {
  existingGrowPhotoCandidates,
  existingGrowPhotoEvidenceInput,
  type ExistingGrowPhotoCandidate
} from "@/features/personal/diagnosis/existingGrowPhotoEvidence";
import { radius } from "@/theme/theme";
import type { EvidenceAsset, EvidencePurpose } from "@/types/evidence";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = {
  growId: string;
  plantId?: string;
  purpose: Extract<EvidencePurpose, "diagnosis" | "ipm">;
  value: EvidenceAsset[];
  onChange: React.Dispatch<React.SetStateAction<EvidenceAsset[]>>;
  maxPhotos?: number;
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
  maxPhotos = 10
}: Props) {
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
    if (addingId || selected || photoCount >= maxPhotos) return;

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

  const workflowLabel = purpose === "ipm" ? "IPM scout" : "diagnosis";
  const photoCount = value.filter((asset) => asset.assetType === "photo").length;

  return (
    <View style={styles.section} accessibilityLabel="Saved grow photo evidence">
      <Text style={styles.title}>Use photos already in this grow</Text>
      <Text style={styles.help}>
        Reuse saved grow evidence instead of uploading the same photo again. Selecting a
        photo explicitly includes it in this {workflowLabel} request; it is not used for
        model training.
      </Text>
      {loading ? (
        <Text style={styles.status}>Loading saved photos...</Text>
      ) : candidates.length ? (
        <View style={styles.grid}>
          {candidates.map((candidate, index) => {
            const selected = value.some(
              (asset) =>
                asset.durableUrl === candidate.url || asset.originalUri === candidate.url
            );
            const busy = addingId === candidate.id;
            const limitReached = photoCount >= maxPhotos;
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
                  }${purpose === "ipm" ? ` for ${workflowLabel}` : ""}`}
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

const styles = StyleSheet.create({
  section: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  title: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  help: { color: "#475569", fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderColor: "#D9E2EC",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 5,
    padding: 8,
    width: 156
  },
  preview: {
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    height: 104,
    width: "100%"
  },
  photoTitle: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  meta: { color: "#64748B", fontSize: 12 },
  status: { color: "#475569", fontSize: 12, lineHeight: 18 },
  button: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.5 }
});
