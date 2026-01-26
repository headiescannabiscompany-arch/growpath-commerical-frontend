import React, { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { saveToolUsage } from "../../toolUsageApi.js";

export default function VPDCalculatorScreen() {
  const { user } = useAuth();
  const [temperature, setTemperature] = useState(25);
  const [humidity, setHumidity] = useState(60);
  const [vpd, setVpd] = useState(null);

  function calculateVPD(temp, rh) {
    // VPD formula (kPa):
    // es = 0.6108 * exp((17.27 * T) / (T + 237.3))
    // ea = es * (RH / 100)
    // VPD = es - ea
    const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const ea = es * (rh / 100);
    return (es - ea).toFixed(2);
  }

  async function handleCalculate() {
    const vpdValue = calculateVPD(Number(temperature), Number(humidity));
    setVpd(vpdValue);
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "VPDCalculator",
        input: { temperature, humidity },
        output: { vpd: vpdValue }
      });
    } catch (err) {
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <Text style={styles.title}>VPD Calculator</Text>
        <Text style={styles.label}>Temperature (°C)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(temperature)}
          onChangeText={(text) => setTemperature(Number(text))}
        />
        <Text style={styles.label}>Relative Humidity (%)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(humidity)}
          onChangeText={(text) => setHumidity(Number(text))}
        />
        <TouchableOpacity style={styles.button} onPress={handleCalculate}>
          <Text style={styles.buttonText}>Calculate VPD</Text>
        </TouchableOpacity>
        {vpd !== null && <Text style={styles.result}>VPD: {vpd} kPa</Text>}
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
