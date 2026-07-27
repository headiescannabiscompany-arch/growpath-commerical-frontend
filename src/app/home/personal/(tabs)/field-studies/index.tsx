import { useFocusEffect } from "@react-navigation/native";
import { Link } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { createFieldStudy, FieldStudy, listFieldStudies } from "@/api/fieldStudies";
import { radius } from "@/theme/theme";

export default function FieldStudiesScreen() {
  const [studies, setStudies] = useState<FieldStudy[]>([]);
  const [title, setTitle] = useState("");
  const [regionLabel, setRegionLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStudies(await listFieldStudies());
    } catch (loadError: any) {
      setError(loadError?.message || "Field Studies could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const create = useCallback(async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle || creating) return;
    setCreating(true);
    setError("");
    try {
      const study = await createFieldStudy({
        title: cleanTitle,
        regionLabel: regionLabel.trim(),
        purpose: "biodiversity_survey",
        visibility: "private",
        defaultLocationPrivacy: "private",
        obscureSensitiveSpecies: true
      });
      setStudies((current) => [study, ...current]);
      setTitle("");
      setRegionLabel("");
    } catch (createError: any) {
      setError(createError?.message || "Field Study could not be created.");
    } finally {
      setCreating(false);
    }
  }, [creating, regionLabel, title]);

  return (
    <ScrollView
      testID="screen-field-studies"
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text accessibilityRole="header" style={styles.title}>
        Field Studies
      </Text>
      <Text style={styles.subtitle}>
        Coordinate a botanical survey, record plant identity and health, and invite
        editors, verifiers, or viewers. A study starts private.
      </Text>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Public viewing is not public editing</Text>
        <Text style={styles.noticeText}>
          Only the owner and invited editors can change observations. Exact locations
          remain private unless you explicitly publish them. Sensitive species are
          automatically reduced to an approximate area.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Start a Field Study</Text>
        <TextInput
          accessibilityLabel="Field Study title"
          onChangeText={setTitle}
          placeholder="Example: Patapsco roadside plant survey"
          style={styles.input}
          value={title}
        />
        <TextInput
          accessibilityLabel="Field Study region"
          onChangeText={setRegionLabel}
          placeholder="General region (optional)"
          style={styles.input}
          value={regionLabel}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!title.trim() || creating}
          onPress={() => void create()}
          style={({ pressed }) => [
            styles.primaryButton,
            (!title.trim() || creating) && styles.disabled,
            pressed && styles.pressed
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {creating ? "Creating..." : "Create Private Study"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Your studies
        </Text>
        <Link href="/field-observations" asChild>
          <Pressable accessibilityRole="link">
            <Text style={styles.textLink}>Open public map</Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator />
          <Text style={styles.statusText}>Loading Field Studies...</Text>
        </View>
      ) : error && !studies.length ? (
        <View style={styles.status}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : !studies.length ? (
        <View style={styles.status}>
          <Text style={styles.statusTitle}>No Field Studies yet</Text>
          <Text style={styles.statusText}>
            Create one above, then add a Plant ID result as the first observation.
          </Text>
        </View>
      ) : (
        studies.map((study) => {
          const id = String(study.id || study._id || "");
          return (
            <Link key={id} href={`/home/personal/field-studies/${id}`} asChild>
              <Pressable style={styles.studyCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.studyTitle}>{study.title}</Text>
                  <Text style={styles.badge}>{study.visibility}</Text>
                </View>
                <Text style={styles.studyMeta}>
                  {study.regionLabel || "Region not set"} · {study.accessRole}
                </Text>
                <Text style={styles.cardLink}>Open study →</Text>
              </Pressable>
            </Link>
          );
        })
      )}
      {error && studies.length ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  title: { color: "#0F172A", fontSize: 27, fontWeight: "800" },
  subtitle: { color: "#475569", fontSize: 15, lineHeight: 22 },
  notice: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14
  },
  noticeTitle: { color: "#065F46", fontSize: 15, fontWeight: "800" },
  noticeText: { color: "#166534", lineHeight: 20, marginTop: 5 },
  panel: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 16
  },
  panelTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  sectionTitle: { color: "#0F172A", fontSize: 19, fontWeight: "800" },
  textLink: { color: "#166534", fontWeight: "800" },
  status: {
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  statusTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  statusText: { color: "#64748B", lineHeight: 20 },
  errorText: { color: "#B91C1C", lineHeight: 20 },
  secondaryButton: {
    borderColor: "#94A3B8",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  secondaryButtonText: { color: "#0F172A", fontWeight: "700" },
  studyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    padding: 15
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  studyTitle: { color: "#0F172A", flex: 1, fontSize: 17, fontWeight: "800" },
  badge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  studyMeta: { color: "#64748B", fontSize: 13, textTransform: "capitalize" },
  cardLink: { color: "#166534", fontWeight: "800", marginTop: 4 }
});
