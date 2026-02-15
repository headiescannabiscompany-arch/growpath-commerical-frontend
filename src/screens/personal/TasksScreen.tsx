import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Tasks</Text>
      <Text style={styles.body}>
        Temporarily stubbed to unblock bundling/ESLint. Re-implement after lint is stable.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { opacity: 0.8 }
});
