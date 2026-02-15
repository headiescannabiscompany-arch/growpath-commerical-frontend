import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CommercialProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Commercial Profile</Text>
      <Text style={styles.body}>Temporarily stubbed (legacy children-prop pattern).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { opacity: 0.8 }
});
