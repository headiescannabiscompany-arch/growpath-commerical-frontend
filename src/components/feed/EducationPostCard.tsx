import React from "react";
import { Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import AppCard from "@/components/layout/AppCard";

type EducationPostCardProps = {
  title: string;
  body: string;
  cta: string;
};

export default function EducationPostCard({ title, body, cta }: EducationPostCardProps) {
  return (
    <AppCard>
      <Text style={styles.label}>Education</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Link href="/courses" style={styles.link}>
        {cta} →
      </Link>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 6
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  body: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 10
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB"
  }
});
