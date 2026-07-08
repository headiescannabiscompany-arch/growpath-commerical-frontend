import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useEntitlements } from "@/entitlements";
import { useCreatePlant, usePlants, useUpdatePlant } from "../../plants/hooks";

function param(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function plantId(plant: any) {
  return String(plant?.id || plant?._id || plant?.plantId || "");
}

function plantName(plant: any) {
  return String(plant?.name || plant?.tag || plantId(plant) || "Plant");
}

export default function AssignPlantsToGrow() {
  const router = useRouter();
  const entitlements = useEntitlements();
  const params = useLocalSearchParams<{
    facilityId?: string | string[];
    growId?: string | string[];
  }>();
  const growId = param(params.growId);
  const facilityId = param(params.facilityId) || entitlements.facilityId || null;
  const { data: plants, isLoading, refetch } = usePlants(facilityId);
  const createPlant = useCreatePlant(facilityId);
  const updatePlant = useUpdatePlant(undefined, facilityId);

  const [selected, setSelected] = useState<string[]>([]);
  const [plantDraft, setPlantDraft] = useState("");
  const [feedback, setFeedback] = useState("");

  const available = useMemo(
    () =>
      Array.isArray(plants)
        ? plants.filter((plant: any) => !plant.growId && plantId(plant))
        : [],
    [plants]
  );
  const canAssign = selected.length > 0 && !updatePlant.isPending;
  const canCreate = plantDraft.trim().length > 1 && !createPlant.isPending;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
    setFeedback("");
  }

  async function quickAddPlant() {
    if (!canCreate) return;
    setFeedback("");
    try {
      const created: any = await createPlant.mutateAsync({
        name: plantDraft.trim(),
        stage: "Veg",
        growId: growId || undefined
      });
      const id = plantId(created?.plant || created?.created || created);
      if (id && !(created as any)?.growId) {
        setSelected((current) => [...new Set([...current, id])]);
      }
      setPlantDraft("");
      await refetch();
      setFeedback("Plant added to this grow.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to add plant.");
    }
  }

  async function assignSelected() {
    if (!canAssign || !growId) return;
    setFeedback("");
    try {
      await Promise.all(selected.map((id) => updatePlant.mutateAsync({ id, growId })));
      goToGrow();
    } catch (error: any) {
      setFeedback(error?.message || "Unable to assign selected plants.");
    }
  }

  function goToGrow() {
    if (!growId) {
      router.replace("/home/facility/grows");
      return;
    }
    router.replace({
      pathname: "/home/facility/grows/[id]",
      params: { id: growId }
    });
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Plants</Text>
        <Text style={styles.title}>Assign plants</Text>
        <Text style={styles.subtitle}>
          Link existing plants or quick-add plants so logs, tasks, and AI context attach
          to the new grow.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Quick add plant</Text>
        <View style={styles.inlineRow}>
          <TextInput
            style={styles.input}
            placeholder="Plant name or tag"
            placeholderTextColor="#64748b"
            value={plantDraft}
            onChangeText={(value) => {
              setPlantDraft(value);
              setFeedback("");
            }}
            returnKeyType="done"
            onSubmitEditing={quickAddPlant}
          />
          <Pressable
            onPress={quickAddPlant}
            disabled={!canCreate}
            accessibilityRole="button"
            accessibilityLabel="Add plant to grow"
            style={[styles.secondaryButton, !canCreate && styles.disabledButton]}
          >
            {createPlant.isPending ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.secondaryButtonText}>Add plant</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Unassigned plants</Text>
          <Text style={styles.helper}>{selected.length} selected</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.helper}>Loading plants...</Text>
          </View>
        ) : null}

        {!isLoading && available.length === 0 ? (
          <Text style={styles.emptyText}>
            No unassigned plants yet. Add one above or continue to the grow workspace.
          </Text>
        ) : null}

        <View style={styles.plantGrid}>
          {available.map((plant: any) => {
            const id = plantId(plant);
            const active = selected.includes(id);
            const name = plantName(plant);
            return (
              <Pressable
                key={id}
                onPress={() => toggle(id)}
                accessibilityRole="button"
                accessibilityLabel={`${active ? "Remove" : "Select"} plant ${name}`}
                style={[styles.plantChip, active && styles.plantChipActive]}
              >
                <Text
                  style={[styles.plantChipText, active && styles.plantChipTextActive]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            onPress={assignSelected}
            disabled={!canAssign || !growId}
            accessibilityRole="button"
            accessibilityLabel="Assign selected plants to grow"
            style={[
              styles.primaryButton,
              (!canAssign || !growId) && styles.disabledButton
            ]}
          >
            {updatePlant.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Assign selected</Text>
            )}
          </Pressable>
          <Pressable
            onPress={goToGrow}
            accessibilityRole="button"
            accessibilityLabel="Continue to grow"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Continue to grow</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#f8fafc", flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: 900,
    padding: 20,
    width: "100%"
  },
  header: { gap: 6, marginBottom: 16 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#111827", fontSize: 30, fontWeight: "900" },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#d7ddd2",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  label: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  inlineRow: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    flexGrow: 1,
    fontSize: 15,
    minWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  helper: { color: "#64748b", fontWeight: "700" },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  emptyText: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  plantGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  plantChip: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  plantChipActive: { backgroundColor: "#166534", borderColor: "#166534" },
  plantChipText: { color: "#334155", fontWeight: "900" },
  plantChipTextActive: { color: "#ffffff" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  secondaryButtonText: { color: "#111827", fontWeight: "900" },
  disabledButton: { opacity: 0.55 },
  feedback: { color: "#047857", fontWeight: "800" }
});
