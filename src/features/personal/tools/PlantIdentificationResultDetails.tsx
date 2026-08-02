import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
}

function display(value: unknown, fallback = "Not established") {
  const text = String(value || "").trim();
  return text || fallback;
}

type PlantIdentificationResultStyles = ReturnType<
  typeof createPlantIdentificationResultStyles
>;

function EvidenceList({
  title,
  values,
  styles
}: {
  title: string;
  values: unknown;
  styles: PlantIdentificationResultStyles;
}) {
  const items = textList(values);
  if (!items.length) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item, index) => (
        <Text key={`${title}-${index}-${item}`} style={styles.listItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export default function PlantIdentificationResultDetails({
  outputs
}: {
  outputs: Record<string, any>;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPlantIdentificationResultStyles(palette), [palette]);
  const candidates = Array.isArray(outputs.candidates) ? outputs.candidates : [];
  const sourceVerification = outputs.sourceVerification || {};
  const possibleGenera = textList(outputs.possibleGenera);

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Botanical narrowing</Text>
        <Text style={styles.line}>Broad group: {display(outputs.broadGroup)}</Text>
        <Text style={styles.line}>Likely family: {display(outputs.likelyFamily)}</Text>
        <Text style={styles.line}>
          Possible genera:{" "}
          {possibleGenera.length ? possibleGenera.join(", ") : "Not established"}
        </Text>
      </View>

      {candidates.length ? (
        <View style={styles.group}>
          <Text style={styles.sectionTitle}>Candidate comparison</Text>
          {candidates.map((candidate: any, index: number) => (
            <View
              key={`${candidate?.scientificName || candidate?.commonNames?.[0] || "candidate"}-${index}`}
              style={styles.candidate}
            >
              <Text style={styles.candidateTitle}>
                {index + 1}.{" "}
                {display(
                  candidate?.scientificName,
                  textList(candidate?.commonNames)[0] || "Unresolved candidate"
                )}
              </Text>
              <Text style={styles.meta}>
                {display(candidate?.rank, "working candidate")} ·{" "}
                {display(candidate?.confidence, "low")} confidence ·{" "}
                {candidate?.verificationStatus === "verified"
                  ? "source verified"
                  : "not source verified"}
              </Text>
              <EvidenceList
                title="Supports"
                values={candidate?.evidence}
                styles={styles}
              />
              <EvidenceList
                title="Conflicts / lookalikes"
                values={candidate?.counterEvidence}
                styles={styles}
              />
              <EvidenceList
                title="Still needed"
                values={candidate?.missingEvidence}
                styles={styles}
              />
            </View>
          ))}
        </View>
      ) : null}

      <EvidenceList title="Evidence used" values={outputs.evidence} styles={styles} />
      <EvidenceList
        title="Counter-evidence"
        values={outputs.counterEvidence}
        styles={styles}
      />
      <EvidenceList
        title="Missing evidence"
        values={outputs.missingInformation}
        styles={styles}
      />
      <EvidenceList
        title="Next photos to add"
        values={outputs.requiredNextPhotos}
        styles={styles}
      />
      <EvidenceList
        title="Questions that would narrow the ID"
        values={outputs.requiredNextQuestions}
        styles={styles}
      />

      <View style={styles.verification}>
        <Text style={styles.sectionTitle}>Source verification</Text>
        <Text style={styles.line}>
          {sourceVerification.status === "verified"
            ? "This run includes recorded external botanical verification."
            : "No external botanical database was queried for this run. The result remains a photo/form candidate until its source records are checked."}
        </Text>
        {textList(sourceVerification.recommendedSourceIds).length ? (
          <Text style={styles.meta}>
            Recommended checks:{" "}
            {textList(sourceVerification.recommendedSourceIds).join(", ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function createPlantIdentificationResultStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { gap: 12 },
    group: { gap: 5 },
    sectionTitle: { color: palette.text, fontSize: 14, fontWeight: "800" },
    groupTitle: { color: palette.text, fontSize: 12, fontWeight: "800" },
    line: { color: palette.textMuted, lineHeight: 19 },
    listItem: { color: palette.textMuted, lineHeight: 19 },
    candidate: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      backgroundColor: palette.surface,
      padding: 10,
      gap: 5
    },
    candidateTitle: { color: palette.text, fontWeight: "800" },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    verification: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: 8,
      backgroundColor: palette.accentSoft,
      padding: 10,
      gap: 5
    }
  });
}
