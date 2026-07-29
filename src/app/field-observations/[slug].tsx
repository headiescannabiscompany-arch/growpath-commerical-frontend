import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { FieldObservation, FieldStudy, getPublicFieldStudy } from "@/api/fieldStudies";
import { radius } from "@/theme/theme";

function observationName(observation: FieldObservation) {
  return (
    observation.identity?.commonName ||
    observation.identity?.scientificName ||
    observation.title ||
    "Unconfirmed plant"
  );
}

export default function PublicFieldStudyScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = String(params.slug || "");
  const [study, setStudy] = useState<FieldStudy | null>(null);
  const [observations, setObservations] = useState<FieldObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const response = await getPublicFieldStudy(slug);
      setStudy(response.study);
      setObservations(response.observations);
    } catch (loadError: any) {
      setError(loadError?.message || "This Field Study could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading published Field Study...</Text>
      </View>
    );
  }

  if (!study) {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="header" style={styles.title}>
          Field Study unavailable
        </Text>
        <Text style={styles.error}>{error}</Text>
        <Link href="/field-observations" asChild>
          <Pressable accessibilityRole="link">
            <Text style={styles.link}>Open observation map</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Link href="/field-observations" asChild>
        <Pressable accessibilityRole="link">
          <Text style={styles.link}>← Public observation map</Text>
        </Pressable>
      </Link>
      <Text accessibilityRole="header" style={styles.title}>
        {study.title}
      </Text>
      <Text style={styles.meta}>
        {study.regionLabel || "Region not specified"} ·{" "}
        {study.purpose?.replace(/_/g, " ")}
      </Text>
      {study.description ? (
        <Text style={styles.description}>{study.description}</Text>
      ) : null}

      <View style={styles.privacy}>
        <Text style={styles.privacyTitle}>Location privacy</Text>
        <Text style={styles.privacyText}>
          Only intentionally published observations appear here. Approximate and regional
          coordinates do not represent the contributor&apos;s exact saved location.
        </Text>
      </View>

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {observations.length} published observation
        {observations.length === 1 ? "" : "s"}
      </Text>
      {!observations.length ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>
            This study does not have published observations yet.
          </Text>
        </View>
      ) : (
        observations.map((observation) => {
          const location = observation.location as any;
          return (
            <View key={String(observation.id || observation._id)} style={styles.card}>
              <Text style={styles.cardTitle}>{observationName(observation)}</Text>
              {observation.identity?.scientificName ? (
                <Text style={styles.scientificName}>
                  {observation.identity.scientificName}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {observation.identity?.verificationStatus || "ai_candidate"} ·{" "}
                {observation.identity?.confidence || "unknown"} confidence
              </Text>
              <Text style={styles.meta}>
                {String(observation.observationContext?.habitat || "Habitat not shared")}
                {location?.precision ? ` · ${location.precision} location` : ""}
              </Text>
              {observation.notes ? (
                <Text style={styles.description}>{observation.notes}</Text>
              ) : null}
              {(observation.identity?.evidence || []).length ? (
                <Text style={styles.evidence}>
                  Evidence: {observation.identity?.evidence?.join("; ")}
                </Text>
              ) : null}
              {(observation.identity?.counterEvidence || []).length ? (
                <Text style={styles.counterEvidence}>
                  Counter-evidence: {observation.identity?.counterEvidence?.join("; ")}
                </Text>
              ) : null}
              {(observation.identity?.missingEvidence || []).length ? (
                <Text style={styles.missing}>
                  More evidence requested:{" "}
                  {observation.identity?.missingEvidence?.join("; ")}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { gap: 13, padding: 20, paddingBottom: 56 },
  centered: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24
  },
  link: { color: "#166534", fontWeight: "800" },
  title: { color: "#0F172A", fontSize: 29, fontWeight: "800" },
  sectionTitle: { color: "#0F172A", fontSize: 20, fontWeight: "800", marginTop: 4 },
  meta: { color: "#64748B", lineHeight: 20, textTransform: "capitalize" },
  description: { color: "#334155", fontSize: 15, lineHeight: 22 },
  muted: { color: "#64748B", lineHeight: 20 },
  error: { color: "#B91C1C", lineHeight: 20, textAlign: "center" },
  privacy: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 5,
    padding: 14
  },
  privacyTitle: { color: "#1E3A8A", fontWeight: "800" },
  privacyText: { color: "#1E40AF", lineHeight: 20 },
  empty: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 16
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 5,
    padding: 15
  },
  cardTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  scientificName: { color: "#334155", fontStyle: "italic" },
  evidence: { color: "#166534", lineHeight: 20, marginTop: 4 },
  counterEvidence: { color: "#9A3412", lineHeight: 20 },
  missing: { color: "#92400E", lineHeight: 20 }
});
