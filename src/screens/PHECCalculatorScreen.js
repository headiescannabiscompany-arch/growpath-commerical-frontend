import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import AppShell from "../components/AppShell.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { saveToolUsage } from "../../toolUsageApi.js";

export default function PHECCalculatorScreen() {
  const { user } = useAuth();
  const [ph, setPh] = useState(6.0);
  const [ec, setEc] = useState(1.2);
  const [targetPh, setTargetPh] = useState(6.0);
  const [phAdjustment, setPhAdjustment] = useState(null);

  async function handleCalculate() {
    // Simple example: show difference to target pH
    const adjustment = (Number(targetPh) - Number(ph)).toFixed(2);
    setPhAdjustment(adjustment);
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "PHECCalculator",
        input: { ph, ec, targetPh },
        output: { adjustment }
      });
    } catch (err) {
      // Optionally handle error (e.g., show a message)
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <AppShell style={undefined} contentContainerStyle={undefined}>
      <Card style={styles.card}>
        <Text style={styles.title}>pH/EC Calculator</Text>
        <Text style={styles.label}>Current pH</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(ph)}
          onChangeText={(text) => setPh(Number(text))}
        />
        <Text style={styles.label}>Current EC</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(ec)}
          onChangeText={(text) => setEc(Number(text))}
        />
        <Text style={styles.label}>Target pH</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(targetPh)}
          onChangeText={(text) => setTargetPh(Number(text))}
        />
        <TouchableOpacity style={styles.button} onPress={handleCalculate}>
          <Text style={styles.buttonText}>Calculate pH Adjustment</Text>
        </TouchableOpacity>
        {phAdjustment !== null && (
          <Text style={styles.result}>Adjustment Needed: {phAdjustment}</Text>
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
