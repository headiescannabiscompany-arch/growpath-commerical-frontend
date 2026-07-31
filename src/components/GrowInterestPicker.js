import React, { useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { INTEREST_TIERS } from "../config/interests";
import {
  buildEmptyTierSelection,
  getTier1Metadata,
  normalizeInterestList
} from "../utils/growInterests";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "../theme/theme";

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
  enabledTierIds = /** @type {string[]} */ ([]),
  tierOptionsOverride,
  collapsible = true,
  defaultExpanded = true,
  showEmptyTiers = false,
  emptyTierText = "No choices are saved for this tier."
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const selections = value || buildEmptyTierSelection();
  const visibleTiers = resolveVisibleTiers(enabledTierIds);
  const { user } = useAuth();
  const tierOneId = getTier1Metadata()?.id || "crops";
  const userTier1Selections = useMemo(
    () => normalizeInterestList(user?.growInterests?.[tierOneId]),
    [user?.growInterests, tierOneId]
  );
  const appliedOverrides = useMemo(
    () => tierOptionsOverride || {},
    [tierOptionsOverride]
  );
  const [expanded, setExpanded] = useState(collapsible ? Boolean(defaultExpanded) : true);

  const toggleExpanded = useCallback(() => {
    if (!collapsible) return;
    setExpanded((prev) => !prev);
  }, [collapsible]);

  const handleToggle = (tierId, option) => {
    const currentTier = Array.isArray(selections[tierId]) ? selections[tierId] : [];
    const exists = currentTier.includes(option);
    const nextTier = exists
      ? currentTier.filter((tag) => tag !== option)
      : [...currentTier, option];
    const nextSelections = { ...selections, [tierId]: nextTier };
    onChange?.(nextSelections);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.headerRow, !collapsible && styles.headerRowStatic]}
        activeOpacity={collapsible ? 0.7 : 1}
        onPress={toggleExpanded}
        accessibilityRole={collapsible ? "button" : undefined}
        accessibilityLabel={collapsible ? `Toggle ${title}` : undefined}
        accessibilityState={collapsible ? { expanded } : undefined}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
        </View>
        {collapsible ? (
          <Text style={styles.toggleIcon}>{expanded ? "▲" : "▼"}</Text>
        ) : null}
      </TouchableOpacity>

      {!expanded
        ? null
        : visibleTiers.map((tier) => {
            let tierOptions =
              (appliedOverrides[tier.id] && Array.isArray(appliedOverrides[tier.id])
                ? appliedOverrides[tier.id]
                : tier.options) || [];

            if (tier.tier === 1) {
              tierOptions = appliedOverrides[tier.id] ?? userTier1Selections;
            }

            if ((!tierOptions || tierOptions.length === 0) && !showEmptyTiers) {
              return null;
            }

            return (
              <View key={tier.id} style={styles.tierBlock}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierLabel}>
                    Tier {tier.tier}: {tier.label}
                  </Text>
                  <Text style={styles.tierCount}>
                    {Array.isArray(selections[tier.id]) ? selections[tier.id].length : 0}{" "}
                    selected
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {!tierOptions.length ? (
                    <Text style={styles.emptyTierText}>{emptyTierText}</Text>
                  ) : null}
                  {tierOptions.map((option) => {
                    const active = selections[tier.id]?.includes(option);
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => handleToggle(tier.id, option)}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Toggle grow interest ${option}`}
                        accessibilityState={{ checked: Boolean(active) }}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
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

const createStyles = (palette) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 16,
      backgroundColor: palette.surface,
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
      color: palette.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 4
    },
    helper: {
      fontSize: 13,
      color: palette.textMuted,
      marginBottom: 12
    },
    toggleIcon: {
      fontSize: 18,
      color: palette.textMuted,
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
      color: palette.text,
      flex: 1,
      marginRight: 8
    },
    tierCount: {
      fontSize: 12,
      color: palette.textMuted
    },
    emptyTierText: {
      fontSize: 13,
      lineHeight: 19,
      color: palette.warning
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    chip: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: palette.surfaceMuted,
      marginRight: 8,
      marginBottom: 8
    },
    chipActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    chipText: {
      fontSize: 12,
      color: palette.textMuted,
      fontWeight: "500"
    },
    chipTextActive: {
      color: palette.accentText
    }
  });
