import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { saveToolUsage } from "../../toolUsageApi.js";

export default function ScheduleCalculatorScreen() {
  const { user } = useAuth();
  const [plantType, setPlantType] = useState("");
  const [days, setDays] = useState(3);
  const [lastWatered, setLastWatered] = useState("");
  const [nextWater, setNextWater] = useState(null);

  async function handleCalculate() {
    if (!lastWatered) return;
    const last = new Date(lastWatered);
    if (isNaN(last.getTime())) return setNextWater("Invalid date");
    const next = new Date(last);
    next.setDate(last.getDate() + Number(days));
    const result = next.toDateString();
    setNextWater(result);
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "ScheduleCalculator",
        input: { plantType, days, lastWatered },
        output: { result }
      });
    } catch (err) {
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <Text style={styles.title}>Schedule Calculator</Text>
        <Text style={styles.label}>Plant Type (optional)</Text>
        <TextInput
          style={styles.input}
          value={plantType}
          onChangeText={setPlantType}
          placeholder="e.g. Tomato, Basil"
        />
        <Text style={styles.label}>Days Between Events</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(days)}
          onChangeText={(text) => setDays(Number(text))}
        />
        <Text style={styles.label}>Last Event Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={lastWatered}
          onChangeText={setLastWatered}
          placeholder="2026-01-17"
        />
        <TouchableOpacity style={styles.button} onPress={handleCalculate}>
          <Text style={styles.buttonText}>Calculate Next Event</Text>
        </TouchableOpacity>
        {nextWater && <Text style={styles.result}>Next Event: {nextWater}</Text>}
      </Card>
    </ScreenContainer>
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
