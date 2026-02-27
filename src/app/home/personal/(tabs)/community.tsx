import React from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#475569", marginBottom: 16 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardText: { fontSize: 14, color: "#475569", marginBottom: 10 },
  cta: { color: "#166534", fontWeight: "700" }
});

export default function CommunityTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.subtitle}>
        Learn from courses and connect with growers in the forum.
      </Text>

      <Link href="/home/personal/courses" asChild>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitle}>Learn</Text>
          <Text style={styles.cardText}>Browse creator courses and learning tracks.</Text>
          <Text style={styles.cta}>Open Courses -></Text>
        </Pressable>
      </Link>

      <Link href="/home/personal/forum" asChild>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitle}>Forum</Text>
          <Text style={styles.cardText}>
            Discuss grows, trade notes, and share progress with the community.
          </Text>
          <Text style={styles.cta}>Open Forum -></Text>
        </Pressable>
      </Link>
    </View>
  );
}
