import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TemplateDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Template Detail</Text>
      <Text style={styles.body}>Temporarily stubbed (legacy FeatureGate undefined).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { opacity: 0.8 }
});
