import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { plantIdentificationCandidates, plantIdentificationSelection, safePlantIdentificationOutputs } from "./plantIdentificationCandidates";

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
  outputs: rawOutputs
}: {
  outputs: Record<string, any>;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPlantIdentificationResultStyles(palette), [palette]);
  const outputs = safePlantIdentificationOutputs(rawOutputs);
  const candidates = plantIdentificationCandidates(outputs);
  const selection = plantIdentificationSelection(outputs);
  const correction = outputs.userCorrection?.source === "user_entry" ? outputs.userCorrection : null;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [rawOutputs]);
  const selectedIndexes = selection?.candidateIndexes || [];
  const ranked = selection?.status === "leading_candidate" || selection?.status === "close_alternatives";
  const order = [...selectedIndexes, ...candidates.map((_: any, index: number) => index)
    .filter((index: number) => !selectedIndexes.includes(index))].slice(0, ranked ? 3 : 5);
  const visibleCount = correction ? (expanded ? order.length : 0) : expanded ? order.length : selection?.status === "close_alternatives" ? selectedIndexes.length : 1;
  const visible = order.slice(0, visibleCount);
  const sourceVerification = outputs.sourceVerification || {};
  const referenceLookup = outputs.referenceLookup;
  const possibleGenera = textList(outputs.possibleGenera);
  const followUpKey = (value: string) => value.replace(/^optional\s*:\s*/i, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nextPhotos = textList(outputs.requiredNextPhotos).slice(0, 1);
  const nextQuestions = (selection?.discriminator ? [selection.discriminator] : textList(outputs.requiredNextQuestions).slice(0, 1))
    .filter((value) => !nextPhotos.some((photo) => followUpKey(photo) === followUpKey(value)));
  // Saved missingInformation also contains the next-photo/question lists. Show
  // each actionable request in its own slot once, without mutating the receipt.
  const missingEvidence = textList(outputs.missingInformation).filter((value) =>
    ![...nextPhotos, ...nextQuestions].some((request) => followUpKey(request) === followUpKey(value)));

  return (
    <View style={styles.container}>
      {correction ? (
        <View style={styles.verification}>
          <Text style={styles.sectionTitle}>{correction.commonName} — identified by you</Text>
          <Text style={styles.line}>Your identification is saved separately. The original AI result remains unchanged; this is not independent species verification.</Text>
          <Text style={styles.meta}>No new photos are required to keep your correction.</Text>
        </View>
      ) : selection ? (
        <View style={styles.verification}>
          <Text style={styles.sectionTitle}>{selection.status === "leading_candidate" ? "Best candidate · tentative"
            : selection.status === "close_alternatives" ? "Close alternatives — no clear winner yet" : "No reliable species match yet"}</Text>
          <Text style={styles.line}>{selection.reason}</Text>
        </View>
      ) : null}
      {(outputs.imageAnalysis?.retakeRequired || outputs.imageAnalysis?.quality === "unusable") && outputs.identificationNotes ? (
        <View style={styles.verification}>
          <Text style={styles.sectionTitle}>Why no identity was accepted</Text>
          <Text style={styles.line}>{String(outputs.identificationNotes)}</Text>
        </View>
      ) : null}
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
          <Text style={styles.sectionTitle}>{correction ? "Original AI candidates" : selection ? "Candidate comparison" : "Candidates — ranking evidence unavailable"}</Text>
          {visible.map((index: number) => { const candidate = candidates[index]; return (
            <View
              key={`${candidate?.scientificName || candidate?.commonNames?.[0] || "candidate"}-${index}`}
              style={styles.candidate}
            >
              <Text style={styles.candidateTitle}>
                {display(
                  candidate.rank === "horticultural_type" ? candidate.horticulturalName : textList(candidate?.commonNames)[0],
                  candidate?.scientificName || "Unresolved candidate"
                )}
              </Text>
              {candidate?.scientificName ? (
                <Text style={styles.meta}>Scientific candidate: {candidate.scientificName}</Text>
              ) : null}
              {candidate?.commonNameSource === "stored_reference" ? (
                <Text style={styles.meta}>Common name from a stored reference, not independent photo verification.</Text>
              ) : null}
              <Text style={styles.meta}>
                {candidate?.rank === "horticultural_type" ? "Named-type suggestion, not a verified cultivar" : candidate?.rank === "hybrid" ? "Hybrid hypothesis, not verified" : display(candidate?.rank, "working candidate")} ·{" "}
                {display(candidate?.confidence, "low")} confidence ·{" "}
                {candidate?.verificationStatus === "verified"
                  ? "source verified"
                  : "not source verified"}
              </Text>
              <EvidenceList
                title="Why it fits"
                values={candidate?.evidence}
                styles={styles}
              />
              <EvidenceList
                title="What remains uncertain"
                values={candidate?.counterEvidence}
                styles={styles}
              />
              <EvidenceList
                title="What would distinguish it"
                values={candidate?.missingEvidence}
                styles={styles}
              />
            </View>
          ); })}
          {(correction || order.length > (selection?.status === "close_alternatives" ? selectedIndexes.length : 1)) ? (
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.candidate}>
              <Text style={styles.candidateTitle}>{expanded ? "Hide comparison" : correction ? "View original AI candidates" : "Compare other candidates"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <EvidenceList title="Evidence used" values={outputs.evidence} styles={styles} />
      <EvidenceList title="How the proposals were handled" values={Array.isArray(outputs.candidateAssessment)
        ? outputs.candidateAssessment.slice(0, 5).filter((item: any) =>
          Number.isInteger(item.proposedIndex) && item.proposedIndex >= 0 && item.proposedIndex < 5 &&
          ["retained", "downgraded", "withheld"].includes(item.outcome) && typeof item.reason === "string")
          .map((item: any) => `Proposal ${item.proposedIndex + 1} — ${item.outcome === "downgraded" ? "broadened" : item.outcome}: ${item.reason}`) : []} styles={styles} />
      <EvidenceList
        title="Counter-evidence"
        values={outputs.counterEvidence}
        styles={styles}
      />
      <EvidenceList
        title="Missing evidence"
        values={missingEvidence}
        styles={styles}
      />
      <EvidenceList
        title={outputs.imageAnalysis?.retakeRequired || outputs.imageAnalysis?.quality === "unusable" ? "Photo needed for another identification" : "Optional next photo"}
        values={correction ? [] : nextPhotos}
        styles={styles}
      />
      <EvidenceList
        title="One optional way to narrow it down"
        values={correction ? [] : nextQuestions}
        styles={styles}
      />

      <View style={styles.verification}>
        <Text style={styles.sectionTitle}>Stored plant knowledge</Text>
        <Text style={styles.line}>
          {referenceLookup?.status === "matched"
            ? "Matched stored records marked reviewed. A name match does not confirm the photographed plant or its variety."
            : referenceLookup?.status === "no_match"
              ? "No eligible stored reference matched this candidate in the bounded search. This does not rule out the plant."
              : referenceLookup?.status === "unavailable"
                ? "Stored plant knowledge was unavailable. Your photo result was preserved without retrying AI."
                : "No stored-reference lookup was recorded for this result."}
        </Text>
        {referenceLookup?.partial === true ? (
          <Text style={styles.meta}>Some reference checks were unavailable. Any matches shown were retained from the checks that completed.</Text>
        ) : null}
        {referenceLookup?.recordsOmitted > 0 ? (
          <Text style={styles.meta}>Some reference details were omitted to keep this result within its size limit.</Text>
        ) : null}
        {(Array.isArray(referenceLookup?.records) ? referenceLookup.records : []).map((record: any, index: number) => (
          <View key={`${record.recordType}-${record.recordId}-${index}`} style={styles.candidate}>
            <Text style={styles.candidateTitle}>
              {textList(record.commonNames)[0] || record.scientificName}
            </Text>
            <Text style={styles.meta}>
              {record.scientificName} · {record.matchType === "name_match"
                ? "Candidate name match" : "Related genus record — not a photo match"}
            </Text>
            {(Array.isArray(record.sourceRecords) ? record.sourceRecords : []).map((source: any, sourceIndex: number) => (
              <Text key={sourceIndex} style={styles.meta}>
                {source.sourceName} · {source.url} · Reviewed: {source.lastReviewedAt?.slice(0, 10)}
              </Text>
            ))}
          </View>
        ))}
      </View>

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
