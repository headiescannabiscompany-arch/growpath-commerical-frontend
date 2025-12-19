import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { generateSchedule } from "../api/feeding";

export default function FeedingScheduleOptions({ navigation, route }) {
  const { nutrientData } = route.params;
  const [medium, setMedium] = useState("Soil");
  const [strain, setStrain] = useState("Photoperiod");
  const [weeks, setWeeks] = useState("12");

  async function next() {
    try {
      const res = await generateSchedule({
        nutrientData,
        growMedium: medium,
        strainType: strain,
        experience: "Intermediate",
        weeks: Number(weeks),
      });
      const payload = res?.data ?? res;
      if (!payload?.schedule) {
        throw new Error("Schedule unavailable");
      }
      navigation.navigate("FeedingScheduleResult", {
        schedule: payload.schedule,
        nutrientData,
      });
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to generate schedule");
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>Setup Feeding Plan</Text>

      <Text style={styles.label}>Grow Medium</Text>
      <TextInput style={styles.in} value={medium} onChangeText={setMedium} />

      <Text style={styles.label}>Strain Type</Text>
      <TextInput style={styles.in} value={strain} onChangeText={setStrain} />

      <Text style={styles.label}>Total Weeks</Text>
      <TextInput style={styles.in} keyboardType="numeric" value={weeks} onChangeText={setWeeks} />

      <TouchableOpacity style={styles.nextBtn} onPress={next}>
        <Text style={styles.nextText}>Generate Plan</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700" },
  label: { marginTop: 16, fontWeight: "700" },
  in: { backgroundColor: "#eee", padding: 10, borderRadius: 8, marginTop: 6 },
  nextBtn: { backgroundColor: "#2ecc71", padding: 14, marginTop: 20, borderRadius: 8 },
  nextText: { color: "white", textAlign: "center", fontWeight: "700" },
});
