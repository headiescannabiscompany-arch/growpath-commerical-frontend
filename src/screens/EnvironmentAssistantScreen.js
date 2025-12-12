import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { analyzeEnvironment } from "../api/environment";

export default function EnvironmentAssistantScreen() {
  const [stage, setStage] = useState("Veg");
  const [tempDayC, setTempDayC] = useState("");
  const [tempNightC, setTempNightC] = useState("");
  const [humidity, setHumidity] = useState("");
  const [vpd, setVpd] = useState("");
  const [ppfd, setPpfd] = useState("");
  const [dli, setDli] = useState("");
  const [co2, setCo2] = useState("");
  const [lightHours, setLightHours] = useState("18");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await analyzeEnvironment({
      stage,
      tempDayC: tempDayC ? Number(tempDayC) : null,
      tempNightC: tempNightC ? Number(tempNightC) : null,
      humidity: humidity ? Number(humidity) : null,
      vpd: vpd ? Number(vpd) : null,
      ppfd: ppfd ? Number(ppfd) : null,
      dli: dli ? Number(dli) : null,
      co2: co2 ? Number(co2) : null,
      lightHours: lightHours ? Number(lightHours) : null,
      strainType: "",
      medium: "",
    });
    setResult(res.data.env);
    setLoading(false);
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>AI Environment Optimizer</Text>
      <Text style={styles.sub}>Enter your current grow room values.</Text>

      <Text style={styles.label}>Stage (Seedling / Veg / Early Flower / Mid Flower / Late Flower / Dry)</Text>
      <TextInput style={styles.input} value={stage} onChangeText={setStage} />

      <Text style={styles.label}>Day Temp (°C)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={tempDayC} onChangeText={setTempDayC} />

      <Text style={styles.label}>Night Temp (°C)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={tempNightC} onChangeText={setTempNightC} />

      <Text style={styles.label}>Humidity (%)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={humidity} onChangeText={setHumidity} />

      <Text style={styles.label}>VPD (kPa, optional)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={vpd} onChangeText={setVpd} />

      <Text style={styles.label}>PPFD (µmol/m²/s, optional)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={ppfd} onChangeText={setPpfd} />

      <Text style={styles.label}>DLI (mol/m²/day, optional)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={dli} onChangeText={setDli} />

      <Text style={styles.label}>CO₂ (ppm, optional)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={co2} onChangeText={setCo2} />

      <Text style={styles.label}>Light Hours (per day)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={lightHours} onChangeText={setLightHours} />

      <TouchableOpacity style={styles.btn} onPress={run}>
        <Text style={styles.btnText}>{loading ? "Checking..." : "Analyze Environment"}</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.section}>Target Ranges</Text>
          <Text>Day: {result.targets.tempDayC}°C</Text>
          <Text>Night: {result.targets.tempNightC}°C</Text>
          <Text>RH: {result.targets.humidityMin}–{result.targets.humidityMax}%</Text>
          <Text>VPD Ideal: {result.targets.vpdIdeal} kPa</Text>
          <Text>PPFD: {result.targets.ppfdMin}–{result.targets.ppfdMax}</Text>
          <Text>DLI: {result.targets.dliMin}–{result.targets.dliMax}</Text>
          <Text>CO₂ Ideal: {result.targets.co2Ideal} ppm</Text>

          <Text style={styles.section}>Current Assessment</Text>
          <Text>Status: {result.currentAssessment.status}</Text>
          {result.currentAssessment.issues.map((i, idx) => (
            <Text key={idx}>• {i}</Text>
          ))}
          {result.currentAssessment.riskFlags.map((r, idx) => (
            <Text key={idx}>⚠️ {r}</Text>
          ))}

          <Text style={styles.section}>Recommended Actions</Text>
          {result.recommendations.actions.map((a, idx) => (
            <View key={idx} style={styles.actionCard}>
              <Text style={styles.actionTitle}>{a.title}</Text>
              <Text>{a.details}</Text>
              <Text style={styles.actionPriority}>Priority: {a.priority}</Text>
            </View>
          ))}

          {result.notes ? (
            <>
              <Text style={styles.section}>Notes</Text>
              <Text>{result.notes}</Text>
            </>
          ) : null}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700" },
  sub: { color: "#777", marginBottom: 16 },
  label: { marginTop: 12, fontWeight: "700" },
  input: { backgroundColor: "#eee", padding: 10, borderRadius: 8, marginTop: 4 },
  btn: { backgroundColor: "#2ecc71", padding: 14, borderRadius: 8, marginTop: 20 },
  btnText: { color: "white", fontWeight: "700", textAlign: "center" },
  resultCard: { backgroundColor: "white", padding: 14, borderRadius: 10, marginTop: 20 },
  section: { fontSize: 18, fontWeight: "700", marginTop: 10, marginBottom: 4 },
  actionCard: { backgroundColor: "#f3f3f3", padding: 10, borderRadius: 8, marginTop: 6 },
  actionTitle: { fontWeight: "700" },
  actionPriority: { fontSize: 12, color: "#555", marginTop: 2 },
});
