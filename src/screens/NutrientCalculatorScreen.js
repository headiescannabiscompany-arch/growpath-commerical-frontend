import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { saveToolUsage } from "../../toolUsageApi.js";

export default function NutrientCalculatorScreen() {
  const { user } = useAuth();
  const [volume, setVolume] = useState(10); // liters
  const [strength, setStrength] = useState(1.0); // EC or multiplier
  const [gramsPerLiter, setGramsPerLiter] = useState(1.5); // default nutrient
  const [totalGrams, setTotalGrams] = useState(null);

  async function handleCalculate() {
    // Calculate total grams needed
    const total = (volume * strength * gramsPerLiter).toFixed(2);
    setTotalGrams(total);
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "NutrientCalculator",
        input: { volume, strength, gramsPerLiter },
        output: { total }
      });
    } catch (err) {
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <Text style={styles.title}>Nutrient Calculator</Text>
        <Text style={styles.label}>Water Volume (liters)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(volume)}
          onChangeText={(text) => setVolume(Number(text))}
        />
        <Text style={styles.label}>Nutrient Strength (EC or multiplier)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(strength)}
          onChangeText={(text) => setStrength(Number(text))}
        />
        <Text style={styles.label}>Grams per Liter</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(gramsPerLiter)}
          onChangeText={(text) => setGramsPerLiter(Number(text))}
        />
        <TouchableOpacity style={styles.button} onPress={handleCalculate}>
          <Text style={styles.buttonText}>Calculate</Text>
        </TouchableOpacity>
        {totalGrams !== null && (
          <Text style={styles.result}>Total Nutrients: {totalGrams} g</Text>
        )}
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
