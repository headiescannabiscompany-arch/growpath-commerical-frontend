import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B"
  },
  emptyState: {
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B"
  },
  cta: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "#16A34A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700"
  },
  listItem: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  listMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B"
  }
});

export default function GrowsListScreen() {
  const hasGrows = false;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grows</Text>
        <Text style={styles.subtitle}>Manage your grows and track progress.</Text>
      </View>

      {hasGrows ? (
        <Link href="/home/personal/grows/seedling-1" asChild>
          <Pressable style={styles.listItem}>
            <Text style={styles.listTitle}>Spring Grow</Text>
            <Text style={styles.listMeta}>2 plants · Started Jan 12</Text>
          </Pressable>
        </Link>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No grows yet</Text>
          <Text style={styles.emptyText}>
            Create your first grow to start tracking plants.
          </Text>
          <Link href="/home/personal/grows/new" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>+ New Grow</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </View>
  );
}
