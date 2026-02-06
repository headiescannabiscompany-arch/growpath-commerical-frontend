import React from "react";
import { Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import AppCard from "@/components/layout/AppCard";

type ForumThreadCardProps = {
  title: string;
  meta: string;
};

export default function ForumThreadCard({ title, meta }: ForumThreadCardProps) {
  return (
    <AppCard>
      <Text style={styles.label}>Forum</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{meta}</Text>
      <Link href="/forum" style={styles.link}>
        View thread →
      </Link>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 6
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  meta: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 10
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981"
  }
});
