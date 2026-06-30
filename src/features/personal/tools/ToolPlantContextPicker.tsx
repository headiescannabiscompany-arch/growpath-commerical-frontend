import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { listPersonalPlants, type PersonalPlant } from "@/api/plants";

export function buildToolPlantContext(plant?: PersonalPlant | null) {
  if (!plant) return null;
  return {
    id: String(plant.id || (plant as any)._id || ""),
    name: plant.name || "",
    cropCommonName: plant.cropCommonName || "",
    scientificName: plant.scientificName || "",
    cultivarOrStrain: plant.cultivar || plant.strain || "",
    cropProfileId: plant.cropProfileId || null,
    stage: plant.stage || plant.status || "",
    medium: plant.medium || "",
    growthProfile: plant.growthProfile || null
  };
}

export function useToolPlantContext(growId?: string, initialPlantId = "") {
  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [plantId, setPlantId] = useState(initialPlantId);

  useEffect(() => {
    if (!growId) {
      setPlants([]);
      return;
    }
    listPersonalPlants({ growId })
      .then(setPlants)
      .catch(() => setPlants([]));
  }, [growId]);

  const selectedPlant = useMemo(
    () => plants.find((plant) => String(plant.id || (plant as any)._id) === plantId),
    [plantId, plants]
  );
  const selectedPlantContext = useMemo(
    () => buildToolPlantContext(selectedPlant),
    [selectedPlant]
  );
  const toolRunContext = useMemo(
    () => ({
      plantId: plantId || undefined,
      cropProfileId: selectedPlant?.cropProfileId || undefined,
      cropIdentity: selectedPlantContext || undefined,
      selectedPlantContext: selectedPlantContext || undefined,
      plantGrowthProfile: selectedPlant?.growthProfile || undefined
    }),
    [plantId, selectedPlant, selectedPlantContext]
  );

  return {
    plants,
    plantId,
    setPlantId,
    selectedPlant,
    selectedPlantContext,
    toolRunContext
  };
}

export function ToolPlantContextPicker({
  plants,
  plantId,
  selectedPlant,
  onSelect
}: {
  plants: PersonalPlant[];
  plantId: string;
  selectedPlant?: PersonalPlant;
  onSelect: (plantId: string) => void;
}) {
  if (!plants.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Plant context</Text>
      <Text style={styles.subtitle}>
        Tool runs save the selected plant, crop, cultivar, size, pheno, and timing context
        when available.
      </Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.pill, !plantId && styles.pillOn]}
          onPress={() => onSelect("")}
          accessibilityRole="button"
          accessibilityLabel="Run tool for whole grow"
        >
          <Text style={[styles.pillText, !plantId && styles.pillTextOn]}>Whole grow</Text>
        </Pressable>
        {plants.map((plant, index) => {
          const id = String(plant.id || (plant as any)._id || `plant-${index}`);
          return (
            <Pressable
              key={id}
              style={[styles.pill, plantId === id && styles.pillOn]}
              onPress={() => onSelect(id)}
              accessibilityRole="button"
              accessibilityLabel={`Run tool for ${plant.name || `Plant ${index + 1}`}`}
            >
              <Text style={[styles.pillText, plantId === id && styles.pillTextOn]}>
                {plant.name || `Plant ${index + 1}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selectedPlant ? (
        <Text style={styles.context}>
          {[
            selectedPlant.cropCommonName || selectedPlant.scientificName,
            selectedPlant.cultivar || selectedPlant.strain,
            selectedPlant.growthProfile?.phenoLabel
              ? `pheno: ${selectedPlant.growthProfile.phenoLabel}`
              : ""
          ]
            .filter(Boolean)
            .join(" | ")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 7 },
  label: { color: "#334155", fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 13, lineHeight: 19 },
  context: { color: "#166534", fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  pillOn: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  pillText: { fontWeight: "800" },
  pillTextOn: { color: "#FFFFFF" }
});
