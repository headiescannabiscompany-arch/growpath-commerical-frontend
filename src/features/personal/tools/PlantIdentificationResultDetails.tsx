import React from "react";
import { StyleSheet, Text, View } from "react-native";

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

function EvidenceList({ title, values }: { title: string; values: unknown }) {
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
              <EvidenceList title="Supports" values={candidate?.evidence} />
              <EvidenceList
                title="Conflicts / lookalikes"
                values={candidate?.counterEvidence}
              />
              <EvidenceList title="Still needed" values={candidate?.missingEvidence} />
            </View>
          ))}
        </View>
      ) : null}

      <EvidenceList title="Evidence used" values={outputs.evidence} />
      <EvidenceList title="Counter-evidence" values={outputs.counterEvidence} />
      <EvidenceList title="Missing evidence" values={outputs.missingInformation} />
      <EvidenceList title="Next photos to add" values={outputs.requiredNextPhotos} />
      <EvidenceList
        title="Questions that would narrow the ID"
        values={outputs.requiredNextQuestions}
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

const styles = StyleSheet.create({
  container: { gap: 12 },
  group: { gap: 5 },
  sectionTitle: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  groupTitle: { color: "#334155", fontSize: 12, fontWeight: "800" },
  line: { color: "#334155", lineHeight: 19 },
  listItem: { color: "#475569", lineHeight: 19 },
  candidate: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 5
  },
  candidateTitle: { color: "#0F172A", fontWeight: "800" },
  meta: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  verification: {
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 8,
    backgroundColor: "#F0F9FF",
    padding: 10,
    gap: 5
  }
});
