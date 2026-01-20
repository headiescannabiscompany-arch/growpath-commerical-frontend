import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import AppShell from "../components/AppShell.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { saveToolUsage } from "../../toolUsageApi.js";

export default function HarvestEstimatorScreen() {
  const { user } = useAuth();
  const [plantType, setPlantType] = useState("");
  const [daysToHarvest, setDaysToHarvest] = useState(90);
  const [plantDate, setPlantDate] = useState("");
  const [harvestDate, setHarvestDate] = useState(null);

  async function handleEstimate() {
    if (!plantDate) return;
    const planted = new Date(plantDate);
    if (isNaN(planted.getTime())) {
      setHarvestDate("Invalid date");
      return;
    }
    const harvest = new Date(planted);
    harvest.setDate(harvest.getDate() + Number(daysToHarvest));
    const result = harvest.toDateString();
    setHarvestDate(result);
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "HarvestEstimator",
        input: { plantType, daysToHarvest, plantDate },
        output: { result }
      });
    } catch (err) {
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <AppShell style={undefined} contentContainerStyle={undefined}>
      <Card style={styles.card}>
        <Text style={styles.title}>Harvest Estimator</Text>
        <Text style={styles.label}>Plant Type (optional)</Text>
        <TextInput
          style={styles.input}
          value={plantType}
          onChangeText={setPlantType}
          placeholder="e.g. Tomato, Basil"
        />
        <Text style={styles.label}>Days to Harvest</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(daysToHarvest)}
          onChangeText={(text) => setDaysToHarvest(Number(text))}
        />
        <Text style={styles.label}>Planting Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={plantDate}
          onChangeText={setPlantDate}
          placeholder="2026-01-17"
        />
        <TouchableOpacity style={styles.button} onPress={handleEstimate}>
          <Text style={styles.buttonText}>Estimate Harvest Date</Text>
        </TouchableOpacity>
        {harvestDate && (
          <Text style={styles.result}>Estimated Harvest: {harvestDate}</Text>
        )}
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing(2),
    padding: spacing(3),
    alignItems: "stretch"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: spacing(2),
    color: colors.primary
  },
  label: {
    fontSize: 16,
    marginTop: spacing(2),
    color: colors.textSecondary
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing(1),
    fontSize: 16,
    marginTop: spacing(0.5)
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing(2),
    marginTop: spacing(3),
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  result: {
    marginTop: spacing(3),
    fontSize: 18,
    fontWeight: "bold",
    color: colors.success
  }
});
