import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function ForumFilters({
  visible,
  tiers = [],
  activeFilters = [],
  onToggleFilter
}) {
  if (!visible) return null;

  return (
    <View style={styles.filterDrawer}>
      <Text style={styles.filterDrawerTitle}>Filter Content</Text>
      {tiers.map((tier) => {
        if (tier.isTierOne && tier.options.length === 0) return null;
        return (
          <View key={tier.id} style={styles.tierContainer}>
            <Text style={styles.tierTitle}>{tier.label}</Text>
            <View style={styles.tierOptions}>
              {tier.options.map((option) => {
                const isActive = activeFilters.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => onToggleFilter(option, tier.id)}
                  >
                    <Text
                      style={[styles.filterText, isActive && styles.filterTextActive]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  filterDrawer: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee"
  },
  filterDrawerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333"
  },
  tierContainer: {
    marginBottom: 12
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#555"
  },
  tierOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd"
  },
  filterChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981"
  },
  filterText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500"
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "700"
  }
});
