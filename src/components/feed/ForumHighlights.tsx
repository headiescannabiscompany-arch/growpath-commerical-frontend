import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ForumThreadCard from "@/components/feed/ForumThreadCard";

const THREADS = [
  {
    title: "Best VPD targets for late flower?",
    meta: "32 replies · 2h ago"
  },
  {
    title: "Nutrient burn vs light stress — quick visual guide",
    meta: "18 replies · 5h ago"
  },
  {
    title: "DIY drying tent airflow setup",
    meta: "11 replies · 1d ago"
  }
];

export default function ForumHighlights() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forum Highlights</Text>
      <View style={styles.stack}>
        {THREADS.map((thread) => (
          <ForumThreadCard key={thread.title} title={thread.title} meta={thread.meta} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A"
  },
  stack: {
    gap: 12
  }
});
