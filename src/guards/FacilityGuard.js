import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFacility } from "../context/FacilityContext";

export default function FacilityGuard({ children }) {
  const { selectedId } = useFacility();

  if (!selectedId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select a Facility</Text>
        <Text style={styles.body}>No facility selected yet.</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { opacity: 0.8 }
});
