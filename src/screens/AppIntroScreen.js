import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function AppIntroScreen({ onDone }) {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Grow with intention.</Text>
      <Text style={styles.body}>
        GrowPath is designed to help you observe, plan, and learn from your grow — not to
        automate it.{"\n\n"}
        You stay in control. The app helps you think clearly.
      </Text>
      <Text style={styles.footer}>Built by growers. Used with judgment.</Text>
      <TouchableOpacity style={styles.button} onPress={onDone}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#fff"
  },
  headline: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 24,
    textAlign: "center"
  },
  body: {
    fontSize: 18,
    color: "#222",
    marginBottom: 32,
    textAlign: "center"
  },
  footer: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 32
  },
  button: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18
  }
});
