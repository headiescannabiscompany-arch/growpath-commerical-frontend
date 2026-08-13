import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";

export default function ForumFilters({
  visible,
  tiers = [],
  activeFilters = [],
  onToggleFilter
}) {
  const { palette } = useAppTheme();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.filterDrawer,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
      ]}
    >
      <Text style={[styles.filterDrawerTitle, { color: palette.text }]}>
        Filter Content
      </Text>
      {tiers.map((tier) => {
        if (tier.isTierOne && tier.options.length === 0) return null;
        return (
          <View key={tier.id} style={styles.tierContainer}>
            <Text style={[styles.tierTitle, { color: palette.textSoft }]}>
              {tier.label}
            </Text>
            <View style={styles.tierOptions}>
              {tier.options.map((option) => {
                const isActive = activeFilters.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Filter Forum by ${option}`}
                    accessibilityState={{ checked: isActive }}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border
                      },
                      isActive && {
                        backgroundColor: palette.accent,
                        borderColor: palette.accent
                      }
                    ]}
                    onPress={() => onToggleFilter(option, tier.id)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: palette.textMuted },
                        isActive && {
                          color: palette.accentText,
                          fontWeight: "700"
                        }
                      ]}
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
    padding: 12,
    borderRadius: radius.card,
    marginBottom: 12,
    borderWidth: 1
  },
  filterDrawerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12
  },
  tierContainer: {
    marginBottom: 12
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8
  },
  tierOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  filterChip: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500"
  }
});
