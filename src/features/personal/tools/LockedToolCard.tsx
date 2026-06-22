import React from "react";
import { Href, Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

type LockedToolCardProps = {
  title: string;
  capability: string;
  description?: string;
  upgradeHref?: string;
};

export default function LockedToolCard({
  title,
  capability,
  description = "Upgrade or enable this capability to use the tool.",
  upgradeHref = "/subscribe"
}: LockedToolCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Locked</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.capability}>Required capability: {capability}</Text>
      <Link href={upgradeHref as Href} style={styles.link} asChild>
        <Text>View upgrade options</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FEF2F2",
    gap: 7
  },
  eyebrow: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 17, fontWeight: "800" },
  description: { color: "#475569", lineHeight: 20 },
  capability: { color: "#991B1B", fontSize: 12, fontWeight: "700" },
  link: { color: "#166534", fontWeight: "800", marginTop: 4 }
});
