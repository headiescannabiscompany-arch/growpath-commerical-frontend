import React from "react";
import { View, Text, StyleSheet } from "react-native";

type PlannedScreenProps = {
  title?: string;
  message?: string;
};

export function PlannedScreen({
  title = "Planned",
  message = "This area is planned for a future release."
}: PlannedScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc"
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    color: "#0f172a"
  },
  message: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center"
  }
});
