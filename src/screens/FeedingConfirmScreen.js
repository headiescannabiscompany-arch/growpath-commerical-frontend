import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";

export default function FeedingConfirmScreen({ route, navigation }) {
  const { nutrientData } = route.params;

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Confirm Nutrient Data</Text>

      <Text style={styles.label}>Product:</Text>
      <Text>{nutrientData.productName}</Text>

      <Text style={styles.label}>NPK:</Text>
      <Text>{nutrientData.npk.n}-{nutrientData.npk.p}-{nutrientData.npk.k}</Text>

      <Text style={styles.label}>Micros:</Text>
      {Object.entries(nutrientData.micros).map(([k, v]) => (
        <Text key={k}>{k}: {v}</Text>
      ))}

      <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.navigate("FeedingScheduleOptions", { nutrientData })}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: "700", marginBottom: 10 },
  label: { marginTop: 16, fontWeight: "700" },
  nextBtn: { backgroundColor: "#2ecc71", padding: 14, marginTop: 20, borderRadius: 8 },
  nextText: { color: "white", textAlign: "center", fontWeight: "700" },
});
