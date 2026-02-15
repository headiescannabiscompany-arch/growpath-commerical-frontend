import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TasksTodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks Today</Text>
      <Text style={styles.body}>Temporarily stubbed (legacy undefined Alert).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { opacity: 0.8 }
});
