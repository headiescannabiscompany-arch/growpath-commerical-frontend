import React, { useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { INTEREST_TIERS } from "../config/interests";
import {
  buildEmptyTierSelection,
  getTier1Metadata,
  normalizeInterestList
} from "../utils/growInterests";
import { useAuth } from "../context/AuthContext";

function resolveVisibleTiers(enabledTierIds) {
  if (!Array.isArray(enabledTierIds) || enabledTierIds.length === 0) {
    return INTEREST_TIERS;
  }

  const normalized = new Set(enabledTierIds.map((value) => String(value)));
  return INTEREST_TIERS.filter(
    (tier) => normalized.has(tier.id) || normalized.has(String(tier.tier))
  );
}

export default function GrowInterestPicker({
  title = "Grow Interests",
  helperText,
  value,
  onChange,
  enabledTierIds,
  tierOptionsOverride,
  collapsible = true,
  defaultExpanded = true
}) {
  const selections = value || buildEmptyTierSelection();
  const visibleTiers = resolveVisibleTiers(enabledTierIds);
  const { user } = useAuth();
  const tierOneId = getTier1Metadata()?.id || "crops";
  const userTier1Selections = useMemo(
    () => normalizeInterestList(user?.growInterests?.[tierOneId]),
    [user?.growInterests, tierOneId]
  );
  const appliedOverrides = useMemo(() => tierOptionsOverride || {}, [tierOptionsOverride]);
  const [expanded, setExpanded] = useState(
    collapsible ? Boolean(defaultExpanded) : true
  );

  const toggleExpanded = useCallback(() => {
    if (!collapsible) return;
    setExpanded((prev) => !prev);
  }, [collapsible]);

  const handleToggle = (tierId, option) => {
    const currentTier = Array.isArray(selections[tierId]) ? selections[tierId] : [];
    const exists = currentTier.includes(option);
    const nextTier = exists ? currentTier.filter((tag) => tag !== option) : [...currentTier, option];
    const nextSelections = { ...selections, [tierId]: nextTier };
    onChange?.(nextSelections);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.headerRow, !collapsible && styles.headerRowStatic]}
        activeOpacity={collapsible ? 0.7 : 1}
        onPress={toggleExpanded}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
        </View>
        {collapsible ? (
          <Text style={styles.toggleIcon}>{expanded ? "▲" : "▼"}</Text>
        ) : null}
      </TouchableOpacity>

      {!expanded ? null : visibleTiers.map((tier) => {
        let tierOptions =
          (appliedOverrides[tier.id] && Array.isArray(appliedOverrides[tier.id])
            ? appliedOverrides[tier.id]
            : tier.options) || [];

        if (tier.tier === 1) {
          tierOptions = appliedOverrides[tier.id] ?? userTier1Selections;
        }

        if (!tierOptions || tierOptions.length === 0) {
          return null;
        }

        return (
          <View key={tier.id} style={styles.tierBlock}>
            <View style={styles.tierHeader}>
              <Text style={styles.tierLabel}>
                Tier {tier.tier}: {tier.label}
              </Text>
              <Text style={styles.tierCount}>
                {Array.isArray(selections[tier.id]) ? selections[tier.id].length : 0} selected
              </Text>
            </View>
            <View style={styles.chipRow}>
              {tierOptions.map((option) => {
                const active = selections[tier.id]?.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => handleToggle(tier.id, option)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
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
  container: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 24
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4
  },
  headerRowStatic: {
    paddingVertical: 0
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4
  },
  helper: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12
  },
  toggleIcon: {
    fontSize: 18,
    color: "#6B7280",
    marginLeft: 8
  },
  tierBlock: {
    marginBottom: 16
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8
  },
  tierCount: {
    fontSize: 12,
    color: "#6B7280"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  chip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    marginRight: 8,
    marginBottom: 8
  },
  chipActive: {
    backgroundColor: "#10B981",
    borderColor: "#059669"
  },
  chipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500"
  },
  chipTextActive: {
    color: "#FFFFFF"
  }
});
