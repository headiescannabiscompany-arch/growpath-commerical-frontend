import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import AppShell from "../components/AppShell.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { saveToolUsage } from "../../toolUsageApi.js";

export default function LightCalculatorScreen() {
  const { user } = useAuth();
  const [area, setArea] = useState(1);
  const [ppfd, setPpfd] = useState(400);
  const [hours, setHours] = useState(16);
  const [dli, setDli] = useState(null);

  function calculateDLI(ppfd, hours) {
    // DLI = PPFD (μmol/m²/s) * 3600 * hours / 1,000,000
    return ((ppfd * 3600 * hours) / 1000000).toFixed(2);
  }

  async function handleCalculate() {
    const dli = calculateDLI(Number(ppfd), Number(hours));
    setDli(dli);
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "LightCalculator",
        input: { area, ppfd, hours },
        output: { dli }
      });
    } catch (err) {
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <AppShell style={undefined} contentContainerStyle={undefined}>
      <Card style={styles.card}>
        <Text style={styles.title}>Light Calculator</Text>
        <Text style={styles.label}>Grow Area (m²)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(area)}
          onChangeText={(text) => setArea(Number(text))}
        />
        <Text style={styles.label}>PPFD (μmol/m²/s)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(ppfd)}
          onChangeText={(text) => setPpfd(Number(text))}
        />
        <Text style={styles.label}>Light Hours per Day</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(hours)}
          onChangeText={(text) => setHours(Number(text))}
        />
        <TouchableOpacity style={styles.button} onPress={handleCalculate}>
          <Text style={styles.buttonText}>Calculate DLI</Text>
        </TouchableOpacity>
        {dli !== null && <Text style={styles.result}>DLI: {dli} mol/m²/day</Text>}
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
