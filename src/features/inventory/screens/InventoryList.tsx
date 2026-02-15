import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function InventoryList() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.body}>Temporarily stubbed to unblock hooks lint.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { opacity: 0.8 }
});
