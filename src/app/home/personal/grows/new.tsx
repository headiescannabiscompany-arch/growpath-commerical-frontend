import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12
  },
  cta: {
    marginTop: 20,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700"
  }
});

export default function NewGrowScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Grow</Text>

      <Text style={styles.label}>Grow Name</Text>
      <TextInput placeholder="My first grow" style={styles.input} />

      <Text style={styles.label}>Start Date</Text>
      <TextInput placeholder="YYYY-MM-DD" style={styles.input} />

      <Pressable style={styles.cta} onPress={() => router.back()}>
        <Text style={styles.ctaText}>Create Grow</Text>
      </Pressable>
    </View>
  );
}
