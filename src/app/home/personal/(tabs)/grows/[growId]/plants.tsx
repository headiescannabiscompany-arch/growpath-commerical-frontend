import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  createPersonalPlant,
  listPersonalPlants,
  type PersonalPlant
} from "@/api/plants";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, getRowId } from "@/features/grows/routeUtils";

export default function GrowPlantsScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cultivar, setCultivar] = useState("");
  const [medium, setMedium] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!growId) {
      setPlants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPlants(await listPersonalPlants({ growId }));
    } catch {
      setPlants([]);
      setFeedback("Unable to load plants.");
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function create() {
    if (!growId || creating || !name.trim()) return;
    setCreating(true);
    setFeedback("");
    const created = await createPersonalPlant({
      growId,
      name: name.trim(),
      cultivar: cultivar.trim() || undefined,
      strain: cultivar.trim() || undefined,
      medium: medium.trim() || undefined,
      stage: "seedling"
    });
    if (created) {
      setName("");
      setCultivar("");
      setMedium("");
      setShowForm(false);
      setFeedback("Plant added to this grow.");
      await load();
    } else {
      setFeedback("Unable to create plant.");
    }
    setCreating(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Plants</Text>
      <Text style={styles.subtitle}>Plants tracked inside this grow.</Text>
      <GrowWorkspaceNav growId={growId} active="plants" />

      <Pressable
        style={styles.primaryButton}
        onPress={() => setShowForm((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={showForm ? "Cancel adding plant" : "Add plant"}
      >
        <Text style={styles.primaryButtonText}>
          {showForm ? "Cancel" : "+ Add Plant"}
        </Text>
      </Pressable>

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.label}>Plant name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Plant 1"
            accessibilityLabel="Plant name"
          />
          <Text style={styles.label}>Cultivar / strain</Text>
          <TextInput
            style={styles.input}
            value={cultivar}
            onChangeText={setCultivar}
            placeholder="Optional"
            accessibilityLabel="Cultivar or strain"
          />
          <Text style={styles.label}>Medium</Text>
          <TextInput
            style={styles.input}
            value={medium}
            onChangeText={setMedium}
            placeholder="Soil, coco, hydro..."
            accessibilityLabel="Plant medium"
          />
          <Pressable
            style={[styles.primaryButton, (!name.trim() || creating) && styles.disabled]}
            disabled={!name.trim() || creating}
            onPress={create}
            accessibilityRole="button"
            accessibilityLabel="Add plant to grow"
          >
            <Text style={styles.primaryButtonText}>
              {creating ? "Adding..." : "Add to Grow"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {loading ? (
        <ActivityIndicator />
      ) : plants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.cardTitle}>No plants yet</Text>
          <Text style={styles.subtitle}>
            Add the first plant to start plant-level tracking.
          </Text>
        </View>
      ) : (
        plants.map((plant, index) => (
          <View key={getRowId(plant) || `plant-${index}`} style={styles.card}>
            <Text style={styles.cardTitle}>{plant.name || "Untitled plant"}</Text>
            <Text style={styles.subtitle}>
              {plant.cultivar || plant.strain || "Unknown cultivar"} -{" "}
              {plant.stage || plant.status || "stage not set"}
            </Text>
            {plant.medium ? (
              <Text style={styles.meta}>Medium: {plant.medium}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#64748B", lineHeight: 19 },
  form: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8
  },
  label: { color: "#334155", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    padding: 10
  },
  primaryButton: {
    alignSelf: "flex-start",
    borderRadius: 9,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  feedback: { color: "#334155", fontWeight: "700" },
  empty: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 5
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 4
  },
  cardTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  meta: { color: "#475569", fontSize: 12 }
});
